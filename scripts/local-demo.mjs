import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ganache from 'ganache';
import solc from 'solc';
import { BrowserProvider, ContractFactory, Wallet, keccak256, parseEther } from 'ethers';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const keysDir = path.join(root, 'keys');
fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
fs.chmodSync(keysDir, 0o700);
const keyPath = path.join(keysDir, `local-${Date.now()}-${randomBytes(4).toString('hex')}.json`);
const identities = Object.fromEntries(['funder', 'initiator', 'counterparty'].map(role => {
  const w = Wallet.createRandom();
  return [role, { address: w.address, privateKey: w.privateKey }];
}));
fs.writeFileSync(keyPath, JSON.stringify(identities, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
fs.chmodSync(keyPath, 0o600);

const ganacheProvider = ganache.provider({
  logging: { quiet: true },
  chain: { chainId: 31337, hardfork: 'shanghai' },
  wallet: { accounts: Object.values(identities).map((v, i) => ({ secretKey: v.privateKey, balance: '0x' + (i === 0 ? parseEther('10') : parseEther('1')).toString(16) })) }
});
const provider = new BrowserProvider(ganacheProvider, undefined, { cacheTimeout: -1 });
assert.equal((await provider.getNetwork()).chainId, 31337n);
const wallets = Object.fromEntries(Object.entries(identities).map(([name, { privateKey }]) => [name, new Wallet(privateKey, provider)]));
const source = fs.readFileSync('contracts/IllustrativeHashlock.sol', 'utf8');
const input = { language: 'Solidity', sources: { 'IllustrativeHashlock.sol': { content: source } }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: 'paris', outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } } };
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors?.some(e => e.severity === 'error')) throw Error(output.errors.map(e => e.formattedMessage).join('\n'));
const artifact = output.contracts['IllustrativeHashlock.sol'].IllustrativeHashlock;
const factory = new ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallets.funder);
const contract = await factory.deploy();
const deployed = await contract.deploymentTransaction().wait();
const addr = await contract.getAddress();
const initiator = contract.connect(wallets.initiator);
const counterparty = contract.connect(wallets.counterparty);
const evidence = { warning: 'LOCAL GANACHE TRANSACTIONS ONLY; NOT QUIPSWAP OR PUBLIC TESTNET', chainId: 31337, contract: addr, addresses: Object.fromEntries(Object.entries(identities).map(([k,v]) => [k,v.address])), transactions: { deploy: deployed.hash }, scenarios: {} };
async function record(txPromise) {
  const receipt = await (await txPromise).wait();
  assert.equal(receipt.status, 1);
  return { hash: receipt.hash, blockNumber: receipt.blockNumber, status: receipt.status };
}
const secret = '0x' + randomBytes(32).toString('hex');
const hash = keccak256(secret);
const idA = '0x' + randomBytes(32).toString('hex');
const idB = '0x' + randomBytes(32).toString('hex');
const now = (await provider.getBlock('latest')).timestamp;
const happy = { ids: [idA, idB], secretHash: hash };
const amountA = parseEther('0.03'), amountB = parseEther('0.02');
happy.commitInitiator = await record(initiator.commit(idA, hash, identities.counterparty.address, now + 3600, { value: amountA }));
happy.commitCounterparty = await record(counterparty.commit(idB, hash, identities.initiator.address, now + 1800, { value: amountB }));
assert.equal(await provider.getBalance(addr), amountA + amountB);
await assert.rejects(counterparty.execute.staticCall(idB, secret), /not recipient/);
await assert.rejects(initiator.execute.staticCall(idB, '0x' + '00'.repeat(32)), /wrong secret/);
const initiatorBefore = await provider.getBalance(identities.initiator.address);
happy.executeInitiator = await record(initiator.execute(idB, secret));
const receipt = await provider.getTransactionReceipt(happy.executeInitiator.hash);
const revealed = receipt.logs.map(l => { try { return contract.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'Executed')?.args.secret;
assert.equal(revealed, secret);
const counterpartyBefore = await provider.getBalance(identities.counterparty.address);
happy.executeCounterparty = await record(counterparty.execute(idA, revealed));
assert.equal(await provider.getBalance(addr), 0n);
assert.equal((await contract.locks(idA)).closed, true);
assert.equal((await contract.locks(idB)).closed, true);
await assert.rejects(counterparty.execute.staticCall(idA, revealed), /not open/);
assert((await provider.getBalance(identities.initiator.address)) > initiatorBefore);
assert((await provider.getBalance(identities.counterparty.address)) > counterpartyBefore);
happy.outcome = 'both locks executed; contract balance zero';
evidence.scenarios.happy = happy;

const refundId = '0x' + randomBytes(32).toString('hex');
const refundAmount = parseEther('0.04');
const refundSecretHash = keccak256('0x' + randomBytes(32).toString('hex'));
const refund = { id: refundId, amountWei: refundAmount.toString() };
const refundNow = (await provider.getBlock('latest')).timestamp;
refund.commitInitiator = await record(initiator.commit(refundId, refundSecretHash, identities.counterparty.address, refundNow + 120, { value: refundAmount }));
assert.equal(await provider.getBalance(addr), refundAmount);
try {
  await initiator.reclaim.staticCall(refundId);
  throw Error('early reclaim unexpectedly succeeded');
} catch (err) {
  if (err.message === 'early reclaim unexpectedly succeeded') throw err;
  refund.earlyReclaim = 'reverted as expected';
}
await ganacheProvider.request({ method: 'evm_increaseTime', params: [121] });
await ganacheProvider.request({ method: 'evm_mine', params: [] });
const balanceBefore = await provider.getBalance(identities.initiator.address);
refund.reclaimInitiator = await record(initiator.reclaim(refundId));
assert.equal(await provider.getBalance(addr), 0n);
assert.equal((await contract.locks(refundId)).closed, true);
const balanceAfter = await provider.getBalance(identities.initiator.address);
assert(balanceAfter > balanceBefore, 'refund net of gas should increase balance');
refund.outcome = 'counterparty never committed; depositor reclaimed after simulated deadline; contract balance zero';
evidence.scenarios.refund = refund;
fs.writeFileSync('evidence.local.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
await ganacheProvider.disconnect();
