# RESULT

## Status: WORKING

The demo builds and runs with exactly `npm install && npm run demo`. It
generates a fresh post-quantum SHRINCS keypair, signs a message digest, verifies
it, and rejects a tampered message (plus a tampered signature and a wrong key).
All 9 assertions pass; the process exits 0. `tsc --noEmit` typechecks clean.

## How to run

```bash
cd /private/tmp/devtrials2/t01-deepseek-v4-flash
npm install
npm run demo          # or: npx tsx src/demo.ts
```

- Node.js 18+ (tested on v22.22.2). No API keys, no network, no funds needed.
- Re-running regenerates a brand-new keypair each time.
- Output is also saved to `demo-output.log`.

## What was built

| File | Purpose |
| --- | --- |
| `src/demo.ts` | the demo (keygen -> sign -> verify -> tamper) |
| `package.json` | pins `@quip.network/hashsigs-wasm@0.2.1-rc9`, `tsx`, `@noble/hashes` |
| `tsconfig.json` | `moduleResolution: bundler` (needed for the package's exports map) |
| `README.md` | usage + wiring-into-an-EVM-dApp note |
| `DEVLOG.md` | sources, commands, errors, guesses |
| `demo-output.log` | captured run |
| `keys/shrincs-demo-signing-key.hex` | throwaway 264-byte secret (regenerated each run) |
| `keys/shrincs-demo-public.json` | public material + commitment |

Underlying tech: `@quip.network/hashsigs-wasm` — Quip Network's **SHRINCS** hash-based
(post-quantum) signature scheme, compiled to WebAssembly from the audited
`hashsigs-rs` Rust crate. Profile `shrincs-256s-keccak`. The same signatures
verify on-chain against QuipNetwork's Solidity/Solana verifiers.

## Evidence (from `demo-output.log`)

Loaded wasm + profile:
```
wasm version : 0.2.1-rc9
profile      : shrincs-256s-keccak
```

Fresh throwaway keypair (public material only; secret in ./keys):
```
publicKeyCommitment : 0x8f72d1e21f1976674c38dba62fe1a7a1bdc2e53d662e5a8205b9fb09c3fa0e7a
stateful leaves     : 16/16
```

Message + digest + signature:
```
message    : "EVM dApp action: transfer 1.00 ETH to 0x1111...1111 (nonce 7)"
keccak-256 : 0xe5b5a5c93270dd60c7d044253dc97600fb1b734d599297b5bdd59aca28c7c02a
signature  : 2784 bytes in 60.8 ms   (stateful SHRINCS)
```

All assertions:
```
[PASS] shrincs.verify(sig, msg, commitment)                 got=true  want=true
[PASS] shrincs.verify(sig, TAMPERED msg, commitment)        got=false want=false   <-- tamper fails
[PASS] shrincs.verify(TAMPERED sig, msg, commitment)        got=false want=false
[PASS] shrincs.verify(sig, msg, OTHER commitment)           got=false want=false
[PASS] shrincs.verifyStateless(sig, msg, stateless pk)      got=true  want=true
[PASS] shrincs.verifyStateless(sig, TAMPERED msg, ...)      got=false want=false
[PASS] sphincsPlusC.verify(genuine)                         got=true  want=true
[PASS] sphincsPlusC.verify(tampered msg)                    got=false want=false
[PASS] re-imported commitment matches original              got==want
checks passed: 9 / checks failed: 0
RESULT: OK — post-quantum sign/verify works and tampering is rejected.
```

Tamper detail — one character of the destination changes the whole digest, and
verification flips true -> false:
```
original digest: 0xe5b5a5c93270dd60c7d044253dc97600fb1b734d599297b5bdd59aca28c7c02a
tampered digest: 0x52be436ecbfe313fb92624fb250edb0e120c1ccd8f5ef7b3ff939b112a551adc
```

There are no tx hashes or job ids: this is a purely local crypto demo (the task's
"sign a message, verify it" scope), so it touches no chain and submits nothing
publicly. Nothing was posted anywhere.

## What did not work / was harder than it should be

1. **`latest` on npm is stale.** `dist-tags` are `{ latest: "0.1.0-rc1",
   rc: "0.2.1-rc9" }`. A plain `npm install @quip.network/hashsigs-wasm` installs
   the *older* API (`loadShrincsWasm`, single export map), which does not match
   the README currently on `main` (multi-profile `loadHashSigs()` + subpaths).
   I pinned the exact pre-release `0.2.1-rc9` so code and docs agree. (Deviation,
   recorded in DEVLOG.)
2. **`.d.ts` / runtime mismatch.** `shrincsKeysToSecretBytes` is documented as a
   member of the `HashSigs` interface in `dist/api.d.ts`, but at runtime it is a
   **module-level named export**, not a property of the `loadHashSigs()` result.
   Destructuring it off the bundle throws `TypeError: ... is not a function`.
   I only found this by reading the shipped JS (source, not docs).
3. **Message length is strict and unhinted.** Every sign/verify requires an
   *exactly 32-byte* message digest; there is no "sign a string" helper. Easy to
   miss; I had to read `hashsigs_rs.d.ts` for the `ERR_BAD_LENGTH` rule.
4. **No RNG in the wasm.** `keygen` needs a caller-supplied 32-byte seed; fine,
   but surprising, and you must know to reach for the OS CSPRNG.
5. **Two public-key shapes.** The raw wasm `sphincsPlusCVerify` takes a 64-byte
   concatenated key, while the JS wrapper `sphincsPlusC.verify` takes
   `{ pkSeed, root }`. Took a moment to disentangle.
6. Minor: the npmjs.com package page and npm search page returned empty through
   the web extractor; had to use the registry JSON API and the installed files.

## What in the vendor's docs/tools would have made this easier

- **Publish a sensible `latest`** (or point `latest` at the newest rc) so
  `npm install <pkg>` matches the README. Today, following the README's install
  line gets you a different API than the README describes.
- **Make `api.d.ts` match the runtime** — `shrincsKeysToSecretBytes` should
  either be on the `HashSigs` return object or not in its interface. A one-line
  doc note ("ser/de helpers are named exports, not bundle members") would have
  saved a debug cycle.
- **A `hashsigs-wasm` Quickstart section** showing the canonical EVM flow:
  `digest = keccak256(message)` -> `sign(digest)` -> store
  `publicKeyCommitment` on-chain -> `verify`. The pieces are all documented, but
  scattered across the `ts/README`, the Rust README, and the `ethereum-sdk`.
- **A `hashToDigest()` / length-validating helper** (or a clearer "messages are
  32 bytes; hash first" callout at the top of the API table) — this is the
  single most likely first-run mistake.
- **A tiny end-to-end example file in the package** (`examples/sign-verify.mjs`)
  that runs with `node` with no build step — the README's snippets are close, but
  an executable one would remove the guesswork about seeds, message length, and
  named-export vs bundle-member.
- Note: the demo intentionally does **not** use `ethereum-sdk`, which is the only
  piece requiring Alchemy keys + a funded testnet wallet. If the goal were an
  on-chain proof, that SDK needs a "no-RPC dry run" mode.
