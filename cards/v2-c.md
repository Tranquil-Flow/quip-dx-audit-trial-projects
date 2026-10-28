# v2-c

- **Round:** Round 4
- **Model:** MiniMax-M3
- **Task:** Solidity dev (screenshot-only): ERC-20 on the testnet
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Solidity dev (screenshot-only): ERC-20 on the testnet | MiniMax-M3 | Aglais EVM, faucet and explorer (plain EVM) | Built and working on testnet | 16 min | Found the RPC and chain id only on agls.quip.network, after four docs pages without them [C-TRL-27, C-TRL-28, C-TRL-34, C-TRL-35]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiniMax-M3.
- **What it does:** A Foundry project with a hand-written ERC-20 ("Quip Demo Token", QUIPDEMO, public mint) deployed to Aglais, with 500 tokens minted and 1 transferred to a second address, and the transactions and token pages checked on the Aglais Blockscout explorer. Quip is used only as an EVM chain, faucet and explorer.
- **Quip products and integration:** Aglais EVM RPC, faucet and Blockscout explorer — CHAIN_ONLY (one rebuild also tagged the faucet and explorer NATIVE).
- **Evidence:** Deploy [0x730459e15b455e2fbf6b9d3e3ed2c991acf4539d4409288cbd172c3371e6c53e](https://explorer.aglais.quip.network/tx/0x730459e15b455e2fbf6b9d3e3ed2c991acf4539d4409288cbd172c3371e6c53e) (block 416994) creating [0x9787B6D583419ee470e75BE9DEe85907B13feA73](https://explorer.aglais.quip.network/address/0x9787B6D583419ee470e75BE9DEe85907B13feA73), mint [0xfec447632849a849255c8c5c76846471d98489579632b771294702885cb3b6a2](https://explorer.aglais.quip.network/tx/0xfec447632849a849255c8c5c76846471d98489579632b771294702885cb3b6a2) (block 416995) and transfer [0x5d6257fd213aeb605c141e23fcdbd638ee2bd05e06a18ec29335e9f41427d278](https://explorer.aglais.quip.network/tx/0x5d6257fd213aeb605c141e23fcdbd638ee2bd05e06a18ec29335e9f41427d278) (block 417029), all status 1; the balances (999,999 and 501 tokens) match. The builder's write-up says the contract was "verified" on the explorer; it was seen there, but its source is not verified. One claim was wrong: the write-up says agls.quip.network advertises an `explorer.agls.quip.network` host, but the page shows `explorer.aglais.quip.network`. First rebuild: works, with its own deploy [0xd26a827f84d884cb9ac9492531e77fcef57ac924a98c82699667084fda304424](https://explorer.aglais.quip.network/tx/0xd26a827f84d884cb9ac9492531e77fcef57ac924a98c82699667084fda304424) and mint [0x0d1f9aeb275a3c3352ff10f63fb0820b65befe5372b9ec6164cf83885cc6e7d2](https://explorer.aglais.quip.network/tx/0x0d1f9aeb275a3c3352ff10f63fb0820b65befe5372b9ec6164cf83885cc6e7d2). Second rebuild: works, with its own deploy [0xd74a9022fcfa923f79dc996b89b00f687d8d13753a403cac8e3b77ae09634cdf](https://explorer.aglais.quip.network/tx/0xd74a9022fcfa923f79dc996b89b00f687d8d13753a403cac8e3b77ae09634cdf) creating [0x2B2A6B30B327e6D973FA3CF28079E3B8FCa29529](https://explorer.aglais.quip.network/address/0x2B2A6B30B327e6D973FA3CF28079E3B8FCa29529), a mint and a transfer; the deployed code matched a fresh build.
- **Time:** 16 min.
- **Key Quip call** (`erc20-quip/foundry.toml:6-12`, excerpt):
```toml
[rpc_endpoints]
agls = "https://evm-rpc.aglais.quip.network:20049"

[etherscan]
# Blockscout-based, no API key required.
agls = {key = "", url = "https://explorer.aglais.quip.network/api", chain = 20033}
```
- **What got in the way:** The developer docs have no Solidity deploy guide, and the Quickstart, Quip SDK and Run a Node pages give no RPC or chain id; the builder found them only on agls.quip.network, through a search result [[C-TRL-27](https://developers.quip.network/docs/llms.txt), [C-TRL-28](https://agls.quip.network)]. agls.quip.network lists the `:20049` RPC form, the bare host also works, and neither is marked preferred [[C-TRL-34](https://agls.quip.network/)]. Contract verification on the explorer is not documented [[C-TRL-35](https://explorer.aglais.quip.network/api/v2/smart-contracts/verification/config)].
