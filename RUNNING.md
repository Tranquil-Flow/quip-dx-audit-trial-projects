# Running v7-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts).

Python modules imported (pip names may differ): `xqsa`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
cd /private/tmp/devtrials5/v7-mimo-v2.5
python3.13 -m venv .venv
source .venv/bin/activate
pip install "xquad[quip]"
python3.13 demo.py
```

Requires Python 3.13+. The network part takes 1-3 minutes (miners need time to find
the order and solve it). If your account is unfunded the SDK auto-draws a faucet drip;
fund manually with:

```
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'Content-Type: application/json' \
  -d '{"dest": "0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a"}'
```

(Replace with your own address from `account_id_hex` in ~/.quip/keystore.json.)

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x added by a later rebuild run, not part of the trial

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
