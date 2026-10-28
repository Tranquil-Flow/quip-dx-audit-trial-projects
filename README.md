# Quip Aglais Max-Cut comparison

This project encodes Max-Cut on the four-cycle `(0-1-2-3-0)` as a binary QUBO and compares:

1. exact exhaustive enumeration on the laptop;
2. the SDK's local CPU simulated-annealing solver; and
3. optionally, a job submitted to Quip Network's Aglais testnet.

For each edge `(u, v)`, the cut contribution is `x_u + x_v - 2 x_u x_v`. The minimized QUBO is its negative, so QUBO energy equals `-cut_size`. The exact optimum is a cut of 4 with energy -4.

Requirements: Python 3.13 or newer. Testnet AGLS comes only from the free faucet; no mainnet or real funds are used. The generated testnet keystore is unencrypted, stays under `./keys`, and is ignored by Git.

## Set up

```console
python3.13 -m venv .venv
. .venv/bin/activate
python -m pip install -r requirements.txt
```

## Run locally

```console
python maxcut_compare.py
python -m unittest -v
```

## Submit to Aglais

```console
python maxcut_compare.py --network 2>&1 | tee network_run.log
```

The default uses topology placement, preserving eligibility for compatible hardware-backed miners. If placement fails, `--native` accepts the graph directly but may exclude miners that require QPU embedding. The first network run creates `keys/quip-aglais.json`, automatically requests one testnet faucet drip if needed, posts the job, waits for finality, and writes public result evidence to `artifacts/network_result.json`.

The returned solver identity is an on-chain account, not hardware attestation. A successful network result therefore proves marketplace execution, but not that the winning miner used a quantum processor.
