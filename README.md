# Quip Network Hackathon Demo

Solve an NP-hard optimization problem (Max-Cut on the Petersen graph) on the Quip
Network quantum-compute testnet (Aglais) and compare with a local baseline.

## Quickstart

```bash
python3.13 -m venv .venv
source .venv/bin/activate
pip install "xquad[quip]"
python3.13 demo.py
```

The demo:
- builds an Ising model (SPIN domain) for Max-Cut,
- solves locally with simulated annealing (instant),
- submits the same model as a paid on-chain compute job to the Aglais testnet,
- waits for finality (typically 1-3 min) and prints the winning miner's solution
  and on-chain job metadata.

## What it does, in one line

`SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json").solve(model)`
signs a propose_job extrinsic, reserves an AGLS reward on-chain, and returns the
lowest-energy assignment found by the network's miners.

## Files

- demo.py          — the full demo script
- keys/            — throwaway testnet account keys (keystore.json)
- DEVLOG.md        — every page visited, commands, errors
- FRICTION.md      — doc/site pain points
- RESULT.md        — status, evidence, vendor recommendations

## Keys / account

Throwaway testnet account (generated this session, hybrid-falcon512 post-quantum scheme):
0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a
Funded with free AGLS from https://faucet.aglais.quip.network/request
