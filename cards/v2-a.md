# v2-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** Solidity dev (screenshot-only): ERC-20 on the testnet
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Solidity dev (screenshot-only): ERC-20 on the testnet | Claude Sonnet 5.5 | none | Blocked: never found the EVM RPC, faucet or explorer on its docs path; nothing built | 10 min | [C-TRL-28, C-AGT-05, C-SDK-07, C-R5-19]. Nothing to rebuild. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** Nothing was built. The persona searched for an EVM RPC, faucet and explorer, did not find them and stopped before creating a Foundry project, about 10 minutes into a roughly 75-minute budget.
- **Quip products and integration:** NONE (docs and READMEs read only).
- **Evidence:** No transactions or contracts. The throwaway wallet has balance 0 and nonce 0 on the Aglais EVM RPC. Claims checked: the bootnode RPC returns "Method not found" for `eth_chainId`, and `nodes.quip.network` fails TLS. The agent's conclusion was too strong: the EVM RPC works, and Quip's testnet page is linked from the Submit a Job page, just not on this developer's path. First rebuild: nothing to rebuild (no code). Second rebuild: nothing to rebuild (no code).
- **Time:** 10 min.
- **What got in the way:** The docs path for an EVM developer never gives the Aglais RPC, chain id, faucet or explorer [[C-TRL-28](https://agls.quip.network), [C-AGT-05](https://developers.quip.network/docs/llms-full.txt)]. The Quickstart implies smart contracts cannot be used yet [[C-SDK-07](https://developers.quip.network/docs/getting-started/quickstart#:~:text=Right%20now%20there%27s%20not%20much%20to%20do%20other%20than%20mine%20blocks)]. The faucet README gives no public faucet URL and points to `nodes.quip.network`, which fails TLS [[C-R5-19](https://github.com/QuipNetwork/faucet/blob/main/README.md)]. The only RPC it found is Substrate-only [[C-TRL-38](https://gitlab.com/quip.network/quip-validator/-/blob/c236a6866951ea29a91c281188883daed928bc7b/README.md#L7)]. The blog links to the retired GitBook docs [[C-TRL-10](https://quip.network/blog/testnet-is-live)]. Web search returned unrelated results [[C-AGT-03](https://quip.gitbook.io/docs)].
