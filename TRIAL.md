# g4-b

- **Round:** Round 3
- **Model:** GPT-6
- **Task:** PQ wallet CLI with the Solana SDK
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ wallet CLI with the Solana SDK | GPT-6 | solana-sdk (WOTS+), Quip's Solana program on devnet | Partly working: a read-only devnet status check and offline tests only | 14 min | [C-R5-13, C-R4-26, C-R5-12, C-R5-11]. Both rebuilds rated it partly working. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A Node CLI (init, status, airdrop, create, fund, send) that re-bundles the Quip Solana SDK locally to get around its broken ESM, guards on the devnet genesis hash, makes throwaway keys, and would create a Quip PQ wallet and send a WOTS+-authorised transfer with a one-time-key journal. Only the read-only devnet status and an offline simulated-RPC test ran.
- **Quip products and integration:** `@quip.network/solana-sdk` and the Quip Solana program on devnet — OUTDATED (WOTS+); the live wallet and transfer — NONE.
- **Evidence:** The Quip program is executable on devnet and the factory account [A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4](https://explorer.solana.com/address/A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4?cluster=devnet) is owned by it. The builder's payer, recipient and wallet addresses are empty with no transactions, as it said; the 3/3 passing test is an offline simulated-RPC run. First rebuild: partly working; tests pass and `airdrop` returns 429. Second rebuild: partly working, finding the builder's write-up and log accurate and confirming the 429 independently.
- **Time:** 14 min.
- **What got in the way:** A deep docs link redirects to a doubled `/docs/docs/` path and 404s [[C-R5-13](https://docs.quip.network/docs/getting-started/quip-sdk)]. The package import problem [[C-R4-26](https://cdn.jsdelivr.net/npm/@quip.network/solana-sdk@0.0.1/package.json)], the broken repository field [[C-SDK-15](https://www.npmjs.com/package/@quip.network/solana-sdk?activeTab=versions)], the placeholder README [[C-R5-10](https://unpkg.com/@quip.network/solana-sdk@0.0.1/README.md)] and the WOTS+-only design [[C-R5-11](https://unpkg.com/@quip.network/solana-sdk@0.0.1/README.md)] all applied. The SDK's `createWallet` drops its transaction signature and its send helper ignores the confirmation error [[C-R5-12](https://unpkg.com/@quip.network/solana-sdk@0.0.1/dist/solana.js)]. Solana's public devnet faucet returned 429, which is outside Quip.

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
