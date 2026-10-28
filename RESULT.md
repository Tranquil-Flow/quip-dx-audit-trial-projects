# RESULT

**Status: WORKING** (off-chain demo only; on-chain verification not attempted, not requested)

## How to run
```
npm install && npm run demo      # Node >= 18 (tested on v22.22.2, macOS arm64); ~3 s
npm run typecheck                # optional
```
Uses `@quip.network/hashsigs-wasm` **pinned to `0.2.1-rc9`** (see below), `@noble/hashes` (keccak-256), `tsx`.
Source: `src/demo.ts`. Only public values are written to `keys/demo-public.json`; secret keys stay in memory.

## What it does
1. Loads Quip's WASM library (`loadHashSigs()`, profile `shrincs-256s-keccak`).
2. Pre-hashes a message with keccak-256 (the library signs exactly 32 bytes).
3. **SPHINCS+C** (stateless): keygen from a 32-byte CSPRNG seed, sign, verify; then shows verify fails for a tampered message, a 1-bit-flipped signature, and a wrong public key.
4. **SHRINCS** (Quip's hybrid stateful/stateless account key): keygen, stateful sign (consumes a one-time leaf), verify against the 32-byte commitment; tampered message and wrong commitment fail; stateless recovery signature verifies and fails when tampered.

## Evidence (actual output, one run)
```
profile: shrincs-256s-keccak
== SPHINCS+C ==  keygen 55 ms, sign 720 ms, signature = 91200 bytes
  PASS valid message: true | PASS tampered message: false | PASS 1-bit-flipped signature: false | PASS wrong public key: false
== SHRINCS ==   keygen 57 ms, sign 61 ms, signature = 2784 bytes (leaves left 15)
  PASS valid: true | PASS tampered: false | PASS wrong commitment: false | PASS stateless valid: true | PASS stateless tampered: false
All checks behaved as expected
```
No tx hashes/addresses/job ids: nothing on-chain was done. Reproduced from a clean `node_modules` too.

## What did not work / caveats
- `npm install @quip.network/hashsigs-wasm` (no version) installs `0.1.0-rc1` (the `latest` tag), which has **no README and a different API** (`loadShrincsWasm`, no `loadHashSigs`). The documented API is in `0.2.1-rc9` (the `rc` tag), so I pinned it exactly.
- The quickstart link found by search (`quip.gitbook.io/docs/getting-started/quickstart`) returned 404. API usage came from the npm package README and `.d.ts` files.
- Not verified: on-chain (Solidity) verification, the "audited" claim, gas cost. SPHINCS+C signatures are 91,200 bytes in the default profile, which is likely impractical as EVM calldata; the SHRINCS stateful signature (~2.8 KB) is the on-chain-oriented path. Measure before committing.
- SHRINCS stateful signing mutates the key in place and each leaf is one-time; the demo doesn't persist secrets. A real dApp must persist after every sign (`shrincsKeysToSecretBytes`) — reuse breaks security.
- 128s profiles reportedly take ~53 s for keygen in WASM; not used.
- Package is a release candidate under AGPL-3.0-or-later — check license compatibility with your dApp.
- Choice of SPHINCS+C/SHRINCS as "the Quip keypair" and keccak-256 as pre-hash were my judgment calls (see DEVLOG).

## What would have made this easier (vendor docs/tools)
- Point the npm `latest` tag at the current API (or state the version to use in the GitHub README); a bare install yields an incompatible package.
- Fix/redirect the dead gitbook quickstart URL; link one canonical "TypeScript quickstart" from the org page.
- Say which hash to use for the 32-byte message (keccak-256 vs SHA-256) and show an end-to-end example that ends in an on-chain `verify` call with gas/calldata numbers per profile.
- Consolidate repo locations (README says GitLab, npm says GitHub) and state which is canonical.
- Put a plain "tamper test" example and recommended profile per use case (wallet vs. off-chain) in the README.
