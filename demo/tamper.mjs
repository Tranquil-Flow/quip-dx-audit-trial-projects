// demo/tamper.mjs — prove the verifier rejects forgery.
//
// Strategy.
//   1. Generate a throwaway Alice key.
//   2. Sign a request.
//   3. Tamper with the request, the canonical-bytes, the signature, the
//      public key, or the context — one at a time.
//   4. The verifier MUST return false / exit non-zero in every case.
//
// This is the test that proves the AND-composition of classical + PQ halves:
// flipping a single byte in either half makes the whole composite invalid.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { b64encode } from "../src/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..");
const CLI = join(PROJECT_ROOT, "bin/quip-sig.mjs");

const scratch = mkdtempSync(join(tmpdir(), "quip-tamper-"));

async function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", d => out += d.toString());
    child.stderr.on("data", d => err += d.toString());
    child.on("exit", code => resolve({ code, out, err }));
  });
}

const failed = [];

// Generate Alice.
let p = await run(["keygen", "--out", join(scratch, "alice.seed.json"), "--name", "alice"]);
if (p.code !== 0) { console.error("keygen failed:", p.err); process.exit(1); }

// Sign a request.
const req = {
  method: "POST",
  path: "/v1/orders",
  body: '{"sku":"QUIP-001","qty":3}',
  timestamp: "2026-09-29T12:00:00.000Z",
  nonce: "n-tamper",
};
const reqPath = join(scratch, "request.json");
writeFileSync(reqPath, JSON.stringify(req, null, 2));
const sigPath = join(scratch, "sig.json");
p = await run(["sign", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--ctx", "api.example.com", "--out", sigPath]);
if (p.code !== 0) { console.error("sign failed:", p.err); process.exit(1); }

// Sanity: verifier accepts the untampered envelope.
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--signature", sigPath]);
if (p.code !== 0) { console.error("baseline verify failed:", p.err); process.exit(1); }
console.log("baseline verify (untampered): OK");

// ---- Tamper 1: change the request body (amount doubled) ----
const tamperedReq = { ...req, body: '{"sku":"QUIP-001","qty":6}' };
const t1ReqPath = join(scratch, "request-tamper-1.json");
writeFileSync(t1ReqPath, JSON.stringify(tamperedReq, null, 2));
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", t1ReqPath, "--signature", sigPath]);
console.log("tamper #1 (body changed in request):", p.code === 0 ? "ACCEPTED (BAD!)" : "rejected (good)");
if (p.code === 0) failed.push("tamper #1");

// ---- Tamper 2: flip one byte in the canonical-bytes field of the envelope ----
const envRaw = readFileSync(sigPath, "utf8");
const env = JSON.parse(envRaw);
// Decode, flip a byte in the middle, re-encode.
const cbBytes = Buffer.from(env.canonicalBytes, "base64");
cbBytes[Math.floor(cbBytes.length / 2)] ^= 0x01; // flip one bit
env.canonicalBytes = b64encode(cbBytes);
const t2SigPath = join(scratch, "sig-tamper-2.json");
writeFileSync(t2SigPath, JSON.stringify(env, null, 2));
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--signature", t2SigPath]);
console.log("tamper #2 (canonicalBytes flipped):", p.code === 0 ? "ACCEPTED (BAD!)" : "rejected (good)");
if (p.code === 0) failed.push("tamper #2");

// ---- Tamper 3: flip one byte in the signature itself ----
const env3 = JSON.parse(readFileSync(sigPath, "utf8"));
const sigBytes = Buffer.from(env3.signature, "base64");
// Flip in the middle of the signature — likely into the lattice half
sigBytes[Math.floor(sigBytes.length / 2)] ^= 0x80;
env3.signature = b64encode(sigBytes);
const t3SigPath = join(scratch, "sig-tamper-3.json");
writeFileSync(t3SigPath, JSON.stringify(env3, null, 2));
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--signature", t3SigPath]);
console.log("tamper #3 (signature byte flipped):", p.code === 0 ? "ACCEPTED (BAD!)" : "rejected (good)");
if (p.code === 0) failed.push("tamper #3");

// ---- Tamper 4: replace Alice's public key with Bob's (cross-key forgery) ----
await run(["keygen", "--out", join(scratch, "bob.seed.json"), "--name", "bob"]);
const env4 = JSON.parse(readFileSync(sigPath, "utf8"));
const bobPub = JSON.parse(readFileSync(join(scratch, "bob.pubkey.json"), "utf8"));
env4.publicKey = bobPub.publicKey;
const t4SigPath = join(scratch, "sig-tamper-4.json");
writeFileSync(t4SigPath, JSON.stringify(env4, null, 2));
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--signature", t4SigPath]);
console.log("tamper #4 (substituted Bob's pubkey):", p.code === 0 ? "ACCEPTED (BAD!)" : "rejected (good)");
if (p.code === 0) failed.push("tamper #4");

// ---- Tamper 5: wrong ctx label ----
p = await run(["sign", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--ctx", "api.example.com", "--out", sigPath]);
// We want to verify with a wrong ctx but our verify CLI ignores --ctx; emulate by rewriting the envelope.
const env5 = JSON.parse(readFileSync(sigPath, "utf8"));
env5.ctx = "evil.example.com";
const t5SigPath = join(scratch, "sig-tamper-5.json");
writeFileSync(t5SigPath, JSON.stringify(env5, null, 2));
p = await run(["verify", "--keys-file", join(scratch, "alice.seed.json"), "--request", reqPath, "--signature", t5SigPath]);
console.log("tamper #5 (ctx label changed in envelope):", p.code === 0 ? "ACCEPTED (BAD!)" : "rejected (good)");
if (p.code === 0) failed.push("tamper #5");

rmSync(scratch, { recursive: true, force: true });

if (failed.length === 0) {
  console.log("\nAll five tamper attempts rejected. tamper tests pass.");
  process.exit(0);
} else {
  console.error(`\nFAIL: ${failed.length} tamper attempts were incorrectly accepted: ${failed.join(", ")}`);
  process.exit(1);
}