import { connect, loadWallet } from '../scripts/lib.mjs';
const api = await connect();
const w = loadWallet('organizer');
console.log('nonce', (await api.call.reviveApi.nonce(w.address)).toString(), 'bal', (await api.call.reviveApi.balance(w.address)).toString());
await api.disconnect();
