import { loadHashSigs } from '@quip.network/hashsigs-wasm';
const h = b => Buffer.from(b).toString('hex');
const { shrincs } = await loadHashSigs();
const k = shrincs.keygen(crypto.getRandomValues(new Uint8Array(32)));
const d = crypto.getRandomValues(new Uint8Array(32)); const s = shrincs.sign(d, k);
const post = (digest) => fetch('http://localhost:3111/api/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({digest:h(digest),signature:h(s),publicKeyCommitment:h(k.publicKeyCommitment)})}).then(r=>r.json());
console.log('valid', await post(d)); console.log('tampered digest', await post(crypto.getRandomValues(new Uint8Array(32))));
