# p3-b

- **Round:** Round 5
- **Model:** GPT-6
- **Task:** Port a Base Sepolia tipping dApp to Quip and tip from a PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Port a Base Sepolia tipping dApp to Quip and tip from a PQ account | GPT-6 | Aglais EVM and faucet; ethereum-sdk signer only; a self-deployed SHRINCS verifier; its own account contract | Partly working: tips sent from a post-quantum account that is the builder's own contract, gated by a self-deployed Quip verifier; Quip's Account contracts not used | 97 min | The SDK signer's message binding does not match the public verifier; incompatible verifier branches [C-ACC-01, C-TRL-02, C-R5-15, C-SDK-24]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** Ports the same tipping dApp to Aglais (chain config, `wallet_addEthereumChain`, AGLS labels, an ERC-20 decimals fix) and adds a demo account contract, `QuipTipAccount`, gated by Quip's `SHRINCS256sKeccak` verifier, plus a localhost Node signing bridge so that a gas-paying ordinary account can submit tips whose `msg.sender` is the post-quantum account. It does not use Quip's WalletFactory or `ShrincsWallet`.
- **Quip products and integration:** Aglais EVM and Substrate RPC and faucet — NATIVE; `@quip.network/ethereum-sdk@beta` signer only — NATIVE (the SDK client is unusable on Aglais); `SHRINCS256sKeccak` verifier built from `hashsigs-solidity` `shrincs-main` — SELF_DEPLOYED; `QuipTipAccount` — FALLBACK (the builder's own account contract); `hashsigs-wasm` — NATIVE.
- **Evidence:** Four Aglais transactions, all status 1: `TipJar` deploy [0xc5f3573a078fc93711ddfe20cd78d0a8dbccb5ff9a69e089e442c0eb4aa88380](https://explorer.aglais.quip.network/tx/0xc5f3573a078fc93711ddfe20cd78d0a8dbccb5ff9a69e089e442c0eb4aa88380) (778,102,004 gas), and three tips from the post-quantum account, [0x22e949e7ac3f758ae0402e9d518aff33a5fcf9ebca8e8a97f99d4b6956bc5ccb](https://explorer.aglais.quip.network/tx/0x22e949e7ac3f758ae0402e9d518aff33a5fcf9ebca8e8a97f99d4b6956bc5ccb), [0xaf0e5ac9865cc44e04cf6e264b1dac996990836694a2238bf1f251c60a22633e](https://explorer.aglais.quip.network/tx/0xaf0e5ac9865cc44e04cf6e264b1dac996990836694a2238bf1f251c60a22633e) and [0x9684a7c4047a7344e79d931611e038f2ab61362038263ba161735fe5b80befd6](https://explorer.aglais.quip.network/tx/0x9684a7c4047a7344e79d931611e038f2ab61362038263ba161735fe5b80befd6) (the `Tipped` event names the account as tipper; account nonces 0, 1 and 2). The write-up says explicitly that this is not the official Quip Account, that it has no rotation or recovery, and that the post-quantum UI is localhost only. Earlier abandoned deployments were not checked individually (the builder discloses them as unfunded). First rebuild: works (`forge test` 8 of 8; a new verifier and post-quantum account deployed and a post-quantum tip succeeded, [0xd351a0f5fe50a2983e5f7dd986e1e16f3bb296fbb972d072fd85fff42b1fedd4](https://explorer.aglais.quip.network/tx/0xd351a0f5fe50a2983e5f7dd986e1e16f3bb296fbb972d072fd85fff42b1fedd4); the first `deploy.mjs` run failed with an RPC error and the rerun succeeded; the browser UI was not exercised). Second rebuild: works (every address, transaction, receipt status and event reproduced under independent RPC checks).
- **Time:** 97 min.
- **Key Quip call** (`src/QuipTipAccount.sol:35-38, 40-41, 44-45`, excerpt):
```solidity
function signedHash(address target, uint256 value, bytes calldata data) public view returns (bytes32) {
    return keccak256(abi.encodePacked(keccak256("shrincs-verify-stateful"), uint32(1),
        commitment, operationHash(target, value, data)));
}
...
function execute(address target, uint256 value, bytes calldata data, bytes calldata signature)
    external returns (bytes memory result)
...
    require(verifier.verify(abi.encodePacked(commitment), signedHash(target, value, data), signature)
        == IQuipVerifier.verify.selector, "invalid PQ signature");
```
- **What got in the way:** No official Account factory, verifier or CreateX on Aglais, and the SDK beta throws `UnsupportedNetworkError` for chain 20033 [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)]. The SDK signer binds the message to the commitment and suite before signing, but the public `shrincs-main` verifier does not, so a signature over the plain operation hash returns `0xffffffff` unless the caller reproduces the bound hash; no page gives the signed-bytes recipe, and two verifier branches are incompatible [[C-TRL-02](https://cdn.jsdelivr.net/npm/@quip.network/hashsigs-wasm@0.2.1-rc9/README.md), [C-R5-15](https://gitlab.com/quip.network/hashsigs-solidity/-/blob/oak-03-and-06/contracts/SHRINCSVerifier.sol)]. The `hashsigs-solidity` SHRINCS branch's `foundry.toml` lists `ignored_error_codes` that current Foundry rejects [[C-SDK-24](https://gitlab.com/quip.network/hashsigs-solidity/-/blob/0e89278f573a29f8341e1f5697ea73e0f8988d51/foundry.toml#L32-L40)]. Deploys on Aglais cost about 337M gas, and AGLS has 12 decimals on one layer and 18 on the other [[C-NET-01](https://developers.quip.network/llms.txt#:~:text=gas%20price%201%20gwei%2C%20backend%20pallet-revive), [C-NET-03](https://explorer.aglais.quip.network/tx/0x642489f4587ac1cf4316d455e735546af3390a7100ed63785d61f0ab328dbcfb), [C-TRL-33](https://faucet.aglais.quip.network/)]. Old `docs.quip.network` subpaths redirect to a doubled `/docs/docs` path that returns 404 [[C-R5-13](https://docs.quip.network/docs/getting-started/quip-sdk), [C-AGT-01](https://quip.gitbook.io/docs)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. `RESTORED.md` lists the files taken from the session log because the snapshot predates their last change. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
