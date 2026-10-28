# Running t04-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python.

```sh
python3 -m venv .venv && . .venv/bin/activate && pip install -e .   # or: uv sync
```

Python modules imported (pip names may differ): `xqvm_py`, `xqsa`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```sh
uv venv --python 3.13 .venv
UV_CACHE_DIR=.uv-cache uv pip install 'xquad[quip]==0.4.1'

# Local
.venv/bin/python schedule_qubo.py local

# New real testnet job (creates a fresh key if the path does not exist)
.venv/bin/python schedule_qubo.py network \
  --keystore keys/aglais-scheduling.json \
  --output network_result.json

# Recover this completed job
.venv/bin/python schedule_qubo.py query 111 \
  --keystore keys/aglais-scheduling.json \
  --output network_query_result.json

# Exhaustive formulation checks
.venv/bin/python -m unittest -v test_schedule_qubo.py
```

Do not commit or share `keys/aglais-scheduling.json`.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/aglais-scheduling.json`, read by `schedule_qubo.py`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 3 x dependency/build/cache dir
- 1 x key material dir
- 1 x clone/mirror of a public Quip repo

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
