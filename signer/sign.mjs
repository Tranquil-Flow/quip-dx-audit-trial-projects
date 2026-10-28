// Throwaway testnet-only signing script for the Aglais demo.
// Generates a fresh SHRINCS key (256s-keccak profile), signs a demo message
// on the stateful path and one on the stateless (SPHINCS+C) path, verifies
// locally, and writes hex artifacts to ../keys/.
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { loadHashSigs, shrincsKeysToSecretBytes, decodeStatefulEnvelope } from "@quip.network/hashsigs-wasm";

const hex = (u8) => Buffer.from(u8).toString("hex");
const u8 = (s) => new Uint8Array(Buffer.from(s, "hex"));

const { sphincsPlusC, shrincs, profileName } = await loadHashSigs();
console.log("profile:", profileName);

// Fresh 32-byte seed for this demo only.
const seed = randomBytes(32);
const maxSignatures = 1024;
const keys = shrincs.keygen(new Uint8Array(seed), maxSignatures);
console.log("maxSignatures:", keys.stateful.publicKey.maxSignatures);

// Demo message: the 32-byte keccak256 of a domain-separated string,
// computed via `cast keccak "quip-aglais-demo|unlock|v1"` (foundry).
// On-chain the verifier receives this exact 32-byte hash as `hash`.
const MESSAGE_HASH = process.env.MSG_HASH ?? "TO_BE_SET";
if (MESSAGE_HASH.replace(/^0x/, "").length !== 64) throw new Error("MSG_HASH must be 64 hex chars");
const msgHash = u8(MESSAGE_HASH.replace(/^0x/, ""));

// Stateful (everyday path) signature.
const sigStateful = shrincs.sign(msgHash, keys);
// Stateless (break-glass / SPHINCS+C) signature.
const sigStateless = shrincs.signStateless(msgHash, keys);

const okStateful = shrincs.verify(sigStateful, msgHash, keys.publicKeyCommitment);
const okStateless = shrincs.verifyStateless(sigStateless, msgHash, keys.stateless.publicKey);
console.log("local stateful verify:", okStateful);
console.log("local stateless verify:", okStateless);
console.log("stateful sig bytes:", sigStateful.length, "stateless sig bytes:", sigStateless.length);

// Decode the stateful envelope for the record.
const parts = decodeStatefulEnvelope(sigStateful);
console.log("envelope parts:", Object.keys(parts));

const commitment = hex(keys.publicKeyCommitment);
console.log("publicKeyCommitment:", commitment);

const out = {
  seed: hex(seed),
  profile: profileName,
  message: hex(msgHash),
  messageLabel: "quip-aglais-demo|unlock|v1",
  publicKeyCommitment: commitment,
  stateful: {
    signature: hex(sigStateful),
    leafUsed: keys.stateful.nextLeafIndex, // next leaf AFTER signing (i.e. leaf used was nextLeafIndex-1)
  },
  stateless: {
    signature: hex(sigStateless),
    pkSeed: hex(keys.stateless.publicKey.pkSeed),
    root: hex(keys.stateless.publicKey.root),
  },
  secret: hex(shrincsKeysToSecretBytes(keys)), // persisted AFTER stateful sign (leaf counter advanced)
};
writeFileSync("../keys/shrincs-demo.json", JSON.stringify(out, null, 2));
writeFileSync("../keys/shrincs-secret.hex", out.secret + "\n");
console.log("wrote ../keys/shrincs-demo.json");
console.log("leaf used for stateful signature:", out.stateful.leafUsed - 1);
