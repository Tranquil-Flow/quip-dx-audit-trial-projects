import { connect } from '../scripts/lib.mjs';
import { blake2AsHex } from '@polkadot/util-crypto';
const api = await connect();
const p = await api.wsProvider.send('author_pendingExtrinsics', []);
console.log('pending count', p.length);
for (const x of p) console.log(blake2AsHex(x,256), x.length, x.slice(0,30));
const h = await api.rpc.chain.getHeader();
console.log('head', h.number.toString());
await api.disconnect();
