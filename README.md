# Quip Network demo: quantum portfolio solve -> on-chain proof

Solves an 8-asset portfolio-selection QUBO on **Quip Network's testnet
(Aglais)** via the official XQuad toolchain (`SolverQuip`), then records the
job id, the chosen portfolio (as an 8-bit mask), the energy and the winning
miner on-chain in a smart contract deployed on Aglais' pallet-revive EVM
(chain id 20033). A read-back script lets anyone verify the stored result
against the public chain.

## What happened (one run, 2026-09-28)

- QUBO: pick exactly 4 of 8 assets, maximise expected return, minimise
  pairwise covariance risk. Optimal selection: BBB, CCC, EEE, GGG
  (mask `0b01010110` = 86), energy -3360 — found by both a local classical
  baseline (dwave-cpu SA) and the Quip Network.
- Quip job: **order_id 167**, proposed to the `QuantumComputeMempool` pallet
  on aglais, solved by miner `5EXN4YzJoqb7GnMTdMDmDo7wYpMz5HtQwcAvy1LmJVHTB943`
  (11 submissions, best_energy_milli -457500, energy_matches_chain=true).
  Job cost: 1 AGLS reward + 0.0019 AGLS fee.
- Contract `PortfolioProof` deployed at
  `0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591` (deploy tx
  `0xf6d5c7dcfcfc557c55e8326b61cc42bbb131c194e7d1b5f4505c2aa33d7997ce`,
  block 378003).
- `record(jobId=167, nAssets=8, mask=86, energy=-3360, solver=…)` mined in
  tx `0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549`,
  block 378051. `SolutionRecorded` event emitted.
- `read_back.py` re-reads the contract over the public EVM JSON-RPC and
  cross-checks every field: ALL FIELDS VERIFIED.

## Files

- `solve_portfolio.py` — builds the QUBO, runs the local baseline, submits
  the job to Quip Network via `SolverQuip`, writes `results/solve_result.json`.
- `src/PortfolioProof.sol` — the recording contract.
- `record_solution.py` — calls `record(...)` on the contract (web3.py).
- `read_back.py` — pure read + cross-check of the stored record.
- `keys/` — throwaway keys created for this demo (EVM key `evm.key`,
  substrate hybrid key `quip_keystore.json`). Do not reuse.
- `results/`, `artifacts/` — outputs and deployment addresses.
- `DEVLOG.md` — full trail of sources, commands, errors and workarounds.

## How to run

```bash
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python "xquad[quip]" web3

.venv/bin/python solve_portfolio.py     # step 1: solve on Quip Network
                                        #   (fresh account is auto-funded from the faucet)
.venv/bin/python record_solution.py     # step 2: record job id + solution on-chain
.venv/bin/python read_back.py           # step 3: read the record back and verify
```

`record_solution.py` and `read_back.py` use the contract already deployed at
`0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591`; to deploy a fresh one:

```bash
forge create src/PortfolioProof.sol:PortfolioProof \
  --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  --private-key $(cat keys/evm.key) --legacy --broadcast
```

## Where to look

- Contract: https://explorer.aglais.quip.network/address/0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591
- Record tx: https://explorer.aglais.quip.network/tx/0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549
- Job on-chain (order 167): https://subscan.aglais.quip.network
- Network info: https://aglais.quip.network

## Notes / gotchas

- Default hardware topology (4577 nodes, max degree 20) has no 8-clique, so
  the dense 28-coupling risk matrix cannot be placed there; the job runs in
  `topology="native"` mode (solved by the simulated-annealing miner fleet).
- EVM side is legacy-tx only (gas price 1 gwei), no pubsub/filters, no
  internal-tx tracing; Blockscout covers normal addresses/tx/contracts.
- Balances: AGLS is a worthless testnet token; the faucet gives 10 AGLS per
  request.
