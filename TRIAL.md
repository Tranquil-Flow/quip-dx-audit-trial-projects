# h2-a

- **Round:** Round 2
- **Model:** GLM-5.2
- **Task:** Solidity dev: deploy and mint an ERC-20 on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Solidity dev: deploy and mint an ERC-20 on Aglais | GLM-5.2 | Aglais EVM, faucet and explorer (plain EVM) | Built and working on testnet; source-verified on Blockscout | ~14 min | No EVM deploy guide. The deploy used ~791M gas, and the storage deposit is not explained [C-TRL-27, C-NET-03, C-TRL-30]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GLM-5.2.
- **What it does:** A dependency-free ERC-20 ("Aglais Trial Token") deployed with Foundry to Aglais, minted to a second address, and verified on Blockscout. No Quip SDK used.
- **Quip products and integration:** Aglais EVM RPC, faucet, Blockscout explorer — CHAIN_ONLY.
- **Evidence:** deploy tx [0xac573b121f66a2e8fbc5775727958a106d323041ad0c6fb6e4f6e1b3d8844ce1](https://explorer.aglais.quip.network/tx/0xac573b121f66a2e8fbc5775727958a106d323041ad0c6fb6e4f6e1b3d8844ce1) to contract [0xe50E4bc48224029B528552F54D593FA8025D6118](https://explorer.aglais.quip.network/address/0xe50E4bc48224029B528552F54D593FA8025D6118) (source-verified on Blockscout), mint tx [0xdd7fcef6442086c74198a5b97af7f881fc22e83721453bb66b5b2cff7699da62](https://explorer.aglais.quip.network/tx/0xdd7fcef6442086c74198a5b97af7f881fc22e83721453bb66b5b2cff7699da62). Both independent rebuilds independently deployed and minted fresh copies; one rebuild also source-verified its copy on Blockscout.
- **Time:** 14 min.
- **Key Quip call** (the builder's write-up, "How to run it"):
```bash
forge create --broadcast --rpc-url $RPC --chain-id 20033 \
  --private-key $PK --gas-price 1000000000 src/AGLS20.sol:AGLS20

cast send <TOKEN> "mint(address,uint256)" 0x1bc89f594BdB52FbDd99f86A8AD76FFE1925966E 500ether \
  --rpc-url $RPC --chain-id 20033 --private-key $PK --gas-price 1000000000
```
- **What got in the way:** No EVM deploy guide in the docs, and developers.quip.network, llms.txt and agls.quip.network do not explain the very high deploy gas (790,996,446 for this small ERC-20) or the storage deposit, which Aglais counts in gas; the quip-validator repo's pallet-revive design note lists the deposit rates and gas scale [[C-TRL-27](https://developers.quip.network/docs/llms.txt), [C-NET-03](https://explorer.aglais.quip.network/tx/0x642489f4587ac1cf4316d455e735546af3390a7100ed63785d61f0ab328dbcfb), [C-TRL-30](https://explorer.aglais.quip.network/tx/0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4)].

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
