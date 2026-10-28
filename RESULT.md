# RESULT.md — Quip Network OTC desk prototype

Date: 2026-09-28 · Project: /private/tmp/devtrials6/m2-minimax-m3
Time budget used: ~85 min of 90.

## Status per component

| Component | Status | Notes |
|---|---|---|
| Off-chain OTC desk (maker/taker order negotiation) | **WORKING** | `scripts/01_create_signed_offers.js` |
| Post-quantum order signing with Quip's signing library | **WORKING** | `@quip.network/hashsigs` (WOTS+), same scheme Quip's wallets verify; maker signs, taker verifies + countersigns, script re-verifies both before saving |
| Quip accounts (vaults) on-chain | **WORKING** | Real `QuipFactory`/`QuipWallet` contracts from `@quip.network/ethereum-sdk`, library-linked WOTSPlus deployed, vaults created per party |
| Settlement: trade 1 (settled) | **WORKING** | Both legs committed via PQ-signed vault calls, secret revealed, both claimed |
| Settlement: trade 2 (expired → refunded) | **WORKING** | Both legs committed, deadlines fast-forwarded, both parties reclaimed |
| Settlement through the REAL QuipSwap contract on a testnet | **BLOCKED (gas)** | Real QuipSwap "Omnibus" contract found live on Base Sepolia at `0xA7955981D5759a799267063110Be0F7AeCc26F8A` with full ABI extracted; blocked by testnet faucet auth walls (no login-free faucet reachable from CLI). See below. |

Overall: **PARTIAL → WORKING with one documented gap.** The full OTC flow works end-to-end against a QuipSwap-semantics settlement contract, using Quip's real account contracts and signing library on a local testnet. Settling against the vendor's actual Base Sepolia QuipSwap deployment is wired up in knowledge (address + ABI + commit semantics) but could not be executed because no login-free Base Sepolia faucet was reachable — every faucet probed (Chainlink, QuickNode, PublicNode, DRPC, LearnWeb3, Ankr, base.org) requires an account/captcha or is offline.

## What was built

```
scripts/01_create_signed_offers.js   maker + taker PQ-signed off-chain orders (Quip hashsigs)
scripts/02_deploy.js                 deploys REAL Quip contracts to Anvil + vaults for both parties
scripts/03_settle_trade1.js          commit → commit → reveal → claim  (SETTLED)
scripts/04_refund_trade2.js          commit → commit → deadline → reclaim → reclaim (REFUNDED)
contracts/Settlement.sol             reference two-leg HTLC escrow implementing the QuipSwap lifecycle
keys/*                                throwaway test keys (EOAs + PQ key material), 0600
orders/trade1.json, trade2.json      signed orders (lock in order; secret maker-only in *.secret.json, 0600)
artifacts/deployment.json            contract + vault addresses
artifacts/evidence-trade1.json       tx hashes, final balances
artifacts/evidence-trade2.json       tx hashes, final balances
artifacts/quipswap-omnibus-abi.json  ABI of the REAL QuipSwap contract, extracted from the vendor's app bundle
```

## How to run

```bash
cd /private/tmp/devtrials6/m2-minimax-m3
npm install                      # done; deps: ethers, @quip.network/ethereum-sdk, @quip.network/hashsigs, @noble/hashes
anvil --host 127.0.0.1 --port 8545   # (already running as background proc)
node scripts/01_create_signed_offers.js trade1
node scripts/01_create_signed_offers.js trade2
node scripts/02_deploy.js
node scripts/03_settle_trade1.js
node scripts/04_refund_trade2.js
```

All scripts are idempotent (fresh keys/contracts per run). Keys are brand-new, generated in `./keys` — nothing else on the machine was touched.

## Evidence

Network: local Anvil (chainId 31337). Throwaway keys only.

Deployments (from `artifacts/deployment.json`):
- WOTSPlus library: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
- QuipFactory: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
- Alice vault: 0xB6E6DCC799E2b193aDe19001b312530C4943753d (EOA 0x67ab9014…d5D1)
- Bob vault: 0x789D375285EC3d5FFF5efc3475109F1C4921B4Dd (EOA 0x6AeA873b…03DB)

Trade 1 — SETTLED (final run, `artifacts/evidence-trade1.json`):
- Settlement: 0x8A791620dd6260079BF849Dc5567aDC3F2FdC318
- alice commit (0.5 ETH, PQ-signed vault call): 0xfbf4c8f71b4dc48cea8bf767332bb003ebe1f0df62a53f8f3d2e2ae3621cf86d
- bob commit (0.25 ETH): 0x5ef7e42cd23b6de43d880263769e294067361d0c75ba67561281c901f41ac441
- alice execute (reveals secret 0x10a753…524b): 0x9e240b6a5cf9e0f0c88aaa6c058068216e0f1207e11fd56d614127da5aea5051
  - keccak256(revealed secret) == lock in the signed order: verified true
- bob execute (claims with revealed secret): 0x0988f0dbfa03c489ca7eb58a5459fa0be041b6e0beffca3ddfa71c064f51fc02
- Final: Alice vault 1.3 ETH (gave 0.5, got 0.25), Bob vault 1.15 ETH (gave 0.25, got 0.5), escrow 0.0.

Trade 2 — EXPIRED / REFUNDED (`artifacts/evidence-trade2.json`):
- Settlement: 0x0165878A594ca255338adfa4d48449f69242Eb8F
- alice commit (0.3): 0x25d6e1dec331a3dcd5d14d86a3b49044fd87b7a0b3d9eb52434e5eaf44a3ff1b
- bob commit (0.15): 0x3b43f59947e60f7982811bf076619c14bae686d722fa90ac0995cc49420ef06f
- nobody reveals; `evm_increaseTime(901)`; deadlines pass
- alice reclaim: 0x15b05eda8b443a40bfc1c3b3e32c451ed1579856bba03ee1798d281cc62289b0
- bob reclaim: 0x1f7053261e36cd3f6b64ae510e7098940a895fe78c7099585ea133a707778889
- Final: Alice vault 0.55 (+0.3 refund), Bob vault 0.65 (+0.15 refund), escrow 0.0.

Post-quantum property (on-chain): every vault action (commit/execute/reclaim) is authorized by a fresh WOTS+ one-time signature verified by the deployed Quip WOTSPlus library; Alice's vault pqOwner rotated from seed 0x86e9587d… at creation to 0xc01617ab… after the ops — rotation only happens after an on-chain `WOTSPlus.verify` passes.

## The real QuipSwap testnet path — findings and the blocker

What I found (all verifiable):
- Quip publishes NO swap SDK ("no public @quip.network/quip-swap or @quip.network/sdk package… Use the wallet for swaps") and no QuipSwap contract in any of their 40 GitHub repos or in the npm SDK tarballs (latest 0.1.7 = WOTS+ vaults only; beta 0.3.0-beta.8 = SHRINCS vaults/paymaster only).
- The REAL QuipSwap settlement contract ("QUIP:Omnibus:v1.0.0-beta.3") is discoverable by reading the account.quip.network JS bundle:
  - address 0xA7955981D5759a799267063110Be0F7AeCc26F8A, deployed on Base mainnet (8453), **Base Sepolia (84532)** and OP Sepolia (11155420) — verified on-chain (26,128 bytes of code on Base Sepolia).
  - Full ABI extracted (76 entries, saved in artifacts/quipswap-omnibus-abi.json): `commit(bytes32 lock, Terms party, Terms counterparty, CommitAuth auth) payable`, `claim(bytes32 secret, Terms party, Terms counterparty)`, `reclaim(...)`, `swapId(...)`, `lockState(bytes32)`, `posted`, `termsHash`, `commitmentFee` (=0), events Commitment/Claim/Reclaimed, errors incl. `NotQuipWallet`, `InvalidCommitSignature`, `WindowViolated`.
  - Commit has two routes: "wallet route" (empty `auth.signature`, caller must be a Quip wallet from WalletFactory 0xA2B2F7…; this is the only live route — `verifierActive()` is false for all addresses on Base Sepolia) and a "keyed route" (SHRINCS signature over `commitDigest(lock, party, counterparty, signerHash)`).
  - Terms struct: chainId, reclaimRecipient, recipient, commitmentDeadline, claimDeadline, reclaimRelease, assets[{assetType,target,id,amount}]. Offer wire format = base64url(JSON{version:2, lock, proposerTerms, takerTerms, proposerOmnibus, takerOmnibus}).
- To settle for real I would need: two SHRINCS Quip wallets (WalletFactory creation fee is 0 on Base Sepolia) + gas ETH on Base Sepolia for the EOAs.

Blocker: **every Base Sepolia faucet probed from the CLI is auth-walled** (Chainlink, QuickNode, PublicNode, DRPC, LearnWeb3 (suspended), Ankr, base.org, Alchemy/Coinbase links). No login-free drip exists, so the real-testnet leg could not be executed within the timebox. No API key can be requested without creating accounts (out of scope for a throwaway prototype). Everything needed to finish it (address, ABI, call semantics, wallet-creation cost) is documented in DEVLOG.md and artifacts/quipswap-omnibus-abi.json.

## What did not work / mismatches between Quip's products

1. **Marketing vs. published surface.** quip.network/quipswap describes an active orderbook + settlement; the vendor's published SDKs expose only wallet helpers. The settlement contract exists but is unpublished — recoverable only by reverse-engineering the web app bundle.
2. **Signature-scheme split.** `ethereum-sdk@latest` uses WOTS+; `@beta` uses SHRINCS (stateful, leaf budgets) via ERC-4337/paymaster; the on-chain Omnibus gating runs against SHRINCS-verifier wallets. The npm `@quip.network/hashsigs` (WOTS+) is the only convenient off-chain signer; `@quip.network/hashsigs-wasm@rc` is the SHRINCS one. An integrator picking "the" signing library must choose generation carefully — `npm install @quip.network/ethereum-sdk` without the `@beta` tag installs the obsolete WOTS+ generation (documented, but easy to miss).
3. **No testnet documentation at all.** No docs page lists the Omnibus address or a Base Sepolia faucet; the only mention is the app bundle's internal deployments table.
4. **One-time-key discipline is on the integrator.** WOTS+ publicSeeds must never be reused; the SDK's QuipSigner generates fresh seeds silently, but nothing enforces or warns about slot reuse (the SHRINCS SDK does track leaves; the WOTS+ one does not).
5. **Contract gate.** Docs: "only Quip wallet contracts can initiate a swap… You cannot drive a swap from an ordinary account today." Confirmed on-chain: verifierActive=false everywhere on Base Sepolia, so only the wallet route works — an OTC desk integrating QuipSwap must first create Quip wallets for both parties.

## What would have made this easier

- A published QuipSwap contract address table (per chain + testnet) and the ABI — it took reverse-engineering a 5.6 MB app bundle to get what a normal integration doc should state in one page.
- A `@quip.network/quip-swap` SDK or at least a TypeScript interface for Terms/CommitAuth + digest computation (the docs themselves say none exists).
- A Quip-hosted testnet faucet or a documented "how to get Base Sepolia ETH for QuipSwap testing" section.
- Consistent versions: `latest` vs `beta` tags pointing at different signature generations, and a clear statement that the WOTS+ package is legacy.
- A tiny end-to-end example (two wallets, one swap) in the SDK repo, like the cpp-sdk has for E2E.
