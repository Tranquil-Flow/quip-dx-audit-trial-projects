# DEVLOG — Quip pqhybridsign library + CLI

Project: build a small library + CLI for hybrid classical/post-quantum signatures using `@quip.network/pqhybridsign`, with two-process interop.

Environment: macOS Apple Silicon, empty project directory.

Plan:
1. Find the package, understand the WASM API surface.
2. Scaffold a Node/TS library that wraps it.
3. CLI for keygen, sign, verify.
4. Two-process interop demo: process A signs a request payload, process B verifies it (files on disk acting as the wire).
5. Tamper test to prove forgery rejection.
6. Write RESULT.md.

## Sources consulted (in order)

- Web search: `pqhybridsign` (first attempt returned only random results — too generic).
- Web search: `Quip Network pqhybridsign documentation` (found https://quip.network/ and the GitHub org).
- Web extract: https://github.com/QuipNetwork (Quip org page, 40 repos).
- `npm view @quip.network/pqhybridsign` — FOUND IT. Versions 0.0.0-rc1..rc9, AGPL-3.0-or-later.
- `npm search quip.network` — also showed `@quip.network/hashsigs-wasm` (different package, hashsigs-rs based; not what we want).
- Web extract: https://github.com/QuipNetwork/pqhybridsign — Rust crate repo, lists suite names, sizes, performance. Notes that the GitLab mirror is `git+https://gitlab.com/quip.network/pqhybridsign.git`.
- `npm pack @quip.network/pqhybridsign@0.0.0-rc9` → tarball inspected at `tmp-pkg/package/`.
- Read `tmp-pkg/package/README.md` — package README in npm tarball (different from the Rust crate README).
- Read `tmp-pkg/package/dist/api.d.ts` — full Promise-based API surface.
- Read `tmp-pkg/package/dist/api.js` and `dist/index.node.cjs` — verified the loader does a synchronous `require` of the wasm module under Node.

## API summary (from the dist .d.ts)

Suites: `"ED-ML-44" | "ED-FN-512" | "SR-ML-44" | "SR-FN-512" | "ED-SH" | "SR-SH"`.
Stateless lattice suites: ED-ML-44, ED-FN-512, SR-ML-44, SR-FN-512 → use `keygenFromSeed`, `sign`, `verify`.
Stateful hash suites: ED-SH, SR-SH → use `keygenStatefulFromSeed` + leaf journal.

For an interop demo we want stateless + fast → **ED-ML-44** (ed25519 + ML-DSA-44, ~160 µs keygen, ~380 µs sign, ~121 µs verify per the README perf table).

Public API of interest (Node entry: `dist/index.node.cjs`):
- `keygenFromSeed(suite, seed)` → `{ publicKey, secretKey }`
- `sign(suite, secretKey, msg, ctx)` → `Uint8Array`
- `verify(suite, publicKey, msg, ctx, sig)` → `boolean`
- `publicKeyLen(suite)`, `secretKeyLen(suite)`, `signatureLen(suite)`, `storedPublicKeyLen(suite)`, `profileName()`
- `signDeterministic(suite, secretKey, msg, ctx, nonce)` for reproducibility
- `vrfProve/vrfVerify/vrfMakeBytes` etc. for VRF (not needed for signing interop)
- `PqHybridSignPanic` class for trap errors

## Choices and deviations

1. **Suite: ED-ML-44.** Stateless, lattice-based (ed25519 + ML-DSA-44). The
   stateful SHRINCS suites (ED-SH, SR-SH) require a LeafJournal with a
   synchronous `commit()` and a hard durability contract. The README is
   unusually explicit about the foot-gun: importing one key twice forks the
   one-time-signature counter and breaks post-quantum security. A throwaway
   demo is exactly the wrong place to take that on. ED-ML-44 is also the
   fastest at this profile build (shrincs-256s).

2. **Persist the SEED, not the secret key.** Two processes that each load the
   same 32-byte seed into `keygenFromSeed` get byte-identical keypairs. This
   matches the package's re-keygen hazard warning about not re-deriving from
   one junction on two hosts — but here we're talking about a deterministic
   keygen from a uniformly-random seed, which is by design safe to redo.
   We do **not** persist the secret key; we persist the seed. The CLI writes
   `keys/<name>.seed.json` and a `keys/<name>.pubkey.json` for distribution.

3. **Canonical request envelope.** To stop two processes from accidentally
   signing different bytes for the same logical request, we pin a sorted-key
   JSON envelope: `{body, method, nonce, path, timestamp}`. The bytes that
   are signed are exactly that JSON. The envelope stored in the signature
   file contains both those bytes (base64) and the signature (base64) so the
   verifier can prove they're signing the same bytes the signer was.

4. **Read the package source instead of relying on docs alone.** The
   GitHub README for the Rust crate and the README inside the npm tarball
   describe the API at very different abstractions (short type names vs.
   Promise API). I read `node_modules/@quip.network/pqhybridsign/dist/api.d.ts`
   to get the exact TypeScript surface — including `keygenFromSeed`,
   `sign`, `verify`, `signDeterministic`, `publicKeyLen`, `secretKeyLen`,
   `signatureLen`, `storedPublicKeyLen`, `profileName`, and the
   `PqHybridSignPanic` error class — and `dist/api.js` to confirm that the
   Promise API is a thin promisifier over the synchronous wasm-bindgen glue
   loaded under Node by `dist/index.node.cjs`.

## Errors / dead ends

- **First keygen attempt in the CLI called `keygenRandom` then ALSO
  generated a fresh seed to "verify determinism".** That was nonsense —
  they were two different seeds, so the comparison always failed. Fixed
  by using only one seed.
- **`new URL("..", import.meta.url).pathname`** does not work on all
  platforms; switched to `dirname(fileURLToPath(import.meta.url))`.
- **`path`** was used without being imported in the first interop draft —
  fixed by importing `{join, dirname}` from `node:path`.

## Final state

- `npm run demo` runs four demos in order: roundtrip (single process),
  deterministic (two keygens + signers → same signature), interop (CLI
  subprocesses), tamper (5 forgery rejections).
- All keys live in `./keys/`. They are throwaway, used only for the local CLI.
- No network calls, no mainnet, no real money. Pure local Node + WASM.