import { ApiPromise, WsProvider } from '@polkadot/api';
import { readFileSync } from 'fs';
const api = await ApiPromise.create({ provider: new WsProvider('wss://bootnode-1.aglais.quip.network:20049/rpc'), noInitWarn:true });
for (const n of ['organizer','alice','bob','carol','dave']) {
  const a = JSON.parse(readFileSync(`keys/${n}.json`)).address.toLowerCase();
  const acct = a + 'ee'.repeat(12);
  const info = await api.query.system.account(acct.startsWith('0x')?acct:'0x'+acct);
  console.log(n, a, info.data.free.toString());
}
console.log('gasPrice?', Object.keys(api.call.reviveApi));
await api.disconnect();
