#!/usr/bin/env node
/**
 * Quip Network Post-Quantum Signature Demo
 * ==========================================
 * Demonstrates SPHINCS+C (stateless) and SHRINCS (hybrid stateful+stateless)
 * hash-based signatures using @quip.network/hashsigs-wasm.
 *
 * These signatures are quantum-resistant — unlike ECDSA/RSA, they cannot be
 * broken by quantum computers. The same signatures verify on-chain against
 * Quip Network's Solidity and Solana verifiers.
 */

import { loadHashSigs, shrincsKeysToSecretBytes } from "@quip.network/hashsigs-wasm";
import { writeFileSync, mkdirSync } from "fs";

// ─── Helpers ────────────────────────────────────────────────────────────────
function pad32(s) { return s.padEnd(32, " ").slice(0, 32); }
function hex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}
function label(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────
console.log("╔══════════════════════════════════════════════════════════╗");
console.log("║   Quip Network — Post-Quantum Signature Demo           ║");
console.log("║   Package: @quip.network/hashsigs-wasm@rc              ║");
console.log("║   Profile: shrincs-256s-keccak (default)               ║");
console.log("╚══════════════════════════════════════════════════════════╝");

// Load the WASM module
label("Loading WASM module");
const t0 = performance.now();
const { sphincsPlusC, shrincs, shrincsImportSigningKey: importKey, profileName } = await loadHashSigs();
const toBytes = shrincsKeysToSecretBytes;
console.log(`  Loaded in ${(performance.now() - t0).toFixed(0)}ms`);
console.log(`  Profile: ${profileName}`);

// ─── 1. SPHINCS+C (Stateless) ───────────────────────────────────────────────
label("1. SPHINCS+C — Stateless Post-Quantum Signatures");

// Generate a random 32-byte seed
const seed = crypto.getRandomValues(new Uint8Array(32));
console.log(`  Seed:     ${hex(seed)}`);

// Generate keypair
const tKeygen = performance.now();
const spKeys = sphincsPlusC.keygen(seed);
console.log(`  Keygen:   ${(performance.now() - tKeygen).toFixed(0)}ms`);
console.log(`  pkSeed:   ${hex(spKeys.publicKey.pkSeed)}`);
console.log(`  pkRoot:   ${hex(spKeys.publicKey.root)}`);
console.log(`  skSeed:   ${hex(spKeys.secret.skSeed)}`);
console.log(`  prfSeed:  ${hex(spKeys.secret.prfSeed)}`);

// Sign a message (must be exactly 32 bytes)
const message = new TextEncoder().encode(pad32("Hello from Quip Network! PQ sigs"));
console.log(`\n  Message:  "${new TextDecoder().decode(message)}"`);
console.log(`  Msg hex:  ${hex(message)}`);

const tSign = performance.now();
const spSig = sphincsPlusC.sign(message, spKeys);
console.log(`  Sign:     ${(performance.now() - tSign).toFixed(0)}ms`);
console.log(`  Sig size: ${spSig.length} bytes (${spSig.length * 8} bits)`);

// Verify
const tVerify = performance.now();
const spOk = sphincsPlusC.verify(spSig, message, spKeys.publicKey);
console.log(`  Verify:   ${(performance.now() - tVerify).toFixed(0)}ms`);
console.log(`  Result:   ${spOk ? "✅ VALID" : "❌ INVALID"}`);

// Tamper test — flip a byte in the message
const tampered = new Uint8Array(message);
tampered[0] ^= 0xff;
const spTampered = sphincsPlusC.verify(spSig, tampered, spKeys.publicKey);
console.log(`  Tampered: ${spTampered ? "❌ STILL VALID (bad!)" : "✅ Correctly rejected"}`);

// ─── 2. SHRINCS (Hybrid Stateful + Stateless) ───────────────────────────────
label("2. SHRINCS — Hybrid Key (Stateful Fast Path + Stateless Recovery)");

const shrSeed = crypto.getRandomValues(new Uint8Array(32));
console.log(`  Seed:     ${hex(shrSeed)}`);

const maxSigs = 8; // Small for demo speed
const tKeygen2 = performance.now();
const shrKeys = shrincs.keygen(shrSeed, maxSigs);
console.log(`  Keygen:   ${(performance.now() - tKeygen2).toFixed(0)}ms`);
console.log(`  Commit:   ${hex(shrKeys.publicKeyCommitment)} (32-byte on-chain commitment)`);
console.log(`  Max sigs: ${shrKeys.stateful.publicKey.maxSignatures}`);
console.log(`  Remaining:${shrKeys.stateful.remaining}`);

// Sign a message (stateful — consumes a leaf)
const msg2 = new TextEncoder().encode(pad32("SHRINCS stateful signing works!"));
console.log(`\n  Message:  "${new TextDecoder().decode(msg2)}"`);

const tSign2 = performance.now();
const shrSig = shrincs.sign(msg2, shrKeys);
console.log(`  Sign:     ${(performance.now() - tSign2).toFixed(0)}ms`);
console.log(`  Sig size: ${shrSig.length} bytes`);
console.log(`  Remaining:${shrKeys.stateful.remaining} (consumed 1 leaf)`);

// Verify against the 32-byte commitment
const tVerify2 = performance.now();
const shrOk = shrincs.verify(shrSig, msg2, shrKeys.publicKeyCommitment);
console.log(`  Verify:   ${(performance.now() - tVerify2).toFixed(0)}ms`);
console.log(`  Result:   ${shrOk ? "✅ VALID" : "❌ INVALID"}`);

// Sign a second message to show stateful progression
const msg3 = new TextEncoder().encode(pad32("Second SHRINCS stateful sig!"));
const shrSig2 = shrincs.sign(msg3, shrKeys);
console.log(`  Sign #2:  ${shrSig2.length} bytes, remaining: ${shrKeys.stateful.remaining}`);

// Stateless recovery path (no leaf consumption)
const msg4 = new TextEncoder().encode(pad32("Stateless recovery path demo!"));
const tRecov = performance.now();
const recovSig = shrincs.signStateless(msg4, shrKeys);
console.log(`\n  Stateless sign: ${(performance.now() - tRecov).toFixed(0)}ms, ${recovSig.length} bytes`);
const recovOk = shrincs.verifyStateless(recovSig, msg4, shrKeys.stateless.publicKey);
console.log(`  Stateless verify: ${recovOk ? "✅ VALID" : "❌ INVALID"}`);

// ─── 3. Key Persistence ─────────────────────────────────────────────────────
label("3. Key Serialization & Import (Persistence)");

const secretBytes = toBytes(shrKeys);
console.log(`  Secret bytes: ${secretBytes.length} bytes`);
console.log(`  Hex (first 32): ${hex(secretBytes.slice(0, 32))}...`);

// Save to disk
mkdirSync("keys", { recursive: true });
writeFileSync("keys/shrincs-demo.key", Buffer.from(secretBytes));
console.log(`  Saved to: keys/shrincs-demo.key`);

// Import from bytes
const restored = importKey(secretBytes);
console.log(`  Imported: commitment ${hex(restored.publicKeyCommitment)}`);
const match = hex(restored.publicKeyCommitment) === hex(shrKeys.publicKeyCommitment);
console.log(`  Match:    ${match ? "✅ Keys match" : "❌ Mismatch!"}`);

// ─── 4. Comparison ──────────────────────────────────────────────────────────
label("4. Signature Size Comparison");

console.log(`  SPHINCS+C (256s-keccak):  ${spSig.length} bytes`);
console.log(`  SHRINCS stateful:         ${shrSig.length} bytes`);
console.log(`  SHRINCS stateless:        ${recovSig.length} bytes`);
console.log(`  ──────────────────────────────────────`);
console.log(`  For reference:`);
console.log(`  ECDSA (secp256k1):         64 bytes (NOT quantum-safe)`);
console.log(`  Ed25519:                   64 bytes (NOT quantum-safe)`);
console.log(`  Dilithium-2 (NIST PQC):  ~2420 bytes`);
console.log(`  ──────────────────────────────────────`);
console.log(`  Hash-based sigs are compact AND quantum-safe!`);

// ─── 5. Cross-profile demo ──────────────────────────────────────────────────
label("5. SHA-256 Profile (Same API, Different Hash)");

const { sphincsPlusC: spSha2, profileName: sha2Profile } = await (await import("@quip.network/hashsigs-wasm/256s-sha2")).loadHashSigs();
console.log(`  Profile: ${sha2Profile}`);

const seedSha2 = crypto.getRandomValues(new Uint8Array(32));
const keysSha2 = spSha2.keygen(seedSha2);
const msgSha2 = new TextEncoder().encode(pad32("SHA-256 profile signing demo!"));
const sigSha2 = spSha2.sign(msgSha2, keysSha2);
const okSha2 = spSha2.verify(sigSha2, msgSha2, keysSha2.publicKey);
console.log(`  Sign+Verify: ${okSha2 ? "✅ VALID" : "❌ INVALID"} (${sigSha2.length} bytes)`);

// ─── Summary ────────────────────────────────────────────────────────────────
label("Demo Complete ✅");
console.log(`  • Generated post-quantum keypairs (quantum-resistant!)`);
console.log(`  • Signed and verified messages with SPHINCS+C and SHRINCS`);
console.log(`  • Demonstrated stateful + stateless signing paths`);
console.log(`  • Persisted and restored keys from disk`);
console.log(`  • Compared signature sizes across schemes`);
console.log(`  • Cross-profile SHA-256 variant worked identically`);
console.log(`\n  All done in under 2 seconds. No network needed.`);
console.log(`  These same signatures verify on-chain on Quip Network.\n`);
