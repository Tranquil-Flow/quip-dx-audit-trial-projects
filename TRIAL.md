# t01-a

- **Round:** Round 1
- **Model:** Claude Sonnet 5
- **Task:** PQ keygen, sign, verify and tamper check (off-chain)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ keygen, sign, verify and tamper check (off-chain) | Claude Sonnet 5 | hashsigs-wasm@rc (SHRINCS, SPHINCS+C) | Built and working (off-chain) | ~2 min | A plain `npm install` gets the old `latest` API; the builder pinned @rc [C-SDK-10, C-SDK-12]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.
- **What it does:** A TypeScript CLI that generates fresh SPHINCS+C and SHRINCS post-quantum keypairs, signs a keccak-256 digest, verifies it, and shows verification failing for a tampered message, signature or key. Entirely off-chain.
- **Quip products and integration:** `@quip.network/hashsigs-wasm@rc` (0.2.1-rc9) — NATIVE.
- **Evidence:** Off-chain only; no transactions or addresses. Both independent rebuilds reproduced all 9 verify checks from a clean `npm ci` with a fresh key. Our own re-run (2026-09-29) got the same 9 passing checks with 0.2.1-rc9 installed.
- **Key Quip call** (`src/demo.ts:24, 37-42`, excerpt):
```ts
const { sphincsPlusC, shrincs, profileName } = await loadHashSigs();
const seed = randomBytes(32);
const [keys, tKeygen] = timed(() => sphincsPlusC.keygen(seed));
const [sig, tSign] = timed(() => sphincsPlusC.sign(msgHash, keys));
check("valid message", sphincsPlusC.verify(sig, msgHash, keys.publicKey), true);
```
- **What got in the way:** A plain `npm install @quip.network/hashsigs-wasm` resolves the stale `latest` tag (0.1.0-rc1), which has a different API that the current README does not document [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions), [C-SDK-12](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md#:~:text=npm%20install%20%40quip.network/hashsigs-wasm)]. The builder spotted this and pinned 0.2.1-rc9.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
