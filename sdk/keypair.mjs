import { ShrincsSigner } from "@quip.network/ethereum-sdk/v1/shrincs";
import fs from 'fs';
const mnemonic = fs.readFileSync('../keys/shrincs-throwaway-mnemonic.txt','utf8').split('\n')[0];
const signer = await ShrincsSigner.fromMnemonic(mnemonic, { passphrase: "optional" });
let t = Date.now();
try { console.log('selfTest:', await signer.runSelfTest(), (Date.now()-t)+'ms'); } catch (e) { console.log('selfTest err:', e.message); }
for (const [label, fn] of [
  ['recoverKeyPair(0,{maxSignatures:256})', () => signer.recoverKeyPair(0, { maxSignatures: 256 })],
  ['deriveKeyPair({statefulIndex:1,statelessIndex:0,maxSignatures:4096})', () => signer.deriveKeyPair({ statefulIndex: 1, statelessIndex: 0, maxSignatures: 4096 })],
]) {
  t = Date.now();
  try { const kp = await fn(); const pub = kp.publicKey ?? kp.pk ?? kp;
    console.log(label, 'OK', (Date.now()-t)+'ms', 'fields:', Object.keys(kp).join(','));
    if (kp.publicKey) console.log('  publicKey fields:', Object.keys(kp.publicKey).map(k=>k+'='+String(kp.publicKey[k]).slice(0,70)).join('\n   '));
  } catch (e) { console.log(label, 'ERR', e.constructor.name, e.message); }
}
