import { connect, loadWallet, estimate } from '../scripts/lib.mjs';
import { readFileSync } from 'fs';
import { Interface } from 'ethers';
const api = await connect();
const w = loadWallet('organizer');
const head = Number((await api.rpc.chain.getHeader()).number);
for (const [n, args] of [['A', []], ['B', [5]], ['C', [head + 100]], ['D', []]]) {
  const art = JSON.parse(readFileSync(`research/mini/out/Mini.sol/${n}.json`));
  const data = art.bytecode.object + new Interface(art.abi).encodeDeploy(args).slice(2);
  try { console.log(n, 'gas', (await estimate(api, { from: w.address, data })).toString()); }
  catch (e) { console.log(n, 'ERR', e.message.slice(0, 200)); }
}
await api.disconnect();
