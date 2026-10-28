# Running t05-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

No package manifest was found; this project is scripts and documents. Check the imports below.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

Full runbook: `RUNBOOK.md`. Short form (from `./repo`):
```bash
cd /private/tmp/devtrials3/t05-claude-sonnet/repo
docker compose --profile cpu up -d quip-validator dashboard   # node (+ dashboard, log collector)
docker compose --profile cpu up -d cpu                        # miner
docker compose --profile cpu stop                             # stop again (keeps all data)
```
Stack = official `gitlab.com/quip.network/nodes.quip.network` compose (images `:beta`) + local
`docker-compose.override.yml` and `.env`. Project `t05cs`, containers `t05cs-{validator,miner,dashboard}`,
ports p2p 30334, front door http://127.0.0.1:20059, logs udp 5524. Throwaway miner key: `./keys/keystore.json`.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x clone/mirror of a public Quip repo

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
