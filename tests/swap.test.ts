import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTerms, generateSecret, nativeAsset, planSameChainSwap, resolveDeployment, secretToPair, swapId } from '@quip.network/quip-swap-sdk';

const alice = '0x12Fff5E0B59eDE35c1c594aB5e371389D9Dc72c2';
const bob = '0x3F2Cc4E990a2f09D73C26B7A947D33aeec27930f';

test('Quip SDK records a live Base Sepolia-only Omnibus and factory', () => {
  const deployment = resolveDeployment(84532n);
  assert.equal(deployment.deployed, true);
  assert.ok(deployment.omnibusAddress.startsWith('0x'));
  assert.ok(deployment.walletFactory?.startsWith('0x'));
});

test('Quip SDK validates two same-chain native ETH swap terms, secret, lock and order', () => {
  const now = 1_900_000_000n;
  const deadlines = [120n, 240n, 360n, 480n, 600n, 720n].map(gap => now + gap);
  const proposer = createTerms({ chainId: 84532n, reclaimRecipient: alice, recipient: alice,
    commitmentDeadline: deadlines[0], claimDeadline: deadlines[2], reclaimRelease: deadlines[4], assets: [nativeAsset(1000n)] });
  const taker = createTerms({ chainId: 84532n, reclaimRecipient: bob, recipient: bob,
    commitmentDeadline: deadlines[1], claimDeadline: deadlines[3], reclaimRelease: deadlines[5], assets: [nativeAsset(2000n)] });
  const plan = planSameChainSwap(proposer, taker, { minimumBufferSeconds: 120n });
  assert.equal(plan.proposerTerms, proposer);
  assert.equal(plan.takerTerms, taker);
  assert.equal(plan.claimWindow.lower, deadlines[1]);
  const { secret, lock } = generateSecret();
  assert.equal(secretToPair(secret).lock, lock);
  assert.match(swapId(lock, proposer, taker), /^0x[0-9a-fA-F]{64}$/);
  assert.throws(() => planSameChainSwap(proposer, taker, { minimumBufferSeconds: 1800n }), /buffer/i);
});
