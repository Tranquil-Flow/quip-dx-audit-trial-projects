import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
const pk = generatePrivateKey(); const a = privateKeyToAccount(pk);
fs.writeFileSync('../keys/evm-throwaway.json', JSON.stringify({ note: 'THROWAWAY Aglais testnet key, created 2026-09-28 for Quip eval', address: a.address, privateKey: pk }, null, 2));
console.log(a.address);
