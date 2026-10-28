# g1-a

- **Round:** Round 3
- **Model:** Claude Opus 5.5
- **Task:** Testnet swap with quip-swap-sdk
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Testnet swap with quip-swap-sdk | Claude Opus 5.5 | quip-swap-sdk, ethereum-sdk@beta | Partly working: a swap settled against Quip's real contracts on a local fork; no Base Sepolia gas for the live run | 9 min | [C-ACC-03, C-ACC-06, C-SWP-03, C-SWP-05]. Both rebuilds rated it partly working, for the same reason. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** A TypeScript CLI that makes two throwaway owner accounts and two SHRINCS Quip wallets, deploys the wallets through Quip's wallet factory, and runs a hashlocked same-chain ETH swap through QuipSwap's Omnibus contract on Base Sepolia (each commit sent through a wallet's post-quantum-signed `execute`, then one claim). It also has a read-only probe of the live contracts. It was only proven on a local fork of Base Sepolia, because the throwaway accounts could not get Base Sepolia ETH.
- **Quip products and integration:** QuipSwap via `@quip.network/quip-swap-sdk` and Quip Accounts via `@quip.network/ethereum-sdk@beta` — NATIVE contracts, exercised on a local fork only; no live transaction.
- **Evidence:** Live reads confirmed the Omnibus [0xA7955981D5759a799267063110Be0F7AeCc26F8A](https://base-sepolia.blockscout.com/address/0xA7955981D5759a799267063110Be0F7AeCc26F8A) and the wallet factory [0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8](https://base-sepolia.blockscout.com/address/0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8) have code on Base Sepolia and none on Aglais. The builder's swap hashes are labelled fork-only and cannot be checked on a public chain. The two owner accounts have balance 0 and nonce 0 on Base Sepolia, as the builder said. First rebuild: partly working. It re-ran the swap on its own fork of Base Sepolia against Quip's real contracts and got a settled swap (claim 0x3443fe14989344d33b3921b8eafc533bb0a76ca4bdeeb47ebb692169f90a4e5c, fork only); the live `swap` command stopped with the same "no test ETH" message. Second rebuild: partly working, for the same reason; it also reproduced a settled swap on a fork.
- **Time:** 9 min.
- **What got in the way:** Quip's only faucet funds Aglais, where neither contract is deployed, so the live swap had no gas [[C-ACC-03](https://developers.quip.network/llms.txt#:~:text=Dispenses%2010%20AGLS%2C%20rate%2Dlimited%20per%20destination)]. The Quip Accounts SDK passes a bare address as the account, so local private-key signers fail and the builder needed a workaround [[C-ACC-06](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsFactoryClient.d.ts)]. The docs say no swap SDK is published, but it is on npm [[C-SWP-03](https://developers.quip.network/docs/getting-started/quip-sdk#:~:text=no%20swap%20SDK%20is%20published%20today)]. The swap SDK README links files that are not shipped [[C-SWP-05](https://cdn.jsdelivr.net/npm/@quip.network/quip-swap-sdk@0.1.0-beta.9/README.md#:~:text=For%20integration%20instructions%20and%20end-to-end%20walkthroughs)] and the package has no public source repository [[C-SWP-06](https://www.npmjs.com/package/@quip.network/quip-swap-sdk?activeTab=versions)]. The QuipSwap page gives no addresses or supported chains [[C-TRL-13](https://developers.quip.network/docs/quip-interlock-protocol/quipswap)]. A plain install gets older builds [[C-SWP-04](https://www.npmjs.com/package/@quip.network/quip-swap-sdk?activeTab=versions), [C-SDK-10](https://www.npmjs.com/package/@quip.network/ethereum-sdk?activeTab=versions)]. The wallet implementation on OP Sepolia differs from the SDK default [[C-ACC-02](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/addresses.js)]. Swap windows and the SDK's default 1800 s buffer are undocumented [[C-SWP-10](https://cdn.jsdelivr.net/npm/@quip.network/quip-swap-sdk@0.1.0-beta.9/dist/index.d.ts)].
