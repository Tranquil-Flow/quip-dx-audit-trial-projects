// End-to-end raffle on Quip Aglais testnet (pallet-revive EVM).
// Randomness: FALLBACK commit-reveal + future blockhash (Quip QVRF has no callable interface — see RESULT.md).
import { connect, loadWallet, loadArtifact, deploy, send, view, contractLogs, headNumber, waitForBlock } from './lib.mjs';
import { Interface, keccak256, solidityPacked, randomBytes, hexlify, parseEther, formatEther } from 'ethers';
import { mkdirSync, writeFileSync } from 'fs';

const TICKET = parseEther(process.env.TICKET || '0.01');
const BOND = parseEther(process.env.BOND || '0.05');
const ENTRY_BLOCKS = Number(process.env.ENTRY_BLOCKS || 150); // entry window in blocks, counted from the deploy block
const REVEAL_WINDOW = Number(process.env.REVEAL_WINDOW || 150);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const api = await connect();
const art = loadArtifact();
const iface = new Interface(art.abi);
const organizer = loadWallet('organizer');
const players = ['alice', 'bob', 'carol', 'dave'].map(loadWallet);
const evidence = { network: 'Aglais (Quip Testnet)', chainId: 20033, randomness: 'commit-reveal + future blockhash (fallback; QVRF unavailable)', txs: {} };

// 1. organizer commits to a secret
const secret = hexlify(randomBytes(32));
const commit = keccak256(solidityPacked(['bytes32'], [secret]));
mkdirSync('evidence', { recursive: true });
writeFileSync('keys/raffle-secret.json', JSON.stringify({ secret, commit }, null, 2), { mode: 0o600 });
evidence.commit = commit;

// 2. deploy
log('deploying Raffle, entryBlocks =', ENTRY_BLOCKS, 'commit =', commit);
const dep = await deploy(api, organizer, art, [commit, TICKET, ENTRY_BLOCKS, REVEAL_WINDOW], BOND);
const addr = dep.address;
evidence.contract = addr; evidence.txs.deploy = { ethTxHash: dep.ethTxHash, extrinsic: dep.extrinsicHash, block: dep.blockNumber, blockHash: dep.blockHash };
log('deployed at', addr, 'block', dep.blockNumber);
const entryEnd = Number((await view(api, iface, addr, 'entryEndBlock'))[0]);
evidence.entryEndBlock = entryEnd;
log('entryEndBlock =', entryEnd);
log('on-chain check: organizerCommit =', (await view(api, iface, addr, 'organizerCommit'))[0], 'state =', (await view(api, iface, addr, 'state'))[0]);

// 3. entries (sequential per wallet, wallets in parallel)
const entries = await Promise.all(players.map(async (w, i) => {
  const r = await send(api, w, iface, addr, 'enter', [], TICKET);
  log(`${['alice', 'bob', 'carol', 'dave'][i]} entered`, w.address, 'block', r.blockNumber);
  return { player: w.address, ethTxHash: r.ethTxHash, extrinsic: r.extrinsicHash, block: r.blockNumber };
}));
evidence.txs.entries = entries;
const n = Number((await view(api, iface, addr, 'numEntries'))[0]);
log('numEntries on chain =', n);
if (n !== players.length) throw new Error(`expected ${players.length} entries, chain says ${n} (some enter txs reverted?)`);

// 4. close entries after the deadline
log('waiting for block >', entryEnd);
await waitForBlock(api, entryEnd + 1);
const close = await send(api, players[3], iface, addr, 'closeEntries');
const drawBlock = Number((await view(api, iface, addr, 'drawBlock'))[0]);
evidence.txs.closeEntries = { ethTxHash: close.ethTxHash, extrinsic: close.extrinsicHash, block: close.blockNumber, drawBlock };
log('entries closed, drawBlock =', drawBlock);

// 5. reveal + draw
await waitForBlock(api, drawBlock + 1);
const draw = await send(api, organizer, iface, addr, 'draw', [secret]);
evidence.txs.draw = { ethTxHash: draw.ethTxHash, extrinsic: draw.extrinsicHash, block: draw.blockNumber };
const drawn = contractLogs(draw.events, iface, addr).find((l) => l.name === 'Drawn');

// 6. independent verification from public chain state
const winner = (await view(api, iface, addr, 'winner'))[0];
const idx = Number((await view(api, iface, addr, 'winnerIndex'))[0]);
const seedOnChain = (await view(api, iface, addr, 'seed'))[0];
const bh = (await view(api, iface, addr, 'usedBlockHash'))[0];
const revealed = (await view(api, iface, addr, 'revealedSecret'))[0];
const seedLocal = keccak256(solidityPacked(['bytes32', 'bytes32', 'uint256', 'address'], [revealed, bh, n, addr]));
const idxLocal = Number(BigInt(seedLocal) % BigInt(n));
const entrantsOnChain = [];
for (let i = 0; i < n; i++) entrantsOnChain.push((await view(api, iface, addr, 'entryAt', [i]))[0]);
const checks = {
  commitMatches: keccak256(solidityPacked(['bytes32'], [revealed])) === commit,
  seedRecomputed: seedLocal === seedOnChain,
  indexRecomputed: idxLocal === idx,
  winnerIsEntrant: entrantsOnChain[idx] === winner,
  drawnEventPresent: !!drawn,
};
const ok = Object.values(checks).every(Boolean);
evidence.result = { winner, winnerIndex: idx, seed: seedOnChain, blockHashUsed: bh, secretRevealed: revealed, entrants: entrantsOnChain, prizeAGLS: formatEther(TICKET * BigInt(n)), checks, verified: ok };
writeFileSync('evidence/raffle-run.json', JSON.stringify(evidence, null, 2));
log('WINNER', winner, '(index', idx + ')', 'seed', seedOnChain);
log('verification', checks, ok ? 'ALL OK' : 'FAILED');
await api.disconnect();
process.exit(ok ? 0 : 1);
