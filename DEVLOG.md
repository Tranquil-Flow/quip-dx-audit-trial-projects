# DEVLOG — QuipSwap testnet swap via @quip.network/quip-swap-sdk

## Sources consulted (in order)
1. npm registry: `npm view @quip.network/quip-swap-sdk` (no `repository`/`homepage` field → no link to source/docs)
2. npm registry: `npm search @quip.network` (found ethereum-sdk, hashsigs-wasm, pqhybridsign, arch-sdk, solana-sdk, quip-solver-core, ...)
3. `node_modules/@quip.network/quip-swap-sdk/README.md` (shipped in tarball)
4. `node_modules/@quip.network/quip-swap-sdk/dist/index.js` (bundled source — read to find deployment registry)
5. `node_modules/@quip.network/ethereum-sdk/README.md` (0.1.7 = `latest`, then 0.3.0-beta.8 = `beta`)
6. `node_modules/@quip.network/ethereum-sdk/dist/src/v1/**` (.d.ts + .js — read for addresses / SHRINCS wallet API)
7. Public RPCs https://sepolia.base.org and https://sepolia.optimism.io (eth_getCode checks)

## Log
- `npm init -y && npm i @quip.network/quip-swap-sdk@beta @quip.network/ethereum-sdk viem`
  - Note: `latest` dist-tag of swap-sdk is 0.1.0-beta.6 but `beta` tag is 0.1.0-beta.9; README says install `@beta`, so used beta.9.
- swap-sdk README links to `USAGE.md`, `../README.md`, `../ARCHITECTURE.md`, `../QUIP_LIFECYCLE.md` — **none are shipped in the npm tarball** and package.json has no repository URL. DEVIATION: read bundled `dist/index.js` instead.
- README "Deployment registry addresses" section is cut off mid-sentence; the actual registry lives only in the bundle (`deployments_default`):
  - Omnibus `0xA7955981D5759a799267063110Be0F7AeCc26F8A` (CREATE3, `QUIP:Omnibus:v1.0.0-beta.3`) deployed=true on 8453 (Base mainnet), **84532 (Base Sepolia)**, **11155420 (OP Sepolia)**; walletFactory `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`.
- eth_getCode: Omnibus has code (26130 hex chars) on both Base Sepolia and OP Sepolia; factory 0xA2B2… has 154-char code (proxy). 
- ethereum-sdk `latest` (0.1.7) is the old WOTS+ SDK with QuipFactory `0x4a5A…` ≠ the factory Omnibus expects. DEVIATION: installed `@quip.network/ethereum-sdk@beta` (0.3.0-beta.8), whose `v1/addresses.json` has WalletFactory `0xA2B2…` (matches). Its live wallet family is "SHRINCS" (`@quip.network/ethereum-sdk/v1/shrincs`).
- ethereum-sdk beta README references SDK_README.md / DEPLOYMENTS.md — also not shipped in tarball. Reading .d.ts instead.
8. WebSearch "QuipSwap quip.network swap testnet docs Omnibus" (only press/kucoin hits; mostly confused with Tezos "QuipuSwap")
9. WebSearch "quip.network testnet faucet Base Sepolia quip wallet" → generic Base faucets (docs.base.org/tools/network-faucets, Alchemy, CDP, thirdweb, Bware)
10. Probed quip.network, docs.quip.network (301 → https://developers.quip.network/docs), swap.quip.network (200), github.com/QuipNetwork
11. GitHub API: QuipNetwork org repo list — **no public quip-swap / Omnibus repo** (so the swap SDK's README links to USAGE.md etc. are dead ends)
12. github.com/QuipNetwork/faucet README — faucet is for Quip's *substrate* dev chain, not for Base/OP Sepolia
13. https://developers.quip.network/docs/llms.txt and the .md mirrors of: quickstart, quip-sdk, quipswap, quip-accounts, quip-lifecycle, how-quip-fits-together (saved in docs_cache/)

## Findings from official docs
- quip-sdk.md: "There is no public `@quip.network/quip-swap` or `@quip.network/sdk` package, and **no swap SDK is published today. Use the wallet for swaps.**" — CONTRADICTS the task premise and npm (`@quip.network/quip-swap-sdk` exists, beta.9). Proceeding with the npm package anyway.
- quip-sdk.md confirms: use `@quip.network/ethereum-sdk@beta` and `@quip.network/hashsigs-wasm@rc` (latest tags are stale 2025 builds). Matches my earlier deviation.
- quipswap.md: "The settlement contract is gated: only Quip wallet contracts can initiate a swap. You cannot drive a swap from an ordinary account." (ABI has `NotQuipWallet` error). So both parties must be SHRINCS Quip wallets created via WalletFactory 0xA2B2…
- quip-accounts.md: an EOA submits txs and pays fees; the SHRINCS sig authorizes. Wallets are created by the factory.
- No doc mentions a faucet for Base Sepolia / OP Sepolia test ETH, or which testnet QuipSwap runs on (only the SDK bundle's registry says 84532 / 11155420).

## Build
- `npm i -D tsx typescript @types/node`; set `"type":"module"` (swap-sdk is ESM-only).
- `npx tsx src/genkeys.ts` → keys/keys.json (mode 600): two fresh viem EOAs + two fresh SHRINCS BIP39 mnemonics (`generateMnemonic` from ethereum-sdk/v1/shrincs).
  - alice EOA 0x8C2Da2c664ad9B6826A077413c8CBe993A1F55B0, bob EOA 0x1f3E552187A6C22D087C6424C8a2603FCc3f4F02
- Read .d.ts/.js of swap SDK to design flow (no USAGE.md available). Key facts learned from **source, not docs**:
  - Wallet commit route: `auth.signature = 0x` + `auth.signer` any blob > 20 bytes (attribution only); contract checks `WALLET_FACTORY.commitmentOf(msg.sender) != 0`.
  - Commit must be sent BY the Quip wallet → `omnibus.prepareCommit(args, {account: wallet})` → `Call{to,value,data}` → `ShrincsWalletClient.execute({target,value,data})` (SHRINCS stateful signature, EOA pays gas).
  - Claim is permissionless (any EOA can send `claim(secret, …)`, assets go to the `recipient`s in the terms). Same-chain claim settles both legs at once.
  - Timing: taker may only commit in `[proposer.commitmentDeadline, taker.commitmentDeadline)` → a swap inherently waits ≥ 1 buffer. `planSameChainSwap` default buffer = 1800 s (30 min per gap!); `DEFAULT_BUFFERS.fastL2 = 300n` exists — using 300 s on Base Sepolia (DEVIATION from default, documented option).
- `npx tsx src/probe.ts` (read-only):
  - Base Sepolia: Omnibus version `QUIP:Omnibus:v1.0.0-beta.3`, commitmentFee 0, WALLET_FACTORY 0xA2B2…; factory creationFee 0, executeFee 0, latestWalletImpl 0xc4E4… == SDK's ShrincsWalletImplementation ✅
  - OP Sepolia: same Omnibus, but factory latestWalletImpl = 0x6808… (the "beta2" impl) ≠ SDK default 0xc4E4… → chose **Base Sepolia (84532)** as target.
  - Both fresh EOAs have 0 balance → need testnet ETH for gas.

## Swap script (src/swap.ts) — fork validation
- Started a local fork I own: `anvil --fork-url https://sepolia.base.org --port 18545 --silent &` and gave the two throwaway EOAs 0.1 fork-ETH with `cast rpc anvil_setBalance`.
- Run 1 `RPC_URL=http://127.0.0.1:18545 FORK_WARP=1 STATE_FILE=runs/fork-state.json npx tsx src/swap.ts`
  - ERROR: `ContractFunctionExecutionError … eth_sendTransaction … Details: No Signer available` from `ShrincsFactoryClient.createShrincsWallet`.
  - Cause (read SDK source `shrincsFactoryClient.js` / `shrincsWalletClient.js`): the ethereum-sdk passes `account: this.account` (an address **string**) to viem `writeContract`, which overrides the wallet client's local private-key account and makes viem use JSON-RPC `eth_sendTransaction` (node-side signing). Works only with injected/browser wallets or unlocked nodes, not with a local key.
  - WORKAROUND: `localSigning()` Proxy around the viem WalletClient that re-injects the LocalAccount in `writeContract`/`sendTransaction`.
- Run 2 (fork): **full swap settled** — wallets created, both commits via Quip-wallet `execute`, claim, status `settled`. Log: runs/fork-run2.log. (fork-only hashes, not on the public chain)
  - Alice wallet 0x69dD37f07980Dc430e55475A00b88613b0692ce3: 0.00005 → 0.00006 ETH; Bob wallet 0x03080F31e0Dcced3B5779b23D5CdA226936056CF: 0.00005 → 0.00007 ETH (as expected: A gives 0.00002, B gives 0.00001).
  - Note: ShrincsWalletClient.execute makes the EOA attach `value + maxFee` as msg.value, so the commit value is actually funded by the EOA per call; the wallet top-up is only needed because swap-sdk `prepareCommit` preflights `getBalance(wallet) >= value` and simulates from the wallet. (Could use `skipPreflightChecks`, but simulation would then likely fail.)
  - Used `maxSignatures = 64` (guess; hashsigs-wasm default is 1024; no doc on sensible values). SHRINCS keygen took ~3–4 s per wallet.
- Added `MIN_EOA_BALANCE` preflight (clear BLOCKED message + exit 2), fixed `est.totalCost` (field doesn't exist; CostEstimate = gasUnits/gasPrice/…), added tsconfig + npm scripts; `npx tsc -p .` clean.
- Fork run 3 (`STATE_FILE=runs/fork-state2.json`): wallets found via `getShrincsWallet` (already-deployed path), second swap settled. Log runs/fork-run3.log.
- Fork gas used: wallet top-up 25,810; commit via Quip wallet execute 403,468 / 366,682; claim 78,252 (wallet creation ~600k gas limit). Live Base Sepolia gas price (`cast gas-price`) = 0.006 gwei → the whole live run would cost < 0.00002 ETH gas per party.
- Stopped my own anvil process (`pkill -f "anvil --fork-url … --port 18545"`).

## Live Base Sepolia attempt — BLOCKED on funding
14. https://docs.base.org/base-chain/tools/network-faucets.md (lists CDP faucet / Circle faucet; no requirements given)
15. WebSearch "Base Sepolia faucet API no login no captcha curl 2026" → Alchemy marketing says "no CAPTCHA / no account"
16. `curl https://www.alchemy.com/faucets/base-sepolia` → page bundle contains `captchaRequiredError: "Please complete the CAPTCHA verification"` → CAPTCHA is required. CDP faucet needs a Coinbase Developer Platform account/API key; thirdweb/QuickNode need login or mainnet balance.
   - Decision: did NOT create third-party accounts or attempt to bypass CAPTCHAs; did not use any existing wallet on the machine (per rules).
- Checked ethereum-sdk `ShrincsPaymasterClient` for a gasless route: `sponsorUserOp` requires the paymaster *operator's* SHRINCS key (Quip-held) plus an ERC-4337 bundler → not usable by an outside developer.
- No Quip-run EVM testnet faucet exists (QuipNetwork/faucet is for Quip's Substrate dev chain only).
- `npx tsx src/swap.ts` against https://sepolia.base.org → `BLOCKED: alice's throwaway EOA 0x8C2D… has 0 ETH on chain 84532` (runs/live-run1.log), exit 2.
- Note: Quip wallet addresses are CREATE3(commitment of key + owner EOA), so the fork-computed addresses (alice 0x69dD37f0…, bob 0x03080F31…) are exactly what would be deployed on live Base Sepolia once the EOAs are funded.
- Wrote RESULT.md. Overall PARTIAL: code path verified end-to-end on a Base Sepolia fork against real deployed bytecode; live testnet swap BLOCKED only on test-ETH funding (needs a human to pass a faucet CAPTCHA/login for the two EOAs listed, then `npm run swap`).
