# Quip local/testnet QUBO comparison

This project sends one four-variable binary QUBO through two backends from Quip's official XQuad/XQSA toolchain:

- `xqsa.SolverDWaveCPU`, locally on the CPU.
- `xqsa.SolverQuip`, on Quip Network's no-value Aglais testnet.

The QUBO is a maximum-weight independent-set formulation for the path `0--1--2--3`. Its unique optimum is `[1, 0, 1, 0]` with energy `-7`. The program also enumerates all 16 assignments as an independent exact oracle.

## Setup

Requires `uv` and a Rust toolchain. Keep uv's Python and cache inside this directory:

```sh
export UV_PYTHON_INSTALL_DIR="$PWD/.python"
export UV_CACHE_DIR="$PWD/.uv-cache"
uv sync --python 3.13
```

The official `quip-signer==0.3.0` macOS source distribution needs the small workspace-boundary workaround documented in `DEVLOG.md`. `pyproject.toml` points uv at the patched, checksum-verified copy under `vendor/`.

## Run

```sh
# Deterministic checks plus a real local solve
uv run python -m unittest -v test_solve_qubo.py

# Save local evidence
uv run python solve_qubo.py local

# Submit the identical model to Aglais. This creates/reuses only
# ./keys/aglais-keystore.json and uses the no-value testnet faucet.
uv run python solve_qubo.py testnet

# Compare persisted results
uv run python solve_qubo.py compare

# Independently verify the recorded proposal through Aglais Subscan
uv run python verify_subscan.py
```

Generated evidence is written under `outputs/`. Private seed material stays in `keys/aglais-keystore.json`; the script enforces mode `0600` and never emits the seed. Do not commit that file.

Read `RESULT.md` for the observed run and `DEVLOG.md` for every source, command, error, and workaround.
