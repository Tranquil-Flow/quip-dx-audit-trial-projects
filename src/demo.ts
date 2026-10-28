/**
 * Quip Network post-quantum (hash-based) signature demo.
 *
 * Uses the official Quip Network SHRINCS implementation shipped as WebAssembly:
 *   @quip.network/hashsigs-wasm  (profile: shrincs-256s-keccak)
 * The same construction is verified on-chain by the Solidity / Solana verifiers
 * in the QuipNetwork/hashsigs-* repos.
 *
 * SHRINCS is a two-path hash-based scheme (ePrint 2025/2203, appendix):
 *   - stateful path  -> fast, bounded UXMSS / WOTS-C one-time leaves (normal ops)
 *   - stateless path -> unbounded SPHINCS+C recovery signatures (break-glass)
 *
 * This demo:
 *   1. generates a brand-new SHRINCS keypair from fresh OS entropy
 *   2. signs a message digest
 *   3. verifies the signature (must pass)
 *   4. tampers with the message / signature / key and shows verification FAILS
 *
 * NOTE: like every signature scheme, SHRINCS signs a fixed-size 32-byte digest,
 * not the raw text. We hash the human-readable message to a 32-byte digest with
 * keccak-256 (the EVM hash) and sign that digest.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { keccak_256 } from "@noble/hashes/sha3";
import {
  loadHashSigs,
  loadShrincsWasm,
  shrincsKeysToSecretBytes,
  type ShrincsKeys,
} from "@quip.network/hashsigs-wasm/256s-keccak";

const KEYS_DIR = join(process.cwd(), "keys");

const toHex = (b: Uint8Array): string => "0x" + Buffer.from(b).toString("hex");
const short = (b: Uint8Array, n = 8): string =>
  `${toHex(b.slice(0, n))}…(${b.length} bytes)`;
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
/** keccak-256 of a UTF-8 string -> the 32-byte digest we actually sign. */
const digest = (s: string): Uint8Array => keccak_256(utf8(s));

// ---------- tiny assertion harness (real evidence, not prose) ----------------
let passed = 0;
let failed = 0;
function check(label: string, got: unknown, want: unknown): void {
  const ok = got === want;
  ok ? passed++ : failed++;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`   [${mark}] ${label}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
}
function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function main(): Promise<void> {
  mkdirSync(KEYS_DIR, { recursive: true });

  // -- 1. load the wasm -------------------------------------------------------
  section("1. Load Quip SHRINCS wasm");
  const raw = await loadShrincsWasm();
  const { shrincs, sphincsPlusC, shrincsImportSigningKey, profileName } =
    await loadHashSigs();
  console.log(`   wasm version : ${raw.version()}`);
  console.log(`   profile      : ${profileName}`);
  console.log(`   (signatures from one profile do NOT verify under another)`);

  // -- 2. generate a BRAND-NEW throwaway keypair ------------------------------
  section("2. Generate a post-quantum keypair (fresh throwaway key)");
  // The wasm build deliberately has no RNG: we supply 32 bytes of fresh OS entropy.
  const seed = new Uint8Array(randomBytes(32));
  const keys: ShrincsKeys = shrincs.keygen(seed, 16); // maxSignatures=16 (<=4096)
  const commitment = keys.publicKeyCommitment;

  console.log(`   key fingerprint (seed)   : ${short(seed)}`);
  console.log(`   publicKeyCommitment      : ${toHex(commitment)}`);
  console.log(`   stateless pkSeed         : ${short(keys.stateless.publicKey.pkSeed)}`);
  console.log(`   stateless root           : ${short(keys.stateless.publicKey.root)}`);
  console.log(`   stateful leaves remaining: ${keys.stateful.remaining}/${keys.stateful.publicKey.maxSignatures}`);

  // Persist the throwaway key material in ./keys (never used on mainnet).
  const secret = shrincsKeysToSecretBytes(keys);
  writeFileSync(join(KEYS_DIR, "shrincs-demo-signing-key.hex"), toHex(secret) + "\n");
  writeFileSync(
    join(KEYS_DIR, "shrincs-demo-public.json"),
    JSON.stringify(
      {
        profile: profileName,
        publicKeyCommitment: toHex(commitment),
        statelessPublicKey: {
          pkSeed: toHex(keys.stateless.publicKey.pkSeed),
          root: toHex(keys.stateless.publicKey.root),
        },
        maxSignatures: keys.stateful.publicKey.maxSignatures,
        note: "throwaway demo key - generated locally, no mainnet, no funds",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`   saved secret  -> ${join(KEYS_DIR, "shrincs-demo-signing-key.hex")}`);
  console.log(`   saved public  -> ${join(KEYS_DIR, "shrincs-demo-public.json")}`);

  // -- 3. the message ---------------------------------------------------------
  section("3. Message to sign");
  const message = "EVM dApp action: transfer 1.00 ETH to 0x1111...1111 (nonce 7)";
  const msgDigest = digest(message);
  console.log(`   message      : "${message}"`);
  console.log(`   keccak-256   : ${toHex(msgDigest)}  (32-byte digest that gets signed)`);

  // -- 4. sign (stateful path) ------------------------------------------------
  section("4. Sign with the stateful SHRINCS path");
  const t0 = performance.now();
  const signature = shrincs.sign(msgDigest, keys);
  const signMs = (performance.now() - t0).toFixed(1);
  console.log(`   signature    : ${signature.length} bytes in ${signMs} ms`);
  console.log(`   sig prefix   : ${short(signature, 16)}`);
  console.log(`   leaves now   : ${keys.stateful.remaining} remaining (advanced in place)`);

  // -- 5. verify --------------------------------------------------------------
  section("5. Verify the genuine signature (expect PASS)");
  check("shrincs.verify(sig, msg, commitment)", shrincs.verify(signature, msgDigest, commitment), true);

  // -- 6. TAMPER with the message --------------------------------------------
  section("6. Tamper with the message (expect verification to FAIL)");
  const tamperedMessage = "EVM dApp action: transfer 1.00 ETH to 0xBAD0...BAD0 (nonce 7)";
  const tamperedDigest = digest(tamperedMessage);
  console.log(`   original : "${message}"`);
  console.log(`   tampered : "${tamperedMessage}"`);
  console.log(`   digest original: ${toHex(msgDigest)}`);
  console.log(`   digest tampered: ${toHex(tamperedDigest)}`);
  check("shrincs.verify(sig, TAMPERED msg, commitment)", shrincs.verify(signature, tamperedDigest, commitment), false);

  // -- 7. TAMPER with the signature ------------------------------------------
  section("7. Tamper with the signature bytes (expect FAIL)");
  const badSig = Uint8Array.from(signature);
  badSig[badSig.length - 1] ^= 0x01; // flip one bit
  console.log(`   flipped last bit of the ${badSig.length}-byte signature`);
  check("shrincs.verify(TAMPERED sig, msg, commitment)", shrincs.verify(badSig, msgDigest, commitment), false);

  // -- 8. WRONG key -----------------------------------------------------------
  section("8. Verify against a different keypair's commitment (expect FAIL)");
  const otherKeys = shrincs.keygen(new Uint8Array(randomBytes(32)), 4);
  console.log(`   other commitment: ${toHex(otherKeys.publicKeyCommitment)}`);
  check("shrincs.verify(sig, msg, OTHER commitment)", shrincs.verify(signature, msgDigest, otherKeys.publicKeyCommitment), false);

  // -- 9. stateless recovery path --------------------------------------------
  section("9. Stateless (SPHINCS+C) recovery path — same guarantees");
  const sSig = shrincs.signStateless(msgDigest, keys);
  console.log(`   stateless sig: ${sSig.length} bytes`);
  check(
    "shrincs.verifyStateless(sig, msg, stateless pk)",
    shrincs.verifyStateless(sSig, msgDigest, keys.stateless.publicKey),
    true,
  );
  check(
    "shrincs.verifyStateless(sig, TAMPERED msg, stateless pk)",
    shrincs.verifyStateless(sSig, tamperedDigest, keys.stateless.publicKey),
    false,
  );
  // sphincsPlusC is the same stateless scheme exposed directly.
  const sp = sphincsPlusC.keygen(new Uint8Array(randomBytes(32)));
  const spSig = sphincsPlusC.sign(msgDigest, sp);
  check("sphincsPlusC.verify(genuine)", sphincsPlusC.verify(spSig, msgDigest, sp.publicKey), true);
  check("sphincsPlusC.verify(tampered msg)", sphincsPlusC.verify(spSig, tamperedDigest, sp.publicKey), false);

  // -- 10. key persistence round-trip ----------------------------------------
  section("10. Persist / re-import the secret key round-trip");
  const reimported = shrincsImportSigningKey(secret);
  check(
    "re-imported commitment matches original",
    toHex(reimported.publicKeyCommitment),
    toHex(commitment),
  );
  console.log(`   secret key   : ${secret.length} bytes (flat SHRINCS secret)`);
  console.log(`   re-signed sig still verifies: ` +
    shrincs.verify(shrincs.sign(msgDigest, reimported), msgDigest, commitment));

  // -- summary ----------------------------------------------------------------
  section("SUMMARY");
  console.log(`   checks passed: ${passed}`);
  console.log(`   checks failed: ${failed}`);
  if (failed > 0) {
    console.error("\nRESULT: FAILED — a post-quantum signature check did not behave as expected.");
    process.exit(1);
  }
  console.log("\nRESULT: OK — post-quantum sign/verify works and tampering is rejected.");
}

main().catch((err) => {
  console.error("\nDEMO ERROR:", err);
  process.exit(1);
});
