# DEVLOG — QuipSwap testnet prototype (OTC trustless swap)

Task: prototype trustless swap between two parties via Quip Network's QuipSwap
protocol on testnet. Deliver (a) happy path both complete, (b) counterparty
disappears -> initiator reclaims. Scripts + tx hashes.

## Sources consulted (in order)
1. https://quip.network/ — marketing site. Learned: QuipSwap live on Base (Sep 2026),
   Quip accounts = post-quantum wallet layer, orderbook opening soon.
2. https://developers.quip.network/docs/getting-started/quickstart — quickstart: node runner,
   PQ keys via account.quip.network or libs (hashsigs-rs/-cpp/-ts/-solidity).
3. https://developers.quip.network/docs/quip-interlock-protocol/quipswap — QuipSwap doc:
   commit/execute/reclaim lifecycle, hash lock, initiator has LONGER window than
   counterparty, "settlement contract is gated: only Quip wallet contracts can initiate
   a swap today", native/ERC20/NFT legs.
4. https://quip.network/blog/quipswap-launch — launch announcement (Sep 1 2026): app live on
   Base, audit by Oak Security, no technical spec published.
5. https://github.com/QuipNetwork (org) — 40 repos. ethereum-sdk = WOTS+ wallet stack.
   NO swap contract repo public.
6. https://gitlab.com/quip.network (group) — mirrors + docs; no swap contract repo.
7. ethereum-sdk repo (cloned, incl. branches deploy/testnet, deploy/op-base-sepolia) —
   QuipWallet/QuipFactory (WOTS+ era). DEPLOYMENTS.md: v1 canonical CREATE3 addresses.
   No swap code in any branch.
8. https://quip-swap.quip.locker — serves the QUIP Account (QuipSwap) web app.
   Downloaded /assets/index-D447g-dh.js (5.4MB minified). Reverse-engineered from it:
   - Omnibus (swap settlement) contract address: 0xf780Fc9C066D824bFF85758E381A3919B1817f09
     on chains 8453 (Base) + 84532 (Base Sepolia).
   - Full ABI (66 entries incl. custom errors) — extracted & saved as omnibus_abi.json.
   - Window model, digest scheme (keccak), commit auth (signer = walletAddr||vaultId,
     empty signature on the wallet route), lockState enum.
9. https://base-sepolia.blockscout.com (API v2) — omnibus deployed bytecode (unverified),
   tx list (exactly 1 tx ever: setVerifierActivity by owner 0xc68b6477...).
10. Chain probes via public RPCs (sepolia.base.org, base-sepolia-rpc.publicnode.com):
    omnibus WALLET_FACTORY=0x6de121f7cc8b310adbc957425b97e1c8dfce3be5, commitmentFee=0,
    MAX_FEE=0.01e18; factory is an ERC-1967 proxy, latestWalletImpl=0xb84a596A...,
    creationFee=0, owner=0xc68b6477...; zero wallets created so far.
11. github.com/QuipNetwork/hashsigs-ts (cloned) — WOTS+ only, NO SHRINCS. npm
    @quip.network/hashsigs versions 0.0.1–0.2.0-rc.2 — no SHRINCS.
12. Quip's own account app references Alchemy faucet (auth required) for Base Sepolia.

## Commands / actions that mattered
- git clone ethereum-sdk, hashsigs-ts, arch-sdk, docs, devdocs (gitlab)
- npm init + npm i ethers@6 in project root
- curl app bundle -> app/index.js; python extraction -> omnibus_abi.json, wallet_abi.json,
  factory_abi.json (from minified JS object literals, fixed `!1`/`!0` booleans and quoted keys)
- node scripts/probe-gate.js — eth_call gating probes (EmptyAssets/TermsMismatch/WindowViolated
  hit BEFORE any sender checks)
- node scripts/probe-factory.js — factory proxy introspection
- node scripts/scan-omnibus.js — omnibus tx history (1 tx, setVerifierActivity only)
- eth_getLogs broken on all public RPCs ("could not coalesce error" for any range) —
  workaround: Blockscout API instead.

## Errors / dead ends
- DuckDuckGo backend flaky (several "no results"); worked around with targeted queries.
- grep.app blocked (Vercel checkpoint) — no public source search for the swap contract.
- ethers v6 tuple encoding: needs array form; fixed probe script.
- My first selector computations used SHA3-256 (NIST) instead of keccak256 — wrong
  selectors, garbage reads; fixed with pycryptodome keccak.
- eth_getLogs unusable on sepolia.base.org / publicnode / thirdweb RPCs.
- SHRINCS wallet stack (the ONLY wallet type the omnibus gate accepts) is NOT in any
  public repo; exists solely inside the 5.4MB minified web bundle (class names: N_t/
  Rgt/nP, tags quip-shrincs-wallet-v1, quip.shrincs.action.execute, hypertree/FORS).
  Reimplementing the stateful SPHINCS-style signer from minified code is a multi-hour
  job and unverifiable without on-chain tx ability.
- No test ETH on Base Sepolia; all faucets require authenticated third-party accounts
  (Alchemy/Coinbase) that I won't create. quip's faucet repo is for the QUIP L1, not Base Sepolia.
- Counter-factual checked: ethereum-sdk's WOTS+ QuipWallet can NOT satisfy the omnibus
  gate (omnibus references the newer factory, WALLET_FACTORY()=0x6de121f7..., and its
  wallet impl differs from the SDK's).

## Points where I guessed / deviated
- Nothing on-chain was sent (no funds, no wallet stack) — all chain interaction was
  read-only (eth_call / blockscout / RPC). All conclusions are from bundle analysis +
  on-chain reads, documented above.
- The interleaved deadline rule (prop.commit < take.commit < prop.claim < take.claim <
  prop.reclaim < take.reclaim, taker commit window opens at proposer.commitmentDeadline)
  is reconstructed from the app's validation code (J3/QTt/vTt/NTt) and error names,
  NOT from contract source (unverified). Flagged as needs-on-chain-confirmation.
- AssetType enum values assumed {0:Native, 1:ERC20, 2:ERC721(+1155)} from app usage
  (wa.Native comparisons) — not confirmed against bytecode.

## Outcome
BLOCKED at the wallet layer + faucet. Everything about the swap settlement contract
(QuipSwap "omnibus") is fully mapped: address, ABI, fee, gating semantics, window
model, digest scheme, both commit routes. The missing pieces are (1) the SHRINCS
wallet signer implementation (closed source, minified only) and (2) testnet ETH.
See RESULT.md.
