import { ApiPromise, WsProvider } from '@polkadot/api';
const api = await ApiPromise.create({ provider: new WsProvider('wss://bootnode-1.aglais.quip.network:20049/rpc') });
const md = api.runtimeMetadata.asLatest;
for (const p of md.pallets) {
  const calls = api.tx[p.name.toString().charAt(0).toLowerCase()+p.name.toString().slice(1)];
  console.log(p.name.toString(), calls ? Object.keys(calls).join(',') : '');
}
console.log('genesis', api.genesisHash.toHex());
await api.disconnect();
