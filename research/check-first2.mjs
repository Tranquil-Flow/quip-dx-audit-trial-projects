import { connect, loadWallet } from '../scripts/lib.mjs';
const api = await connect();
const w = loadWallet('organizer');
const code = await api.call.reviveApi.code('0x99D94fc66915F8aD2B4fdD51248E2B55ecc6dF97');
console.log('code length at first-deploy address:', code.toHex().length);
console.log('organizer balance (wei18)', (await api.call.reviveApi.balance(w.address)).toString());
console.log('gasPrice', (await api.call.reviveApi.gasPrice()).toString());
await api.disconnect();
