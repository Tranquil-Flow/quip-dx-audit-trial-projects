# h2-b

- **Round:** Round 2
- **Model:** MiniMax-M3
- **Task:** Solidity dev: deploy and mint an ERC-20 on Aglais
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Solidity dev: deploy and mint an ERC-20 on Aglais | MiniMax-M3 | Aglais EVM, faucet and explorer (plain EVM) | Built and working on testnet | ~18 min | Same; two mints at a 2M gas limit failed with status 0 and no reason [C-TRL-27, C-NET-03, C-TRL-30]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** MiniMax-M3.
- **What it does:** The same owner-mintable ERC-20 pattern (QuipToken/QUIPT), deployed and minted with Foundry, visible on Blockscout.
- **Quip products and integration:** Aglais EVM RPC, faucet, Blockscout explorer — CHAIN_ONLY.
- **Evidence:** deploy tx [0x4233f9b40a342729dd7f8c414e97ce358d7a78bf741a32d7004a438b2bf89abc](https://explorer.aglais.quip.network/tx/0x4233f9b40a342729dd7f8c414e97ce358d7a78bf741a32d7004a438b2bf89abc) to contract [0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE](https://explorer.aglais.quip.network/address/0xbF42E7A9A38a94ec0A1927Aae69487F96e54aFAE), mint tx [0xc14f824e22585898f6a68c68b8cf0129ec4de291ac5a85e5be7ab542fac6a769](https://explorer.aglais.quip.network/tx/0xc14f824e22585898f6a68c68b8cf0129ec4de291ac5a85e5be7ab542fac6a769). The contract is not source-verified. Both independent rebuilds deployed and minted fresh copies.
- **Time:** 18 min.
- **Key Quip call** (`src/QuipToken.sol:28-32, 62-64`):
```solidity
constructor(uint256 _initialSupply) {
    owner = msg.sender;
    overrideTotal = _initialSupply; // historical ceiling, set at deploy
    _mint(msg.sender, _initialSupply);
}
...
function mint(address to, uint256 value) external onlyOwner {
    _mint(to, value);
}
```
- **What got in the way:** Same missing deploy guide and very high deploy gas as `h2-a` [[C-TRL-27](https://developers.quip.network/docs/llms.txt), [C-NET-03](https://explorer.aglais.quip.network/tx/0x642489f4587ac1cf4316d455e735546af3390a7100ed63785d61f0ab328dbcfb), [C-TRL-30](https://explorer.aglais.quip.network/tx/0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4)]; two mint attempts at a 2M gas limit failed with status 0 and no reason given, and the mint went through only when retried at a 6M limit.

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
