# Running h3-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `xqsa`, `xqvm_py`, `networkx`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
uv venv --python 3.13 .venv && source .venv/bin/activate
uv pip install "xquad[quip]" networkx numpy
QUIP=1 python maxcut.py                    # N=16, default topology
N=20 NATIVE=1 QUIP=1 python maxcut.py      # N=20, topology="native"
```
Without `QUIP=1` only the classical baselines run. Keystore is created at ./keys/keystore.json (throwaway testnet key, auto-funded from the faucet; I passed an explicit keystore path so nothing went to ~/.quip).

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/keystore.json`, read by `maxcut.py`, `probe.py`

Environment variables the code reads: `QUIP`, `NATIVE`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
