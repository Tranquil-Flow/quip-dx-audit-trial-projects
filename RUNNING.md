# Running v7-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python.

```sh
pip install -r requirements.txt
```

Python modules imported (pip names may differ): `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "Run"), verbatim:

From this project directory:

```sh
uv venv --python python3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]'
.venv/bin/python demo.py
.venv/bin/python -m unittest -v test_demo
.venv/bin/python demo.py --network  # optional: new Aglais testnet job, faucet tokens only
```

`README.md` has safety and setup details. The first network run generated a fresh throwaway keystore at `./keys/quip-keystore.json` with private file permissions; the directory and file are `0700` and `0600` respectively, and `keys/` is gitignored. No pre-existing keys, mainnet, or real money were used.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/quip-aglais.json`, read by `testnet_job.py`
- `quip-keystore.json`, read by `demo.py`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
