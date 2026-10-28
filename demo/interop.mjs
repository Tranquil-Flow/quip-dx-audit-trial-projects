// demo/interop.mjs — real cross-process interop.
//
// The most important demo. We spin up a fresh throwaway key in this process,
// then invoke the CLI TWICE as a SUBPROCESS to prove the wire format works
// across process boundaries:
//   1. `node bin/quip-sig.mjs sign` — run in a fresh Node process to sign a
//     request, producing /tmp/sig.json. This is the "Alice" process.
//   2. `node bin/quip-sig.mjs verify` — run in another fresh Node process
//     to verify the signature, reading /tmp/sig.json and the request. This
//     is the "Bob" process.
//
// Because the CLI re-derives the keypair from the SEED file, and the package's
// keygenFromSeed is deterministic on the seed, both subprocess invocations
// produce the same key bytes that this parent process produced. The
// canonical-bytes envelope and signature are passed between processes via the
// filesystem, which is the realistic shape of an HTTP API request signing
// protocol.

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildCanonicalRequestBytes,
  keygenFromSeed,
} from "../src/lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(HERE, "..");
const CLI = join(PROJECT_ROOT, "bin/quip-sig.mjs");

// 1. Set up an isolated keys dir + scratch dir.
const scratch = mkdtempSync(join(tmpdir(), "quip-interop-"));
console.log("# scratch dir:", scratch);

// 2. Generate a throwaway key by calling the CLI's keygen subcommand
//    (so we exercise the CLI itself, not just the library).
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [
    CLI,
    "keygen",
    "--suite", "ED-ML-44",
    "--out", join(scratch, "alice.seed.json"),
    "--name", "alice",
  ], { stdio: "inherit" });
  child.on("exit", code => code === 0 ? resolve() : reject(new Error(`keygen exited ${code}`)));
});

// Sanity-check determinism: re-derive here in the parent and compare with
// what the CLI wrote to alice.pubkey.json. This proves both processes agree
// on the key bytes — the foundation of interop.
const seedRaw = readFileSync(join(scratch, "alice.seed.json"), "utf8");
const seedObj = JSON.parse(seedRaw);
const seed = Buffer.from(seedObj.seed, "base64");
const suite = seedObj.suite;
const { publicKey: expectedPub } = await keygenFromSeed(suite, new Uint8Array(seed.buffer, seed.byteOffset, seed.byteLength));
const pubFile = readFileSync(join(scratch, "alice.pubkey.json"), "utf8");
const pubObj = JSON.parse(pubFile);
const actualPub = Buffer.from(pubObj.publicKey, "base64");
if (Buffer.compare(expectedPub, actualPub) !== 0) {
  console.error("FAIL: parent-derived public key does not match CLI-written public key");
  process.exit(1);
}
console.log("# determinism check: parent vs CLI key gen  -> OK (both processes agree on", actualPub.length, "byte public key)");

// 3. Write the request.
const req = {
  method: "POST",
  path: "/v1/transfer",
  body: '{"from":"alice","to":"bob","amount":42}',
  timestamp: "2026-09-29T12:00:00.000Z",
  nonce: "n-" + crypto.randomUUID(),
};
const reqPath = join(scratch, "request.json");
writeFileSync(reqPath, JSON.stringify(req, null, 2));
const canonical = buildCanonicalRequestBytes(req);
console.log("# request canonical bytes:", new TextDecoder().decode(canonical));

// 4. Run the SIGN subprocess.
const sigPath = join(scratch, "sig.json");
const ctxLabel = "api.example.com";
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [
    CLI,
    "sign",
    "--keys-file", join(scratch, "alice.seed.json"),
    "--request", reqPath,
    "--ctx", ctxLabel,
    "--out", sigPath,
  ], { stdio: "inherit" });
  child.on("exit", code => code === 0 ? resolve() : reject(new Error(`sign exited ${code}`)));
});

// 5. Run the VERIFY subprocess — completely fresh Node process.
console.log("# --- verification subprocess ---");
await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [
    CLI,
    "verify",
    "--keys-file", join(scratch, "alice.seed.json"),
    "--request", reqPath,
    "--signature", sigPath,
  ], { stdio: "inherit" });
  child.on("exit", code => code === 0 ? resolve() : reject(new Error(`verify exited ${code}`)));
});

// 6. Show what was on disk.
console.log("# --- artifacts ---");
console.log("# seed file:", readFileSync(join(scratch, "alice.seed.json"), "utf8").trimEnd());
console.log("# signature file size:", readFileSync(sigPath).length, "bytes");
console.log("# request file:", reqPath);
console.log("# signature file:", sigPath);

rmSync(scratch, { recursive: true, force: true });
console.log("# interop OK");