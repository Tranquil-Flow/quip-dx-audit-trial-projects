// demo/deterministic.mjs — same seed + same nonce → same signature.
//
// signDeterministic proves that two processes signing the same payload with
// the same seed and the same nonce produce byte-identical signatures. That
// is a stronger interop property than the basic sign/verify roundtrip.

import {
  buildCanonicalRequestBytes,
  keygenFromSeed,
  signDeterministic,
  verify,
} from "../src/lib.mjs";

const seed = new Uint8Array(32);
crypto.getRandomValues(seed);
const nonce = new Uint8Array(32);
crypto.getRandomValues(nonce);
const req = {
  method: "POST",
  path: "/v1/x",
  body: null,
  timestamp: "2026-09-29T12:00:00.000Z",
  nonce: "n-1",
};
const canonical = buildCanonicalRequestBytes(req);
const ctx = "deterministic-demo";

function toHex(u8) {
  return Buffer.from(u8).toString("hex");
}

// Process A: derive key + sign.
const A = await keygenFromSeed("ED-ML-44", seed);
const sigA = await signDeterministic("ED-ML-44", A.secretKey, canonical, ctx, nonce);

// Process B: derive key + sign — fresh Uint8Arrays, different memory, same bytes.
const seedCopy = new Uint8Array(seed);
const nonceCopy = new Uint8Array(nonce);
const canonicalCopy = new Uint8Array(canonical);
const B = await keygenFromSeed("ED-ML-44", seedCopy);
const sigB = await signDeterministic("ED-ML-44", B.secretKey, canonicalCopy, ctx, nonceCopy);

console.log("seed A     :", toHex(seed).slice(0, 16), "...");
console.log("seed B     :", toHex(seedCopy).slice(0, 16), "...");
console.log("nonce      :", toHex(nonce).slice(0, 16), "...");
console.log("pub A      :", toHex(A.publicKey).slice(0, 32), "...");
console.log("pub B      :", toHex(B.publicKey).slice(0, 32), "...");
console.log("sig A      :", toHex(sigA).slice(0, 32), "...", sigA.length, "B");
console.log("sig B      :", toHex(sigB).slice(0, 32), "...", sigB.length, "B");

const pubEq = Buffer.compare(Buffer.from(A.publicKey), Buffer.from(B.publicKey)) === 0;
const sigEq = Buffer.compare(Buffer.from(sigA), Buffer.from(sigB)) === 0;
console.log("pub equal  :", pubEq);
console.log("sig equal  :", sigEq);

// Verify both with the public key.
const vA = await verify("ED-ML-44", A.publicKey, canonical, ctx, sigA);
const vB = await verify("ED-ML-44", A.publicKey, canonical, ctx, sigB);
console.log("verify(sigA):", vA);
console.log("verify(sigB):", vB);

if (!(pubEq && sigEq && vA && vB)) process.exit(1);
console.log("deterministic interop OK");