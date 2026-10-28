// src/lib.mjs — thin wrapper around @quip.network/pqhybridsign.
//
// Why a wrapper: the raw API is async-only (because the WASM module loads
// lazily on first call) and returns raw Uint8Arrays. We give the rest of the
// project a stable, typed surface that handles:
//   - the choice of suite (default ED-ML-44 — stateless, ~380µs sign)
//   - deterministic key generation from a seed (the only safe path for
//     inter-process interop — both processes must agree on the seed)
//   - base64 <-> Uint8Array for JSON envelopes
//   - canonical message envelopes so signer and verifier can't disagree on
//     what was actually signed.
//
// We deliberately do NOT handle stateful suites (ED-SH/SR-SH) here. The README
// explicitly warns that importing one key twice forks the one-time-signature
// counter and destroys its post-quantum security, and the LeafJournal
// durability contract is a much bigger surface than this throwaway demo needs.
// Stateless lattice suites have no such hazard.

import pq from "@quip.network/pqhybridsign";

export const DEFAULT_SUITE = "ED-ML-44";

// ---- base64 helpers (works in Node 20+ and modern browsers) ----

export function b64encode(bytes) {
  const buf = Buffer.from(bytes);
  return buf.toString("base64");
}

export function b64decode(str) {
  const buf = Buffer.from(str, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

// ---- key handling ----------------------------------------------------------

export async function keygenFromSeed(suite, seed) {
  if (!(seed instanceof Uint8Array) || seed.length !== 32) {
    throw new Error("seed must be a 32-byte Uint8Array");
  }
  const pair = await pq.keygenFromSeed(suite, seed);
  return pair; // already Uint8Arrays per the package's createApi
}

export async function keygenRandom(suite, rng = crypto.getRandomValues.bind(crypto)) {
  const seed = new Uint8Array(32);
  rng(seed);
  return keygenFromSeed(suite, seed);
}

// Persist a seed to disk in a self-describing JSON file.
// `out.dir` will contain:
//   { "suite": "ED-ML-44", "seed": "<base64>", "createdAt": "<iso8601>" }
// We store the SEED not the secret key. Anyone with the seed can re-derive
// the same keys deterministically, so this is the canonical artifact.
//
//   - keys/alice.seed.json
//   - keys/bob.seed.json
export async function writeSeedFile(path, suite, seed) {
  const fs = await import("node:fs/promises");
  const payload = {
    suite,
    seed: b64encode(seed),
    note: "THROWAWAY key for local testing only. Never reuse on mainnet.",
  };
  await fs.writeFile(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export async function readSeedFile(path) {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(path, "utf8");
  const obj = JSON.parse(raw);
  if (typeof obj.suite !== "string" || typeof obj.seed !== "string") {
    throw new Error(`bad seed file ${path}`);
  }
  return { suite: obj.suite, seed: b64decode(obj.seed) };
}

// ---- sign / verify ---------------------------------------------------------

export async function sign(suite, secretKey, msg, ctx) {
  if (typeof msg === "string") msg = new TextEncoder().encode(msg);
  if (typeof ctx === "string") ctx = new TextEncoder().encode(ctx);
  return pq.sign(suite, secretKey, msg, ctx);
}

export async function signDeterministic(suite, secretKey, msg, ctx, nonce) {
  if (typeof msg === "string") msg = new TextEncoder().encode(msg);
  if (typeof ctx === "string") ctx = new TextEncoder().encode(ctx);
  if (typeof nonce === "string") nonce = new TextEncoder().encode(nonce);
  if (!(nonce instanceof Uint8Array) || nonce.length !== 32) {
    throw new Error("nonce must be a 32-byte Uint8Array");
  }
  return pq.signDeterministic(suite, secretKey, msg, ctx, nonce);
}

export async function verify(suite, publicKey, msg, ctx, sig) {
  if (typeof msg === "string") msg = new TextEncoder().encode(msg);
  if (typeof ctx === "string") ctx = new TextEncoder().encode(ctx);
  return pq.verify(suite, publicKey, msg, ctx, sig);
}

// ---- canonical request envelope -------------------------------------------
// Both processes must agree byte-for-byte on what is signed. We pin the
// envelope format to a single line of JSON whose fields are sorted, so the
// bytes are stable across processes and runs.

export function buildCanonicalRequestBytes({ method, path, body, timestamp, nonce }) {
  if (typeof method !== "string") throw new Error("method must be string");
  if (typeof path !== "string") throw new Error("path must be string");
  if (typeof timestamp !== "string") throw new Error("timestamp must be ISO string");
  if (typeof nonce !== "string") throw new Error("nonce must be string");
  // body is a string OR null — null means "no body"
  const bodyStr = body === null ? "" : body;
  if (typeof bodyStr !== "string") throw new Error("body must be string or null");
  // Stable sort, no whitespace.
  const envelope = JSON.stringify({
    body: bodyStr,
    method,
    nonce,
    path,
    timestamp,
  });
  return new TextEncoder().encode(envelope);
}

// Build the JSON envelope that the signer writes to disk and the verifier
// reads back. Contains: suite, suiteProfile (the WASM build profile),
// canonicalBytes (base64), signature (base64), publicKey (base64), ctx (str).
export function buildSignedRequest({ suite, ctx, canonicalBytes, signature, publicKey }) {
  return {
    suite,
    ctx,
    canonicalBytes: b64encode(canonicalBytes),
    publicKey: b64encode(publicKey),
    signature: b64encode(signature),
  };
}

// ---- lengths (for pre-allocation/UX) ----

export async function lengths(suite) {
  const [publicKeyLen, secretKeyLen, signatureLen, storedPublicKeyLen] =
    await Promise.all([
      pq.publicKeyLen(suite),
      pq.secretKeyLen(suite),
      pq.signatureLen(suite),
      pq.storedPublicKeyLen(suite),
    ]);
  return { publicKeyLen, secretKeyLen, signatureLen, storedPublicKeyLen };
}

export async function profile() {
  return pq.profileName();
}