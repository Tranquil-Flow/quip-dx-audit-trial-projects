# m5-a

- **Round:** Round 2
- **Model:** Claude Opus 5.5
- **Task:** DAO treasury held in a Quip PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| DAO treasury held in a Quip PQ account | Claude Opus 5.5 | ethereum-sdk, hashsigs-wasm, Omnibus | Partly working: the PQ payout approval was verified live on Base Sepolia; treasury and swap on a fork only | ~23 min | [C-ACC-01, C-SWP-01, C-ACC-03, C-TRL-08]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** Creates a SHRINCS Quip account as a DAO treasury, has a separate approver key sign a payout intent with `hashsigs-wasm`, verifies it off-chain and against the live ERC-7913 verifier, then commits and claims a QuipSwap/Omnibus trade to pay the recipient. Runs end to end on a Base Sepolia fork; the PQ-approval check itself runs live.
- **Quip products and integration:** PQ payout approval — NATIVE (verified live against Quip's deployed verifier on Base Sepolia and OP Sepolia), plus a SELF_DEPLOYED clone of the SHRINCS verifier on Aglais for a second check; treasury account and Omnibus settlement — NATIVE contracts, fork only.
- **Evidence:** live approval verified against the SHRINCS ERC-7913 verifier [0xF2f9E6D692da41b089c3c261c41509669eEc5567](https://base-sepolia.blockscout.com/address/0xF2f9E6D692da41b089c3c261c41509669eEc5567) on Base Sepolia (and the same address on OP Sepolia) via `eth_call` (VALID for the genuine approval, INVALID once tampered); Aglais verifier clone deploy tx [0x38e4f75595f7680d58910fb922189c76a3e66ad59093b5be7bcf0e8e8cecce1a](https://explorer.aglais.quip.network/tx/0x38e4f75595f7680d58910fb922189c76a3e66ad59093b5be7bcf0e8e8cecce1a) and AGLS transfer tx [0xc01bc3dc7e2afa847eb0e80cf87835669e94af13415903bcea7d785a004eddd1](https://explorer.aglais.quip.network/tx/0xc01bc3dc7e2afa847eb0e80cf87835669e94af13415903bcea7d785a004eddd1) on Aglais. Both independent rebuilds and our own re-run on 2026-09-29 reproduced the fork flow and the live checks.
- **Time:** 23 min.
- **Key Quip call** (`flow.mjs:207-211`):
```js
const leaf = takeLeaf("approver"); // persisted BEFORE signing
// Deployed SHRINCS verifier (V4 adapter) binds statefulRawMessageHash(commitment, hash) over the caller hash.
const bound = ShrincsCodec.statefulRawMessageHash(approver.publicKeyCommitment, payoutHash);
const t = Date.now();
const sig = approver.signStatefulRawAt(bound, leaf);
```
- **What got in the way:** Quip has not deployed its account or Omnibus contracts on Aglais [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29), [C-SWP-01](https://explorer.aglais.quip.network/address/0xA7955981D5759a799267063110Be0F7AeCc26F8A)], Quip's faucet funds only Aglais and the docs give no Base Sepolia funding path [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)], and `execute()` pays the transfer value from the owner EOA rather than the smart account's own balance unless worked around [[C-TRL-08](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsWalletClient.js)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
