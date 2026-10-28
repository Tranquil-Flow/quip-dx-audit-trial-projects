import { connect, headNumber } from '../scripts/lib.mjs';
const api = await connect();
const head = await headNumber(api);
let total = 0, bare = 0, general = 0, signed = 0;
for (let n = head - 40; n <= head; n++) {
  const bh = await api.rpc.chain.getBlockHash(n);
  const raw = await api.wsProvider.send('chain_getBlock', [bh.toHex()]);
  const ex = raw.block.extrinsics;
  total += ex.length;
  for (const x of ex) {
    // strip compact length prefix: find version byte
    const b = Buffer.from(x.slice(2), 'hex');
    let off = b[0] & 3 === 0 ? 1 : (b[0] & 3) === 1 ? 2 : (b[0] & 3) === 2 ? 4 : 5;
    const v = b[off];
    if (v === 0x04) bare++; else if (v === 0x45) general++; else if (v === 0x84) signed++;
  }
}
console.log({ head, blocks: 41, total, bare, general, signed });
await api.disconnect();
