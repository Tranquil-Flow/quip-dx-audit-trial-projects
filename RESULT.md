# RESULT — QuipSwap testnet swap prototype

**Status: PARTIAL** (protocol fully reverse-engineered; end-to-end txs BLOCKED)

The QuipSwap settlement layer is completely mapped and verified against the live
Base Sepolia chain. The two blocking gaps are documented at the bottom. No money
was risked (testnet-only intent), no external accounts created, nothing posted
publicly, brand-new throwaway keys only (`./keys/` — currently empty because no
wallet could be deployed).

## What was delivered

Working, verified tooling in this repo:

- `omnibus_abi.json` — complete ABI of the QuipSwap settlement contract
  ("Omnibus"), 66 entries including custom errors. Extracted from the official
  web app bundle (quip-swap.quip.locker) because the contract is NOT verified on
  any explorer and NOT in any public repo.
- `wallet_abi.json`, `factory_abi.json` — ABIs of the SHRINCS wallet and its
  factory (the only wallet type the omnibus gate accepts), same extraction.
- `scripts/probe-gate.js` — eth_call probes proving the omnibus validation order
  (runs, real output in DEVLOG).
- `scripts/probe-factory.js` — factory proxy introspection (runs).
- `scripts/scan-omnibus.js` — omnibus history scan (runs; exactly 1 tx ever:
  `setVerifierActivity`, tx 0xf94aa5c4...).
- `DEVLOG.md` — every source, command, error and dead end, in order.

## The protocol (as reconstructed)

Chain: Base Sepolia (84532), also deployed on Base mainnet (8453), same address.

| Item | Value |
|---|---|
| Omnibus (settlement) | 0xf780Fc9C066D824bFF85758E381A3919B1817f09 |
| WALLET_FACTORY (gate) | 0x6de121f7cc8b310adbc957425b97e1c8dfce3be5 (ERC-1967 proxy) |
| Factory latestWalletImpl | 0xb84a596A6fB567FC4634b4f49212410D1193140e |
| commitmentFee | 0 (free) |
| MAX_FEE | 0.01 ETH |
| owner | 0xc68B64770Da7914DEb0EF238b048a0Bf3B5f6A26 |

Interface: `commit(bytes32 lock, Terms party, Terms counterparty, CommitAuth auth) payable`,
`claim(bytes32 secret, Terms party, Terms counterparty)`,
`reclaim(bytes32 lock, Terms party, Terms counterparty)`,
plus views `commitDigest(...)`, `termsHash(lock)`, `posted(lock, digest)`, `lockState(lock)`.

- lock = keccak256(secret); secret = 32 random bytes, kept by the initiator.
- Terms = {chainId, reclaimRecipient, recipient, commitmentDeadline, claimDeadline,
  reclaimRelease, assets[{assetType, target, id, amount}]}.
- Commit routes: (a) "wallet route" — msg.sender must be a wallet from the factory,
  auth.signature empty, auth.signer = walletAddress || vaultId (what the app sends);
  (b) "keyed route" — WOTS+ signature over `commitDigest(lock, party, counterparty,
  keccak256(signer))` via an owner-activated verifier.
- Windows strictly interleave: proposer.commit < taker.commit < proposer.claim <
  taker.claim < proposer.reclaim < taker.reclaim. Taker's commit window opens at the
  proposer's commitmentDeadline; proposer reveals the secret in its claim window;
  taker claims after; each side reclaims only after its own reclaimRelease.
- lockState: 0 free → 1 proposer committed → 2 both committed → 3 settled.
- Escrowed assets move: commit pulls/escrows the party's assets (+ fee); claim pays
  `counterparty.recipient`; reclaim returns to `party.reclaimRecipient`.

Happy path would be: initiator (OTC desk) commits leg A → counterparty commits leg B
(after initiator's commitmentDeadline) → initiator claims with secret → counterparty
reads secret from that tx and claims. Grief path: initiator commits → counterparty
never commits → after initiator's reclaimRelease, initiator reclaims (lockState 1).

## Why no transaction hashes (the blockers)

1. **The wallet stack is closed source.** The omnibus gate accepts only wallets from
   0x6de121f7..., which are "SHRINCS" (stateful SPHINCS-style) ERC-4337 wallets. The
   public ethereum-sdk only implements the older WOTS+ wallet, whose factory the
   omnibus does not reference. The SHRINCS keypair/signer (hypertree/FORS, tags
   `quip-shrincs-wallet-v1`, `quip.shrincs.action.execute`) exists only inside the
   5.4MB minified app bundle. Reimplementing it from minified code is a multi-hour
   job, and no swap can be initiated without it (gate + wallet-signed execute).
2. **No test ETH.** Base Sepolia faucets require authenticated third-party accounts
   (Alchemy/Coinbase). Quip's own faucet repo serves its L1, not Base Sepolia.
   No real tx = no hashes.

On-chain evidence gathered (read-only): omnibus has exactly ONE historical tx
(setVerifierActivity by the owner activating verifier 0x9154da0b...); zero wallets
have ever been created by the swap factory; zero commitments ever posted. The
protocol is brand new — nothing to piggyback on.

## How to run what exists

    cd <this dir> && npm install ethers@6
    node scripts/probe-gate.js      # omnibus validation-order probes
    node scripts/probe-factory.js   # wallet factory introspection
    node scripts/scan-omnibus.js    # omnibus activity scan

## What the vendor's docs/tools would have made this easier

- **Verify the omnibus contract** (Base + Base Sepolia). Its ABI had to be extracted
  from the minified web bundle; an explorer-verified source would have saved the bulk
  of the session.
- **Open-source the SHRINCS wallet stack + a swap SDK.** The public ethereum-sdk has
  no swap module and the wrong wallet generation. A documented `swap.commit/claim/
  reclaim` client (as the bundle shows exists internally — the app even hints at an
  internal `make verify-omnibus` Makefile) is the single biggest missing piece.
- **Document the call-level interface.** The QuipSwap docs describe the lifecycle and
  the wallet gate but not the omnibus ABI, the commit auth format, the digest scheme,
  or the interleaved deadline rule (reconstructed here from the app's validation code).
- **Builder faucet.** A Base Sepolia ETH drip for swap prototypers (creationFee is
  already 0; only gas is needed).
- **Publish the Oak Security audit** (announced as "coming soon") to confirm the
  timing model before OTC desks rely on it.

## Honest assessment

The settlement protocol itself is real, deployed, and coherent (hash-locked escrow
with interleaved timeouts; either-both-or-neither guarantee; fee currently 0). A
determined follow-up session with (a) the extracted bundle classes ported to a
standalone SHRINCS signer and (b) a working faucet could complete both scripted
paths in a few hours. Nothing in this repo fabricates results: there are no tx
hashes because no transactions could be sent, and that is stated plainly.
