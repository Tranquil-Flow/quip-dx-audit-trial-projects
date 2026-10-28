# Running p2-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python.

```sh
pip install -r requirements.txt
```

Python modules imported (pip names may differ): `quip_signer`, `the`, `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

python3.13 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
    python3 sign_demo.py
    python3 compute_job.py            # add --local-only to skip the network job

IMPORTANT: the vendor requires Python >= 3.13 (xquad/xqsa/xqffi/xqvm-py metadata
all say requires_python >=3.13). On THIS machine the default `python3` is 3.9.6,
so `python3 -m venv .venv` + pip install fails with "Could not find a version that
satisfies the requirement xquad (from versions: none)". Use a 3.13 interpreter
(here: /opt/homebrew/bin/python3.13). On macOS, `quip-signer` is built from
source during pip install and needs a Rust toolchain (this machine has rustc 1.95).

What the machine DID run (evidence for part 1; part 2 pending the install):
    PYTHONPATH=vendor_src/quip_signer-0.3.0/python /opt/homebrew/bin/python3.13 sign_demo.py

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `quip_keystore.json`, read by `compute_job.py`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x added by a later rebuild run, not part of the trial
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
