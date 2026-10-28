import { ShrincsSigner, generateMnemonic } from "@quip.network/ethereum-sdk/v1/shrincs";
import fs from 'fs';
const mnemonic = generateMnemonic(); // 12 words; generateMnemonic(256) for 24
const t0 = Date.now();
const signer = await ShrincsSigner.fromMnemonic(mnemonic, { passphrase: "optional" });
console.log('signer created in', Date.now()-t0, 'ms; keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(signer)).join(', '));
fs.writeFileSync('../keys/shrincs-throwaway-mnemonic.txt', mnemonic + '\n# THROWAWAY test mnemonic, passphrase "optional", created 2026-09-28\n');
