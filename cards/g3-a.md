# g3-a

- **Round:** Round 3
- **Model:** Claude Sonnet 5.5
- **Task:** Substrate-side AGLS transfer
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Substrate-side AGLS transfer | Claude Sonnet 5.5 | xqsa, quip-signer, Aglais Substrate RPC, faucet, Subscan | Built and working on testnet | 4 min | No Substrate transfer example; the signing helpers are undocumented xqsa internals [C-R5-06, C-AGT-05, C-R4-13]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A small Python CLI (`quipctl.py`) that creates throwaway Quip hybrid keystores, reads AGLS balances over the Aglais Substrate RPC, requests faucet drips, and sends a `Balances.transfer_keep_alive` signed with Quip's sr25519 plus FN-DSA-512 hybrid scheme, then prints a Subscan link. It reuses xqsa's internal signing and metadata helpers, because standard Substrate signing is not accepted by the chain.
- **Quip products and integration:** `xquad[quip]` / `xqsa` 0.4.1, `quip-signer` 0.3.0, the Aglais Substrate RPC, faucet and Subscan — NATIVE.
- **Evidence:** Transfer extrinsic [0xeebe8a694cd13786557f1ec9126597067d9eed772b33583e70b0cd6105579478](https://subscan.aglais.quip.network/sub/extrinsic/0xeebe8a694cd13786557f1ec9126597067d9eed772b33583e70b0cd6105579478) (block 389360, 0.5 AGLS, success, finalized, fee as claimed) and faucet extrinsic [0xfef8bc47a7288ca791c5d7cfe315e5b6e288924ab0967e15a095e37b2672d37e](https://subscan.aglais.quip.network/sub/extrinsic/0xfef8bc47a7288ca791c5d7cfe315e5b6e288924ab0967e15a095e37b2672d37e) (block 389354); balances matched (9.499030807259 and 0.5 AGLS). The "show it on an explorer" part was checked through the Subscan API plus a deep link; the UI itself was not rendered, as the builder disclosed. First rebuild: works, with its own transfer [0x835f45b8cb5296006a3b1ce97619d4f627c0eb1dd6957d12a93b948cdd5e9c48](https://subscan.aglais.quip.network/sub/extrinsic/0x835f45b8cb5296006a3b1ce97619d4f627c0eb1dd6957d12a93b948cdd5e9c48) (block 390924). Second rebuild: works.
- **Time:** 4 min.
- **What got in the way:** The docs give no direct AGLS balance query or Substrate transfer example, and the hybrid-signing helpers that make it possible are undocumented xqsa internals [[C-R5-06](https://developers.quip.network/llms.txt)]. The Substrate endpoints, decimals and explorer URL are not in the developer docs [[C-AGT-05](https://developers.quip.network/docs/llms-full.txt)]. Standard `substrate-interface` cannot decode Aglais account storage [[C-R4-13](https://pypi.org/project/xquad/0.4.1/)].
