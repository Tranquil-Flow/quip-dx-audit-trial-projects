# RESULT — Quip OTC desk prototype

Date: 2026-09-28. Time used: ~30 min. Everything reproducible from this directory (`README.md`); full narrative in `DEVLOG.md`.

## TL;DR
**Overall: PARTIAL.** The off-chain post-quantum order flow and the QuipSwap settle/refund lifecycle both work end to end against
the **real, live Base Sepolia QuipSwap deployment's bytecode and state**, but the settled/refunded trades were executed on a
**local anvil fork of Base Sepolia, not on the public testnet**: I could not get Base Sepolia ETH (every public faucet needs a captcha or
a vendor account; I did not bypass or sign up). The only public-testnet evidence is read-only / `eth_call`.

## Status per component
| component | status | notes |
|---|---|---|
| PQ signing library (`@quip.network/hashsigs-wasm@rc` 0.2.1-rc9, SHRINCS `shrincs-256s-keccak`) | **WORKING** | keygen/sign/verify in Node; persisted key state; sigs ~2.8–3.1 KB |
| Off-chain order protocol (PQ-signed Offer → PQ-signed Acceptance → deterministic QuipSwap terms) | **WORKING** | 8 offline tests pass (`npm test`): tamper, wrong key, wrong taker, expiry, acceptance replay |
| Deployed on-chain SHRINCS verifier accepts our signatures | **WORKING (live Base Sepolia)** | `eth_call` on public RPC; needs raw-hash signing (see friction) |
| QuipSwap settlement, **keyed route** (PQ-signed commit) — settled trade | **WORKING on fork** / **not run on public testnet** | evidence below |
| QuipSwap refund/expiry trade | **WORKING on fork** / **not run on public testnet** | both legs reclaimed; negative tests passed |
| QuipSwap via **Quip SHRINCS wallets** (documented path) | **WORKING on fork only** | needed fork-only `anvil_autoImpersonateAccount` because the SDK can't sign with a local key |
| Public-testnet (Base Sepolia) transactions | **BLOCKED** | no faucet funds without captcha/account; run stops at "fund 0x20D9… first" |
| Quip "Aglais" testnet (EVM chain 20033, curl faucet) | **BLOCKED / not applicable** | QuipSwap, WalletFactory, verifier have **no code** there |
| Swap on Quip-native chain / pallet-revive | not attempted | no swap deployment exists there |

## Evidence
All chain-local evidence is in `evidence/*.json`; `RPC_URL=http://127.0.0.1:8547 npm run verify` re-reads every hash from the node ("all evidence verified on-chain").
Fork = anvil 1.5.1 `--fork-url https://sepolia.base.org --chain-id 84532` (my own process; see DEVLOG #34 for a port mix-up I caught and redid).

**Live public Base Sepolia (chain 84532), read-only** (`evidence/live-base-sepolia-simulation.txt`, block ≈47.415M):
- Omnibus (QuipSwap) `0xA7955981D5759a799267063110Be0F7AeCc26F8A`, code 13,064 B, `owner()` `0xc68B…6A26`, `WALLET_FACTORY()` `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`, `commitmentFee()` 0, `verifierActive(0xF2f9…5567)` = true.
- SHRINCS wallet impl `0xc4E4652898bB12C4f0Ba9083829689B1963135E7` = factory `latestWalletImpl()`. ERC-7913 verifier `0xF2f9E6D692da41b089c3c261c41509669eEc5567` (`PROFILE_TAG` = keccak("shrincs-256s-keccak")).
- SDK-computed commit digest == on-chain `commitDigest()`; `eth_call` of `Omnibus.commit` from a plain EOA with a valid hashsigs-wasm SHRINCS signature **succeeds**; a tampered signature **reverts**.

**Settled trade — keyed route, fork** (maker A sells 1,000 mUSDC, taker B pays 0.002 ETH; `evidence/settled-anvil-fork.json`)
- MockUSDC `0xe7508a487b13d8115a6e4f70a0d0d0c0c868ad6e`; swapId `0x7ada483b…c15d`; lock `0x0c383885…0283`; offer hash `0xe436789e…6b13`
- commitA `0x003922f6d190285a5907cff7021a87d7719e24c81a440a9adbd0980faaec074e` · commitB `0xd49037cc3be2439f849b08c8d2f6f756f994353cafb2daee8ac28473a9d631e4` · claim `0xefe8d5037afc82640621cd05d6649e205339ab30bd380a4fd38cc662a3d6d233` (2 Claim events; SDK status `settled`)
- Balances: A mUSDC 1000→0, B mUSDC 0→1000; A +≈0.0015 ETH net (0.002 − gas), B −≈0.0023 ETH.

**Refunded/expired trade — keyed route, fork** (`evidence/refunded-anvil-fork.json`)
- swapId `0x3fd924bd…88d9`; commitA `0x01921676…d4fb`, commitB `0xcf55c2ac…f34b`; maker never reveals the secret.
- Negative checks: B reclaim before release → `WINDOW_VIOLATED`; A claim after claim window → `WINDOW_VIOLATED`.
- reclaimA `0x290cfa9bac646baae3ed2af4326ac0faadcc38d69d4c6c53f162c357fb52433b` · reclaimB `0x5cf1226805292116822e10e966c2607bab4a1285890b34f620a5774d2389a7ca`; A's 1000 mUSDC and B's 0.002 ETH returned (net only gas).

**Settled via Quip wallets, fork** (`evidence/settled-wallet-route-anvil-fork.json`)
- walletA `0xA480ef208B72fEBC4C89C23dFD5F03Cb932940b5`, walletB `0x1e61b5c592394EB779e20c19238251A2ba1312B1` (created by the live factory); A.commit `0x57fc4960…dfc480`, B.commit `0xcaca8508…e711`, claim `0x71b3f376…52c8b5`; wallet B ended with the 1000 mUSDC.
- Jobs ids: n/a (no compute jobs were part of this task).

Throwaway keys: `keys/` (EOAs `partyA 0x20D9…07B4`, `partyB 0xe015…9c2B`, `relayer 0x9B96…958B`; SHRINCS keys; wallet seeds). No existing keys/wallets used, nothing posted publicly, no mainnet.

## How the trade works (what I built)
1. Maker generates the swap secret; signs an **Offer** (chain, Omnibus, hashlock, both parties' EOA + SHRINCS key commitments, sell/buy amounts, six-timestamp schedule) with SHRINCS.
2. Taker verifies (hashsigs-wasm **and** the deployed on-chain verifier via `eth_call`), then signs an **Acceptance** bound to the offer hash. Maker verifies it.
3. Both derive identical `Terms`; each runs `planSameChainSwap`. Maker commits (SHRINCS signature over the Omnibus commit digest), waits for the taker window, taker commits, maker reveals via `claim` — or, in the expiry case, nobody claims and both `reclaim` after their release times.

## What did not work / caveats (be skeptical of these)
- **No public-testnet settlement.** Fork ≠ testnet: no real block production/finality/RPC limits, and I used `evm_mine` to advance timestamps. Real-chain run of `run.ts` is untested (only the funding pre-check was exercised live).
- **`run-wallet.ts` cannot run on a real chain as written**: `@quip.network/ethereum-sdk` takes `account: Address` and lets the node sign (`eth_sendTransaction`), which local-key setups/public RPCs can't do. I used anvil auto-impersonation.
- **Security caveat of the keyed route**: the PQ signature only *authorises/attributes* the commit; assets are pulled from `msg.sender` (an ordinary ECDSA EOA), so custody isn't post-quantum in that route (the SDK doc says the same: "identities attribute, they don't gate"). The wallet route is the one that keeps assets in a SHRINCS wallet — but there, native-leg `value` is paid by the outer-tx EOA, not the wallet's balance (verified on-chain), so the "quantum-safe wallet" doesn't fund the ETH leg.
- Order-signing uses a **separate** SHRINCS key from the wallet key (wallet leaves are tracked on-chain; reusing them off-chain could burn/reuse one-time leaves). There's no binding between the order key and wallet key beyond both being named in the offer.
- SHRINCS state: keys are one-time-leaf; my `PqSigner` persists to disk on every sign, but there's no locking/backup; 64 leaves per key. A desk needs real key-state management.
- Demo schedule gaps are 20 s (SDK default minimum is 1800 s). Do not use for real value.
- Not done: cross-chain swap, ERC-721/1155 legs, OP Sepolia, order book/discovery/transport (offers are objects in-process), slashing/griefing analysis, multi-order/RFQ pricing, tx retry/monitoring, UI.
- One mistake on my side (logged): my first anvil failed to start (port in use) and my first runs hit a node I didn't own; I discarded that evidence and re-ran on my own node.

## Where the vendor's docs/tools made this harder (and what would have helped)
1. **Tell me which network to use.** `llms.txt` says "testnet = Aglais, chain 20033, curl faucet"; QuipSwap/Accounts live on Base/OP Sepolia with no Quip faucet. A single "Testnet quickstart for QuipSwap" page (chain id, RPC, Omnibus/factory/verifier addresses, how to get gas) would have saved the most time. Even better: a Quip-run Base Sepolia drip or a faucet-less path (e.g. sponsored/paymaster txs for the demo wallet).
2. **Docs contradict each other/the code**: swap SDK "does not exist" vs `@quip.network/quip-swap-sdk` on npm; "only Quip wallets can initiate" vs permissionless keyed route; quickstart recommends legacy WOTS+ `@quip.network/hashsigs` while other pages say SHRINCS/`hashsigs-wasm@rc`; gitbook URLs still returned by search are 404.
3. **A worked end-to-end example** (`examples/otc-swap.ts`): create wallet → sign → prepareCommit → wallet.execute → claim/reclaim. The pieces exist in three packages; the glue (Call → `wallet.execute`, sender-funded `value`, which hash to sign for the verifier) had to be reverse-engineered.
4. **Document the verifier's exact signing contract**: "sign the raw 32-byte digest with `hashsigs-wasm shrincs.sign`; key = 32-byte commitment; sig = envelope". The ethereum-sdk codec suggests a double binding (`statefulRawMessageHash`) that the deployed verifier rejects. Also export `statefulRawMessageHash` or explain why not.
5. **Publish USAGE.md/ARCHITECTURE.md inside the swap-sdk tarball** (README links them; they're absent), fix the `latest` dist-tag (points at an older beta than `beta`), and put the current code on default branches (GitHub/GitLab `main` for ethereum-sdk and hashsigs-solidity are the deprecated WOTS+ generation; the real code is on `deploy/testnet` / `feat/verifier-ERC7913`).
6. **ethereum-sdk**: add a root export, accept a viem `Account` (local key) not just `Address`, and remove the internal "Contact Rick" note from the public README.
7. **SDK ergonomics**: `getSameChainSwapStatus` returns `settled` for both "claimed" and "fully reclaimed"; a desk needs to tell them apart. Custom-error decoding for verifier failures (`InvalidCommitSignature`) on `eth_call` reverts.
8. Type friction: quip-swap-sdk's viem peer types don't unify with a chain-specific viem client (had to run untyped via tsx).
