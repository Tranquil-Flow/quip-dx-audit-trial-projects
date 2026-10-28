# h6-b

- **Round:** Round 2
- **Model:** MiMo-V2.5
- **Task:** Hackathon: build something small with Quip in an hour
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Hackathon: build something small with Quip in an hour | MiMo-V2.5 | hashsigs-wasm@rc | Built and working (offline signing demo) | ~10 min | The README does not name a pre-hash, so the demo pads text instead of hashing it [C-TRL-02]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** Walks through SPHINCS+C and SHRINCS keygen, signing and verification, a tamper check on the SPHINCS+C signature, SHRINCS stateless recovery, key persistence and a SHA-256 profile, fully offline.
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` — NATIVE.
- **Evidence:** Off-chain only. Both independent rebuilds confirmed a valid SPHINCS+C signature (91,200 bytes) and a stateful SHRINCS signature (2,784 bytes) verify, and that the demo's tamper check rejects a flipped byte. That tamper check covers SPHINCS+C only. Our own re-run on 2026-09-29 also worked.
- **Time:** 10 min.
- **Key Quip call** (`demo.mjs:88-106`, excerpt):
```js
const shrKeys = shrincs.keygen(shrSeed, maxSigs);
...
const msg2 = new TextEncoder().encode(pad32("SHRINCS stateful signing works!"));
...
const shrSig = shrincs.sign(msg2, shrKeys);
...
const shrOk = shrincs.verify(shrSig, msg2, shrKeys.publicKeyCommitment);
```
- **What got in the way:** The npm README says messages are exactly 32 bytes but does not name a pre-hash function [[C-TRL-02](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md)]. This demo pads text to 32 bytes instead of hashing it.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
