# RESULT.md — Provably-fair on-chain raffle on Quip Network's testnet (Aglais)

Status: **WORKING** — contract deployed, one full raffle run end to end,
winner drawn and paid, draw independently re-verified from public chain data.

Overall component verdicts: QVRF BLOCKED (vendor has no public interface yet —
see below); raffle contract, runner, and verification all WORKING via the
documented fallback.

## What was asked

A provably fair on-chain raffle on Quip Network's testnet: a smart contract
that takes entries and picks a winner using Quip's quantum randomness (QVRF) if
available, plus a script running one full raffle end to end. If QVRF cannot be
used: explain exactly why, and what the fallback is.

## What Quip Network actually is (context)

Quip Network is a decentralized quantum-compute marketplace. Its own chain is a
Substrate solochain ("quip-testnet", a.k.a. **Aglais testnet**, EIP-155 chain id
**20033**, token **AGLS**, ~6s blocks). Smart contracts on Aglais run on
**pallet-revive** (PolkaVM), which accepts plain **Solidity/EVM bytecode**
(AllowEVMBytecode=true, permissionless deployment) and is exposed through an
Ethereum JSON-RPC sidecar: **https://evm-rpc.aglais.quip.network:20049**.
Faucet: POST https://faucet.aglais.quip.network/request {"dest":"0x..."}
(10 AGLS per request). Explorer (Blockscout): https://explorer.aglais.quip.network

## Component status

| Component | Status | Notes |
|---|---|---|
| QVRF (Quip quantum randomness) in the contract | BLOCKED (by vendor) | no published request interface; see below |
| Raffle smart contract on Aglais testnet | WORKING | Solidity, deployed via eth-rpc sidecar |
| Provable fairness mechanism | WORKING (fallback) | commit-reveal + K-block anchor of real block hashes |
| End-to-end runner script | WORKING | run_full.py (deploy→enter→reveal→close→draw→claim/refund) |
| Independent off-chain draw verification | WORKING | verify.py recomputes winner from public data |
| Faucet / keys | WORKING | 4 throwaway keys in ./keys, funded via faucet |

## Why QVRF could not be used (exact reasons)

1. **No published request interface.** The official docs
   (developers.quip.network/docs/compute/qvrf) say verbatim: "The request
   interface is not yet final, so no function names or parameters appear here"
   and "Integration documentation with installable packages and code examples
   will follow once those details settle." There is nothing to call.
2. **Access is gated.** quip.network/qvrf offers only a "Request Access"
   contact form. No public API key flow, no SDK package (checked npm/PyPI —
   the only Quip packages are hash-signature/WOTS SDKs).
3. **On-chain verification is unfinished.** quip.network/qvrf: "On-chain
   verification contracts — In development". A contract cannot yet verify a
   QVRF transcript on-chain.
4. **Nothing QVRF exists on Aglais.** Grep of the quip-validator runtime
   (GitHub, the actual testnet runtime source): no QVRF pallet, no randomness
   precompile (`Precompiles = ()`), no randomness runtime API. The only
   randomness in the runtime is BABE epoch randomness on the Substrate side,
   which is not exposed to EVM contracts.
5. **The only public consumer is elsewhere.** Quantum Echoes (first QVRF
   project) mints on **Ethereum mainnet** via an operator-run flow; its
   coordinator interface is not open for third-party contracts and not on
   Quip's testnet.
6. **EVM randomness opcodes on Aglais are inert.** Verified in Quip's pinned
   polkadot-sdk fork source: `DIFFICULTY`/`PREVRANDAO` returns the hard-coded
   constant 2,500,000,000,000,000 (vm/evm.rs:50); RPC blocks show difficulty
   0x0 and mixHash = that same constant. `block.prevrandao` is therefore a
   constant on this chain and cannot seed a draw.

## What we fell back to (and why it is fair)

The contract uses the strongest randomness actually available inside the Aglais
EVM — real, per-block canonical hashes:

- **Commit phase**: entrants submit keccak256(abi.encode(player, salt)); the
  entry list is fixed before anything about the draw exists.
- **Reveal phase**: entrants reveal their salts (checked against commitments),
  so the final entrant set is locked and public before the draw anchor.
- **Close**: anyone calls closeReveals() after the reveal deadline; it stores
  the anchor block N and the aggregate hash of all ordered reveals.
- **Draw**: at least K=5 blocks (30s) later, anyone calls draw(). Winner index
  = keccak256(aggregate, H) % entries, where H = fold over
  blockhash(N)…blockhash(N+4). blockhash() returns the REAL Substrate block
  hash inside this EVM (exec.rs), and those 5 hashes did not exist when the
  reveal set was locked, so nobody — entrant, operator, or us — could know the
  outcome at entry/reveal time. GRANDPA finality prevents reorgs.
- **Payouts**: winner claims the pot minus reserved refunds; revealed
  non-winners refund their 1 AGLS entry (tracked, non-repeatable); unrevealed
  entrants forfeit.

Limitations (documented honestly): an adversary who could author ALL 5 blocks
of the anchor window (1/3^5 per attempt with the current 3 validators) could
re-roll the draw by choosing which block carries closeReveals(); the window is
public so attempts are visible. This is the classic multi-block-anchor scheme
used where no VRF oracle exists; QVRF is precisely the product that would
remove this assumption when its interface ships. For a testnet raffle with
visible, audit-able randomness this is a reasonable, standard trade-off.

## How to run what we built

Prereqs: python3 + pip install web3 eth-account eth-abi, node + npm install
solc@0.8.26 (for solcjs). Everything lives in this directory.

    cd /private/tmp/devtrials6/m4-glm-5.2
    ./node_modules/.bin/solcjs --bin --abi --optimize --base-path . -o build contracts/AglaisQuantumRaffle.sol
    python3 raffle.py fund      # faucet-fund keys in ./keys (10 AGLS each)
    python3 raffle.py deploy    # or run the whole lifecycle:
    python3 run_full.py         # deploy -> 3 entries -> reveals -> close -> draw -> claim/refunds
    python3 verify.py           # independently recompute the winner from on-chain data

Files: contracts/AglaisQuantumRaffle.sol (contract), run_full.py (end-to-end),
raffle.py (stepwise runner), verify.py (verification), raffle_state.json
(deployed addresses, salts, tx hashes, draw evidence), keys/ (throwaway
testnet keys — never reuse), DEVLOG.md (full narrative).

Chain parameters: chain id 20033, RPC https://evm-rpc.aglais.quip.network:20049,
gas price 1 gwei. CRITICAL Aglais quirk: pallet-revive charges contract storage
deposits out of the tx GAS OVERPAYMENT, so state-writing txs need huge gas
limits (deploy ~1.7e9, entry ~1.4e9, other writes ~2e8). Standard EVM tooling
defaults fail with "Invalid Transaction" or a revert
(StorageDepositNotEnoughFunds). See DEVLOG items #3 and #12.

## Evidence (final run, Aglais testnet, chain id 20033)

Contract (v6, the deployed artifact):
  0x1179b9b7d5e9DA6dA2a594b2721874842048aEe7
  (Blockscout: https://explorer.aglais.quip.network/address/0x1179b9b7d5e9DA6dA2a594b2721874842048aEe7)

| Step | Tx hash | Block |
|---|---|---|
| Deploy | 0x5a6c5e26646943d6ca4a6dc0224e6b8fcf0b4df2b2e0547644ec98e76ca9b3f0 | 378268 |
| alice enter (1 AGLS) | 0x4fc8ef9ab79e23c935015973abc84df3a7e1cbcb499eda4e1c5884e51f05e264 | 378269 |
| bob enter (1 AGLS) | 0x88e3c897d6a45a699485a8d8f2a0a52af1b7f6aa1bae0657458a6cb91964df9a | 378270 |
| carol enter (1 AGLS) | 0x649dbda00d935f8dfd8f7844af3fbd613beac87a703166b914d9fdae99789d42 | 378271 |
| alice reveal | 0xe246fe5da0d5ad805094ad6a96262d3f75526dc455373f866ec4467d92c30869 | 378285 |
| bob reveal | 0x171d2918816202ba854d1014ea088f1285da5e5e2b1149b100f1d2b24b985cab | 378286 |
| carol reveal | 0x191ad6593b9f438f0709b0ab5b23a93ffbdbf485a978a759826e19d2ed8d5809 | 378287 |
| closeReveals (anchor=378300) | 0xc4f7af4ed68e516cfe4d8076fc055a6327a91d8f91eb5b1b5d4e21c61b7e77be | 378299 |
| draw | 0x124b8c2154bbe06f40d894cd67148daebe2fe97d8e55050f3db4725ec234eb8b | 378306 |
| winner claim (1 AGLS) | 0x820f3e47be9003682305680164b530fdd2a77882050b52fdd2bc8c3549574188 | 378307 |
| alice refund (1 AGLS) | 0x2649aff5175bfbe743e2626719808a8ff6d3f679d6c0f1d3bc33712aaaeaa568 | 378307 |
| carol refund (1 AGLS) | 0x07d441a6366309e02281b96a6d13ea781d806b4d2a3f0a52f88b31f74c623b15 | 378307 |

Draw parameters (on-chain):
  commitDeadline 378283, revealDeadline 378298, anchorBlock 378300,
  drawBlock 378306, drawAggregate
  c5f23ded39b989fb2a69534a17df95ea9ed3f2a208f27f3578666affae96727a,
  anchorHash (DrawExecuted event)
  cd19bc5dfee02bc15c9a932a880d9b853bbfc7a1850d72fbba2e42d058f1e93b
  = keccak-fold of blockhash(378300..378304):
  02e78735524b…38b59, 4ea68d0e86…ad55f, 91232d1fd3…b9c4,
  84251adad8…f04258, bb00ed4e79a…f374f57.

Winner: index 1 = BOB 0xc69EA47F15916e3195BB10F2B51624d26E786bB8.
Payouts: PaidOut 1.0 AGLS to bob; Refunded 1.0 AGLS each to alice and carol;
final contract pot 0.

Independent verification (verify.py, recomputes everything from public data —
entry structs, salts, chain block hashes): VERIFY: PASS
(aggregateMatches ✓, anchorHashesMatchChain ✓, anchorHashMatches ✓,
winnerMatches ✓, recomputed winner index 1 = bob).

Known cosmetic issue in the deployed build: drawEvidence()'s 6th return field
(anchorHash) reads 0 because the return-parameter name shadowed the local in
the deployed bytecode. The true value is in the DrawExecuted event (extracted
above) and the source in this repo is fixed (compile-checked, not redeployed
within the time budget). The draw itself is unaffected — winner and hashes all
verify.

## What did not work and why (summary)

- QVRF: no public interface (see above) — blocked by vendor, not by us.
- First 3 deploys reverted: storage deposit paid from gas overpayment (found
  via eth_estimateGas revert payload). Fixed with large gas limits.
- Contract v1 phase bug, v2/v3 commitment-encoding bug (Web3.solidity_keccak
  ≠ abi.encode), v4 closeReveals phase bug, v5 claim-drains-pot-before-refunds
  bug — each found by real tx failures, each fixed; v6 is the clean run.
  (The final deployed contract is the 6th iteration; DEVLOG records every dead
  end. The refund-order flaw and a drawEvidence() return-variable shadowing
  bug are fixed in the repo source; the getter fix is compile-checked but not
  redeployed within the time budget — the deployed event log carries the
  correct value.)
- Subscan indexer is stale (~17 days behind) — no extrinsic-level error
  introspection there; used eth_call revert data instead.
- eth_estimateGas fails on value-bearing calls (TransferFailed) — worked
  around with fixed generous gas limits.

## What in the vendor's docs/tools would have made this easier

1. A published QVRF request/callback interface (function names, parameters,
   fee model) — the docs explicitly say it does not exist yet; that single
   page would have made the primary task trivial.
2. A documented EVM deployment guide for Aglais covering the
   deposit-via-gas-overpayment mechanics; the integration doc's own checklist
   still has "Contract upload, deployment, calls, events" UNCHECKED — we had
   to reverse-engineer the gas economics from the SDK source and live tx
   failures.
3. A working Subscan/API for the testnet (stale indexer) and consistent
   explorer URLs (registry says explorer.testnet.quip.network which does not
   resolve; the live one is explorer.aglais.quip.network).
4. Registering the faucet in the chain registry entry (eip155-20033.json has
   "faucets": []).
5. Any precompile exposing BABE/epoch randomness (or QVRF) to EVM contracts
   would replace the multi-block-anchor fallback.
