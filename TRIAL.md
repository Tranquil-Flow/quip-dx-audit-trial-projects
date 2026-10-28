# m1-a

- **Round:** Round 2
- **Model:** Claude Opus 5.5
- **Task:** PQ wallet CLI: create and fund a PQ smart account, send a signed transfer
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ wallet CLI: create and fund a PQ smart account, send a signed transfer | Claude Opus 5.5 | ethereum-sdk (Quip Accounts) | Partly working: the account flow ran on a Base Sepolia fork only; its deploy of Quip's contracts to Aglais stalled at step 2 of 5 | ~40 min | No Account deployment on Aglais; no usable Base Sepolia faucet [C-ACC-01, C-ACC-03]. Rebuilds differ: one finished the Aglais deploy and made a live PQ-signed transfer on the self-deployed copies; the other reproduced the fork flow only. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** A CLI that generates a throwaway EOA and SHRINCS mnemonic, deploys a Quip PQ smart account through `WalletFactory`, funds it, and sends transfers authorized by one-time SHRINCS signatures; it targets Base Sepolia (exercised on a fork). A bundled `deploy-aglais.mjs` script redeploys Quip's contracts on Aglais. The builder's own Aglais attempt stalled after the verifier; the full live Aglais run was done by one independent rebuild.
- **Quip products and integration:** `ethereum-sdk` (Quip Accounts) — NATIVE on Base Sepolia, but fork only (the builder tried eight public Base Sepolia faucets and could use none of them headlessly: four needed a login, wallet or identity verification, or a mainnet balance, three were unavailable, and the builder's log gives no reason for the eighth); SELF_DEPLOYED on Aglais, completed only in one independent rebuild.
- **Evidence:** the builder's own Aglais work reached only the SHRINCS verifier deploy tx [0xcd03a9dc38ca57431a90e2146d779dc16b32f7d2846984a510c112f586cd8008](https://explorer.aglais.quip.network/tx/0xcd03a9dc38ca57431a90e2146d779dc16b32f7d2846984a510c112f586cd8008); its smart-account create/fund/transfer ran on a local Base Sepolia fork only. One rebuild then ran the same deploy script to completion on Aglais: `vetImplementation` tx [0xb81a7c89c82503d7f8e2e9ccf92199c139e111445c177281527497a4c0dd14b7](https://explorer.aglais.quip.network/tx/0xb81a7c89c82503d7f8e2e9ccf92199c139e111445c177281527497a4c0dd14b7), fund tx [0xb6ad6f711f8daa38d94867917fe307f90c8bbe4f4154e22cd2c1a094cb950332](https://explorer.aglais.quip.network/tx/0xb6ad6f711f8daa38d94867917fe307f90c8bbe4f4154e22cd2c1a094cb950332), SHRINCS-signed transfer tx [0xf53a5f62e7dd42a487197cdb29f80041212ec1b4a7e0a468000c29d55c591a69](https://explorer.aglais.quip.network/tx/0xf53a5f62e7dd42a487197cdb29f80041212ec1b4a7e0a468000c29d55c591a69) from smart account [0xD6c7CcE3043d908c74F925CaF9d652F0f7bfd1eB](https://explorer.aglais.quip.network/address/0xD6c7CcE3043d908c74F925CaF9d652F0f7bfd1eB). The other rebuild reproduced the fork flow only and rated the project partly working.
- **Time:** 40 min.
- **Key Quip call** (`quip-wallet.mjs:178-179`):
```js
const wallet = await factory.createShrincsWallet(params);
log("smart account deployed:", wallet.walletAddress);
```
- **What got in the way:** Quip has not deployed its smart-account contracts on Aglais [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)], and Quip's faucet funds only Aglais, not Base Sepolia, where the contracts are [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
