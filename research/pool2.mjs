import { connect } from '../scripts/lib.mjs';
import { blake2AsHex } from '@polkadot/util-crypto';
const api = await connect();
const p = await api.wsProvider.send('author_pendingExtrinsics', []);
const eth = p.filter((x) => x.startsWith('0x') && x.slice(6, 12) === '040e00'.slice(0, 6) || x.includes('040e00'));
console.log('pending', p.length, 'bare-revive-ish', eth.length);
for (const x of eth.filter((x)=>x.length>6000)) console.log(blake2AsHex(x,256), x.length);
await api.disconnect();
