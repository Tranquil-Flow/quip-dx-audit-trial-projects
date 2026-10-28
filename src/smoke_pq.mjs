// Smoke test: real Quip SHRINCS (hashsigs-wasm, profile 256s-keccak)
import { loadHashSigs } from "@quip.network/hashsigs-wasm";
import { randomBytes, createHash, webcrypto } from "node:crypto";

const { shrincs, sphincsPlusC, profileName } = await loadHashSigs();
// profileName is exported at root? fall back
console.log("loaded profile:", profileName ?? "(root name n/a)");

const seed = new Uint8Array(randomBytes(32));
const t0 = Date.now();
const keys = shrincs.keygen(seed, 8); // tiny leaf budget for speed
console.log("keygen ms:", Date.now() - t0);
console.log("publicKeyCommitment:", Buffer.from(keys.publicKeyCommitment).toString("hex"));

const msg = new Uint8Array(createHash("sha256").update("otc-order-1").digest());
const t1 = Date.now();
const sig = shrincs.sign(msg, keys);
console.log("sign ms:", Date.now() - t1);
console.log("sig len bytes:", sig.length);

const ok = shrincs.verify(sig, msg, keys.publicKeyCommitment);
console.log("verify(commitment path):", ok);

const bad = new Uint8Array(msg); bad[0] ^= 1;
console.log("verify wrong msg:", shrincs.verify(sig, bad, keys.publicKeyCommitment));

const raw = shrincs.signStateless(msg, keys);
console.log("stateless len:", raw.length, "verifyStateless:", shrincs.verifyStateless(raw, msg, keys.stateless.publicKey));

// leaf consumption behaviour
console.log("nextLeafIndex after 1 sign:", keys.stateful.nextLeafIndex, "remaining:", keys.stateful.remaining);
