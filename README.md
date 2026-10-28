# Quip portfolio demo

End-to-end demo for Aglais, Quip Network's public testnet:

1. Build an 8-asset QUBO (choose one asset from each of two four-asset sectors).
2. Submit it to Quip's heterogeneous quantum-capable optimization network with XQuad `SolverQuip`.
3. Save the returned on-chain order ID and chosen bit mask.
4. Deploy a Solidity result registry through Aglais's `pallet-revive` EVM endpoint. The constructor permanently records the order ID, solution, energy, and canonical result hash.
5. Read the record back and verify its hash against the compute artifact.

Important: Quip jobs can be won by CPU, GPU, or QPU miners. The current result metadata names the winning miner account but does not attest its hardware. This demo therefore proves use of Quip's compute marketplace and chain, not that the winning sample physically ran on a QPU.

## Requirements

- Python 3.13+
- Node.js 20+
- `resolc` (tested with 1.4.0; produces the native PolkaVM artifact)
- Foundry/Forge with Solidity 0.8.24 support (produces the EVM artifact Aglais deploys through `pallet-revive`)
- Testnet only; AGLS has no value

## Setup

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]' pytest
npm install
```

The checked-out project has fresh throwaway testnet keys under `./keys`. Never fund or reuse them outside Aglais.

## Run

Local deterministic smoke test (no network or tokens):

```sh
.venv/bin/python scripts/portfolio_job.py --local
```

Submit to Aglais. This uses the documented public faucet automatically and writes `artifacts/compute-result.json`:

```sh
.venv/bin/python scripts/portfolio_job.py --network aglais
```

Compile both the native PolkaVM artifact and the EVM artifact accepted by Aglais `pallet-revive`, then deploy the EVM artifact with the compute result in its constructor:

```sh
npm run compile
npm run deploy
```

Read and independently verify the stored result:

```sh
npm run read
```

Run tests (the included pytest configuration limits collection to this project's `test/` directory):

```sh
.venv/bin/pytest -q
```

## Files

- `scripts/portfolio_job.py`: QUBO builder, brute-force verifier, local solver, and Quip submitter.
- `contracts/PortfolioResult.sol`: immutable on-chain result record.
- `scripts/compile.mjs`: calls `resolc` and normalizes its output.
- `scripts/deploy-record.mjs`: deploys the contract to chain ID 20033.
- `scripts/read-result.mjs`: reads and verifies the stored record.
- `data/assets.json`: deterministic demo inputs.
- `artifacts/compute-result.json`: actual solve output (after a run).
- `artifacts/deployment.json`: actual deployment evidence (after a run).
- `DEVLOG.md`: full source/command/dead-end log.
- `RESULT.md`: final status and evidence.
