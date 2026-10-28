# Running t02-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `cryptography`, `a`, `base58`, `quip_signer`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```sh
cd /private/tmp/devtrials6/t02-glm-5.2
python3 -m venv .venv                       # (already set up)
.venv/bin/pip install quip-signer cryptography base58
.venv/bin/python quip_poc/quip_poc.py run   # keygen + fund + withdraw + verify
```

See `quip_poc/README.md` for per-step subcommands (`keygen`, `fund`,
`withdraw`, `status`). Keys are throwaway, in `./keys/` (mode 0600).

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `QUIP_RPC`, `QUIP_FAUCET`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 5 x clone/mirror of a public Quip repo
- 1 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
