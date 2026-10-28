# Running h6-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `xqvm_py`, `xqsa`

## 2. How the builder ran it

From `RESULT.md` (section "Run it"), verbatim:

From this directory on macOS with `uv` available:

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python "xquad[quip]"
.venv/bin/python demo.py
.venv/bin/python -m unittest discover -v
```

`--data other.json`, `--seed 7`, and `--reads 200` are supported. JSON format: `{ "people": ["Ada", "Ben"], "interactions": [["Ada", "Ben", 5]] }`. If a standard Python 3.13 venv with pip is already active, the vendor's install command is `pip install "xquad[quip]"`. The network extra is not needed for local CPU use; `xquad` alone should also install that backend.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 5. What was removed from this branch

- nothing significant

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
