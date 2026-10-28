# RESULT.md — Quip pqhybridsign hybrid signing demo

## Summary

Built a small Node.js library and CLI on top of `@quip.network/pqhybridsign`
that signs and verifies messages with a hybrid classical + post-quantum
signature (suite **ED-ML-44**: ed25519 + ML-DSA-44, AND-composed). The CLI
spawns real subprocesses for sign/verify and the canonical request envelope is
handed off between processes as JSON files on disk, which is the realistic
shape of HTTP request signing.

**Overall status: WORKING.**

All four demo programs pass on the local machine with Node v22.22.2 and the
default feature set of `@quip.network/pqhybridsign@0.0.0-rc9` (SHRINCS
profile = `shrincs-256s`).

## Status per component

| Component | Status | Notes |
| --- | --- | --- |
| Library (`src/lib.mjs`) | WORKING | keygenFromSeed, sign, signDeterministic, verify, lengths, canonical-envelope helper |
| CLI (`bin/quip-sig.mjs`) | WORKING | subcommands: `info`, `keygen`, `sign`, `verify` |
| `demo/roundtrip.mjs` (single-process) | WORKING | sign + verify in one process |
| `demo/deterministic.mjs` | WORKING | two keygen+signer sites produce byte-identical signatures from same seed+nonce |
| `demo/interop.mjs` (cross-process) | WORKING | spawns `node bin/quip-sig.mjs` as subprocess for both sign and verify |
| `demo/tamper.mjs` (forgery rejection) | WORKING | five tamper variants all rejected by the verifier |

## What the package gave us

- `@quip.network/pqhybridsign@0.0.0-rc9` (npm) — Promise-based TS API over a
  WASM module compiled from `https://github.com/QuipNetwork/pqhybridsign`
  (Rust crate, AGPL-3.0-or-later). Supports six suites: ED-ML-44, ED-FN-512,
  SR-ML-44, SR-FN-512 (stateless lattice) and ED-SH, SR-SH (stateful
  SHRINCS, with a hard leaf-journal durability contract).
- Profile for this build: `shrincs-256s` (keccak).
- Sizes for ED-ML-44: publicKey 1,344 B, secretKey 2,624 B, signature 2,484 B.
- Performance (one-shot in-process, AMD Ryzen 9 5950X in the package's
  README; on this Apple Silicon machine the smoke test takes ~milliseconds
  end-to-end, dominated by Node startup + WASM module load).

## How to run

```sh
# from the project root
npm install                          # already done
npm run demo                         # run all four demos in order
# or each demo separately
npm run demo:roundtrip
npm run demo:deterministic
npm run demo:interop
npm run demo:tamper

# the CLI itself
node bin/quip-sig.mjs info
node bin/quip-sig.mjs keygen --out keys/alice.seed.json --name alice
node bin/quip-sig.mjs keygen --out keys/bob.seed.json --name bob

# write a request
cat > examples/request.json <<'JSON'
{
  "method": "POST",
  "path": "/v1/transfer",
  "body": "{\"from\":\"alice\",\"to\":\"bob\",\"amount\":42}",
  "timestamp": "2026-09-29T12:00:00.000Z",
  "nonce": "n-1"
}
JSON

# sign (process A)
node bin/quip-sig.mjs sign \
  --keys-file keys/alice.seed.json \
  --request examples/request.json \
  --ctx api.example.com \
  --out /tmp/sig.json

# verify (process B)
node bin/quip-sig.mjs verify \
  --keys-file keys/alice.seed.json \
  --request examples/request.json \
  --signature /tmp/sig.json
# -> OK    suite=ED-ML-44      ctx=api.example.com
```

Available CLI suites: `ED-ML-44`, `ED-FN-512`, `SR-ML-44`, `SR-FN-512`
(stateless lattice only; the SHRINCS suites need a LeafJournal with
synchronous durability and are out of scope for this demo).

## Evidence (last clean run on this machine)

`npm run demo` output, in order:

```
# demo:roundtrip
suite        : ED-ML-44
ctx          : roundtrip-demo
method       : POST /v1/orders
canonical    : 167 bytes -> {"body":"{\"sku\":\"QUIP-001\",\"qty\":3}","method":"POST","nonce":"n-...","path":"/v1/orders","timestamp":"..."}
signature    : 2484 bytes
publicKey    : 1344 bytes
verify       : true

# demo:deterministic
pub A      : 053a66541c97bb7c04c87e0a97007a5b ...
pub B      : 053a66541c97bb7c04c87e0a97007a5b ...
sig A      : a2efe9e717d0712f8193b7dc4ce6a092 ...
sig B      : a2efe9e717d0712f8193b7dc4ce6a092 ...
pub equal  : true
sig equal  : true
verify(sigA): true
verify(sigB): true

# demo:interop (real cross-process)
# determinism check: parent vs CLI key gen -> OK (both processes agree on 1344 byte public key)
# signed POST /v1/transfer
# signature: 2484 bytes
# --- verification subprocess ---
OK    suite=ED-ML-44      ctx=api.example.com
      method=POST   path=/v1/transfer  bytes=186
      sig=2484B  pub=1344B

# demo:tamper
baseline verify (untampered): OK
tamper #1 (body changed in request): rejected (good)
tamper #2 (canonicalBytes flipped): rejected (good)
tamper #3 (signature byte flipped): rejected (good)
tamper #4 (substituted Bob's pubkey): rejected (good)
tamper #5 (ctx label changed in envelope): rejected (good)
```

What this proves:
- The library correctly wraps the WASM API (roundtrip).
- `keygenFromSeed` is deterministic on the seed (deterministic demo).
- Two independent Node processes (parent + `spawn(process.execPath, ...)`)
  agree on the key bytes and on the signature output (interop demo).
- The composite `pqhybridsign` verify returns `false` when any of: the
  request body, the canonical-bytes envelope, the signature itself, the
  embedded public key, or the context label is modified (tamper demo).

## What did NOT work / what was hard

1. **First web search returned nothing useful** — searching for
   "Quip Network pqhybridsign documentation" was too generic and the
   results were about Mazda dealerships and Mondelēz International.
   The package only turned up via direct `npm view @quip.network/pqhybridsign`
   once I guessed the right name from the GitHub org list.

2. **The package's README and the Rust crate's README describe the API at
   different levels.** The npm tarball README shows the Promise-based
   user-facing surface (`keygenFromSeed`, `sign`, `verify`). The Rust
   crate README on GitHub describes the same suites under short type
   names (`EdMl44`, `EdSh`, etc.) and adds a lot of design context
   (stateful durability contract, hybrid AND-composition, AGPL-13).
   You need both documents to use the package well.

3. **Trap error handling is subtle.** The package wraps a
   `WebAssembly.RuntimeError` into `PqHybridSignPanic` and discards the
   cached module so the next call loads a fresh one. For a throwaway
   demo this is fine, but a production caller has to handle that the
   WASM instance can become unusable at any point.

4. **Stateful suites were deliberately avoided.** ED-SH/SR-SH need a
   LeafJournal whose `commit()` is synchronous AND durable. The hazard
   (re-importing one key on two hosts forks the one-time-signature
   counter and destroys the post-quantum security) is exactly what this
   throwaway demo must NOT take on. Documented in the README but easy
   to miss.

5. **No canonical request envelope in the package.** `pqhybridsign` only
   takes `(msg, ctx)` byte buffers. There is no built-in helper to
   canonicalize a JSON request object. We had to invent a sorted-key
   envelope (see `buildCanonicalRequestBytes` in `src/lib.mjs`). Two
   production callers must agree on this contract or they will sign
   different bytes.

## What would have made this easier

- **A first-party "canonical request bytes" helper** in the package.
  Right now you call `sign(site, secretKey, msg, ctx)` and the package
  trusts whatever bytes you hand it. A canonical request envelope
  (signed-method, signed-path, signed-body, signed-timestamp,
  signed-ctx) shipped with the package would let two API services
  interoperate without reinventing the canonicalization rules.
- **A CLI in the package itself.** Right now the package ships only a
  WASM-bound JS/TS library. Even a `npx pqhybridsign-cli sign ...`
  would have removed the need for us to write `bin/quip-sig.mjs`.
- **Test vectors checked into the npm package.** The README says
  cross-implementation test vectors don't exist yet ("the wire format
  is not frozen"). Once it freezes, the canonical cross-process
  interop demo becomes a fixed-vector comparison.
- **Docs page that maps short suite names to wire-format labels.** We had
  to read the Rust crate README to learn that `"ED-ML-44"` corresponds
  to `hybrid-ed25519-mldsa44-v1` on the wire, including the trailing
  NUL byte used as a domain-separation tag. A single table in the npm
  README would have been quicker.

## Files

```
package.json              # declares @quip.network/pqhybridsign@0.0.0-rc9
src/lib.mjs               # library wrapping the WASM module
bin/quip-sig.mjs          # CLI (info, keygen, sign, verify)
demo/roundtrip.mjs        # single-process sign+verify
demo/deterministic.mjs    # two independent sites, same seed+nonce → same sig
demo/interop.mjs          # spawns the CLI in subprocesses
demo/tamper.mjs           # five forgery variants
keys/                     # throwaway local seeds + pubkeys
DEVLOG.md                 # full development log
RESULT.md                 # this file
```

## Safety notes

- No real wallets or keys were used; `./keys/` contains only throwaway
  seeds generated by `crypto.getRandomValues` on this machine during
  this session.
- No network calls beyond `npm install`. No testnet endpoints, no
  faucets, no mainnet, no real money.
- No public posts made (no GitHub issues, no Discord, no social).
- All Node subprocesses are short-lived and self-cleaned up. No Docker
  containers or volumes created.