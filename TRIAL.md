# s2-b

- **Round:** Round 5
- **Model:** MiMo-V2.5
- **Task:** Two-developer QuipSwap swap in the web app (screenshot-only), taker side
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Two-developer QuipSwap swap in the web app (screenshot-only), taker side | MiMo-V2.5 | account.quip.network, swap.quip.network (browsed only) | Blocked: no Quip Account created; after the app switched the wallet to Base mainnet, the persona did not switch back to Base Sepolia, and sign-in waited on a mainnet signature this wallet declines | 150 min | [C-R5-25, C-TRL-13, C-TRL-14, C-ACC-01, C-SWP-03, C-SWP-12]. The pair (with s2-a) reached no offer. Nothing to rebuild. |

## Trial card

- **Model:** MiMo-V2.5.
- **What it does:** Nothing was built. The persona read the docs and the two QuipSwap web apps, documented the switch to Base mainnet on connect and the "Finding your accounts / Reading your address book" screen that followed, and wrote `taker.md` asking the maker for a workaround. It never created a Quip Account. The session stopped before an account existed and before it wrote a final report.
- **Quip products and integration:** account.quip.network — NONE (the connect and sign-in step never completed); swap.quip.network — NONE (browsed only; its live list is Base mainnet only).
- **Evidence:** The taker wallet [0x105EebB7dC7357984960165B5EB6D0282C3CeC75](https://base-sepolia.blockscout.com/address/0x105EebB7dC7357984960165B5EB6D0282C3CeC75) has nonce 0, no code and 0.024 ETH on Base Sepolia, so no account was ever deployed, matching `taker.md` ("not yet created"). Its claims that `testnet.quip.network` and `sepolia.quip.network` do not resolve, and that the docs' `llms.txt` shows only the Aglais testnet, are true. Two statements overclaim: `taker.md` says it found no network selector in either app, but the account wizard has a Base Sepolia option (the maker session used it); and a claim that `swap.quip.network/balances` covers Base Sepolia was not independently re-checked. The first `RESULT.md` was never updated, so its amounts are stale. What the pair achieved: nothing past the maker's account setup. Neither side had an offer, and this side never had an account (see s2-a).
- **Time:** 150 min.
- **What got in the way:** On connect the app switched the wallet to Base mainnet; this session's wallet declines mainnet signatures, and the persona did not switch back to Base Sepolia, so the page stayed on "Finding your accounts" [[C-R5-25](https://account.quip.network/)]. The docs describe only the Aglais testnet and say nothing about Base Sepolia swaps [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap), [C-TRL-14](https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts#:~:text=A%20factory%20contract%20creates%20each%20account), [C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)]. The root `llms.txt` lists `quip-swap-sdk`, which the persona read about but did not use, while the SDK page says no swap SDK exists [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)]. swap.quip.network's live order book needs a Base mainnet account [[C-SWP-12](https://swap.quip.network/)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
