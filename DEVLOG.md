# DEVLOG

Task: build a TypeScript demo for Quip Network post-quantum (hash-based)
signatures — generate a keypair, sign a message, verify it, and show that a
tampered message fails verification. Must run with `npm install && npm run demo`.

Everything below was done inside the project directory only.

## Environment
- macOS, arm64 (Apple Silicon), fresh empty dir
- node v22.22.2, npm 10.9.7, git 2.50.1
- Project dir: /private/tmp/devtrials2/t01-deepseek-v4-flash

## Sources consulted (in order)
1. web search — "Quip Network post-quantum signatures EVM"
2. web search — "Quip Network hash-based signatures developer docs"
3. https://github.com/quipnetwork  (org listing -> enumerated repos)
4. https://github.com/QuipNetwork/hashsigs-rs  (Rust core: SHRINCS + WOTS+;
   README describes SHRINCS hybrid, profiles, the `ts/` subdir)
5. https://github.com/QuipNetwork/hashsigs-py  (Python bindings — not our path)
6. https://github.com/QuipNetwork/ethereum-sdk  (Solidity + TS SDK; needs
   Alchemy + funded testnet key — heavier than the task needs)
7. https://github.com/QuipNetwork/hashsigs-ts  (older standalone WOTS+ TS impl)
8. https://github.com/QuipNetwork/hashsigs-rs/tree/main/ts  (**decisive** — the
   README for `@quip.network/hashsigs-wasm`, with the full API + profiles table)
9. https://registry.npmjs.org/@quip.network%2Fhashsigs-wasm  (registry metadata)
10. https://raw.githubusercontent.com/QuipNetwork/hashsigs-rs/main/ts/package.json
11. local (installed package) — dist/api.d.ts, dist/profiles/256s-keccak/*,
    dist/profiles/256s-keccak/nodejs/hashsigs_rs.d.ts (read source, not docs)

## Decision: which Quip artifact to build on
Three candidates:
- `ethereum-sdk` — the on-chain (EVM) SDK. Requires ALCHEMY_API_KEY, .env,
  funded testnet wallet, deploying "QuipFactory"/"Deployer" contracts. Heavy,
  needs secrets + funds, and is an on-chain integration rather than a
  sign/verify demo. Rejected as the primary path.
- `hashsigs-ts` — an older, standalone WOTS+ TypeScript implementation. WOTS+
  is flagged upstream as **legacy** ("do not use WOTS+ for new integrations.
  Use SHRINCS"). Rejected.
- `@quip.network/hashsigs-wasm` (from `hashsigs-rs/ts`) — the official, current
  SHRINCS signer/verifier compiled from the audited Rust crate to WebAssembly.
  Pure local, no funds, no secrets, gives real post-quantum sign/verify.
  **Chosen.**

This is the flagship current scheme and the same bytes verify on-chain against
the Solidity/Solana verifiers, so it is a faithful demo of "Quip post-quantum
signatures" without touching a chain.

## Commands that mattered
- `node -v; npm -v; uname -m`  -> v22.22.2 / 10.9.7 / arm64
- `curl -s https://registry.npmjs.org/@quip.network%2Fhashsigs-wasm` -> versions
  + dist-tags (see "Version drift" below)
- `cat .../hashsigs-wasm/dist/api.d.ts` -> the real typed surface
- `grep -n ... nodejs/hashsigs_rs.d.ts` -> confirmed message must be 32 bytes,
  ERR_BAD_LENGTH codes, no-RNG note
- `npm install` (x2 — once with `latest`-adjacent pin, once clean)
- `npx tsc -p tsconfig.json` -> typecheck (caught two real errors, see below)
- `npm run demo`

## Version drift (had to choose a version deliberately)
`npm view`/registry showed:
  dist-tags: { latest: "0.1.0-rc1", rc: "0.2.1-rc9" }
So a bare `npm install @quip.network/hashsigs-wasm` installs **0.1.0-rc1** — an
older API (`loadShrincsWasm` entry, single export map, no per-profile subpaths).
The README currently on `main` (and the newer `ts/package.json`, 0.2.1-rc9)
describes the **multi-profile** API: `loadHashSigs()` plus
`@quip.network/hashsigs-wasm/<profile>` subpaths. I pinned the exact pre-release
`"@quip.network/hashsigs-wasm": "0.2.1-rc9"` so the code matches the documented
API. This is a deliberate deviation from "just npm install the package".

## Errors hit and how I fixed them
1. **tsc: Cannot find module '@quip.network/hashsigs-wasm/256s-keccak'**
   under default module resolution. The package uses an `exports` map with
   subpath entries. Fixed by adding `tsconfig.json` with
   `"moduleResolution": "bundler"` (node16/nodenext would also work).
2. **Runtime: `TypeError: shrincsKeysToSecretBytes is not a function`**
   I destructured it off the `loadHashSigs()` result, following `api.d.ts.ts`
   interface names. It is NOT a property of that bundle at runtime — it is a
   **module-level named export** of the package (`export { shrincsKeysToSecretBytes }`)
   in `dist/api.js`. NOTE: the `HashSigs` interface in `api.d.ts` does not list
   it, but I initially assumed it did; either way the fix is to import it as a
   named export, not off the bundle. Fixed the import. (Worked around by reading
   the shipped JS/`.d.ts`, i.e. read source rather than docs.)
   - Extra: the wasm-level function `sphincsPlusCVerify` takes a **64-byte**
     concatenated public key, whereas the JS wrapper `sphincsPlusC.verify`
     takes `{ pkSeed, root }`. Used the wrapper's object form.

## Guesses / deviations to flag
- **Pinned a pre-release** (`0.2.1-rc9`) instead of the `latest` dist-tag, to
  match the documented API. See "Version drift".
- **Message is hashed before signing.** SHRINCS signs a *fixed 32-byte digest*;
  there is no high-level "sign this string" helper. I take the demo's
  human-readable message and keccak-256 it (via `@noble/hashes`) — the EVM hash
  — then sign the digest. On-chain this digest would be the canonical action
  hash / ERC-7913 digest. This is a normal usage pattern, but it is my design
  choice, not something the docs hand you.
- **Seed comes from Node's `crypto.randomBytes(32)`.** The wasm build has *no
  RNG* by design; keygen requires a caller-supplied 32-byte seed. Using the OS
  CSPRNG gives a genuine brand-new throwaway key.
- **`maxSignatures = 16`** (default is 1024). Perf scales with `maxSignatures`
  because each shrincs call re-validates the full secret key; 16 keeps the demo
  snappy and is plenty for one signature. It is a valid 1..=4096 value.
- **Stateful `sign` then `signStateless`** in the same run: `shrincs.sign()`
  mutates the key in place (leaf counter advances). The stateless path never
  mutates, so running it after the stateful sign is safe. Re-signing the same
  leaf is a documented footgun; the demo signs each path once.
- The stateful signature is 2784 bytes and the stateless one is 91200 bytes —
  both far larger than an ECDSA sig; expected for hash-based PQ schemes, and the
  reason account abstraction / on-chain commitment storage matters.

## Dead ends
- `https://www.npmjs.com/package/@quip.network/hashsigs-wasm` and the npm search
  page failed to render via the web extractor (returned empty). Fell back to the
  registry JSON API and to reading the installed package's files.
- GitLab links (`gitlab.com/quip.network/...`) are referenced by the npm package
  metadata, but the GitHub mirror (`github.com/QuipNetwork/...`) had everything
  needed, so I did not chase the GitLab copies.

## Result
`npm install && npm run demo` runs clean: 9/9 assertions pass, genuine
signatures verify, and every tampered input (message, signature bit-flip, wrong
key) fails verification. See RESULT.md for the evidence and demo-output.log.
