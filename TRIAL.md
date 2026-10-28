# v2-b

- **Round:** Round 3
- **Model:** GPT-6
- **Task:** Solidity dev (screenshot-only): ERC-20 on the testnet
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Solidity dev (screenshot-only): ERC-20 on the testnet | GPT-6 | Aglais EVM, faucet and explorer (plain EVM) | Built and working on testnet | 81 min | [C-TRL-27, C-TRL-28, C-R5-19, C-NET-03, C-R5-20]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** A Foundry project with an owner-mintable OpenZeppelin 5 ERC-20 ("Aglais Demo Token", AGDEMO) and three tests. The README has the `forge create` and `cast send` commands to deploy it on Aglais and mint 100 tokens to a second address. Quip is used only as an EVM chain, faucet and explorer.
- **Quip products and integration:** Aglais EVM RPC, faucet and Blockscout explorer — CHAIN_ONLY (one rebuild also tagged the faucet and explorer NATIVE).
- **Evidence:** Deploy [0x744357e28f70dc60e40cc0d65c99789bc216c4c4b21e325f3586392ddf6067f6](https://explorer.aglais.quip.network/tx/0x744357e28f70dc60e40cc0d65c99789bc216c4c4b21e325f3586392ddf6067f6) (block 391399) creating [0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d](https://explorer.aglais.quip.network/address/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d), and mint [0xd98e715a51c93f32c694c708c90a47fbfae4b9aeb93deb99f1750d363fc7bffd](https://explorer.aglais.quip.network/tx/0xd98e715a51c93f32c694c708c90a47fbfae4b9aeb93deb99f1750d363fc7bffd) (block 391409, 1e20 units). Name, symbol, owner and balance match. The builder's write-up says openly that source was not verified on the explorer and the web faucet form did not fund the wallet while the documented `POST /request` did. First rebuild: works, with its own deploy [0x16d16d0b8227a97222f7171094d4ebf3c6dff8eb9761be9a0e42735fb49db2e9](https://explorer.aglais.quip.network/tx/0x16d16d0b8227a97222f7171094d4ebf3c6dff8eb9761be9a0e42735fb49db2e9) and mint [0x219a18065e9032a90ad2557e48a44440a96bbf1d4bddace56b0cf460ae0f57a3](https://explorer.aglais.quip.network/tx/0x219a18065e9032a90ad2557e48a44440a96bbf1d4bddace56b0cf460ae0f57a3). Second rebuild: works. The builder's deploy and mint reproduce on the live RPC, and a fresh deploy from a new faucet-funded key succeeded ([0xEF020Ba5AbD5cEcEF8FbaC611dB25b020DAFBCa4](https://explorer.aglais.quip.network/address/0xEF020Ba5AbD5cEcEF8FbaC611dB25b020DAFBCa4)).
- **Time:** 81 min.
- **What got in the way:** The Quickstart has no EVM or Foundry path and no RPC, faucet or explorer coordinates [[C-TRL-27](https://developers.quip.network/docs/llms.txt)], and the Aglais portal is not linked from the homepage or docs [[C-TRL-28](https://agls.quip.network)]. The faucet README covers only operator usage [[C-R5-19](https://github.com/QuipNetwork/faucet/blob/main/README.md)]. `nodes.quip.network`, linked from it, fails TLS [[C-TRL-39](https://nodes.quip.network/chain-specs/aglais-network.json)]. An ERC-20 deploy uses hundreds of millions of gas units with no explanation [[C-NET-03](https://explorer.aglais.quip.network/tx/0x642489f4587ac1cf4316d455e735546af3390a7100ed63785d61f0ab328dbcfb)]. Source verification on the explorer is undocumented [[C-TRL-35](https://explorer.aglais.quip.network/api/v2/smart-contracts/verification/config)]. An explorer address summary said 0 transactions while its Transactions tab listed 2 [[C-R5-20](https://explorer.aglais.quip.network/api/v2/addresses/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d/counters)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
