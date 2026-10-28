# Running m3-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `xqsa`, `web3`, `xqvm_py`, `results`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

    uv venv --python 3.13 .venv
    uv pip install --python .venv/bin/python "xquad[quip]" web3
    .venv/bin/python solve_portfolio.py    # solve on Quip Network (auto-faucet-funded)
    .venv/bin/python record_solution.py    # record job id + bits + energy on-chain
    .venv/bin/python read_back.py          # read + verify the stored record

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
