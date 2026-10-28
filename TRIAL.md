# t01-c

- **Round:** Round 1
- **Model:** GPT-6
- **Task:** PQ keygen, sign, verify and tamper check (off-chain)
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ keygen, sign, verify and tamper check (off-chain) | GPT-6 | hashsigs-wasm 0.1.0-rc1 (the npm `latest` tag) | Works off-chain, but on the previous-generation build | ~4 min | Never reached the developer docs. `npm view` showed only `latest`, whose API does not match the README [C-SDK-10, C-SDK-12, C-TRL-01]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A minimal SHRINCS stateful sign/verify demo, built against the npm `latest` version (0.1.0-rc1), which the builder pinned after `npm view`, rather than `@rc`.
- **Quip products and integration:** `@quip.network/hashsigs-wasm` 0.1.0-rc1 (the npm `latest` tag) — OUTDATED.
- **Evidence:** Off-chain only. Both independent rebuilds confirmed the installed package is genuinely 0.1.0-rc1 and that its low-level `signStatefulRaw`/`shrincsVerifyStatefulRaw` API is undocumented on the current GitHub README.
- **Key Quip call** (`src/demo.ts:11-20`):
```ts
const wasm = await loadShrincsWasm();
const seed = randomBytes(32); // brand-new CSPRNG seed; never print or persist
const keypair = wasm.shrincsKeygen(seed.toString('hex'), 2);
seed.fill(0); // best effort; immutable JS hex string may still linger in memory
try {
  const publicKey = keypair.publicKey();
  const { signature, nextStatefulLeafIndex } = keypair.signStatefulRaw(hex(message));
  const valid = wasm.shrincsVerifyStatefulRaw(
    publicKey.publicKeyCommitment, publicKey, hex(message), signature,
  );
```
- **What got in the way:** It never reached the developer docs, which say to install `@rc`. It read the GitHub README, then ran `npm view`, which reports only the `latest` version (0.1.0-rc1), and pinned that. That build's API does not match the README's `loadHashSigs()` examples, so the builder worked from the package's type declarations instead [[C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions), [C-SDK-12](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md#:~:text=npm%20install%20%40quip.network/hashsigs-wasm)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
