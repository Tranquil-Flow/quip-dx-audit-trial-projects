# Running t04-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

    cd /private/tmp/devtrials2/t04-glm-5.2
    export UV_CACHE_DIR=$PWD/.uvcache
    uv venv --python 3.13 .venv          # pip venv may fail: machine disk ~full
    uv pip install --python .venv/bin/python "xqsa[quip]"
    export QUIP_KEYSTORE=$PWD/keys/testnet-throwaway.ks

    .venv/bin/python scheduling_qubo.py   # build QUBO + brute-force oracle
    .venv/bin/python solve_local.py       # local CPU solve (ground state)
    .venv/bin/python solve_network3.py    # network solve (order 116 pattern)
    .venv/bin/python solve_network.py     # network solve, plain weights (order 114)

solve_network*.py self-fund from the testnet faucet when the account is short
(autoconfirm=True, autofund=True); they poll until the order finalizes and print
order_id, energies, assignment and loads, and save network_result*.json.

Keystore: keys/testnet-throwaway.ks — a brand-new key generated for this task.
No mainnet, no real funds, testnet AGLS only.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/testnet-throwaway.ks`, read by `solve_network.py`, `solve_network2.py`, `solve_network3.py`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 3 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
