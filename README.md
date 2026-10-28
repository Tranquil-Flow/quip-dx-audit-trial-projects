# Quip Network scheduling demo

This project formulates six-job, three-machine scheduling as an 18-variable
QUBO, solves it with XQuad/XQSA locally, and submits the same model to the
Aglais public Quip testnet.

See `FORMULATION.md` for the equations and `RESULT.md` for captured evidence.

## Reproduce

Requires Python 3.13+, `uv`, and (on macOS) Rust to build native extensions.

```sh
uv venv --python 3.13 .venv
UV_CACHE_DIR=.uv-cache uv pip install 'xquad[quip]==0.4.1'
.venv/bin/python schedule_qubo.py local
```

A network run uses only free, valueless Aglais testnet tokens. It creates a
brand-new mode-0600 keystore under `./keys`, asks the faucet for test tokens,
submits, waits, and writes `network_result.json`:

```sh
.venv/bin/python schedule_qubo.py network \
  --keystore keys/aglais-scheduling.json \
  --output network_result.json
```

Recover a known order later:

```sh
.venv/bin/python schedule_qubo.py query 111 \
  --keystore keys/aglais-scheduling.json \
  --output network_query_result.json
```

Do not commit or share files in `keys/`.
