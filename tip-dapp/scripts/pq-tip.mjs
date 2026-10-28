// Execute a real tip FROM a Quip-SHRINCS-authorized account on Aglais.
// The EOA is a gas-only relayer; it cannot authorize the account's execution.
import { readFile, writeFile, rename, open } from 'node:fs/promises';
import { Contract, JsonRpcProvider, Wallet, FetchRequest, getAddress, getBytes, parseEther } from 'ethers';
import { ShrincsSigner, ShrincsCodec } from '@quip.network/ethereum-sdk/v1/shrincs';
import { encodeAbiParameters } from 'viem';
let observedGenesis;
for (let attempt = 0; attempt < 4; attempt++) {
  try {
    const g = await fetch('https://bootnode-1.aglais.quip.network:20049/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0] }) });
    observedGenesis = (await g.json()).result;
    break;
  } catch (e) { if (attempt === 3) throw e; await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); }
}
if (observedGenesis !== '0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286') throw Error('Wrong Substrate genesis');
const req = new FetchRequest('https://evm-rpc.aglais.quip.network'); req.timeout = 120_000;
const p = new JsonRpcProvider(req, 20033, { staticNetwork: true });
if ((await p.send('eth_chainId', [])) !== '0x4e41') throw Error('Wrong EVM chain');
const w = new Wallet(JSON.parse(await readFile('keys/deployer.json', 'utf8')).privateKey, p);
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  if (i < 0) return fallback;
  if (i + 1 >= process.argv.length) throw Error(`Missing ${name}`);
  return process.argv[i + 1];
};
const creator = getAddress(arg('--creator', new Wallet(JSON.parse(await readFile('keys/creator.json', 'utf8')).privateKey).address));
const amountText = arg('--amount', '0.001');
if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(amountText)) throw Error('Invalid amount');
const amount = parseEther(amountText);
if (amount <= 0n || amount > parseEther('0.005')) throw Error('Tip must be >0 and <=0.005 AGLS');
const message = arg('--message', 'Quip SHRINCS testnet tip');
if (message.length > 160) throw Error('Message too long');
const state = JSON.parse(await readFile('keys/pq-deployment.json', 'utf8'));
const verifierArtifact = JSON.parse(await readFile('vendor-hashsigs-solidity/out/SHRINCS256sKeccak.sol/SHRINCS256sKeccak.json', 'utf8'));
const accountArtifact = JSON.parse(await readFile('out/QuipTipAccount.sol/QuipTipAccount.json', 'utf8'));
const jarArtifact = JSON.parse(await readFile('out/TipJar.sol/TipJar.json', 'utf8'));
const deployment = JSON.parse(await readFile('web/deployment.json', 'utf8'));
if (deployment.chainId !== 20033) throw Error('TipJar deployment chain mismatch');
for (const addr of [state.verifierV4, state.accountV4b, deployment.tipJar]) if ((await p.getCode(addr)) === '0x') throw Error(`Missing contract: ${addr}`);
const verifier = new Contract(state.verifierV4, verifierArtifact.abi, p);
const account = new Contract(state.accountV4b, accountArtifact.abi, w);
const jar = new Contract(deployment.tipJar, jarArtifact.abi, p);
const data = jar.interface.encodeFunctionData('tip', [creator, '0x0000000000000000000000000000000000000000', 0n, message]);
const hash = await account.operationHash(await jar.getAddress(), amount, data);
const onChainSignedHash = await account.signedHash(await jar.getAddress(), amount, data);
const seed = JSON.parse(await readFile('keys/quip-seed.json', 'utf8')).seed;
const signer = await ShrincsSigner.create(getBytes(seed));
const keypair = signer.recoverKeyPair(0, { maxSignatures: 16 });
if ((await account.commitment()).toLowerCase() !== keypair.publicKeyCommitment.toLowerCase()) throw Error('PQ signer not installed in account');
let nextLeaf = 1;
try { nextLeaf = JSON.parse(await readFile('keys/pq-leaves.json', 'utf8')).nextLeaf; }
catch (e) { if (e.code !== 'ENOENT') throw e; }
if (!Number.isInteger(nextLeaf) || nextLeaf < 1 || nextLeaf > 16) throw Error('Leaf budget exhausted/invalid; rotate key before signing');
// Burn the leaf DURABLY before creating or sharing any signature, even if RPC fails.
const temp = `keys/pq-leaves.${process.pid}.tmp`;
const f = await open(temp, 'wx', 0o600);
try { await f.writeFile(JSON.stringify({ nextLeaf: nextLeaf + 1 }) + '\n'); await f.sync(); }
finally { await f.close(); }
await rename(temp, 'keys/pq-leaves.json');
console.log('burned leaf:', nextLeaf);
const boundHash = ShrincsCodec.statefulRawMessageHash(keypair.publicKeyCommitment, hash);
if (boundHash.toLowerCase() !== onChainSignedHash.toLowerCase()) throw Error('Account hash differs from SDK hash');
const sig = keypair.signStatefulRawAt(boundHash, nextLeaf);
if (!keypair.verifyStatefulRaw(boundHash, sig)) throw Error('Local PQ verification failed');
const envelope = encodeAbiParameters([ShrincsCodec.abiTuples.publicKey, ShrincsCodec.abiTuples.statefulSignature], [keypair.publicKey, sig]);
const magic = await verifier.verify.staticCall(keypair.publicKeyCommitment, boundHash, envelope);
console.log('PQ signature on-chain verification:', magic, 'expected:', verifier.interface.getFunction('verify').selector, 'burned leaf:', nextLeaf);
if (magic !== verifier.interface.getFunction('verify').selector) throw Error('On-chain PQ verifier rejected signature; refusing tip');
if (process.argv.includes('--verify-only')) process.exit(0);
const balance = await p.getBalance(state.accountV4b);
if (balance < amount) {
  const funding = await w.sendTransaction({ to: state.accountV4b, value: parseEther('0.01'), gasPrice: 1_000_000_000n });
  console.log('Account funding tx:', funding.hash, 'status:', (await funding.wait()).status);
}
const gas = await account.execute.estimateGas(await jar.getAddress(), amount, data, envelope);
console.log('PQ-account execution gas estimate:', String(gas));
const tx = await account.execute(await jar.getAddress(), amount, data, envelope, { gasLimit: gas * 12n / 10n, gasPrice: 1_000_000_000n });
console.log('PQ tip tx:', tx.hash);
const receipt = await tx.wait();
console.log('PQ tip receipt status:', receipt.status, 'block:', receipt.blockNumber);
for (const log of receipt.logs) {
  try {
    const ev = jar.interface.parseLog(log);
    if (ev.name === 'Tipped') console.log('Tipped event:', { tipper: ev.args.tipper, creator: ev.args.creator, nativeAmountWei: String(ev.args.ethAmount), message: ev.args.message });
  } catch { /* non-Tipped event */ }
}
console.log('Creator withdrawable wei:', String(await jar.ethBalance(creator)));
console.log('PQ account nonce:', String(await account.nonce()));
