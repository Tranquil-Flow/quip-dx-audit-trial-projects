# RESULT.md — Quip Network Hackathon Build

## Status: WORKING ✅

## What I Built
A Node.js demo that generates post-quantum (quantum-resistant) keypairs and
signs/verifies messages using Quip Network's SHRINCS and SPHINCS+C hash-based
signature schemes. This runs entirely locally — no network, no testnet, no
tokens needed.

### What it demonstrates:
1. **SPHINCS+C keygen → sign → verify** — stateless post-quantum signatures
2. **SHRINCS keygen → sign → verify** — hybrid key with stateful fast path + stateless recovery
3. **Tamper detection** — flipped byte correctly rejected
4. **Key persistence** — serialize 264-byte secret, save to disk, reimport
5. **Cross-profile** — SHA-256 variant works identically to keccak variant
6. **Signature size comparison** — shows tradeoffs vs ECDSA, Ed25519, Dilithium

## How to Run
```bash
cd /private/tmp/devtrials4/h6-mimo-v2.5
npm install @quip.network/hashsigs-wasm@rc
node demo.mjs
```

## Evidence
- **Package installed**: `@quip.network/hashsigs-wasm@rc` (1 package, 0 vulnerabilities)
- **Key file saved**: `keys/shrincs-demo.key` (264 bytes, SHRINCS secret key)
- **All 5 demo sections pass**: SPHINCS+C sign/verify, SHRINCS stateful sign/verify,
  SHRINCS stateless recovery, key persistence round-trip, cross-profile SHA-256
- **Tamper detection works**: flipped byte correctly rejected
- **Performance**: WASM load 50ms, SPHINCS+C keygen ~876ms, sign ~8309ms, verify 5ms
- **SHRINCS stateful**: keygen 165ms, sign 285ms, verify 1ms (much faster for stateful path)
- **Signature sizes**: SPHINCS+C 91,200 bytes, SHRINCS stateful 2,784 bytes

## What Did NOT Work
1. **Compute job submission** — The docs page "Submit Your First Compute Job" is a
   dead end. Quote: "Connection details for the public test network have not been
   published yet." Cannot test the optimization solver path without a testnet RPC URL.
2. **Python xquad/xqsa path** — Requires Python 3.13+ and also needs the unpublished
   testnet connection. The local CPU solver works but is a separate installation.
3. **EVM/Solana SDK** — Both `@quip.network/ethereum-sdk@beta` and
   `@quip.network/solana-sdk` need Alchemy API keys and wallet private keys.
   Out of scope for a quick hackathon demo.

## Top 5 Changes to Vendor Docs/Site That Would Help Most

### 1. Add a 5-Minute Quickstart with Working Code
The quickstart page (https://developers.quip.network/docs/getting-started/quickstart)
says "generate quantum-resistant keys" but provides zero code. Add a single
copy-pasteable `node -e "..."` or a 10-line script that generates a keypair,
signs, and verifies. This is the #1 thing hackathon developers need.

### 2. Fix the Compute Job Page or Mark It Clearly as "Coming Soon"
The "Submit Your First Compute Job" page
(https://developers.quip.network/docs/compute/submit-a-job) is a detailed
tutorial that literally cannot be followed. The line "Connection details for
the public test network have not been published yet" should be a prominent
banner at the TOP of the page, not buried in the middle. Better yet, provide
a local-only example that doesn't need the network.

### 3. Publish the WASM README to npm (and All Package READMEs)
The `@quip.network/hashsigs-wasm` npm page had no README when I first checked.
The README exists in the GitHub repo (ts/README.md) with excellent docs. npm
is where developers land first — publish the README there. Same for any other
packages.

### 4. Fix the Import Example in the README
The README shows: `import { loadHashSigs, shrincsKeysToSecretBytes, shrincsImportSigningKey } from "@quip.network/hashsigs-wasm"` but `shrincsImportSigningKey` is NOT a top-level export — it's returned by `loadHashSigs()`. This causes a runtime error that takes debugging to figure out.

### 5. Make the 32-Byte Message Constraint Obvious
Every code example should show the message as exactly 32 bytes (or use a
helper). The error "message must be exactly 32 bytes" is clear, but
developers shouldn't have to discover this constraint by trial and error.
Add a note in every code example, or provide a `hashMessage(data)` helper
in the library that pre-hashes arbitrary data to 32 bytes.
