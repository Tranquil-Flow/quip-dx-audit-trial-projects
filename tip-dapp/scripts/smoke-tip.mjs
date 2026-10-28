// Testnet smoke tip via the fresh funding EOA. This does NOT claim post-quantum signing.
import { readFile } from 'node:fs/promises';
import { Contract, Interface, JsonRpcProvider, Wallet, parseEther } from 'ethers';
const rpc = 'https://evm-rpc.aglais.quip.network';
const g = await fetch('https://bootnode-1.aglais.quip.network:20049/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'chain_getBlockHash', params: [0] }) });
if ((await g.json()).result !== '0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286') throw Error('Wrong genesis');
const p = new JsonRpcProvider(rpc, 20033, { staticNetwork: true });
if ((await p.send('eth_chainId', [])) !== '0x4e41') throw Error('Wrong chain');
const w = new Wallet(JSON.parse(await readFile('keys/deployer.json', 'utf8')).privateKey, p);
const creator = new Wallet(JSON.parse(await readFile('keys/creator.json', 'utf8')).privateKey).address;
const deployment = JSON.parse(await readFile('web/deployment.json', 'utf8'));
if (deployment.chainId !== 20033) throw Error('Deployment config chain mismatch');
if ((await p.getCode(deployment.tipJar)) === '0x') throw Error('TipJar not deployed');
const artifact = JSON.parse(await readFile('out/TipJar.sol/TipJar.json', 'utf8'));
const jar = new Contract(deployment.tipJar, artifact.abi, w);
const value = parseEther('0.001');
const args = [creator, '0x0000000000000000000000000000000000000000', 0n, 'Aglais testnet smoke tip'];
const estimate = await jar.tip.estimateGas(...args, { value });
console.log('Tip gas estimate:', String(estimate));
const tx = await jar.tip(...args, { value, gasLimit: estimate * 12n / 10n, gasPrice: 1_000_000_000n });
console.log('Tip tx:', tx.hash);
const receipt = await tx.wait();
console.log('Tip receipt status:', receipt.status, 'block:', receipt.blockNumber);
for (const log of receipt.logs) {
  try {
    const event = jar.interface.parseLog(log);
    if (event.name === 'Tipped') console.log('Tipped event:', { tipper: event.args.tipper, creator: event.args.creator, nativeAmountWei: String(event.args.ethAmount), message: event.args.message });
  } catch { /* unrelated log */ }
}
console.log('Creator withdrawable wei:', String(await jar.ethBalance(creator)));
