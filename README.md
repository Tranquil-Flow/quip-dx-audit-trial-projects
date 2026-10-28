# Quip hackathon project picker

A tiny demo that chooses which small projects a one-person hackathon team should build. Four projects have scores and three pairs compete for the same time. The choice is a binary quadratic model solved with Quip's XQuad SDK. The script also computes the energy independently and checks all possible choices, so the demo is easy to explain.

## Run

Requires Python 3.13+ (`python3.13`) and `uv`. The installation command is adapted from the [Quip compute-job guide](https://developers.quip.network/docs/compute/submit-a-job).

```sh
uv venv --python python3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]'
.venv/bin/python demo.py
.venv/bin/python -m unittest -v test_demo
```

To submit a real job **only to the free Aglais testnet** (chain 20033), run:

```sh
.venv/bin/python demo.py --network
```

This mode uses `SolverQuip.for_network("aglais")`, prints the fee quote, creates a new local keystore at `./keys/quip-keystore.json` on first use, automatically obtains faucet AGLS if needed, and waits for a miner's result. No wallet or key from elsewhere is used. Do not use this keystore for real assets or other chains; do not share it. `keys/` is gitignored. Do not delete it until you no longer need this test account. The call may take a few minutes without progress messages. A rerun uses the same project-local testnet account and may submit another paid-in-faucet-tokens job.

The local run uses the bundled CPU annealer, needs no wallet or network access, and makes no testnet submission. The Aglais result returns an on-chain `order_id` and `energy_matches_chain` in the metadata. No transaction hash is returned by this SDK example. The chain's `best_energy_milli` is in SPIN milli-scale, not the same unit as the displayed binary energy; see the [first-job tutorial](https://developers.quip.network/docs/xquad/solving/quip-first-job).
