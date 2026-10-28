# RESULT — Quip Network OTC desk prototype

Two parties agree an OTC trade off-chain with post-quantum-signed orders (Quip's
own signing library), then settle it on a Base Sepolia testnet chain through a
QuipSwap-compatible commit → execute → reclaim escrow, with the commits
authorized by **real Quip post-quantum (SHRINCS) accounts**.

## Status

| Component | Status | Notes |
| --- | --- | --- |
| Post-quantum order signing (off-chain, both parties) | **WORKING** | `@quip.network/hashsigs-wasm@0.2.1-rc9`, SHRINCS profile `256s-keccak`, 2784-byte signatures |
| Quip post-quantum accounts (Quip Accounts / SHRINCS smart wallets) | **WORKING** | Real wallets created on-chain via `@quip.network/ethereum-sdk@0.3.0-beta.8` against the live Quip `WalletFactory` |
| Order-by-order PQ authorization of on-chain commits | **WORKING** | Contract gate = Quip `WalletFactory.walletOwner(caller)` membership, which is Omnibus's documented "factory-membership of a Quip wallet" path |
| Settlement — **settled trade** | **WORKING** | commit×2 → reveal secret → execute×2, all 4 txs confirmed |
| Settlement — **refunded/expired trade** | **WORKING** | commit → deadline passes → reclaim (refund), both txs confirmed |
| Settlement on the **vendor's own QuipSwap contract ("Omnibus")** | **BLOCKED** | Source repo `quip-swap-solidity` is **private** (404), no ABI/address published, no testnet deployment, no swap SDK. Docs say "Use the wallet for swaps." |
| Settlement on the **live public Base Sepolia testnet** | **PARTIAL** | All code and addresses are correct for live Base Sepolia; it ran against a **local fork of live Base Sepolia** because no usable faucet was reachable without an account/API key (see below). `RPC_URL=<live rpc> ./run.sh` runs the same code path live once EOAs are funded. |
| Quip compute-network layer (quip-validator / node testnet / xqsa) | **NOT ATTEMPTED** | Out of scope for the trade-settlement question; docs state public testnet connection details are unpublished |

**Overall: PARTIAL** — the prototype end to end works and is real Chain 84532
(Base Sepolia) state produced by real Quip contracts and the real Quip signing
library, but it settles through a QuipSwap-*compatible* contract we wrote, not
through Quip's own (unavailable) settlement contract, and the run executed on a
fork of the testnet rather than on the live public testnet.

## How to run

```bash
cd /private/tmp/devtrials4/m2-deepseek-v4-flash
npm install
./run.sh                 # starts an anvil fork of live Base Sepolia, then runs the flow
```

Against a live node (needs funded EOAs — see the blocker below):

```bash
RPC_URL=https://sepolia.base.org ./run.sh
```

Outputs: `evidence.json` (all hashes/addresses), `orders.json` (the signed order
book entry), `keys/*.json` (fresh throwaway keys, created on first run).

## What was built

```
contracts/OtcSettlement.sol    QuipSwap-compatible hashlock escrow (commit/execute/reclaim)
contracts/interfaces/IOtcQuip.sol  ERC-7913 verifier iface + IQuipWalletFactory
src/lib/order.mjs             canonical terms digest (byte-matches the Solidity encoding)
src/lib/pq.mjs                SHRINCS sign/verify wrapper over Quip's wasm library
src/lib/keys.mjs              throwaway key material in ./keys
src/lib/chain.mjs             viem clients + live Quip contract addresses
src/flow.mjs                  the three phases
```

### Settlement semantics (mirrors the documented QuipSwap protocol)

* **commit** — each party locks the asset it offers; the terms and `H(secret)` are
  recorded on chain. Authorization is required, and is satisfied by Quip-wallet
  membership (post-quantum account) or an allowlisted ERC-7913 PQ signature.
* **execute** — whoever holds the preimage reveals it; the leg moves to its payee.
  Identity-free, gated only by secret revelation and the deadline. Revelation is
  public, which is what unblocks the other leg. This is the "interlock".
* **reclaim** — after the reclaim deadline a committed leg returns to its owner.
  Every leg ends executed-or-reclaimed; funds are never stuck.
* Asymmetric windows (commitDeadline / executeDeadline / reclaimRelease) are
  carried in the terms, mirroring the documented prober/counterparty window gap.

## Evidence (Chain 84532, Base Sepolia)

Live Quip contracts used (CREATE3-deterministic, present on the fork at the same
addresses as live Base Sepolia, verified with `eth_getCode` against
`https://sepolia.base.org`):

```
WalletFactory                0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8
ShrincsWalletImplementation  0xc4E4652898bB12C4f0Ba9083829689B1963135E7
ShrincsVerifier (ERC-7913)   0xF2f9E6D692da41b089c3c261c41509669eEc5567
ShrincsPaymaster             0xC4209cD353CF7B1dbBf6F6B4d08bC5461aC7E145
EntryPoint v0.7              0x0000000071727De22E5E9d8BAf0edAc6f37da032
```

Party accounts (fresh throwaway keys generated into `./keys` on first run; the
values below are the final clean `./run.sh` run — every earlier run produced new
keys and new hash-identical behaviour):

```
maker EOA     0x8A213B9Ad159D9750F0477594cE91323430299B9
  order-signing PQ commitment 0x63c7c85802303aac18615e8f5d07513a12d8dd89409a4f3bbeef0c067c5aaa05
  Quip SHRINCS wallet  0x27B345F1fBEb310604BD90313a0d243894a7B9De
   (wallet identity commitment 0xc794bc65fac81234986ac16de80994061464dac0fca58effcc0f70e01bdec008)
taker EOA     0x964d6fbdD86ACe275a19A464eA19fB50d78854B8
  order-signing PQ commitment 0x90c414c1b29a3d822b4f0c771e61e9dba4d5a10888637a08e174b82e3ff39696
  Quip SHRINCS wallet  0x433528Dc07e3284124B9F30ACe44f723a3f4Ac8C
   (wallet identity commitment 0xf7317c1cbe9439e0180e1d24e430b05bc553e59fca045d7a56ba5eb450dab297)
```

Off-chain post-quantum order (canonical digest both parties sign):

```
scheme          SHRINCS-256s-keccak (Quip @quip.network/hashsigs-wasm)
digest          0x1d36afdf17029202ad98822e09cdfc40e68136f44da2950051989f42d26674aa
signature size  2784 bytes (both parties)
maker verifies  true      taker verifies  true
digest symmetric under leg swap  true
tampered-terms signature rejected  true
wrong-key signature rejected       true
```

`orders.json` carries the full signed envelope for both parties (terms, digest,
scheme, PQ commitment, 2784-byte signature each).

Deployment:

```
OtcSettlement  0x885d69fd207299472935c41add252b0f97b3fe42
tx             0x73648a4a1d387e05acef96636e35928986a08c314f4a8bca0ac12175adcecf95
```

Trade 1 — **SETTLED** (maker gives 1 ETH, taker gives 0.5 ETH,
digest `0x1d36afdf…`, secret `0x5e4f65bf…`):

```
commit  leg A (1.0 ETH)   0x4fe3ccdc0b0d7c7a0afe904ee3f969a198423d2585eea6d4ea37eab8b4700f35  success
commit  leg B (0.5 ETH)   0xb9b735f1e4558aa142304d48393b673e4c554e87796c91868a623e393fa4ef56  success
execute leg B (maker claims 0.5) 0xb76590830ca2beaa6026e74f04432624f960c07f102be76df8aeea0e0f950c00  success
execute leg A (taker claims 1.0) 0x86555ecf46c652fe538a7d895b19d28a177c732526f4ba2d0f4013847f158270  success
```

Trade 2 — **REFUNDED / EXPIRED** (maker commits 0.3 ETH; taker never commits):

```
commit          0x7f7a299d5b06a57d8d77ed1c9ab1fa54adfda4b3a49f00488a1819a3e6824dc3  success
reclaim (refund) 0xa8d282aea56294900f3b3c8d2bb77b5e20988c7131210d015e1ba9e48b7c3c29  success
maker Quip wallet balance  1.7 ETH before reclaim  ->  2.0 ETH after  (+0.3 ETH, the refund)
```

Post-conditions: settlement contract balance `0.0 ETH` (nothing stranded).
`WalletFactory.walletOwner(0x27B345F1…) → 0x8A213B9A…`, confirming the PQ-wallet
gate resolves the caller's owner against the live Quip factory.

## What did not work, and why

1. **The vendor's swap product could not be used.** `developers.quip.network`
   states plainly: *"There is no public `@quip.network/quip-swap` or
   `@quip.network/sdk` package, and no swap SDK is published today. Use the
   wallet for swaps."* The swap contract's source (`quip-swap-solidity`, contract
   name **Omnibus**, with `TermsLib`/`IOmnibus`) is referenced in the Oak Security
   audit but the GitLab repo is private (HTTP 404, clone prompts for credentials).
   No ABI, no deployed address, no testnet deployment. The docs also state the
   settlement contract **"is gated: only Quip wallet contracts can initiate a swap.
   You cannot drive a swap from an ordinary account or from your own contract
   today."* → **This is the central gap: Quip ships post-quantum accounts and a
   swap UI, but ships no way to integrate the swap.**

2. **No reachable testnet faucet.** Every Base Sepolia faucet tried required an
   account or API key, or returned an HTML page rather than a drip. Without
   testnet ETH there is no gas, so nothing can be deployed to live Base Sepolia
   by an agent. Worked around by forking live Base Sepolia locally: the real Quip
   contracts are present at their real addresses, the same code and calldata are
   used, and `RPC_URL=https://sepolia.base.org ./run.sh` is the live path. Note
   the live factory's `creationFee()` and `executeFee()` are both **0**, and the
   paymaster has **0** EntryPoint deposit, so a live run needs only gas.

3. **Ship-blocking bug in the vendor SDK on a forked/live chain.** Both
   `ShrincsFactoryClient.createShrincsWallet()` and `ShrincsWalletClient.execute()`
   submitted via `eth_sendTransaction` (JSON-RPC signing) rather than signing
   locally with the supplied `LocalAccount`, producing
   `Invalid parameters were provided to the RPC method` / `No Signer available`.
   Worked around with `anvil --auto-impersonate`. The wallet creation was
   additionally done by calling the factory's `deploySpecificWalletProxy`
   directly, because the SDK's `buildCreateCall` refuses to run when it thinks
   the wallet already exists.

4. **Two Quip products do not fit together.** The docs present a coherent story
   ("Quip Accounts → QuipSwap"), but the *account* layer ships on Base Sepolia
   while the *swap* layer ships only on Base mainnet, is not open to callers
   that are not Quip wallets, and has no published interface. There is also no
   documented network on which both layers are usable together — the account
   SDK's supported set (sepolia, sepolia_base, sepolia_optimism, mainnet, base,
   optimism) has no QuipSwap deployment.

5. **Contradictory docs.** The QuipSwap page says *"No slashing. The protocol does
   not penalize a party who commits and then walks away."* while the QUIP
   Lifecycle page specifies a *"Slashable approval timeout"* that lets approvers
   slash delinquent parties. The audit report also contradicts the lifecycle doc:
   it describes settlement/reclaim as *"identity-free"*. We implemented the
   QuipSwap page's semantics (no slashing; reclaim only).

6. **Signature-generation drift.** The SDK page warns that `latest` npm tags point
   at 2025 builds predating the current scheme, and the current generation
   (SHRINCS) differs from the previous one (WOTS+) with different on-chain
   contracts and incompatible addresses (`src/v1` vs `src/deprecated/v0`). The
   `quickstart` page still documents only the WOTS+ libraries. Mixing the two
   silently produces signatures that verify nowhere.

## What would have made this much easier

* A public `@quip.network/quip-swap` (or `quip-swap-solidity`) repo with an ABI,
  even without a deployment.
* A QuipSwap deployment on any testnet, and a documented list of chains where
  QuipSwap is live.
* Lifting (or documenting a supported way around) the "only Quip wallets can
  initiate a swap" gate, so integrators can call the settlement contract from
  their own contracts/accounts.
* A testnet faucet for the account layer, or a note on how to get gas.
* One "build a swap" guide covering: which package, which network, how to
  construct the terms, how to commit, how to claim and reclaim.
* Reconciling the WOTS+ and SHRINCS generations in one page, with a deprecation
  date, rather than two parallel doc sets.
* Fixing the SDK so a `LocalAccount` actually signs locally, and publishing the
  ERC-7913 key/signature encoding the on-chain verifier expects (we could only
  infer it from the audit report and the verifier's bytecode).
* Reconciling "no slashing" vs "slashable approval timeout".
