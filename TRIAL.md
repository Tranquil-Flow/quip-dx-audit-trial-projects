# t01-b

- **Round:** Round 1
- **Model:** DeepSeek V4 Flash
- **Task:** PQ keygen, sign, verify and tamper check (off-chain)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ keygen, sign, verify and tamper check (off-chain) | DeepSeek V4 Flash | hashsigs-wasm@rc | Built and working (off-chain) | ~3 min | Same `latest` problem; the builder pinned @rc [C-SDK-10, C-SDK-12]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** DeepSeek V4 Flash.
- **What it does:** The same off-chain SHRINCS/SPHINCS+C keygen/sign/verify/tamper demo, plus a secret-key export/re-import round trip.
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` (0.2.1-rc9) — NATIVE.
- **Evidence:** Off-chain only. Both independent rebuilds reproduced the demo's keygen, sign, verify and tamper checks. One rebuild also confirmed that the wasm binary reports profile `shrincs-256s-keccak` and that a signature from that profile fails verification under the sha2 profile. Our own re-run (2026-09-29) reproduced the 9 checks, the export/re-import round trip and the cross-profile failure.
- **Key Quip call** (`src/demo.ts:61-63, 71-73`, excerpt):
```ts
const raw = await loadShrincsWasm();
const { shrincs, sphincsPlusC, shrincsImportSigningKey, profileName } =
  await loadHashSigs();
const seed = new Uint8Array(randomBytes(32));
const keys: ShrincsKeys = shrincs.keygen(seed, 16); // maxSignatures=16 (<=4096)
const commitment = keys.publicKeyCommitment;
```
- **What got in the way:** The npm `latest` tag is the stale 0.1.0-rc1, and the current API is only on the `rc` tag [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions), [C-SDK-12](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md#:~:text=npm%20install%20%40quip.network/hashsigs-wasm)]; the builder read the dist-tags and pinned 0.2.1-rc9. It noted that the npm package metadata points to GitLab while it worked from the GitHub mirror; neither host is stated as canonical [[C-TRL-03](https://www.npmjs.com/package/@quip.network/hashsigs-wasm?activeTab=versions)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
