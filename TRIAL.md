# g4-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** PQ wallet CLI with the Solana SDK
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ wallet CLI with the Solana SDK | Claude Sonnet 5.5 | solana-sdk (WOTS+), Quip's Solana program on devnet | Partly working: key generation, a factory read and offline signing only; Solana's devnet faucet rate-limited funding | 14 min | Retired GitBook 404; the package cannot be imported in plain Node; placeholder README; WOTS+ only [C-AGT-01, C-R4-26, C-SDK-15, C-R5-10, C-R5-11]. Both rebuilds rated it partly working. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A Node CLI (init, fund, factory, create, info, send) that makes a throwaway Solana payer and a WOTS+ secret, reads the Quip devnet factory, and is wired to create a Quip PQ wallet and send a WOTS+-authorised transfer. Only key generation, the factory read and an offline signing self-test ran, because Solana's public devnet faucet returned 429.
- **Quip products and integration:** `@quip.network/solana-sdk` and the Quip Solana wallet program on devnet — OUTDATED (the only published SDK version implements WOTS+, which the docs call previous-generation); the live wallet creation and transfer — NONE.
- **Evidence:** The Quip program [Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj](https://explorer.solana.com/address/Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj?cluster=devnet) is executable on devnet and the factory state read matches the claim. The builder's payer was never funded and sent no transactions, and no hashes were claimed. First rebuild: partly working; signing and the factory read worked, funding failed with 429 for the rebuild too, so no create or transfer ran; that block comes from Solana's public faucet, not Quip. Second rebuild: partly working, reproducing the same.
- **Time:** 14 min.
- **What got in the way:** A web search led to the retired GitBook quickstart, which returns 404 [[C-AGT-01](https://quip.gitbook.io/docs)]. The package cannot be imported by plain Node because of extensionless ESM imports [[C-R4-26](https://cdn.jsdelivr.net/npm/@quip.network/solana-sdk@0.0.1/package.json)]. Its repository field points to a repo that does not exist [[C-SDK-15](https://www.npmjs.com/package/@quip.network/solana-sdk?activeTab=versions)]. The README is a program-developer README with a placeholder clone URL and no SDK usage [[C-R5-10](https://unpkg.com/@quip.network/solana-sdk@0.0.1/README.md)]. The package implements only WOTS+, with no current-scheme Solana path stated [[C-R5-11](https://unpkg.com/@quip.network/solana-sdk@0.0.1/README.md)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
