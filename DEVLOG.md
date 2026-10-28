# DEVLOG — Quip Network post-quantum DAO treasury prototype

Started: 2026-09-28T12:30Z

## Sources consulted (in order)

## Log
### Sources (chronological)
1. WebSearch "Quip Network post-quantum testnet docs" → press releases; points to quip.gitbook.io/docs/nodes/run-a-node-testnet
2. WebSearch "QuipSwap Quip Network post-quantum wallet" → prnewswire / quantumcomputingreport QuipSwap launch articles, quip.gitbook.io link
3. https://quip.gitbook.io/docs (+ /sitemap.xml, /llms.txt) → **HTTP 404 "Content owner not found"**. Old GitBook docs are dead; press articles & search results still link there. DEAD END #1.
4. https://quip.network, https://docs.quip.network (→ redirects to https://developers.quip.network/docs), https://links.quip.network, https://quip.network/llms.txt
5. https://developers.quip.network/llms.txt (developer entry point: testnet RPCs, faucet, packages) — saved to research/
6. https://developers.quip.network/docs/llms.txt and /docs/llms-full.txt (full docs, 1164 lines) — saved to research/docs-llms-full.txt
   (Note: https://developers.quip.network/llms-full.txt at site root 404s; only /docs/llms-full.txt exists.)

### Findings from docs (before touching code)
- Testnet "Aglais": EVM JSON-RPC https://evm-rpc.aglais.quip.network chainId 20033, token AGLS (pallet-revive EVM on a Substrate chain).
  Faucet: POST https://faucet.aglais.quip.network/request {"dest": ...}, 10 AGLS.
- Quip Accounts = smart contracts on *existing* chains (Ethereum, Base, ...), created by a factory; SHRINCS hash-based sigs (XMSS-like everyday path + SPHINCS-like break-glass path). ERC-4337/1271/7913 lineage.
- QuipSwap = HTLC settlement contract. **"The settlement contract is gated: only Quip wallet contracts can initiate a swap. You cannot drive a swap from an ordinary account or from your own contract today."**
- SDK page: `@quip.network/ethereum-sdk@beta` (account client) and `@quip.network/hashsigs-wasm@rc` (SHRINCS). **"There is no public @quip.network/quip-swap or @quip.network/sdk package, and no swap SDK is published today. Use the wallet for swaps."**

### Doc contradictions noticed so far
- C1: developers.quip.network/llms.txt lists "[quip-swap-sdk on npm](https://www.npmjs.com/package/@quip.network/quip-swap-sdk): Swap protocol SDK" — but the Quip SDK docs page says no swap SDK is published. (to verify on npm)
- C2: Quickstart says WOTS+ is "the preferred" scheme and points at @quip.network/hashsigs; the SDK page says WOTS+ libs are previous-generation and new integrations should use SHRINCS via hashsigs-wasm@rc.
- C3: QUIP Lifecycle page describes a "Slashable approval timeout"; QuipSwap page says "No slashing". 
- C4: Accounts docs say accounts live on "Ethereum, Base, and others"; testnet info only describes the Quip Aglais chain (chainId 20033). Unclear which network the Account factory/QuipSwap contracts are deployed on for testnet.
- C5: npm `latest` tags are stale for the packages (docs warn explicitly) — a plain `npm install` gets 2025 builds.

### npm / package inspection
7. `npm view` on @quip.network/{ethereum-sdk,quip-swap-sdk,hashsigs-wasm}; `npm search @quip.network`
   - ethereum-sdk: latest=0.1.7 (stale), beta=0.3.0-beta.8
   - hashsigs-wasm: latest=0.1.0-rc1 (stale), rc=0.2.1-rc9
   - **quip-swap-sdk EXISTS**: beta=0.1.0-beta.9, latest=0.1.0-beta.6, next=0.1.0-beta.5 (next < latest < beta — odd tag ordering).
     → confirms C1: docs SDK page ("no swap SDK is published today") is wrong / out of date.
   - Also found undocumented: @quip.network/pqhybridsign, arch-sdk, solana-sdk, quip-solver-core.
8. `npm install @quip.network/ethereum-sdk@beta @quip.network/hashsigs-wasm@rc @quip.network/quip-swap-sdk@beta ethers`
   - ethereum-sdk pulls in the deprecated @quip.network/hashsigs (WOTS+) too.
   - Both SDKs use **viem**, not ethers (I installed ethers needlessly). quip-swap-sdk has viem as a peerDependency.
9. Read node_modules/@quip.network/ethereum-sdk/README.md — it's the *repo* README (Foundry/make/deploy instructions, "Contact Rick first"), references SDK_README.md, DEPLOYMENTS.md, INVARIANTS.md which are NOT shipped in the npm tarball.
   - Networks listed: Sepolia, Base Sepolia, OP Sepolia, mainnets, MIDL testnet (777). **Quip's own Aglais testnet (20033) is not mentioned anywhere in the SDK.**
10. Read dist/src/v1/shrincs/addresses.js comments: "V1.0.1 GENERATION — live on Base Sepolia and OP Sepolia since 2026-08-27".
    SHRINCS wallets are deployed by the shared WalletFactory 0xA2B2F714... (same address as the old WOTS+ registry row).
11. Read quip-swap-sdk README + dist/index.js: contract is called **"Omnibus"** (docs call it QuipSwap/"settlement contract"). Registry rows:
    Omnibus 0xA7955981D5759a799267063110Be0F7AeCc26F8A (v1.0.0-beta.3) on chains 8453 (Base MAINNET), 84532 (Base Sepolia), 11155420 (OP Sepolia); walletFactory 0xA2B2F714....
    - SDK exposes TWO commit routes: "wallet route" (empty signature, msg.sender must be a factory wallet) and a **"keyed route"** (ERC-7913 signature over commit digest, any sender).
      → Contradicts docs C6: "only Quip wallet contracts can initiate a swap. You cannot drive a swap from an ordinary account".
    - SDK never submits for a smart account: `client.prepareCommit(args,{account: wallet})` returns a Call to hand to the wallet's `execute`. This is the glue point between the two SDKs.
    - README refers to USAGE.md / ARCHITECTURE.md — not shipped in npm tarball either.

### On-chain check (eth_getCode via curl), 2026-09-28
| contract | Aglais 20033 | Base Sepolia 84532 | OP Sepolia 11155420 |
|---|---|---|---|
| WalletFactory 0xA2B2F714 | none | yes (proxy) | yes |
| Omnibus 0xA7955981 | none | yes | yes |
| ShrincsWallet impl beta.3 0xc4E46528 | none | yes | **none** (contradicts "live on OP Sepolia") |
| SHRINCS verifier 0xF2f9E6D6 | none | yes | yes |
| ShrincsPaymaster 0x430c8c89 | none | yes | yes |
| EntryPoint v0.7 | none | yes | yes |

**MAJOR DISCONNECT D1: Quip Network's own testnet (Aglais, the one with the documented faucet and AGLS token) has NO Quip Account factory, NO SHRINCS verifier, NO QuipSwap/Omnibus contract, and no ERC-4337 EntryPoint.** The account + swap products live on Base Sepolia / OP Sepolia, which the developer docs' "Testnet" section never mentions and which need Base Sepolia ETH from a third-party faucet.

### Keys & funding
12. `cast wallet new --json > keys/eoa-operator.json` (0x1eEE5e6C6bce95D80D691e43EA777BC81E25742e), `keys/eoa-recipient.json` (0xAE207CE0db3e58bfFeCF44c2e56c26A67726EC1F). Brand new, throwaway.
13. Aglais faucet: `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0x1eEE...742e"}'` → HTTP 200,
    `{"amount":10000000000000,"dest_account":"0x1eee...742eeeeeeeeeeeeeeeeeeeeeeeee","extrinsic_hash":"0x0db08de22d8e0cb5ec7daf30f71e5ed6b8bfb849d97c6b16b2a725968f18a7db"}`
    `cast balance` via EVM RPC → 9.999 AGLS (amount is in 12-decimal planck; EVM view is 18 decimals; 0.001 difference unexplained — probably existential deposit/fee). Faucet works as documented.
14. Base Sepolia ETH (needed because that's where the Quip contracts actually are): checked Quicknode, Alchemy, Coinbase CDP, Superchain/Optimism console faucets — all require login / captcha / mainnet balance / API key. Per rules I won't create third-party accounts. **Quip provides no Base Sepolia faucet or gas sponsorship path for developers** (ShrincsPaymaster exists but its sponsorship requires the paymaster owner's verifier key). BLOCKER for a *live* Base Sepolia run.
    → DEVIATION: run the full flow against `anvil --fork-url https://sepolia.base.org` so the real, deployed Quip bytecode + state is used, with anvil_setBalance for gas. Clearly labelled as fork evidence, not live-testnet evidence.

### Reading source instead of docs
15. On-chain reads (Base Sepolia): `Omnibus.verifierActive(SHRINCS verifier 0xF2f9…)` = true; `WalletFactory.latestWalletImpl()` = 0xc4E46528 (beta.3); `WalletFactory.owner()` = 0xc68B6477… (canonical operator).
16. GitLab API group listing: https://gitlab.com/api/v4/groups/quip.network/projects — **no public repo for the QuipSwap/Omnibus contracts** (only its SDK on npm; README references ../README.md, ARCHITECTURE.md, QUIP_LIFECYCLE.md of an unpublished repo).
17. `git clone https://gitlab.com/quip.network/hashsigs-solidity` — **main branch contains only WOTSPlus.sol**; the SHRINCS verifier that is deployed on Base Sepolia exists only on unmerged branches (`create-x/guarded-salt` "deploy: base sepolia", `create-x-deployment` "deploy: op sepolia", `feat/verifier-ERC7913`). Read contracts/SHRINCSVerifier.sol on create-x/guarded-salt: ERC-7913 `verify(bytes key, bytes32 hash, bytes sig)` with key = 32-byte SHRINCS publicKeyCommitment and sig = stateful envelope abi.encode(PublicKey, Signature); `verifyStateless` for the break-glass path.
    GUESS: the deployed V4 verifier (0xF2f9…) matches this branch plus the SDK's `statefulRawMessageHash` binding (SDK comments mention "hashsigs-solidity MR !26" moving it to V4, which I can't see). Will confirm empirically.

### Building the flow (flow.mjs) — run against anvil fork of Base Sepolia (block ~47415410)
18. `anvil --fork-url https://sepolia.base.org --port 8547 --chain-id 84532` (first attempt via nohup in a subshell died silently; re-ran as a managed background task).
19. `node keytest.mjs` — first import `@quip.network/ethereum-sdk/shrincs` failed: ERR_PACKAGE_PATH_NOT_EXPORTED. Correct subpath is `@quip.network/ethereum-sdk/v1/shrincs` (not documented anywhere; found in package.json exports).
    SHRINCS keygen (maxSignatures 8/16): ~10–14 s per bundle in Node on M-series. Signing ~100–200 ms. Stateful envelope ~2.8 KB.
20. `forge build --contracts contracts` for TestUSD.sol (my throwaway ERC-20 counter-asset; Quip provides no test token on Base Sepolia).
21. ERROR: `ShrincsFactoryClient.createShrincsWallet` → viem "No Signer available" / eth_sendTransaction "Invalid parameters".
    Cause (read SDK source dist/src/v1/shrincs/shrincsFactoryClient.js + internal/providerState.js): the SDK passes `account: <address string>` into writeContract and asserts `walletClient.getAddresses()`, i.e. it assumes an injected/JSON-RPC wallet (browser extension). A server-side viem LocalAccount (what a DAO backend/multisig bot would use) is not supported.
    WORKAROUND: custom viem transport in flow.mjs (`localSignerTransport`) that answers eth_accounts and turns eth_sendTransaction into a locally signed eth_sendRawTransaction.
22. Wallet created on fork: treasury Quip account 0xbd5b07fC46ce5b7DdF2826Bd44d2a24c2C9246EB (owner = operator EOA, maxSignatures 16, creationFee 0, executeFee 0, gas ~500k).
23. ERROR: hashsigs-wasm `leafIndex must be in 1..=16, got 0` — SHRINCS stateful leaves are **1-indexed**. The SDK type docs say "authPath.length === leaf" but never state the range. Fixed my leaf ledger to start at 1. (Leaf 0 recorded in my ledger but never used.)
24. DAO approval: approver key (separate SHRINCS bundle) signs keccak(abi.encode("QUIP-DAO-PAYOUT-V1", treasury, recipient, sellAmount, buyToken, minBuyAmount, nonce, deadline, chainId)) using `signStatefulRawAt(statefulRawMessageHash(commitment, payoutHash), leaf)`; envelope = abi.encode(PublicKey, StatefulSignature).
    `SHRINCSVerifier.verify(commitment, payoutHash, envelope)` → 0x024ad318 (valid); tampered hash → 0xffffffff. GUESS from step 17 CONFIRMED empirically (the V4 raw-binding hash is what must be signed).
25. QuipSwap: treasury = proposer (wallet route, empty signature); `omnibus.prepareCommit(..., {account: wallet})` → Call → `ShrincsWallet.execute` (PQ-signed). Maker (plain EOA) = taker via the **keyed route** with a SHRINCS signature over `computeCommitDigest` → accepted by Omnibus. Contradiction C6 confirmed empirically: a non-wallet EOA *can* commit to a swap on the live contract (keyed route); docs say it can't.
26. Claim sent by the operator EOA with the secret → one claim settled both legs. Recipient received tUSD.
27. **FINDING (custody-relevant)**: in swap #1 the treasury balance didn't move (0.005 → 0.005). Reading shrincsWalletClient.js `buildExecuteCall`: the SDK sets `msg.value = value + maxFee`, i.e. the **owner EOA fronts the call value**; the Quip account's own balance is never spent by `execute()`. For a treasury this is backwards (funds held in the PQ account can't be paid out via the SDK's high-level API without the hot EOA paying).
    WORKAROUND: `executeFromTreasury()` — call `buildExecuteCall` (private in TS types, reachable in JS), then send with msg.value = maxFee only. Contract accepted it; swap #2 paid from the Quip account (0.005 → 0.003 ETH). The signed payload doesn't cover msg.value, so this is contract-legal.
28. Swap #2 fully settled; `getSameChainSwapStatus` → 'settled'. (First report attempt passed wrong args; SDK signature is (client, lock, plan).)
29. verify-live.mjs: the approvals signed above verified via **eth_call against live Base Sepolia and live OP Sepolia** verifier 0xF2f9… → VALID; tampered → INVALID. (Real-network evidence for the PQ-approval piece without needing gas.)

### Aglais (Quip's own testnet) leg
30. `forge create contracts/TestUSD.sol:TestUSD --rpc-url https://evm-rpc.aglais.quip.network ... --broadcast` → forge printed **"Error: contract was not deployed"** (its receipt wait gave up), yet the tx *was* mined. `cast nonce` kept returning 0 for ~2 min (stale/lagging RPC view) → retries got "1013 Transaction Already Imported" / "1010 Invalid Transaction" (nonce already used). Confusing: the eth RPC's pending/latest view lags inclusion.
    Result: TestUSD on Aglais at 0x7bec9e6072ee626d1A1B136Bd490cfD925Cb8B64 (nonce 0); plain AGLS transfer tx 0xc01bc3dc7e2afa847eb0e80cf87835669e94af13415903bcea7d785a004eddd1 (0.1 AGLS → recipient). `txpool_status` not supported (-32601).
    → Aglais' pallet-revive accepts ordinary EVM bytecode.
31. No Quip Account / QuipSwap contracts on Aglais, and no public Omnibus source to deploy them → can't run accounts or swaps there.
    DEVIATION / WORKAROUND for the PQ-approval piece: cloned the **runtime bytecode** of the live Base Sepolia SHRINCS verifier (0xF2f9…, 4581 bytes, codehash 0xe9319929e0ec163221e849962606feead3e41865677b63a96662b2ecdad78426) onto Aglais with a 12-byte "return runtime" initcode (instead of building hashsigs-solidity's unmerged branch with via-IR + CreateX, which I didn't have time for).
    Deploy tx 0x38e4f75595f7680d58910fb922189c76a3e66ad59093b5be7bcf0e8e8cecce1a, address 0x79d1b0969640d8a79e912f8a1593862ed28ce55b, runtime codehash identical. **gasUsed 0x142e4dae = 338,578,862 gas** (~0.34 AGLS at 1 gwei) for a 4.6 KB contract — pallet-revive weight→gas mapping makes gas numbers not comparable to Ethereum.
    Caveat: only the stateful (everyday) path works there; the stateless/break-glass path delegates to a pinned SPHINCSPlusC sibling (0x97B3…) that doesn't exist on Aglais.
32. `RPC_URL=https://evm-rpc.aglais.quip.network VERIFIER=0x79d1… node verify-live.mjs` → both DAO approvals VALID, tampered INVALID, on Quip's own chain.
    `getShrincsAddresses(20033)` → UnsupportedNetworkError "Chain id 20033 is not supported by this SDK build" — the SDK doesn't know Quip's own testnet exists.

### Wrap-up
33. Stopped my first anvil, started a fresh fork, `LABEL=fork-clean-run node flow.mjs all` → the whole flow reproduces from scratch (wallet → fund → token → PQ approval → commit (treasury pays itself) → maker keyed commit → claim → settled). Log: logs/fork-clean-run.log.
    Note: the treasury address 0xbd5b07fC46ce5b7DdF2826Bd44d2a24c2C9246EB is CREATE3-deterministic from (factory, key commitments, owner), so it's the same counterfactual address on live Base Sepolia (not deployed there; no gas).
34. Removed the needless `ethers` dependency; added npm scripts (fork, flow, build-token, verify-live).
35. Not attempted (time): cross-chain swap (e.g. Base Sepolia ↔ OP Sepolia; OP Sepolia is missing the beta.3 wallet impl anyway), ERC-4337/paymaster path, account.quip.network web UI (browser-only; not usable from a headless DAO backend), Quip compute/QVRF.
Total wall time ≈ 75 min.
