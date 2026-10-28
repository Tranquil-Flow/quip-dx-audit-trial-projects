import { readFile, writeFile, appendFile, chmod } from 'node:fs/promises';
import { formatEther, isAddress, isHex, parseEther } from 'viem';
import { baseSepolia } from 'viem/chains';
import {
  planSameChainSwap, getSameChainSwapStatus, swapId, totalNative, getClaimEvents,
} from '@quip.network/quip-swap-sdk';
import { loadContext, ensureQuipWallet } from './setup.mjs';

const root = new URL('../', import.meta.url);
const mailbox = new URL('file:///private/tmp/projects/swapchat-487/maker.md');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const asBigints = side => ({ ...side, chainId: BigInt(side.chainId), commitmentDeadline: BigInt(side.commitmentDeadline), claimDeadline: BigInt(side.claimDeadline), reclaimRelease: BigInt(side.reclaimRelease), assets: side.assets.map(a => ({ ...a, id: BigInt(a.id), amount: BigInt(a.amount) })) });
const eq = (a, b) => a?.toLowerCase() === b?.toLowerCase();
const contract = '0xA7955981D5759a799267063110Be0F7AeCc26F8A';
const log = async text => appendFile(new URL('DEVLOG.md', root), `\n${text}\n`);
let lastStatus;
let activeOffer;
let activeWallet;
async function report(offer, wallet, status, detail = '') {
  if (status === lastStatus) return;
  lastStatus = status;
  const serialize = (k, value) => typeof value === 'bigint' ? value.toString() : value;
  await writeFile(new URL('file:///private/tmp/projects/swapchat-487/taker.md'),
    `# Taker coordination\nTaker EOA: 0xA501da7ADB0b48AEa2cC48799051ddDe20A1eAe5; Quip wallet: ${wallet.walletAddress}; Base Sepolia chain 84532.\n` +
    `Maker wallet: ${offer.makerWallet}; Omnibus: ${contract}.\nOffer id: ${swapId(offer.lock, offer.maker, offer.taker)}; lock: ${offer.lock}.\n` +
    `Exact terms (native asset amounts in wei): ${JSON.stringify({ maker: offer.maker, taker: offer.taker }, serialize, 2)}\n` +
    `Maker commit: https://base-sepolia.blockscout.com/tx/${offer.makerCommitTx}\n${detail}\nSTATUS: ${status}\n`);
  const resultPath = new URL('RESULT.md', root);
  const prior = await readFile(resultPath, 'utf8');
  const newStatus = status === 'SETTLED' ? 'WORKING' : 'PARTIAL';
  const updated = prior
    .replace(/^Status: .*$/m, `Status: ${newStatus}. ${status}: ${detail}`)
    .replace(/^Offer id: .*$/m, `Offer id: ${swapId(offer.lock, offer.maker, offer.taker)}. Lock: ${offer.lock}. Maker commit: https://base-sepolia.blockscout.com/tx/${offer.makerCommitTx}. Swap terms (wei): ${JSON.stringify({ maker: offer.maker, taker: offer.taker }, serialize)}.`);
  await writeFile(resultPath, updated + `\nProgress update: ${status} — ${detail}\n`);
}
async function explorerSuccess(hash) {
  const url = `https://base-sepolia.blockscout.com/api/v2/transactions/${hash}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Blockscout HTTP ${response.status} for ${hash}`);
  const tx = await response.json();
  if (tx.hash?.toLowerCase() !== hash.toLowerCase() || tx.result !== 'success' || tx.status !== 'ok') throw new Error(`Blockscout has not confirmed success for ${hash}`);
  return url;
}

async function reserveLeaf(wallet) {
  // Persist BEFORE signing: a crash or RPC timeout must never let a new process
  // sign a different action under the same one-time SHRINCS leaf.
  const path = new URL('keys/next-leaf', root);
  let next = 0;
  try { next = Number((await readFile(path, 'utf8')).trim()); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const state = await wallet.getWalletState();
  if (!Number.isSafeInteger(next) || next < 0) throw new Error('Invalid persistent SHRINCS leaf counter');
  while (next < state.maxSignatures && await wallet.isStatefulLeafUsed(next)) next++;
  if (next >= state.maxSignatures) throw new Error('No unreserved SHRINCS signatures; rotate key rather than reusing a leaf');
  await writeFile(path, String(next + 1), { mode: 0o600 });
  await chmod(path, 0o600);
  return next;
}

async function readOffer() {
  let raw;
  try { raw = await readFile(new URL('offer.json', root), 'utf8'); }
  catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const maker = await readFile(mailbox, 'utf8');
    raw = maker.match(/```json\s*([\s\S]*?)```/)?.[1];
  }
  if (!raw) return null;
  const data = JSON.parse(raw);
  if (!data.lock || !data.maker || !data.taker || !data.makerCommitTx || !data.makerWallet) throw new Error('Offer needs lock, maker, taker, makerCommitTx, makerWallet');
  return { ...data, maker: asBigints(data.maker), taker: asBigints(data.taker) };
}

async function checkMakerCommit(ctx, offer, plan) {
  const { publicClient, omnibus } = ctx;
  const receipt = await publicClient.getTransactionReceipt({ hash: offer.makerCommitTx });
  if (receipt.status !== 'success') throw new Error('Maker commit transaction reverted');
  const tip = await publicClient.getBlockNumber();
  if (tip - receipt.blockNumber < 2n) throw new Error('Maker commit has fewer than 3 confirmations');
  const commits = (await omnibus.waitForReceipt(offer.makerCommitTx, { confirmations: 2 })).commitments;
  if (!commits.some(c => eq(c.lock, offer.lock) && eq(c.sender, offer.makerWallet) &&
    c.party.chainId === offer.maker.chainId && c.party.assets.length === offer.maker.assets.length &&
    c.party.assets.every((a, i) => a.amount === offer.maker.assets[i].amount && a.assetType === offer.maker.assets[i].assetType && eq(a.target, offer.maker.assets[i].target)))) throw new Error('Maker receipt does not contain matching wallet-funded Commitment event');
  if (!(await omnibus.isQuipWallet(offer.makerWallet))) throw new Error('Maker wallet is not registered with the official Quip WalletFactory');
  const id = swapId(offer.lock, offer.maker, offer.taker);
  if (offer.swapId && !eq(offer.swapId, id)) throw new Error('Offer swapId does not match SDK calculation');
  if (!(await omnibus.getPosted(id, plan.proposerDigest)) || !eq(await omnibus.getTermsHash(id), plan.canonicalDigest)) throw new Error('Maker commitment/terms hash not posted to Omnibus');
  return id;
}

async function fundWallet(ctx, wallet, required) {
  const balance = await ctx.publicClient.getBalance({ address: wallet.walletAddress });
  if (balance >= required) return;
  const needed = required - balance;
  if (needed > parseEther('0.005')) throw new Error(`Refusing test swap requiring > 0.005 ETH additional wallet funding (${formatEther(needed)} ETH)`);
  const eoaBalance = await ctx.publicClient.getBalance({ address: ctx.eoa.address });
  if (eoaBalance < needed + parseEther('0.002')) throw new Error('Insufficient test ETH to fund wallet while retaining EOA gas');
  const hash = await ctx.walletClient.sendTransaction({ account: ctx.eoa, chain: baseSepolia, to: wallet.walletAddress, value: needed });
  const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== 'success') throw new Error(`Wallet funding failed: ${hash}`);
  console.log(`Funded smart wallet: https://sepolia.basescan.org/tx/${hash}`);
}

async function run() {
  const ctx = await loadContext();
  const wallet = await ensureQuipWallet(ctx);
  console.log('Waiting for maker offer in offer.json or fenced JSON in maker.md; polling ~60 s.');
  while (true) {
    const offer = await readOffer();
    if (!offer) {
      const balance = await ctx.publicClient.getBalance({ address: ctx.eoa.address });
      console.log(`No offer; EOA balance ${formatEther(balance)} Base Sepolia ETH`);
      if (process.env.TAKER_ONCE === '1') throw new Error('No maker offer available');
      await sleep(60_000); continue;
    }
    if (!isHex(offer.lock, { strict: true }) || offer.lock.length !== 66 || !isAddress(offer.makerWallet)) throw new Error('Malformed lock or maker wallet');
    if (eq(offer.makerWallet, wallet.walletAddress)) throw new Error('Maker and taker Quip wallets must be different accounts');
    if (!isHex(offer.makerCommitTx, { strict: true }) || offer.makerCommitTx.length !== 66) throw new Error('Malformed maker commit transaction hash');
    const { omnibus, publicClient } = ctx;
    const plan = planSameChainSwap(offer.maker, offer.taker);
    if (plan.proposerTerms !== offer.maker || plan.takerTerms !== offer.taker) throw new Error('Offer maker must propose first; taker must commit second');
    if (offer.maker.chainId !== 84532n || offer.taker.chainId !== 84532n) throw new Error('Testnet-only: offer must be Base Sepolia same-chain');
    if (!eq(offer.taker.recipient, wallet.walletAddress) || !eq(offer.taker.reclaimRecipient, wallet.walletAddress) || !eq(offer.maker.recipient, offer.makerWallet) || !eq(offer.maker.reclaimRecipient, offer.makerWallet)) throw new Error('Swap recipients/reclaim addresses do not match parties');
    if (offer.maker.assets.some(a => a.assetType !== 0) || offer.taker.assets.some(a => a.assetType !== 0)) throw new Error('This taker supports native ETH only; ERC tokens need wallet approvals');
    if (totalNative(offer.taker) > parseEther('0.005')) throw new Error('Refusing >0.005 test ETH taker leg');
    if (totalNative(offer.maker) > parseEther('0.005')) throw new Error('Refusing >0.005 test ETH maker leg');
    activeOffer = offer;
    activeWallet = wallet;
    const id = await checkMakerCommit(ctx, offer, plan);
    console.log(`Verified maker commitment ${offer.makerCommitTx}; swapId ${id}`);
    const state = await getSameChainSwapStatus(omnibus, offer.lock, plan);
    if (!state.takerPosted) await report(offer, wallet, 'OPEN', 'Maker commitment independently checked against Base Sepolia receipt and Omnibus storage; waiting for valid taker window.');
    console.log('Swap status', state.status, 'chain timestamp', String(state.timestamp));
    if (state.status === 'awaiting-taker-commit') {
      await fundWallet(ctx, wallet, totalNative(offer.taker) + await omnibus.getCommitmentFee());
      const auth = { signer: `0x${wallet.walletAddress.slice(2)}01`, signature: '0x' }; // attribution only; factory membership authenticates msg.sender
      const call = await omnibus.prepareCommit({ lock: offer.lock, party: offer.taker, counterparty: offer.maker, auth }, { account: wallet.walletAddress });
      const leaf = await reserveLeaf(wallet);
      const receipt = await wallet.execute({ target: call.to, value: call.value, data: call.data }, { leaf });
      if (receipt.status !== 'success') throw new Error(`Taker commit reverted: ${receipt.transactionHash}`);
      const scoped = await omnibus.waitForReceipt(receipt.transactionHash);
      if (!scoped.commitments.some(c => eq(c.sender, wallet.walletAddress) && eq(c.lock, offer.lock))) throw new Error('Taker commitment missing from receipt');
      const takerTx = `https://base-sepolia.blockscout.com/tx/${receipt.transactionHash}`;
      console.log(`Taker commit ${takerTx}`);
      await log(`Taker Quip-wallet commit sent via SDK: ${takerTx}; swap id ${id}.`);
      await report(offer, wallet, 'TAKEN', `Taker committed from Quip wallet: ${takerTx}. Maker: claim during proposer claim window and publish transaction.`);
    } else if (state.status === 'proposer-commit-expired' || state.status === 'half-committed-expired') {
      throw new Error(`Do not commit: ${state.status}`);
    }
    const post = await getSameChainSwapStatus(omnibus, offer.lock, plan);
    if (post.takerPosted && post.status !== 'settled' && lastStatus !== 'TAKEN') await report(offer, wallet, 'TAKEN', 'Taker commitment is on-chain; maker should claim in proposer claim window.');
    if (post.status === 'settled') {
      const makerReceipt = await publicClient.getTransactionReceipt({ hash: offer.makerCommitTx });
      const claims = await getClaimEvents({ publicClient, address: contract, lock: offer.lock, fromBlock: makerReceipt.blockNumber });
      const makerClaim = claims.find(c => eq(c.recipient, offer.makerWallet));
      const takerClaim = claims.find(c => eq(c.recipient, wallet.walletAddress));
      if (!makerClaim || !takerClaim || !eq(makerClaim.transactionHash, takerClaim.transactionHash)) throw new Error('Settlement lacks both recipient Claim events');
      await explorerSuccess(makerClaim.transactionHash);
      const settlement = `https://base-sepolia.blockscout.com/tx/${makerClaim.transactionHash}`;
      console.log(`SETTLED both legs, SDK Claim events and Blockscout API success: ${settlement}`);
      await report(offer, wallet, 'SETTLED', `Claim events for BOTH maker and taker recipients in same transaction; Blockscout API reports success: ${settlement}`);
      await log(`Blockscout confirmed both Claim recipient events and transaction success: ${settlement}; swap id ${id}.`);
      return;
    }
    if (post.status === 'reclaimable' || post.status === 'partially-reclaimed') {
      if (!post.takerReclaimed && post.takerPosted) {
        const hash = await omnibus.reclaim({ lock: offer.lock, party: offer.taker, counterparty: offer.maker });
        await omnibus.waitForReceipt(hash);
        console.log(`TAKER RECLAIMED https://base-sepolia.blockscout.com/tx/${hash}`);
        await report(offer, wallet, 'CANCELLED', `Taker funds reclaimed after claim window: https://base-sepolia.blockscout.com/tx/${hash}`);
      }
      throw new Error('Claim expired; taker leg reclaimed/awaiting reclaim, not settled');
    }
    if (process.env.TAKER_ONCE === '1') { console.log('Waiting for next swap window/claim; rerun to continue'); return; }
    await sleep(60_000);
  }
}
run().catch(async err => {
  const message = String(err.message).replace(/\s+/g, ' ').slice(0, 700);
  console.error('Taker stopped:', err.code ?? err.name, message);
  if (activeOffer && activeWallet && lastStatus !== 'SETTLED' && lastStatus !== 'CANCELLED') {
    try { await report(activeOffer, activeWallet, `PROBLEM: ${message.slice(0, 180)}`, message); }
    catch (writeError) { console.error('Could not update coordination:', writeError.message); }
  } else if (!activeOffer && process.env.TAKER_ONCE !== '1') {
    try {
      const path = new URL('file:///private/tmp/projects/swapchat-487/taker.md');
      const prior = await readFile(path, 'utf8');
      await writeFile(path, prior.replace(/STATUS: [^\n]*\s*$/, `STATUS: PROBLEM: ${message.slice(0, 180)}\n`));
    } catch (writeError) { console.error('Could not update coordination:', writeError.message); }
  }
  process.exitCode = 1;
});
