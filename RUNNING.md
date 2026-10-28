# Running p2-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python.

```sh
pip install -r requirements.txt
```

Python modules imported (pip names may differ): `hashsigs`, `quip_signer`, `substrateinterface`, `websocket`, `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "Run"), verbatim:

Use Python >=3.13 (the vendor toolchain requires it). On a machine whose `python3` is >=3.13:

    python3 -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
    python sign_demo.py
    python compute_job.py

Here the unqualified `python3` is 3.9.6, so replace the FIRST command with `python3.13 -m venv .venv`. `python compute_job.py --local-only` skips the testnet. `python sign_demo.py --legacy-wots` tries Quip's earlier one-time signature algorithm. The requirements install only pip packages, selecting included macOS arm64 pip wheels for `quip-signer`/`xqffi` via `--find-links ./dist`; those wheels were built from the vendor's officially documented PyPI sdists because vendor publishes no Mac wheels. Other dependencies come from PyPI. Never commit the `keys/` directory; keys/keystores are created fresh for each script run, with private files mode 0600. No existing wallet, mainnet, Docker container, or real money used. Every compute run creates a new, funded testnet wallet and posts one paid-in-AGLS optimization job; use `--local-only` if you don't want a testnet transaction.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
