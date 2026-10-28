# Quip QVRF → on-chain loot drop

A minimal end-to-end demo of building an on-chain loot drop on
Quip Network's Aglais testnet (chain ID 20033).

## TL;DR — what you'll learn

- The current state of Quip Network's QVRF ("Quantum Verifiable Random
  Function") product and its limits.
- A complete, working on-chain loot drop that consumes a randomness
  callback on Quip Aglais.
- A drop-in off-chain bridge that produces a QVRF-shaped randomness
  transcript today, ready to be swapped for the real Quip QVRF
  oracle the day it ships.

## Setup

```bash
# one-time: install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# build
cd /private/tmp/projects/proj-fd03e9
forge build

# run the demo
python3 scripts/loot_drop_demo.py
```

The script will:
1. Compile and deploy `contracts/LootDropV2.sol` to Quip Aglais.
2. Call `openLoot()` to open a loot box (pays 0.001 AGLS).
3. Generate a QVRF-style randomness off-chain (SHA-256 mix of the
   latest Aglais block hash + request id + a public nonce) and call
   `rawFulfillRandomness()` to feed it on-chain.
4. Call `revealLoot()` and read back the dropped item.

Each step prints its tx hash and a link to the Blockscout explorer.

## The honest version

Quip markets QVRF as their flagship product
(https://quip.network/qvrf/), but as of this run there is **no live
on-chain QVRF request interface** to call from a Solidity contract. The
docs themselves say so:

- `developers.quip.network/docs/compute/qvrf`:
  "This page covers concepts only. The request interface is not yet
  final, so no function names or parameters appear here."
- `quip.network/qvrf`: "On-chain verification contracts: IN DEVELOPMENT".
- `developers.quip.network/docs/getting-started/what-is-quip`:
  "Future subnets: Verifiable Random Functions, Search, Factoring,
  Circuit Mapping."

The repo's only Solidity is `QuipFactory.sol` and `QuipWallet.sol`
(post-quantum signature smart accounts, not randomness), and neither
is deployed on Aglais. So you can't call QVRF from a Solidity contract
today.

This repo gives you the closest faithful substitute:

- `contracts/LootDropV2.sol` — the on-chain consumer. It exposes the
  same shape Chainlink VRF V2 uses (`requestId`, `rawFulfillRandomness`,
  `revealLoot`), so when Quip ships the real QVRF oracle the contract
  doesn't need to change.
- `scripts/loot_drop_demo.py` — the off-chain bridge. It uses
  `cast`/`forge` to send transactions (the chain's `eth_estimateGas`
  is fragile for many transactions, so this is more reliable than
  driving JSON-RPC directly with web3.py).

## Layout

```
contracts/LootDropV2.sol    # the on-chain consumer
foundry.toml                # Foundry config
scripts/loot_drop_demo.py   # end-to-end demo (deploy + open + fulfill + reveal)
keys/wallet.key             # throwaway EOA (generated locally, never reuse)
RESULT.md                   # status and explanation for the harness
DEVLOG.md                   # chronological log of pages visited
FRICTION.md                 # moments that confused or misled me
loot_drop_run.json          # last demo run, with tx hashes and explorer links
```

## What you get on-chain

After running the script you'll have:

- 1 deploy tx (creates `LootDropV2`)
- 1 `openLoot()` tx (creates a randomness request)
- 1 `rawFulfillRandomness()` tx (delivers the QVRF-shaped randomness)
- 1 `revealLoot()` tx (turns the randomness into a loot item)

All four show up in the JSON-RPC and the Blockscout explorer. The
`loot_drop_run.json` file lists every hash, the contract address, the
randomness, the QVRF-shaped transcript, and the loot it produced.

## How the QVRF bridge works (until Quip ships the real one)

Quip's docs describe the canonical QVRF transcript:

```json
{ "OUTPUT", "SAMPLES", "SEED_MANIFEST", "MERKLROOT",
  "AUDITED", "XEB_SCORE", "EXTRACTOR" }
```

`compute_qvrf_style_randomness` in `loot_drop_demo.py` produces a
deterministic 32-byte randomness plus a transcript with the same
shape:

```
output       = sha256(blockHash || coordinator || requestId || publicNonce)
seed_manifest= sha256(blockHash || publicNonce)
merklroot    = sha256(output    || publicNonce)
samples      = 0          (real QVRF has 6000)
audited      = 0
xeb_score    = 0
extractor    = "toeplitz"
```

Because all inputs are public, anyone can re-derive the same
randomness. When Quip ships the real QVRF oracle, the only change
needed is the source of the 32 bytes — the consumer contract stays
the same.
