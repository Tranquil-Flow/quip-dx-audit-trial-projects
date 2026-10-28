# DEVLOG

## Setup
- Read tip-dapp/README.md, src/TipJar.sol, script/Deploy.s.sol, test/TipJar.t.sol, web/app.js, web/index.html.
- Tools present: forge 1.5.1, cast, node v22, python3, docker.
- Created ./keys (chmod 700) for throwaway testnet keys.

## Sources consulted (in order)
1. WebSearch "Quip Network post-quantum testnet developer docs" — only press articles (quantumcomputingreport, decrypt, thequantuminsider); no RPC info.
2. WebSearch "Quip Network quantum vault EVM testnet RPC chain id" — nothing useful (chainlist pages for unrelated chains).
3. https://quip.network (200), https://docs.quip.network -> redirects to https://developers.quip.network/docs, https://quip.network/docs (404), https://github.com/QuipNetwork (200).
4. https://developers.quip.network/sitemap.xml and /llms.txt -> Netlify 404. The real index is https://developers.quip.network/docs/llms.txt (linked from page HTML).
5. Downloaded the .md mirrors of each docs page into ./.docs-cache/ (docs.md, quickstart, quip-sdk, quip-accounts, how-quip-fits-together, run-a-node-testnet, token, use-with-ai, submit-a-job, ...), plus https://developers.quip.network/docs/llms-full.txt.
   - First loop errored: `no such file or directory` for 3 pages because zsh `$(...)` + redirection hiccup in my loop; re-fetched them separately. (My scripting mistake, not vendor.)
6. Findings from docs:
   - Quickstart: "we are building out the smart contract layer" — i.e. the docs suggest there is NO smart-contract layer yet on Quip itself.
   - Quip Accounts = smart-contract accounts (ERC-4337 style, SHRINCS hash-based sigs, ERC-1271) deployed "on the chain you already use". Clients: browser extension + https://account.quip.network.
   - Quip SDK page: `npm install @quip.network/ethereum-sdk@beta` (NOT latest: latest = 2025 previous gen), `@quip.network/hashsigs-wasm@rc`.
   - submit-a-job page: testnet is called "aglais", token AGLS, faucet `POST https://faucet.aglais.quip.network/request {"dest": ...}`, "endpoints can move; aglais.quip.network publishes the current ones".
   - No docs page mentions an EVM RPC/chain id. Docs say nothing about deploying Solidity to Quip's testnet.
7. https://aglais.quip.network (testnet landing page) — THIS is where the EVM details are:
   - EVM JSON-RPC https://evm-rpc.aglais.quip.network:20049, chain id 20033 (0x4e41), AGLS 18 decimals on EVM side (12 on substrate side), gas price 1 gwei, backend **pallet-revive**, explorer https://explorer.aglais.quip.network (Blockscout), substrate explorer subscan.aglais.quip.network.
   - Caveats stated: HTTP only (no WebSocket), "no pubsub or filter API", no internal txs, "Balances read one existential deposit low".
   - Faucet: 10 AGLS per request, accepts EVM address.
   - Contradiction: docs quickstart says smart contract layer not ready; testnet page advertises Solidity tooling via EVM JSON-RPC.

## Probing the EVM RPC
- `curl eth_chainId/eth_blockNumber/eth_gasPrice/net_version/web3_clientVersion` against https://evm-rpc.aglais.quip.network:20049 -> 0x4e41, ~477k blocks, 1 gwei, client `eth-rpc/HEAD-f17113f` (the polkadot-sdk pallet-revive eth-rpc proxy).
- `eth_feeHistory` with an integer block count -> `-32602 Invalid params ... expected a hex string`. (cast passes ints; minor incompatibility.)
- Latest block: baseFeePerGas 1 gwei, gasLimit = u64::MAX (18446744073709551615).

## Keys
- `cast wallet new --json` -> wrote private key to keys/deployer.key and address to keys/deployer.addr via python (never printed). Deployer EOA: 0x9781DD5e6B34C9A959ABCD61C4454fE7124C6a43.
- `cast wallet import deployer -k ./keys ...` — first try used `--unlock-file` (doesn't exist, error "unexpected argument"); correct flag is `--unsafe-password`, fed from keys/deployer.pw (random). Keystore lives at keys/deployer, NOT ~/.foundry/keystores (README's `cast wallet import deployer --interactive` would write to the home dir).
- Faucet: `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0x9781..."}'` -> 200, amount 10000000000000 (planck, 12 dec = 10 AGLS), dest_account = EVM addr padded with 0xEE*12 (pallet-revive address mapping). Balance on EVM side: 9.999 AGLS (one existential deposit low, as the testnet page warns).

## Deploy
- `forge script script/Deploy.s.sol --rpc-url https://evm-rpc.aglais.quip.network:20049 --keystore ../keys/deployer --password-file ../keys/deployer.pw --broadcast`
  -> compiled fine, local sim estimated 1,201,337 gas; broadcast FAILED: `error code 1010: Invalid Transaction`, then retries `1012: Transaction is temporarily banned`.
- Diagnosis: `cast estimate --create <bytecode>` against the node -> **336,975,106 gas** (~280x forge's local estimate). pallet-revive charges weight + storage deposit as gas, so forge's local-EVM-simulated gas limit is way too low -> tx rejected at pool validation as Invalid.
- Retry with `--skip-simulation` -> `error sending request ... operation timed out` (RPC slow: `cast chain-id` took 9.6 s).
- WORKAROUND: `cast send --create <bytecode> --timeout 300` (lets the node estimate gas) -> SUCCESS.
  - TipJar: **0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b**, tx 0x7acfd805309ab5b98f796eed907e8c9f9b05866b361ab5b0f7e8e9f11eef614a, block 477991, gasUsed 336,972,004 (~0.337 AGLS at 1 gwei), type 2 (EIP-1559 accepted).
  - Note: same address forge script predicted (nonce 0) — the failed forge tx never landed.
  - Unmodified solc 0.8.24 / cancun EVM bytecode was accepted: this pallet-revive build runs EVM bytecode (no resolc/PolkaVM recompile needed).
  - `cast code` returns the bytecode; `cast call ethBalance(...)` returns 0.

## Quip post-quantum account on Aglais?
- `npm install ethers@6.13.4 @quip.network/ethereum-sdk@beta @quip.network/hashsigs-wasm@rc` in ./quip-client (took >2 min, ran in background). Got ethereum-sdk 0.3.0-beta.8 (dist-tags: hashsigs-wasm latest=0.1.0-rc1, rc=0.2.1-rc9).
- Read node_modules/@quip.network/ethereum-sdk/README.md + dist/src/v1/addresses.js + dist/src/v1/shrincs/addresses.js (SOURCE, not docs):
  - Supported chains hard-coded: 1, 11155111, 8453, 84532, 10, 11155420, 777 (MIDL). **20033 (Aglais) is not in the list** -> `getShrincsAddresses(20033)` throws UnsupportedNetworkError.
  - Canonical CREATE3 addresses (factory proxy, SHRINCS wallet impl 0xc4E4..., verifier 0xF2f9..., paymaster 0x430c...), all deployed via CreateX by operator 0xc68B...
- `cast code` on Aglais for: WalletFactory 0xA2B2..., EntryPoint v0.7 0x0000000071727De22E5E9d8BAf0edAc6f37da032, CreateX 0xba5Ed0..., SHRINCS wallet impl, verifier, paymaster, Multicall3 0xca11..., Arachnid CREATE2 deployer 0x4e59... -> **all empty (0x)**. No Quip account infrastructure, no 4337 EntryPoint, no bundler on Quip's own testnet.
- GitHub API: QuipNetwork org repos list. GitHub ethereum-sdk `main` = June 2026 (0.1.7, no SHRINCS); `deploy/testnet` (README says "Active Dev Branch") = May 2026, also no SHRINCS. DEAD ENDS.
- GitLab API (https://gitlab.com/api/v4/projects/quip.network%2Fethereum-sdk) is the canonical repo; `main` there is also stale. Branch `v1.0.0-rc.2` (2026-09-16, package 0.3.0-beta.7) has contracts/shrincs/ShrincsWallet.sol + WalletFactory.sol. Cloned to ./vendor/ethereum-sdk. No mention of aglais/20033/revive anywhere in it.
  (A more recent branch `owner-execute-from-account-balance` exists, 2026-10-02 — not used.)
- Read ShrincsWallet.sol: besides the ERC-4337 path (`execute(target,value,data,maxFee) onlyEntryPoint`), there is an owner path `execute(SHRINCS.PublicKey, SHRINCS.Signature, target, value, data, maxFee) external payable onlyOwner` — classical owner EOA submits + pays gas, SHRINCS stateful signature authorizes. This avoids needing EntryPoint/bundler. Decision: use this path.
- SDK `ShrincsFactoryClient` params accept `factoryAddress` + `walletImplementation` overrides -> plan: deploy verifier + factory + wallet impl myself on Aglais, then use the published SDK pointed at them.

## Building the Quip SHRINCS contracts (vendor/ethereum-sdk @ GitLab v1.0.0-rc.2)
- foundry.toml pins `@quip.network/hashsigs-solidity` with `git = "git@gitlab.com:..."` (SSH). I must not use this machine's SSH keys -> fetched over HTTPS instead.
  - `git clone https://gitlab.com/quip.network/hashsigs-solidity.git` was extremely slow (7 MB after ~7 min); stopped my own clone PIDs (43558 43432 43429 43430 43426 — all children of my command) and downloaded the pinned rev tarball: https://gitlab.com/quip.network/hashsigs-solidity/-/archive/672cb903d711c327b0c9b47233c78963723510b9/... (2.4 MB) into dependencies/@quip.network-hashsigs-solidity-0.2.0.
  - Commented out the SSH dependency line in vendor foundry.toml, then `forge soldeer install` for the rest (also slow, several minutes; createx is a git clone).
  - Mistake: briefly wrote a copy of foundry.toml to /tmp (outside project); deleted it right after.
- `forge build contracts/WalletFactory.sol contracts/shrincs/ShrincsWallet.sol .../SHRINCS256sKeccak.sol .../ERC1967Proxy.sol` (solc 0.8.33, via_ir) -> OK. ShrincsWallet runtime ~19.5 KB.
- ABI check (quip-client/abicheck.mjs): function selectors of compiled ShrincsWallet + WalletFactory == those in the published npm SDK 0.3.0-beta.8 ABIs (no diffs).

## Deploying the Quip account stack myself (quip-client/deploy-quip-stack.sh) — plain CREATE via `cast send --create` (CreateX absent)
- SHRINCS256sKeccak verifier 0xf4ba1b7713e96065a7c8f2f6de9342c51799669e (tx 0x23b0df38...318b, gas 0x13f635d0)
- WalletFactory impl 0x203b98d0aa32126a8cdb04baa117060ebc88e327 (MAX_FEE 1e18; tx 0x34276a60...0c6a)
- WalletFactory ERC1967 proxy 0x5a76af570fa9ba264654f357298ce57df24d0c6f, initialize(owner=deployer EOA) (tx 0xf3c77dae...e663)
- ShrincsWallet impl 0xb6fa01c735e5903c5ed6800b5499f086e61d7002 (factory, verifier) (tx 0x2d47efbc...078b)
- factory.vetImplementation(impl) tx 0xa90920e4...ee45 -> latestWalletImpl set; creationFee 0, executeFee 0.
- During this, a parallel `cast balance` hit `error sending request ... operation timed out` — public RPC is flaky; script used `--timeout 600`.
- NOTE: these are MY deployments, not Quip's canonical ones. The SDK's canonical-address registry does not apply on Aglais.

## Tipping from a Quip PQ account (quip-client/tip.mjs, published SDK @quip.network/ethereum-sdk@0.3.0-beta.8 + viem 2.57.3)
- `ShrincsFactoryClient({ chainId: 20033, factoryAddress, walletImplementation })` — overrides bypass the chain allowlist. `boundChain()` is generic (OK for unknown chains).
- Run 1: `createShrincsWallet` failed: `JSON is not a valid request object` / `Account not found for address 0x9781...` — the SDK passes `account` as a bare address to `writeContract`, so viem sends `eth_sendTransaction` (expects injected/node wallet). Aglais public RPC has no managed accounts.
  WORKAROUND: EIP-1193 `custom()` transport shim in tip.mjs that signs eth_sendTransaction locally with the owner key and relays via eth_sendRawTransaction (plays the role of an injected wallet).
- Run 2: Quip account created: **0xe3a62d353a6AC3c5Ebb532d53dA3a1A6fdE62aeC** (owner = deployer EOA, maxSignatures 16, QUIP HD derivation index 0, ERC-1271 key index 1). Mnemonic in keys/quip-mnemonic.txt (never printed). Then failed on my own bad-checksum test address (my bug) -> normalize with getAddress(lowercase).
- Created throwaway creator EOA (keys/creator.*): 0x4b859E4C8d73864653fEe55cC29C3dcAD9F46B88.
- Run 3: SUCCESS. `node tip.mjs 0x4b85... 0.01 "first post-quantum tip on Aglais"` -> SHRINCS leaf 1, tx **0x855d5f3685ef3fda548af703e0a219c4bddb0128881ca8436fc14ecf0a72f8fe**, block 478366, gasUsed 20,044,150. TipJar.ethBalance(creator) = 0.01 AGLS.
  Receipt logs: Tipped(tipper = 0xe3a62d35... (the Quip account), creator = 0x4b85...). So msg.sender at TipJar is the post-quantum account.
- `cast logs` (eth_getLogs) over blocks 478000..latest works. `eth_newFilter` -> `-32601 Method not found` (matches "no filter API" on the testnet page).

## Porting the dApp itself
- quip-client/readcheck.mjs: mirrors web/app.js loadTips() with ethers 6.13.4 JsonRpcProvider -> queryFilter(Tipped, latest-5000..latest) returned the PQ tip. Read path works unchanged.
- quip-client/ethers-eoa-tip.mjs: mirrors app.js sendTip() with an ethers Wallet signer -> tx 0xf1db7f57e95523f1b28ea6a509c0507a0fcd969fbb0b0d9b150877958a26b158, status 1, gasUsed 2,046,504 (node-estimated gasLimit 2,049,737). Write path works unchanged. (Browser + MetaMask NOT tested — no browser wallet in this environment.)
- Creator withdraw (unchanged contract path): first attempt failed because my background shell used relative `keys/` paths from the wrong cwd (my bug). Re-ran with absolute paths: faucet -> creator, `cast send withdrawEth()` -> tx 0x549535d216960c8d7ed85c49894e3169f4d37656a1e455b4def3fe253a9f56f9 status 1; ethBalance(creator) -> 0. Oddity: cast's JSON receipt showed gasUsed 0x0 for this tx. A follow-up `cast balance` timed out (RPC flakiness).
- Edits: web/app.js (TIPJAR_ADDRESS, CHAIN_ID 20033, CHAIN_PARAMS + wallet_addEthereumChain fallback on 4902, "ETH"->"AGLS" label), web/index.html (placeholder), foundry.toml ([rpc_endpoints] aglais), README.md (Aglais deploy via cast send --create, faucet, keystore in ../keys, Quip account section). src/, test/, script/ untouched. `forge test` 5/5 pass.
- Deviation: I did not retry `forge script` with workarounds (e.g. a huge --gas-estimate-multiplier) — documented `cast send --create` instead.
- Not done: Quip browser extension / account.quip.network were not tried (no browser here; both are built on the SDK allowlist, which excludes Aglais, so they couldn't see my self-deployed factory anyway — inference, not verified).
