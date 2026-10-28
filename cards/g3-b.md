# g3-b

- **Round:** Round 3
- **Model:** DeepSeek V4 Pro
- **Task:** Substrate-side AGLS transfer
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Substrate-side AGLS transfer | DeepSeek V4 Pro | Aglais Substrate RPC, pqhybridsign, faucet, Subscan | Works on testnet, but the CLI can report a failure after the transfer has finalized, because its confirmation loop skips blocks | 34 min | [C-R5-06, C-R5-07, C-R5-05]. Both rebuilds found the confirmation bug and rated it partly working. |

## Trial card

- **Model:** DeepSeek V4 Pro (all model calls).
- **What it does:** A dependency-light Rust CLI (`agls-tool`) that talks Substrate JSON-RPC to the official Aglais bootnode. It generates Quip H4 hybrid (sr25519 plus FN-DSA-512) keys, requests faucet funds, reads balance and nonce from storage, and hand-builds, signs and submits a `Balances.transfer_allow_death` extrinsic, printing Subscan links.
- **Quip products and integration:** Aglais Substrate RPC, `pqhybridsign` (H4 hybrid signing), the faucet and Subscan — NATIVE.
- **Evidence:** Transfer extrinsic [0x733c539ac9a5f90b877bb7e71162ca664e7c418503dccda2e4405c0b03b2b68f](https://subscan.aglais.quip.network/sub/extrinsic/0x733c539ac9a5f90b877bb7e71162ca664e7c418503dccda2e4405c0b03b2b68f) (389639-1, 2 AGLS, fee 978975742 planck) and faucet extrinsic 389516-1; balances matched and Subscan indexes the transfer. The builder's claim that the Subscan API "is not publicly routed" was wrong: it answers over POST. First rebuild: partly working. Build and 7 tests passed and its own transfer [0xa70c583e73e87787436e5e8a7297554cb59011fd1f298d1ca8d13d2c23aa9ad1](https://subscan.aglais.quip.network/sub/extrinsic/0xa70c583e73e87787436e5e8a7297554cb59011fd1f298d1ca8d13d2c23aa9ad1) (390918-1) finalized, but the CLI exited with an error saying the transaction was not seen, because its confirmation loop checks only the latest finalized block on each poll and skipped the block. Second rebuild: partly working, for the same confirmation bug (its transfer was finalized at 391312-1).
- **Time:** 34 min.
- **What got in the way:** The docs never say Aglais extrinsics need an H4 hybrid signature or how the account id is derived [[C-R5-06](https://developers.quip.network/llms.txt)]. The Substrate envelope crates are not on crates.io [[C-R5-07](https://crates.io/api/v1/crates/quip-transaction-crypto)]. The docs.rs text gives wrong composite sizes for the FN-512 suites [[C-R5-05](https://docs.rs/pqhybridsign/0.0.0-rc9/pqhybridsign/)].
