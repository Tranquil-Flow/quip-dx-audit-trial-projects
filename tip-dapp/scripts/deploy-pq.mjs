// Deploy Quip's standalone ERC-7913 SHRINCS verifier + a deliberately minimal PQ account.
// Experimental: this is NOT the vendor's canonical Quip Account deployment.
import { readFile, writeFile } from 'node:fs/promises';
import { JsonRpcProvider, Wallet, ContractFactory, FetchRequest, getBytes } from 'ethers';
import { ShrincsSigner } from '@quip.network/ethereum-sdk/v1/shrincs';
const genesis = '0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286';
let observedGenesis;
for (let attempt = 0; attempt < 4; attempt++) {
  try {
    const response = await fetch('https://bootnode-1.aglais.quip.network:20049/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0] }) });
    observedGenesis = (await response.json()).result;
    break;
  } catch (e) { if (attempt === 3) throw e; await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); }
}
if (observedGenesis !== genesis) throw Error('Wrong Substrate genesis');
const req = new FetchRequest('https://evm-rpc.aglais.quip.network');
req.timeout = 120_000;
const p = new JsonRpcProvider(req, 20033, { staticNetwork: true });
if ((await p.send('eth_chainId', [])) !== '0x4e41') throw Error('Wrong EVM chain');
const wallet = new Wallet(JSON.parse(await readFile('keys/deployer.json', 'utf8')).privateKey, p);
const seed = JSON.parse(await readFile('keys/quip-seed.json', 'utf8')).seed;
const signer = await ShrincsSigner.create(getBytes(seed));
const keypair = signer.recoverKeyPair(0, { maxSignatures: 16 });
const commitment = keypair.publicKeyCommitment;
console.log('Quip SHRINCS public commitment:', commitment);
let state;
try { state = JSON.parse(await readFile('keys/pq-deployment.json', 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; state = {}; }
async function deploy(artifactPath, args) {
  const a = JSON.parse(await readFile(artifactPath, 'utf8'));
  const factory = new ContractFactory(a.abi, a.bytecode.object, wallet);
  const request = await factory.getDeployTransaction(...args);
  const gas = await p.estimateGas({ ...request, from: wallet.address });
  console.log('Estimated gas for', artifactPath, String(gas));
  const c = await factory.deploy(...args, { gasLimit: gas * 12n / 10n, gasPrice: 1_000_000_000n });
  console.log('Deployment tx:', c.deploymentTransaction().hash);
  await c.waitForDeployment();
  const address = await c.getAddress();
  console.log('Address:', address, 'receipt status:', (await c.deploymentTransaction().wait()).status);
  return address;
}
if (!state.verifierV4) {
  state.verifierV4 = await deploy('vendor-hashsigs-solidity/out/SHRINCS256sKeccak.sol/SHRINCS256sKeccak.json', []);
  await writeFile('keys/pq-deployment.json', JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}
if ((await p.getCode(state.verifierV4)) === '0x') throw Error('V4 verifier missing code');
if (!state.accountV4b) {
  state.accountV4b = await deploy('out/QuipTipAccount.sol/QuipTipAccount.json', [commitment, state.verifierV4]);
  await writeFile('keys/pq-deployment.json', JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}
if ((await p.getCode(state.accountV4b)) === '0x') throw Error('Final PQ account missing code');
console.log('PQ account:', state.accountV4b, 'verifier:', state.verifierV4);
