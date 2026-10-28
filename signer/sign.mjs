// Generates a throwaway SHRINCS key (kept in ../keys) and a raw stateful signature at leaf 1 over a fixed hash.
import { loadHashSigs, shrincsKeysToSecretBytes } from "@quip.network/hashsigs-wasm";
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
const { shrincs, shrincsImportSigningKey, profileName } = await loadHashSigs();
const keyFile = "../keys/shrincs-secret.hex";
let keys;
if (existsSync(keyFile)) keys = shrincsImportSigningKey(Buffer.from(readFileSync(keyFile, "utf8").trim(), "hex"));
else { keys = shrincs.keygen(randomBytes(32), 16); writeFileSync(keyFile, Buffer.from(shrincsKeysToSecretBytes(keys)).toString("hex"), { mode: 0o600 }); }
const leaf = Number(process.argv[2] ?? 1);
const msg = createHash("sha256").update(process.argv[3] ?? "hello aglais").digest(); // any 32-byte hash
const sig = shrincs.signStatefulRawAt(msg, keys, leaf);
console.error("profile", profileName, "sig bytes", sig.length, "local verifyRaw", shrincs.verifyStatefulRaw(sig, msg, keys.publicKeyCommitment));
console.log(JSON.stringify({ key: "0x" + Buffer.from(keys.publicKeyCommitment).toString("hex"), hash: "0x" + msg.toString("hex"), sig: "0x" + Buffer.from(sig).toString("hex"), leaf }));
