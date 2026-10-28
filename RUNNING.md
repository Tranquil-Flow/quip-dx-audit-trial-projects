# Running g5-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `qubo`, `quip_solver_core`, `substrateinterface`, `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

Setup (Python 3.13 required):

    python3.13 -m venv .venv
    .venv/bin/pip install "xquad[quip]" quip-solver-core

Local solve + ground truth:

    .venv/bin/python work/qubo.py          # model + brute-force optimum (-36)
    .venv/bin/python work/solve_local.py   # SolverDWaveCPU, 4 seeds -> work/local_result.json

Network submission (needs internet; creates ./keys/keystore.json on first run,
auto-funds one 10-AGLS faucet drip when the fresh account is short, proposes,
waits for a miner, saves everything):

    .venv/bin/python work/submit_network.py  # -> work/network_result.json

Comparison incl. independent consensus-scorer cross-check:

    .venv/bin/python work/compare.py

Recover the order from chain state in a new process (offline-proof of the result):

    .venv/bin/python work/query_order.py    # order_id 177 hardcoded

Note: ./keys/keystore.json is the account for the job above. A rerun reuses it
(balance already holds ~8.998 AGLS, so no new drip). To start over, delete the
keystore and generate a fresh throwaway account.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keystore.json`, read by `work/query_order.py`, `work/submit_network.py`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x added by a later rebuild run, not part of the trial

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
