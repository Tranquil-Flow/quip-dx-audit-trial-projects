import { connect } from '../scripts/lib.mjs';
import { readFileSync } from 'fs';
const ev = JSON.parse(readFileSync('evidence/raffle-run.json'));
const api = await connect();
const db = ev.txs.closeEntries.drawBlock;
const sub = (await api.rpc.chain.getBlockHash(db)).toHex();
let eth = 'n/a'; try { eth = (await api.call.reviveApi.ethBlockHash(db)).toString(); } catch (e) { eth = 'ERR ' + e.message.slice(0,80); }
console.log('drawBlock', db);
console.log('contract usedBlockHash  ', ev.result.blockHashUsed);
console.log('substrate hash of block ', sub);
console.log('reviveApi.ethBlockHash  ', eth);
for (const a of ev.result.entrants) console.log('balance', a, (await api.call.reviveApi.balance(a)).toString());
console.log('contract balance', (await api.call.reviveApi.balance(ev.contract)).toString());
await api.disconnect();
