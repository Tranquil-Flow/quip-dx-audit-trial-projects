# m1-c

- **Round:** Round 2
- **Model:** GPT-6
- **Task:** PQ wallet CLI: create and fund a PQ smart account, send a signed transfer
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| PQ wallet CLI: create and fund a PQ smart account, send a signed transfer | GPT-6 | ethereum-sdk SHRINCS signing (local); Aglais EVM | Partly working: local SHRINCS signing and a classical (not post-quantum) AGLS transfer; the PQ account was never created | ~19 min | No Base Sepolia ETH; the SDK's local-signer problem [C-ACC-01, C-ACC-03, C-ACC-06]. Both rebuilds rated it partly working. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A Node CLI that creates a throwaway EOA and a SHRINCS seed, checks balances on Aglais and Base Sepolia, funds the EOA from the Aglais faucet, runs a local SHRINCS sign/verify with durable leaf burning, and sends a classical AGLS transfer on Aglais. Its create, fund and transfer commands for a Quip smart account on Base Sepolia never ran on a public chain.
- **Quip products and integration:** `ethereum-sdk` SHRINCS signing — NATIVE (local sign/verify only); Quip smart account — NONE (never created); Aglais classical transfer — CHAIN_ONLY.
- **Evidence:** classical (ECDSA, not post-quantum) transfer tx [0x3f928c1424e5e4c7f54afa29eb8206930bd27a1fabcf5e04b88321c7cc8ec991](https://explorer.aglais.quip.network/tx/0x3f928c1424e5e4c7f54afa29eb8206930bd27a1fabcf5e04b88321c7cc8ec991). Both independent rebuilds reproduced the local signing and the Aglais transfer and rated the project partly working.
- **Time:** 19 min.
- **Key Quip call** (`wallet.mjs:83-85`, never run on a public chain):
```js
// Reserve durably BEFORE signing. Even failed/dropped broadcasts cannot reuse a leaf.
burns.push(leaf);save(BURNS,burns);
const prepared=await w.prepareExecute({target:to,value:parseEther(amount)},{leaf});
```
- **What got in the way:** Live smart-account creation stops at the insufficient-funds guard (no Base Sepolia ETH). On a fork, the CLI's create call fails because the SDK's client takes `account: Address` and sends `eth_sendTransaction` instead of signing locally; one rebuild got it through on a fork only by impersonating the account [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29), [C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination), [C-ACC-06](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsFactoryClient.d.ts)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
