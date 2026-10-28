// Deploy the unchanged TipJar using a new throwaway EOA, not a default/home keystore.
import { readFile, writeFile } from 'node:fs/promises';
import { JsonRpcProvider, Wallet, ContractFactory } from 'ethers';
const EVM_RPC = 'https://evm-rpc.aglais.quip.network';
const SUBSTRATE_RPC = 'https://bootnode-1.aglais.quip.network:20049/rpc';
const GENESIS = '0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286';
const response = await fetch(SUBSTRATE_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0] }) });
if ((await response.json()).result !== GENESIS) throw Error('Substrate genesis mismatch; refusing to sign');
const provider = new JsonRpcProvider(EVM_RPC, 20033, { staticNetwork: true });
if ((await provider.send('eth_chainId', [])) !== '0x4e41') throw Error('EVM chain ID mismatch; refusing to sign');
const { privateKey } = JSON.parse(await readFile('keys/deployer.json', 'utf8'));
const wallet = new Wallet(privateKey, provider);
const artifact = JSON.parse(await readFile('out/TipJar.sol/TipJar.json', 'utf8'));
const factory = new ContractFactory(artifact.abi, artifact.bytecode.object, wallet);
const request = await factory.getDeployTransaction();
console.log('Sender:', wallet.address, 'balance:', String(await provider.getBalance(wallet.address)));
const deploymentGas = await provider.estimateGas({ ...request, from: wallet.address });
console.log('Deployment estimate:', String(deploymentGas));
if (process.argv.includes('--estimate-only')) process.exit(0);
// pallet-revive maps contract operations to much larger EVM gas numbers than on Base.
const contract = await factory.deploy({ gasLimit: deploymentGas * 12n / 10n, gasPrice: 1_000_000_000n });
console.log('Deployment tx:', contract.deploymentTransaction().hash);
await contract.waitForDeployment();
const address = await contract.getAddress();
console.log('TipJar address:', address);
console.log('Deployment receipt status:', (await contract.deploymentTransaction().wait()).status);
console.log('On-chain bytecode length:', (await provider.getCode(address)).length);
await writeFile('web/deployment.json', JSON.stringify({ chainId: 20033, tipJar: address }, null, 2) + '\n');
console.log('Public frontend deployment config updated: web/deployment.json');
