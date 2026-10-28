import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerms, nativeAsset, planSameChainSwap, swapId, digestTerms, getSameChainSwapStatus } from '@quip.network/quip-swap-sdk';
import { parseEther } from 'viem';

const taker = '0x9345E9Cd435b9eabF3c60d7960be4f1a02d10E15';
const maker = '0x1111111111111111111111111111111111111111';
const makerTerms = createTerms({
  chainId: 84532n, recipient: maker, reclaimRecipient: maker,
  commitmentDeadline: 10_000n, claimDeadline: 13_600n, reclaimRelease: 17_200n,
  assets: [nativeAsset(parseEther('0.001'))],
});
const takerTerms = createTerms({
  chainId: 84532n, recipient: taker, reclaimRecipient: taker,
  commitmentDeadline: 11_800n, claimDeadline: 15_400n, reclaimRelease: 19_000n,
  assets: [nativeAsset(parseEther('0.002'))],
});
const lock = '0x' + '11'.repeat(32);

test('SDK plans paired same-chain swap with default 30-minute buffers', () => {
  const plan = planSameChainSwap(makerTerms, takerTerms);
  assert.equal(plan.proposerTerms, makerTerms);
  assert.equal(plan.takerTerms, takerTerms);
  assert.equal(plan.takerCommitWindow.lower, 10_000n);
  assert.equal(plan.takerCommitWindow.upper, 11_800n);
  assert.equal(plan.claimWindow.lower, 11_800n);
  assert.equal(plan.proposerDigest, digestTerms(makerTerms));
  assert.equal(swapId(lock, makerTerms, takerTerms), swapId(lock, takerTerms, makerTerms));
});

test('SDK rejects adjacent schedule gaps smaller than default buffer', () => {
  assert.throws(() => planSameChainSwap(makerTerms, { ...takerTerms, commitmentDeadline: 11_799n }), { code: 'INSUFFICIENT_BUFFER' });
});

test('SDK refuses mispaired chain IDs', () => {
  assert.throws(() => planSameChainSwap(makerTerms, { ...takerTerms, chainId: 8453n }), { code: 'CHAIN_ID_MISMATCH' });
});
