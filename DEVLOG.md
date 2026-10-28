# DEVLOG — Quip Network post-quantum wallet prototype

Start: 2026-09-28T12:04Z

## Sources consulted (in order)

## Commands / steps / errors

### 14:05 Research
1. WebSearch "Quip Network post-quantum smart account SDK" → hits: github.com/QuipNetwork/cpp-sdk, quip.gitbook.io/docs (basics, quickstart), account.quip.network, quip.network
2. WebSearch "quip.network docs testnet faucet" → quip.gitbook.io/docs/nodes/run-a-node-testnet, gitlab.com/quip.network/nodes.quip.network, press release about Quip's own quantum-classical testnet (Substrate-based, "Aglais" faucet)
3. WebFetch https://quip.gitbook.io/docs/getting-started/quickstart → **HTTP 404** (search engine indexes it but page is gone). DEAD END.
4. `curl https://api.github.com/orgs/QuipNetwork/repos` → relevant repos: ethereum-sdk (TS), hashsigs-ts, hashsigs-solidity, cpp-sdk, pqhybridsign, quip-validator (Substrate fork), faucet, explorer.quip.network
5. `git clone --depth 20` ethereum-sdk, hashsigs-ts, hashsigs-solidity into ./vendor
   - GitHub ethereum-sdk README = v0.1.7 (WOTS+ `QuipFactory`/`QuipWallet`, hardhat, networks: Sepolia/Base Sepolia/OP Sepolia + mainnets). Last commits are a *revert* of "feat/keysets".
   - Mentions env vars and "contact Rick" for deployer keys.
6. `npm view @quip.network/ethereum-sdk` → latest=0.1.7 but dist-tag **beta=0.3.0-beta.8** (modified 2026-09-15). `npm pack` of beta shows a totally different SDK: `./v1` (ERC-4337 EntryPoint v0.7, userOps), `./v1/shrincs` (SHRINCS hash-based sigs), `./deprecated/v0`. README says "Active Dev Branch: deploy/testnet" — **GitHub mirror main is stale vs npm**; README refers to SDK_README.md / DEPLOYMENTS.md which are NOT in the npm tarball nor on GitHub main.
   - OBSERVATION (fit): Quip "testnet" in press/nodes docs = Quip's own Substrate chain (quip-validator, Aglais faucet). The smart-account SDK targets *EVM* chains (Base Sepolia etc.) — two different "testnets".
7. Read npm tarball dist (no source/SDK_README shipped): `dist/src/v1/shrincs/*.d.ts` — ShrincsFactoryClient / ShrincsWalletClient / ShrincsSigner (viem-based). **Had to read compiled JS/d.ts instead of docs.**
8. `npm i @quip.network/ethereum-sdk@0.3.0-beta.8 viem tsx` in project.
9. On-chain probe (viem, public RPCs): Base Sepolia — WalletFactory 0xA2B2…8cc8 (proxy), ShrincsWalletImpl 0xc4E4…35E7, Verifier 0xF2f9…5567, Paymaster 0x430c…5890 all have code; `creationFee()=0`, `latestWalletImpl=0xc4E4…`, owner 0xc68B…6A26.
   OP Sepolia — **ShrincsWalletImplementation and PaymasterImpl have NO code**, although SDK comment says "live on Base Sepolia and OP Sepolia since 2026-08-27". Contradiction → chose Base Sepolia.
10. Cloned QuipNetwork/faucet: Substrate faucet (Sudo FaucetOps.mint), accepts 0x EVM addresses (pallet-revive mapped account). Only for Quip's own chain.
11. Cloned nodes.quip.network: found faucet.aglais.quip.network (GET /health → 200 ok) and stale faucet.testnet.quip.network (DNS dead).
12. Cloned QuipNetwork/chainlist: chainid-20033 "Aglais Testnet" rpc https://evm-rpc.testnet.quip.network:20049 / explorer explorer.testnet.quip.network → **DNS does not resolve (stale entry)**.
13. curl https://agls.quip.network → current endpoints: https://evm-rpc.aglais.quip.network:20049, https://explorer.aglais.quip.network, subscan.aglais.quip.network, portal.aglais.quip.network, new docs site https://developers.quip.network/docs
14. Aglais EVM RPC: eth_chainId=0x4e41 (20033) works. eth_getCode for EntryPoint v0.7, WalletFactory, ShrincsVerifier, ShrincsWalletImpl, CreateX → all `0x`. **KEY MISFIT: Quip's own testnet (with Quip faucet) has NO Quip smart-account contracts; the smart-account SDK's supported testnets (Base Sepolia) have NO Quip faucet.**
15. developers.quip.network/docs: quickstart, quip-sdk, quip-accounts, how-quip-fits-together. quip-sdk page: "install @quip.network/ethereum-sdk@beta (latest=2025 build predating current scheme)", hashsigs-wasm@rc. Accounts "live on the chain you already use (Ethereum, Base…)", "Your existing wallet… pays the fees". No mention of which testnet, no faucet guidance, no code example for creating an account.
   - use-with-ai page claims /llms-full.txt is "live today" → **404**. /llms.txt and .md mirrors → 200.
16. ShrincsPaymasterClient: sponsorship requires the paymaster *operator's* SHRINCS key (Quip-held). No public sponsorship endpoint documented → cannot use it for gasless onboarding.
17. `node gen-eoa.mjs` → fresh throwaway EOA in keys/eoa.json (for gas/"owner" role).
18. `git ls-remote` GitHub ethereum-sdk: branches include deploy/testnet. Checked out deploy/testnet: has SDK_README.md + DEPLOYMENTS.md, but they document the **WOTS+ `QuipSigner/QuipClient/createInMemoryBurnSet` API and v1 WOTS addresses (QuipFactory 0xE567…)**, which is NOT what npm beta.8 exports (`./v1` has no QuipSigner; SHRINCS is under `./v1/shrincs`, WOTS moved to deprecated). **No public source for the SHRINCS SDK or ShrincsWallet.sol found on GitHub** (GitLab mirror branches similarly). Only the compiled npm dist was usable.
19. hashsigs-wasm api.d.ts: `keygen(seed, maxSignatures=1024)`. Chose maxSignatures=64 for faster keygen (~4-7 s per keypair on M-series; two keypairs = main + ERC-1271). GUESS: no documented recommended value ("implementation parameter, not documented" per quip-accounts page).
20. Wrote quip-wallet.mjs (commands: init/info/create/fund/transfer/status/aglais-faucet).
    - `node quip-wallet.mjs init` → EOA 0x417532b34057aa4B0d047746437A56032A892323 (keys/eoa.json), SHRINCS mnemonic (keys/quip-shrincs.json, generated with SDK `generateMnemonic`)
    - ERROR 1: `factory.getShrincsWalletAddress()` returned 0x000…0 → it's a registry read (`wallets(commitment)`), not a prediction, despite the name. Workaround: use the exported pure fn `getShrincsWalletAddress(factory, statefulC, erc1271C, owner)` (CREATE3) for undeployed wallets. Predicted 0x5D923eD6b2FEE4631010d851D62d72AA60D761c1.
21. EOA balance on Base Sepolia = 0 → cannot do live txs yet. Started anvil fork to validate against the REAL deployed Quip contracts: `anvil --fork-url https://sepolia.base.org --chain-id 84532 --port 8546` + `cast rpc anvil_setBalance <eoa> 1 ETH` (fork only — not real funds).
    - ERROR 2: `create` → viem "Invalid parameters… eth_sendTransaction… No Signer available". Cause (read SDK dist): ShrincsFactoryClient/ShrincsWalletClient pass `account: <address string>` to `walletClient.writeContract`, so viem uses JSON-RPC (node-side) signing — only works with injected browser wallets (EIP-1193), not with a local key + public RPC. **SDK is effectively browser-wallet-only for writes.** Workaround: custom viem transport that intercepts eth_sendTransaction, signs locally with the throwaway key, and sends raw.
    - Fork: `create` → deployed at predicted 0x5D92…61c1 (gas ~500k, creationFee 0). `fund 0.01` → success. `transfer 0x…dEaD 0.001` (SDK prepareExecute) → success, leaf 1/64, gasUsed 296,470.
    - FINDING: SDK `execute`/`prepareExecute` sets msg.value = value + maxFee → **the EOA pays the transferred amount; the smart account's own balance is untouched** (stayed 0.01). For a "lockbox" wallet that is surprising and undocumented. Workaround: call the SDK's (non-public, JS-accessible) `wallet.buildExecuteCall()` then send with msg.value = maxFee only → fork transfer of 0.002 from the smart account's balance succeeded (leaf 2/64, gasUsed 263,376; account 0.01→0.008).
    - Negative test (neg-test.mjs): sign 0.001 transfer, tamper value to 0.005 → `simulateContract` reverts `InvalidSignature`. PQ signature is enforced on chain.
22. Faucet survey for Base Sepolia ETH (fresh key, no accounts): quicknode (requires mainnet balance), alchemy (login + mainnet balance), chain.link (wallet connect + mainnet balance), console.optimism.io superchain faucet (wallet/GitHub/World ID verification), l2faucet.com, triangleplatform (503), pk910 base (no DNS), ethereum-ecosystem.com (402). None usable headlessly without an account/captcha/mainnet balance. **No Quip-provided faucet for the chains the smart-account SDK supports.**
23. `node quip-wallet.mjs aglais-faucet` → POST https://faucet.aglais.quip.network/request {"dest":"0x4175…2323"} → 200, extrinsic 0xff88aca9bb33618e98430847886f0ec8492bcf9c800b7fb018d0afef1d280aed; EVM balance on Aglais = 9.999 AGLS. **Quip's own faucet works well for an EVM address** (no captcha/account).
24. EXPERIMENT (deviation, time-boxed): port Quip's smart-account stack to Aglais myself.
    - Aglais accepts raw EVM bytecode: `cast send --create 0x69602a…` → contract 0x5774c3ddacd5591146abfb01b19686509140134e, tx 0x8a2b01896f968628f4c1f9f57ac499f74f7bc37350fb5cc7e0bbbde9af0878be, gasUsed reported 324,791,736 (!), cost ≈0.326 AGLS for a 10-byte contract.
    - Found that ShrincsWallet, SHRINCS256sKeccak verifier, WalletFactory (+ERC1967Proxy) are **source-verified on https://base-sepolia.blockscout.com** (API /api/v2/smart-contracts/<addr>) — the only public source for the current contracts I found. Saved to vendor/bytecode/. WalletFactory uses solady CREATE3 internally (no CreateX needed). solc 0.8.33, cancun.
    - Wrote deploy-aglais.mjs (deploy verifier → factory impl(maxFee=1e18) → ERC1967Proxy(initialize(me)) → ShrincsWallet impl(factory, verifier) → vetImplementation).
    - ERROR 3: verifier deploy tx 0xcd03a9dc…8008 via viem: never mined, eth_getTransactionByHash=null, nonce stuck at 1; re-sending (cast --legacy, even 3 gwei) → `error code 1014: Priority is too low: (5 vs 5)` → tx is stuck in the Substrate tx pool and cannot be replaced by fee bump (substrate priority ignores gas price). eth_estimateGas for it = 338,582,720; block gasLimit reported as u64::MAX (meaningless).
    - …it WAS eventually mined in block 376804 (~5 min later): verifier at 0xbaEB060a213Ad4A3a15Bb242Ea66DE2aCa63aFF1, gasUsed 338,579,618. Aglais inclusion latency for big txs is minutes; raised receipt timeout to 15 min.
25. anvil (started by me) exited on its own between runs. Wrote demo-fork.sh: starts its own anvil fork, sets 1 fork-ETH on the EOA, runs info/create/fund/transfer(from account)/transfer --from-eoa/status/neg-test, kills anvil. Output → evidence/fork-run.log (all steps success; InvalidSignature on tamper).
26. Aglais port continued: deploy-aglais.mjs submitted WalletFactory impl deploy (~14:31). eth_estimateGas = 827,784,831 units (8 KB initcode). After >12 min still not included (nonce stays 2, blocks advancing ~6 s). No way to inspect the Substrate pool from the ETH RPC; eth_getTransactionByHash returns null for pooled txs. GUESS: large EVM deploys exceed per-block weight/proof-size on Aglais, or sit behind the pool without feedback.
27. WalletFactory impl deploy tx 0xa7c0e1df684c197dc022e4fa2583ea0c5697ac67460c74e125abd32bdadb863f: viem WaitForTransactionReceiptTimeoutError after 15 min; eth_getTransactionByHash = null; nonce still 2. **Gave up on the Aglais port** (time box). Remaining steps (factory proxy, 20 KB ShrincsWallet impl ≈ 2B "gas", vetImplementation) not attempted. The pooled tx may still land later; keys/aglais-deployment.json only records the verifier.
28. Wrote RESULT.md. Stopped my own background watchers; anvil instances I started are gone (demo-fork.sh kills its own). No Docker used.

## Summary of guesses / deviations
- Chose Base Sepolia (only chain with full SHRINCS stack) over Quip's own Aglais testnet (no contracts). Chose SDK @beta (docs-recommended) over @latest.
- maxSignatures=64, ERC-1271 key at derivation index 1, main key index 0 — guessed; not documented.
- Local-signing transport workaround (SDK assumes browser wallet).
- Called SDK non-public buildExecuteCall/send to spend the smart account's own balance.
- Used anvil fork + anvil_setBalance instead of real testnet ETH (no usable faucet).
- Pulled contract bytecode/source from Base Sepolia Blockscout; tried to self-deploy on Aglais (partially succeeded, then stuck in pool).
