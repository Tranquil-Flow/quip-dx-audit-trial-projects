# p3-a

- **Round:** Round 5
- **Model:** Claude Opus 5.5
- **Task:** Port a Base Sepolia tipping dApp to Quip and tip from a PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Port a Base Sepolia tipping dApp to Quip and tip from a PQ account | Claude Opus 5.5 | Aglais EVM and faucet; ethereum-sdk (SHRINCS wallet) on Account contracts it deployed itself | Works on Aglais, but only on Account contracts it deployed itself; PQ tips by CLI, the browser UI tips from an ordinary wallet | 56 min | No Account contracts on Aglais and the SDK rejects chain 20033; SSH-pinned dependency in the SDK's `foundry.toml`; forge's gas estimate too low [C-ACC-01, C-ACC-06, C-ACC-05, C-PER-03, C-NET-01]. Independently rebuilt and confirmed (the second rebuild needed a manual repair after an RPC timeout in the deploy script). |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** Ports a Base Sepolia ERC-20 tipping dApp (a `TipJar` contract and an ethers v6 frontend) to Aglais: the contract is unchanged, and the frontend gets the chain config, `wallet_addEthereumChain` and AGLS labels. A Node CLI deploys a Quip SHRINCS account stack that the builder compiled from the SDK's GitLab `v1.0.0-rc.2` branch, then tips the `TipJar` from a post-quantum Quip account through the wallet's direct owner-execute path (no ERC-4337 bundler). The browser UI tips from an ordinary wallet; post-quantum tipping is CLI only.
- **Quip products and integration:** Aglais EVM RPC and explorer — CHAIN_ONLY; Aglais faucet — NATIVE; `@quip.network/ethereum-sdk@beta` 0.3.0-beta.8 (SHRINCS wallet client and signer, with address overrides and a local-signing shim) — NATIVE; Quip Account contracts (WalletFactory, wallet implementation, SHRINCS verifier from `v1.0.0-rc.2`) — SELF_DEPLOYED; `hashsigs-wasm` through the SDK — NATIVE.
- **Evidence:** All claimed Aglais transactions have status 1: `TipJar` deploy [0x7acfd805309ab5b98f796eed907e8c9f9b05866b361ab5b0f7e8e9f11eef614a](https://explorer.aglais.quip.network/tx/0x7acfd805309ab5b98f796eed907e8c9f9b05866b361ab5b0f7e8e9f11eef614a) (336,972,004 gas), the verifier-implementation vetting transaction [0xa90920e48468f74f4929e466dda86f0527c92edc571556fded30a3c84be1ee45](https://explorer.aglais.quip.network/tx/0xa90920e48468f74f4929e466dda86f0527c92edc571556fded30a3c84be1ee45), the post-quantum tip [0x855d5f3685ef3fda548af703e0a219c4bddb0128881ca8436fc14ecf0a72f8fe](https://explorer.aglais.quip.network/tx/0x855d5f3685ef3fda548af703e0a219c4bddb0128881ca8436fc14ecf0a72f8fe) (20,044,150 gas; the `Tipped` event names the Quip account as tipper, 0.01 AGLS), an ordinary-wallet tip [0xf1db7f57e95523f1b28ea6a509c0507a0fcd969fbb0b0d9b150877958a26b158](https://explorer.aglais.quip.network/tx/0xf1db7f57e95523f1b28ea6a509c0507a0fcd969fbb0b0d9b150877958a26b158), and the creator's withdrawal [0x549535d216960c8d7ed85c49894e3169f4d37656a1e455b4def3fe253a9f56f9](https://explorer.aglais.quip.network/tx/0x549535d216960c8d7ed85c49894e3169f4d37656a1e455b4def3fe253a9f56f9) (its receipt shows gas used 0, an RPC quirk the builder also notes). Contract code is present at every claimed address. The write-up says plainly that the account stack is the builder's own deployment and that the browser UI was not tested in a real browser wallet. First rebuild: works (it ran the tip script from a clean `npm install` with a fresh owner key and mnemonic against the builder's deployed stack, because the factory's `createWallet` is permissionless: a new Quip account [0x8Fb5fAbDa88C6a4697304d3452C3Ca09BcAE0Fcb](https://explorer.aglais.quip.network/address/0x8Fb5fAbDa88C6a4697304d3452C3Ca09BcAE0Fcb) was created and a post-quantum tip succeeded, [0x43cac9ac35848b9299f9374e4a207e96127991754cfbae48e22c7320aab2096c](https://explorer.aglais.quip.network/tx/0x43cac9ac35848b9299f9374e4a207e96127991754cfbae48e22c7320aab2096c); it did not redeploy the stack or rerun `forge test`). Second rebuild: works after a manual repair. An RPC timeout during the stack deploy script left the factory without a verifier address, because the script carried on after the error; after redeploying the missing parts by hand, a new PQ tip succeeded.
- **Time:** 56 min.
- **Key Quip call** (`quip-client/tip.mjs:62-65, 78, 90, 92`, excerpt):
```js
const factory = new ShrincsFactoryClient({
  publicClient, walletClient, account: owner.address, chainId: aglais.id,
  factoryAddress: stack.walletFactory, walletImplementation: stack.shrincsWalletImpl,
});
...
  wallet = await factory.createShrincsWallet(walletParams);
...
const prepared = await wallet.prepareExecute({ target: TIPJAR, value, data });
...
const receipt = await prepared.send();
```
- **What got in the way:** No Account contracts exist on Aglais and the SDK rejects chain 20033 with `UnsupportedNetworkError`, so the builder had to build and deploy the stack itself [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)]. The SDK passes the account as a bare address, so local-key signing fails and needed a signing shim [[C-ACC-06](https://cdn.jsdelivr.net/npm/@quip.network/ethereum-sdk@0.3.0-beta.8/dist/src/v1/shrincs/shrincsFactoryClient.d.ts)]. The current account source is only on a GitLab release branch, while GitHub `main` is stale [[C-ACC-05](https://gitlab.com/quip.network/ethereum-sdk/-/blob/355f888cdffb643f6acdd50241fc44a93b37e230/package.json#L1-5)], and that branch's `foundry.toml` pins a public repository over an SSH URL, so `forge soldeer install` needs GitLab SSH credentials [[C-PER-03](https://gitlab.com/quip.network/ethereum-sdk/-/blob/150e4d44a78774764c9abf5c407988a1878ec1ea/foundry.toml#L43)]. `forge script --broadcast` failed with `1010 Invalid Transaction` because forge's local gas estimate is far too low, while `cast send --create` worked [[C-NET-01](https://developers.quip.network/llms.txt#:~:text=gas%20price%201%20gwei%2C%20backend%20pallet-revive), [C-NET-02](https://developers.quip.network/llms.txt#:~:text=gas%20price%201%20gwei%2C%20backend%20pallet-revive), [C-NET-03](https://explorer.aglais.quip.network/tx/0x642489f4587ac1cf4316d455e735546af3390a7100ed63785d61f0ab328dbcfb), [C-TRL-27](https://developers.quip.network/docs/llms.txt)]. The Quickstart still says the smart contract layer is being built out [[C-SDK-07](https://developers.quip.network/docs/getting-started/quickstart#:~:text=Right%20now%20there%27s%20not%20much%20to%20do%20other%20than%20mine%20blocks)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
