# Running p4-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Python (scripts), Docker Compose.

Python modules imported (pip names may differ): `websockets`, `xxhash`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
cd /private/tmp/projects/proj-4d3b9c/quip-deploy
docker compose -p devhobbyb-quip --profile cpu up -d
docker compose -p devhobbyb-quip --profile cpu logs -f        # or: docker logs devhobbyb-miner
open http://localhost:31600/                                  # dashboard
```
Stop: `docker compose -p devhobbyb-quip --profile cpu down --remove-orphans`
(resume later: just `up -d` again — chain DB and dashboard index persist in ./data
and ./dashboard-data; validator continues syncing from where it stopped).

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x deleted by the trial itself before it finished
- 1 x clone/mirror of a public Quip repo (the files the agent edited are kept)

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
