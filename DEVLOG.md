# DEVLOG

Goal: prototype where two parties agree a trade off-chain with post-quantum-signed orders (Quip signing libraries), settle through QuipSwap on a testnet — one settled, one refunded/expired trade. ~90 min from 2026-09-28 16:21 CEST.

## Sources / URLs consulted (in order)

1. https://quip.network/quipswap/ — marketing page (orderbook, post-quantum swaps; "Live on Base").
2. https://developers.quip.network/docs/quip-interlock-protocol/quipswap — protocol: commit/execute/reclaim, hash-lock, asymmetric deadlines, "only Quip wallet contracts can initiate".
3. https://quip.network/blog/quipswap-launch — launch post (Base first).
4. https://developers.quip.network/docs/getting-started/quip-sdk — SDK page: `@quip.network/ethereum-sdk@beta`, `@quip.network/hashsigs-wasm@rc`; "no public quip-swap package… Use the wallet for swaps."
5. https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts, …/quip-lifecycle, …/how-quip-fits-together — account model, QUIP lifecycle.
6. https://github.com/quipnetwork — 40 repos listed; NO swap/settlement repo (checked via GitHub API).
7. https://github.com/QuipNetwork/ethereum-sdk — cloned; contracts = Deployer/QuipFactory/QuipWallet only; SDK exports QuipSigner/QuipWalletClient/QuipClient (WOTS+).
8. https://registry.npmjs.org/@quip.network/ethereum-sdk — latest=0.1.7, beta=0.3.0-beta.8.
9. npm tarball of 0.3.0-beta.8 (unpacked to /tmp/quip-inspect) — SHRINCS-era SDK (WalletFactory/QuipPaymaster), still no swap helpers.
10. https://github.com/QuipNetwork/pqhybridsign — Substrate-side hybrid signatures (not applicable).
11. account.quip.network HTML + its 5.6 MB JS bundle — THE key source: QuipSwap deployment table, Omnibus ABI, offer codec, commit/claim/reclaim semantics.
12. On-chain probes on https://sepolia.base.org (via `cast`) — Omnibus code exists (26,128 bytes), WalletFactory/Paymaster/EntryPoint v0.7 live, commitmentFee=0, verifierActive=false everywhere.

## Key facts extracted (not published anywhere in docs)

- Real QuipSwap settlement contract: "QUIP:Omnibus:v1.0.0-beta.3" at **0xA7955981D5759a799267063110Be0F7AeCc26F8A** on Base (8453), Base Sepolia (84532), OP Sepolia (11155420). Bundle's deployments table + verified on-chain.
- WalletFactory (SHRINCS): 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8 (all three chains). EntryPoint v0.7 canonical. QuipPaymaster 0xC4209c….
- Omnibus ABI (76 entries; saved to artifacts/quipswap-omnibus-abi.json): commit(bytes32 lock, Terms party, Terms counterparty, CommitAuth{signer,signature}) payable; claim(bytes32 secret, Terms, Terms); reclaim(bytes32 lock, Terms, Terms); swapId/commitDigest/lockState/posted/termsHash; errors NotQuipWallet, InvalidCommitSignature, WindowViolated, …
- Terms = {chainId, reclaimRecipient, recipient, commitmentDeadline, claimDeadline, reclaimRelease, assets[{assetType uint8, target, id, amount}]}.
- Two commit routes: wallet route (empty signature, msg.sender must be a Quip wallet) — the ONLY live route on Base Sepolia (verifierActive() = false for all probed addresses); keyed route needs an active SHRINCS verifier.
- Offer wire format: base64url JSON {version:2, lock, proposerTerms, takerTerms, proposerOmnibus, takerOmnibus}.

## Commands that mattered

- git clone QuipNetwork/ethereum-sdk, pqhybridsign (inspection).
- npm pack @quip.network/ethereum-sdk@0.3.0-beta.8 (inspection).
- curl https://sepolia.base.org + cast call … — on-chain verification of Omnibus/factory/verifier state.
- npm install (project): ethers ^6, @quip.network/ethereum-sdk ^0.1.7, @quip.network/hashsigs ^0.1.0, @noble/hashes.
- forge build for WOTSPlus library + Settlement.sol (solc 0.8.28).
- anvil --host 127.0.0.1 --port 8545 --chain-id 31337 (background proc_0dbe2a71d4ba, still running).
- node scripts/01_create_signed_offers.js trade1|trade2 → PQ-signed orders (verified true for both signatures).
- node scripts/02_deploy.js → WOTSPlus lib 0xe7f1…0512, QuipFactory 0x9fE4…6e0, Alice vault 0xB6E6…753d, Bob vault 0x789D…B4Dd, Settlement 0xCf7E…Fc9.
- node scripts/03_settle_trade1.js → SETTLED (final run tx hashes in artifacts/evidence-trade1.json).
- node scripts/04_refund_trade2.js → REFUNDED (tx hashes in artifacts/evidence-trade2.json).
- cast call aliceVault pqOwner() → 0xc01617ab… (rotated from 0x86e9587d… at deploy) = on-chain WOTS+ verification happened per op.

## Errors / dead ends (honest record)

1. Wrong-file write: DEVLOG.md accidentally written to /tmp/quip-inspect/beta-sdk/pkg/ (moved back). cwd drift — subsequent scripts all use absolute paths.
2. First anvil instance (proc_2d632f4daf74) exited silently with `--silent`; relaunched with tee'd log.
3. anvil_setBalance fine; but ethers deploy got NONCE_EXPIRED — fixed by explicit pending nonce on every deployer tx.
4. WOTSPlus in shipped npm artifacts is NOT inlined: hardhat linkReferences show 3 placeholder sites in QuipFactory + 3 in QuipWallet. Fixed by deploying the compiled WOTSPlus library and string-replacing the `__$<hash>$__` placeholder with its address.
5. Trade-2 commit reverted (custom error 0x602f3f82 = LegAlreadyCommitted): I'd reused trade 1's Settlement instance. Fix: fresh Settlement per trade.
6. Second revert (custom error 0x32ed4e50 = TooEarlyToReclaim): my 60 s deadline had already elapsed before the commit tx mined (script start → deploy → commit wall-clock > 60 s). Fix: 900/450 s deadlines + explicit evm_increaseTime for the refund test.
7. evm method names: `anvil_evm_increaseTime` → "Method not found" → standard `evm_increaseTime` works.
8. Event query returned nothing because I queried the OLD settlement address; ethers v6 `attach()` returns a new instance (my first fix attempt did not reassign → SyntaxError → rewired cleanly).
9. Uint8Array.prototype.toString("hex") silently returns garbage (comma-joined bytes) — one false "lock mismatch" print; fixed by Buffer.from(...).toString("hex"). On-chain checks were always correct (execute() itself verifies keccak(secret)==lock, and it passed).
10. Base Sepolia faucets: Chainlink (empty response), QuickNode (HTML sign-in wall), PublicNode (nothing), DRPC (/api/drip 404, unknown method), LearnWeb3 (service suspended), Ankr (empty), base.org/api/drip (empty). No login-free drip found → real-testnet leg BLOCKED on gas. No account creation attempted (CLI-only, throwaway-keys constraint).
11. urllib to sepolia.base.org got 403 (UA-blocked); `cast` works.

## Guesses / deviations / workarounds

- QuipSwap contract unpublished → extracted ABI + addresses from the vendor's own app bundle (data-only extraction, JS literal eval in node, charset-validated).
- Settled against a reference Settlement.sol that implements the exact QuipSwap lifecycle (commit/execute/reclaim, hash-lock, asymmetric initiator-longer windows) because the real Omnibus could not be driven without Base Sepolia gas. This is the ONE intentional deviation from "settle through QuipSwap on a testnet"; everything else uses Quip's real contracts + signing library.
- Local testnet = Anvil (fresh chain, throwaway keys); the vendor's own docs target Base Sepolia but no faucet was reachable.
- Off-chain orders signed with WOTS+ (@quip.network/hashsigs) because that is the only published off-chain PQ signer; the current-gen on-chain path uses SHRINCS wallets (beta SDK) — documented mismatch.
- Order signing keys are one-time publicSeeds derived from the party's quantumSecret+vaultId (fresh seed per signature, tracked in keys/*-pq.json seedsUsed to prevent reuse). Order lock = keccak256(secret); secret kept maker-side only (0600 file), mirroring "the secret stays with you".
- Used anvil[0]'s documented dev key as a deployer EOA on the local chain only (never on any real network).
