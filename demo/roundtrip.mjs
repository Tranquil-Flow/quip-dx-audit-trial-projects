// demo/roundtrip.mjs — single-process roundtrip sanity check.
//
// Generates a fresh throwaway key, signs a canonical request, verifies it,
// and exits 0 on success, 1 on failure. This is the smoke test for the
// library before we wire up real cross-process interop.

import {
  DEFAULT_SUITE,
  buildCanonicalRequestBytes,
  buildSignedRequest,
  keygenFromSeed,
  sign,
  verify,
} from "../src/lib.mjs";

const suite = DEFAULT_SUITE;
const seed = new Uint8Array(32);
crypto.getRandomValues(seed);
const { publicKey, secretKey } = await keygenFromSeed(suite, seed);

const req = {
  method: "POST",
  path: "/v1/orders",
  body: '{"sku":"QUIP-001","qty":3}',
  timestamp: new Date().toISOString(),
  nonce: "n-" + crypto.randomUUID(),
};
const canonical = buildCanonicalRequestBytes(req);
const ctx = "roundtrip-demo";
const sigBytes = await sign(suite, secretKey, canonical, ctx);
const env = buildSignedRequest({ suite, ctx, canonicalBytes: canonical, signature: sigBytes, publicKey });

const ok = await verify(suite, publicKey, canonical, ctx, sigBytes);

console.log("suite        :", suite);
console.log("ctx          :", ctx);
console.log("method       :", req.method, req.path);
console.log("canonical    :", canonical.length, "bytes ->", new TextDecoder().decode(canonical));
console.log("signature    :", sigBytes.length, "bytes");
console.log("publicKey    :", publicKey.length, "bytes");
console.log("envelope keys:", Object.keys(env).join(","));
console.log("verify       :", ok);
if (!ok) process.exit(1);