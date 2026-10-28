# DEVLOG — Quip post-quantum account PoC

Start: 2026-09-28 10:59 CEST. Env: macOS arm64, node v22.22.2, python 3.14.4.

## Sources consulted (in order)
1. WebSearch "Quip Network post-quantum account testnet developer docs" → press releases, quip.network, mention of quip.gitbook.io/docs
2. https://quip.gitbook.io/docs → **404** (dead link from search/press)
3. https://quip.network/ → links to developers.quip.network/docs, github.com/quipnetwork, account.quip.network
4. https://developers.quip.network/docs → sidebar
5. https://api.github.com/orgs/quipnetwork/repos → repo list (ethereum-sdk, hashsigs-*, faucet, chains, quip-validator, explorer.quip.network ...)
6. https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts → Quip Accounts = smart-contract wallets (SHRINCS hash-based sigs, ERC-4337) on existing chains
7. https://developers.quip.network/docs/getting-started/quip-sdk → `npm install @quip.network/ethereum-sdk@beta`, `@quip.network/hashsigs-wasm@rc` ("latest" tag is stale 2025 build!)
8. https://developers.quip.network/docs/getting-started/quickstart (no concrete testnet/RPC/faucet info)
9. github.com/quipnetwork/ethereum-sdk (default branch README is OLD WOTS+/hardhat version; package README says active dev branch is `deploy/testnet`)
10. npm pack @quip.network/ethereum-sdk@beta (0.3.0-beta.8) + hashsigs-wasm@rc (0.2.1-rc9) → read README + dist (vendor/pkgs)
11. github.com/quipnetwork/faucet README → faucet is for Quip's own *Substrate* dev chains (pallet-revive EVM, hybrid sr25519+FN-DSA-512 sigs); no public URL given
12. github.com/quipnetwork/chains → just a fork of ethereum-lists/chains, no Quip chain entry found

## Notes / guesses
- Ambiguity: "Quip's testnet" could mean (a) Quip's own Substrate chain, or (b) the Quip Account (SHRINCS wallet) contracts deployed on EVM testnets. SDK source says V1.0.1 generation is "live on Base Sepolia and OP Sepolia since 2026-08-27".
- Mistake: I initially `npm pack`ed into /tmp/q02pkg (outside project dir); moved it into ./vendor/pkgs immediately.
13. github.com/quipnetwork/links.quip.network + explorer.quip.network sources (grep for URLs) → **found Quip's own testnet "Aglais"**: EVM RPC `https://evm-rpc.aglais.quip.network:20049/`, faucet `https://faucet.aglais.quip.network/request`, explorer `https://explorer.aglais.quip.network`. None of these are in developers.quip.network docs; found only by reading the explorer repo's Dockerfiles / linktree source.
14. Base Sepolia / OP Sepolia public RPCs (eth_getCode on SDK canonical addresses)
15. https://base-sepolia.blockscout.com/api/v2/addresses/<addr> and /api/v2/smart-contracts/<addr> → creation bytecode + constructor args of Quip's contracts (cached in ./aglais/*.json)
16. foundry-rs/foundry GitHub release `stable/foundry_stable_darwin_arm64.tar.gz` (only `anvil` extracted, into ./bin)

## Commands / findings (chronological)
- Aglais RPC probe: eth_chainId=0x4e41 (20033), client `eth-rpc/HEAD-f17113f` (Substrate pallet-revive ETH sidecar), gasPrice 1 gwei.
- eth_getCode on Aglais for SDK canonical addresses (WalletFactory 0xA2B2…8cc8, ShrincsWallet impl 0xc4E4…35E7, paymaster, verifier, EntryPoint v0.7, CreateX, multicall3, create2 deployer) → **all empty**. Quip Accounts are NOT deployed on Quip's own testnet.
- Same check on Base Sepolia: factory proxy, wallet impl, paymaster present. OP Sepolia: factory+paymaster present but wallet impl 0xc4E4… **missing** (SDK comment claims OP Sepolia is live for V1.0.1 — partially untrue).
- **ENVIRONMENT PROBLEM**: first `npm install` (sdk+hashsigs-wasm+viem+ethers) hit `ENOSPC` — the machine's disk had ~120 MB free out of 926 GB (not caused by this project; project was ~200 MB). All tool calls failed until I deleted my own node_modules and cloned vendor repos (freed ~200 MB). Reinstalled only `@quip.network/ethereum-sdk@0.3.0-beta.8` (135 MB node_modules). This ruled out installing full Foundry / building the contracts from source.
- `npm install --no-audit --no-fund @quip.network/ethereum-sdk@0.3.0-beta.8` (pulls viem 2.56.9, hashsigs-wasm 0.2.1-rc9).
- Read SDK .d.ts/.js (no API docs exist for SHRINCS clients on the docs site): ShrincsSigner.fromMnemonic → ShrincsFactoryClient.createShrincsWallet({signer,maxSignatures,derivationIndex,erc1271:{derivationIndex}}) → ShrincsWalletClient.execute({target,value}).
- Base Sepolia factory: creationFee=0, executeFee=0, owner 0xc68B…6A26, latestWalletImpl=0xc4E4…35E7.
- `curl … foundry_stable_darwin_arm64.tar.gz | tar xz -C bin anvil`; `bin/anvil --fork-url https://sepolia.base.org` for a local rehearsal (keys in ./keys-fork, balance via anvil_setBalance).

### SDK problems hit (fork rehearsal)
1. `createShrincsWallet` → `Invalid parameters … eth_sendTransaction … No Signer available`. Cause: SDK passes `account: <address string>` into viem `writeContract`, overriding the local private-key account, so viem sends eth_sendTransaction (browser-wallet/JSON-RPC-account assumption). **Workaround**: wrap walletClient.writeContract/sendTransaction to rebind the local account.
2. `createShrincsWallet` returns the wallet client only, not the tx hash → wrapped writeContract to capture the hash.
3. **Semantics surprise**: `ShrincsWalletClient.execute({target,value})` sends `msg.value = value + maxFee` **from the owner EOA** (sdk shrincsWalletClient.js ~l.551 "msg.value funds the ceiling"). So a "withdrawal" of X actually pays X out of the EOA and leaves the Quip Account balance untouched (observed on fork: account stayed 0.002 after "withdrawing" 0.001). msg.value is not part of the SHRINCS-signed payload (target,value,dataHash,maxFee), so the CLI overrides msg.value to just `maxFee`; the contract then pays `value` from the account's own balance (fork: account 0.002 → 0.0005, recipient +0.0015). Deviation from SDK default — flagged in RESULT.
- Fork rehearsal (Base Sepolia fork, NOT on a public explorer): create 0x1e2573…046e, fund 0x82e3db…dcc4, withdraw 0xbb37cd…abc (account-funded).

### Funding for real Base Sepolia
- No Base Sepolia faucet usable without creating a third-party account / holding mainnet ETH (Coinbase CDP, Alchemy, QuickNode, Superchain all gated). Did not sign up for anything (outward-facing).

### Pivot: Quip's own Aglais testnet
- Generated throwaway keys: `node quip-pq.mjs init` → ./keys (owner EOA 0xfDB778Ff1B8dA5989Ac7587aE1753c1CfB3BB67D, recipient 0x62b825B6802A2eaE75b7caf6CD5A83Eb6D64963b, SHRINCS mnemonic).
- `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0xfDB7…B67D"}'` → 200, amount 1e13 plancks (=10 QUIP on the EVM side, 18-dec), extrinsic 0x6545d2f03053026e5747dce13b2f49c0b5a3bdf719e8e1e02bdbbf58c8cd766b. No auth needed.
- aglais-probe.mjs: deployed a 10-byte test contract → success (0x3cd3b5…) ⇒ Aglais pallet-revive accepts plain EVM bytecode.
- **Decision (guess/deviation)**: redeploy Quip's own Base Sepolia bytecode (verifier, WalletFactory impl, ERC1967 proxy, ShrincsWallet impl) onto Aglais with our throwaway EOA as factory owner, then use the official SDK with `factoryAddress`/`walletImplementation` overrides. This is OUR deployment of Quip's code, not an official Quip deployment.
- aglais-deploy.mjs first run: verifier deploy **reverted** (tx 0x8c187d5c…, gasUsed 0x248a60) because I set gas 15M. pallet-revive charges the code storage deposit through gas: eth_estimateGas = ~784M "gas" (eth_call fails with `StorageDepositNotEnoughFunds` at ≤300M). Even a transfer estimates 1.7M and a 10-byte contract 324M.
- Blockscout returned empty constructor_args for the ERC1967Proxy although its creation bytecode contains them → strip the known old args explicitly.
- Second run (viem-estimated gas): receipt wait timed out (180 s); eth_getTransactionByHash=null and nonce stayed 2 for ~6 min, then the tx landed (block 374903, gasUsed 785,039,618, verifier 0xbcb2c1c0dee8f84c0c575002e8f36a79eaf5a53e, tx 0x216da87b…19d3). Meanwhile a re-run errored "nonce too low" — the RPC's pending nonce doesn't reflect the Substrate pool. → timeouts raised to 15 min.
- Third deploy run (background, `node aglais-deploy.mjs > aglais-deploy.log`): factoryImpl 0x93b48ee2… (tx 0xae15c987…), factory proxy 0xc8f8ba71… (tx 0x96a519f8…), ShrincsWallet impl 0xd1672f08… (tx 0x4880a7a5…), vetImplementation (tx 0xd2396da0…). These landed within ~1 min — inclusion latency on Aglais is erratic (first one took ~6 min).
- quip-pq.mjs: added Aglais support (reads keys/aglais-deployment.json → SDK `factoryAddress`/`walletImplementation` overrides; explorer URL) and wrapped publicClient.waitForTransactionReceipt with a 15-min timeout.
- `RPC_URL=https://evm-rpc.aglais.quip.network:20049/ node quip-pq.mjs create` → Quip Account 0xa4eb42332378Dca2032F906e8E455Dc59424AffE, tx 0xbdd047f9…8341 (SDK estimate: 1.8e9 "gas" ≈ 2.16 QUIP, actual ≈1.5 QUIP).
- `node quip-pq.mjs fund 1` → tx 0xe7b28e17…6ea1.
- `node quip-pq.mjs withdraw 0.4` → **ERROR "RPC Request failed"**; with DEBUG: `eth_sendRawTransaction … Transaction is temporarily banned`. Cause: I had left a fixed `{gas: 1_500_000n}` on execute (from the fork rehearsal). On Aglais that's far too low, the pool rejected the tx and then banned its hash, and the retry was byte-identical (same leaf ⇒ same signature). Removing the fixed gas (let the SDK estimate) → success tx 0xb9d259ba…85e6: recipient 0 → 0.4, Quip Account 1 → 0.6 (msg.value 0, so paid from the account's balance). leavesUsed 1/16.
- `node quip-pq.mjs tamper-check 0.1` on Aglais (eth_call simulation only): signing 0.1 but submitting 1 → `execute` reverted, as expected.
- Explorer API https://explorer.aglais.quip.network/api/v2/transactions/<hash> shows all three txs as success.
- Cleanup: stopped my own anvil fork process; no Docker used.
- Final: pinned package.json deps (@quip.network/ethereum-sdk 0.3.0-beta.8, viem 2.56.9); wrote RESULT.md. End ~11:23 CEST.
