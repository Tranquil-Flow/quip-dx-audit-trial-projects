// (b) Counterparty disappears: Alice commits, Bob never commits. After Alice's reclaimRelease
// passes, Alice reclaims her ETH. No trust in Bob or any operator is needed.
import fs from "node:fs"; import path from "node:path";
import { formatEther } from "viem";
import { getQuipWallet, newSecret, now, schedule, waitUntil, exec, commitCall, reclaimData, read, LOCK_STATE, ASSET,
  CHAIN_ID, OMNIBUS, KEYS, publicClient, decodeOmnibusEvents, record, j } from "./lib.mjs";

const ETH_LEG = BigInt(process.env.ETH_LEG_WEI ?? 100_000_000_000_000n);
const token = JSON.parse(fs.readFileSync(path.join(KEYS, `token${process.env.WALLET_TAG ?? ""}.json`), "utf8")).token;
const alice = await getQuipWallet("alice");
const bob = await getQuipWallet("bob"); // only used for his address — Bob never acts
const A = alice.wallet.walletAddress, B = bob.wallet.walletAddress;
const ethA = async () => formatEther(await publicClient.getBalance({ address: A }));
const ethEscrow = async () => formatEther(await publicClient.getBalance({ address: OMNIBUS }));

const { secret, lock } = newSecret();
const s = schedule(await now());
// early reclaim reverts with WindowViolated() (0x32e5164b) until aliceLeg.reclaimRelease
const aliceLeg = { chainId: BigInt(CHAIN_ID), reclaimRecipient: A, recipient: A, /* recipient = where THIS party receives the other leg */ ...s.proposer,
  assets: [{ assetType: ASSET.Native, target: "0x0000000000000000000000000000000000000000", id: 0n, amount: ETH_LEG }] };
const bobLeg = { chainId: BigInt(CHAIN_ID), reclaimRecipient: B, recipient: B, ...s.taker,
  assets: [{ assetType: ASSET.ERC20, target: token, id: 0n, amount: 250n * 10n ** 6n }] };
const swapId = await read("swapId", [lock, aliceLeg, bobLeg]);
const escrowBefore = await ethEscrow();
console.log(`lock ${lock}\nswapId ${swapId}\nAlice wallet ETH before: ${await ethA()}; Omnibus escrow ETH: ${escrowBefore}`);
const txs = {};
txs.aliceCommit = (await exec(alice, commitCall(lock, aliceLeg, bobLeg, A, alice.wallet.commitment), "Alice commit (0.0001 ETH)")).transactionHash;
const afterCommit = await ethA();
const escrowAfterCommit = await ethEscrow();
console.log(`  lockState=${LOCK_STATE[await read("lockState", [swapId])]}; Alice wallet ETH: ${afterCommit}; Omnibus escrow ETH: ${escrowAfterCommit} (leg funded from Alice EOA via msg.value)`);
console.log("  Bob goes silent (never commits).");

// Early reclaim should be rejected by the contract (sanity check; simulated only, no tx sent).
try {
  await publicClient.call({ account: A, to: OMNIBUS, data: reclaimData(lock, aliceLeg, bobLeg) });
  console.log("  (unexpected) early reclaim simulation succeeded");
} catch (e) { console.log(`  early reclaim correctly rejected: ${e.shortMessage ?? e.message}`.split("\n")[0]); }

await waitUntil(aliceLeg.reclaimRelease, "Alice's reclaimRelease");
const r = await exec(alice, { target: OMNIBUS, value: 0n, data: reclaimData(lock, aliceLeg, bobLeg) }, "Alice reclaim");
txs.aliceReclaim = r.transactionHash;
console.log("  events:", j(decodeOmnibusEvents(r)));
const final = await ethA();
const escrowFinal = await ethEscrow();
console.log(`  Omnibus escrow ETH after reclaim: ${escrowFinal}`);
console.log(`  lockState=${LOCK_STATE[await read("lockState", [swapId])]}; Alice wallet ETH after reclaim: ${final}`);
record(`refund${process.env.WALLET_TAG ?? ""}.json`, { rpc: process.env.RPC_URL ?? "https://sepolia.base.org", omnibus: OMNIBUS, aliceWallet: A, bobWallet: B,
  lock, secret, swapId, aliceLeg, bobLeg, txs, aliceWalletETH: { afterCommit, final }, omnibusEscrowETH: { escrowBefore, escrowAfterCommit, escrowFinal } });
