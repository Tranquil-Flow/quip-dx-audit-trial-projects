import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex } from "@noble/hashes/utils";
import { loadHashSigs } from "@quip.network/hashsigs-wasm";

const hex = (b: Uint8Array) => "0x" + bytesToHex(b);
const short = (b: Uint8Array) => `${hex(b).slice(0, 18)}…`;
const timed = <T>(fn: () => T): [T, number] => {
  const t = performance.now();
  const r = fn();
  return [r, Math.round(performance.now() - t)];
};
let failures = 0;
const check = (label: string, actual: boolean, expected: boolean) => {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: verify() = ${actual} (expected ${expected})`);
};

// The library signs exactly 32 bytes, so we pre-hash. keccak-256 matches what an EVM verifier receives.
const digest = (s: string) => keccak_256(new TextEncoder().encode(s));

const { sphincsPlusC, shrincs, profileName } = await loadHashSigs();
console.log(`Quip hash-based signatures (@quip.network/hashsigs-wasm), profile: ${profileName}\n`);

const message = "Transfer 1.0 ETH to 0xAbC... (nonce 42)";
const tampered = "Transfer 9.0 ETH to 0xAbC... (nonce 42)";
const msgHash = digest(message);
const badHash = digest(tampered);
console.log(`message   : "${message}"\n  keccak256 -> ${hex(msgHash)}`);
console.log(`tampered  : "${tampered}"\n  keccak256 -> ${hex(badHash)}\n`);

// ---- 1. SPHINCS+C (stateless) ----
console.log("== SPHINCS+C (stateless) ==");
// The library has no RNG: a weak seed is a weak key, so use the OS CSPRNG.
const seed = randomBytes(32);
const [keys, tKeygen] = timed(() => sphincsPlusC.keygen(seed));
console.log(`  keygen  ${tKeygen} ms   pk.pkSeed=${short(keys.publicKey.pkSeed)} pk.root=${short(keys.publicKey.root)}`);
const [sig, tSign] = timed(() => sphincsPlusC.sign(msgHash, keys));
console.log(`  sign    ${tSign} ms   signature = ${sig.length} bytes`);
check("valid message", sphincsPlusC.verify(sig, msgHash, keys.publicKey), true);
check("tampered message", sphincsPlusC.verify(sig, badHash, keys.publicKey), false);
const flipped = Uint8Array.from(sig);
flipped[Math.floor(flipped.length / 2)] ^= 0x01;
check("tampered signature (1 bit flipped)", sphincsPlusC.verify(flipped, msgHash, keys.publicKey), false);
const other = sphincsPlusC.keygen(randomBytes(32));
check("wrong public key", sphincsPlusC.verify(sig, msgHash, other.publicKey), false);

// ---- 2. SHRINCS (Quip's hybrid account key: stateful fast path + stateless recovery) ----
console.log("\n== SHRINCS (hybrid; stateful signing consumes a one-time leaf) ==");
const [sk, tSk] = timed(() => shrincs.keygen(randomBytes(32), 16));
console.log(`  keygen  ${tSk} ms   commitment = ${hex(sk.publicKeyCommitment)}  (leaves: ${sk.stateful.remaining})`);
const [ssig, tSs] = timed(() => shrincs.sign(msgHash, sk));
console.log(`  sign    ${tSs} ms   signature = ${ssig.length} bytes  (leaves left: ${sk.stateful.remaining}, next index ${sk.stateful.nextLeafIndex})`);
check("valid message", shrincs.verify(ssig, msgHash, sk.publicKeyCommitment), true);
check("tampered message", shrincs.verify(ssig, badHash, sk.publicKeyCommitment), false);
check("wrong commitment", shrincs.verify(ssig, msgHash, keccak_256(sk.publicKeyCommitment)), false);
const rec = shrincs.signStateless(msgHash, sk);
check("stateless recovery path, valid", shrincs.verifyStateless(rec, msgHash, sk.stateless.publicKey), true);
check("stateless recovery path, tampered", shrincs.verifyStateless(rec, badHash, sk.stateless.publicKey), false);

// Only public material is written; secret keys are ephemeral (in-memory) in this demo.
mkdirSync("keys", { recursive: true });
writeFileSync(
  "keys/demo-public.json",
  JSON.stringify(
    {
      profile: profileName,
      sphincsPlusC: { pkSeed: hex(keys.publicKey.pkSeed), root: hex(keys.publicKey.root) },
      shrincsCommitment: hex(sk.publicKeyCommitment),
    },
    null,
    2,
  ) + "\n",
);

console.log(failures === 0 ? "\nAll checks behaved as expected: valid signatures verify, tampering is rejected." : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
