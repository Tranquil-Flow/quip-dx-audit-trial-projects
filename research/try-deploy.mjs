import { connect, loadWallet, loadArtifact, deploy, estimate } from '../scripts/lib.mjs';
import { Interface, keccak256, solidityPacked, parseEther } from 'ethers';
const api = await connect();
const w = loadWallet('organizer');
const art = loadArtifact();
const head = Number((await api.rpc.chain.getHeader()).number);
const secret = keccak256('0x1234');
const commit = keccak256(solidityPacked(['bytes32'], [secret]));
console.log('head', head);
try {
  const r = await deploy(api, w, art, [commit, parseEther('0.01'), head + 30, 20], parseEther('0.05'));
  console.log('deployed', r.address, r.ethTxHash, r.blockHash);
  console.log(r.events.map((e) => e.event.section + '.' + e.event.method).join(', '));
} catch (e) { console.log('ERR', e.message); }
await api.disconnect();
