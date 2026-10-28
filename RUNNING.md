# Running t08-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
npm install
npm test                      # 7 unit tests
npm run keygen                # creates NEW throwaway ./keys/testnet.json and requests faucet funds (Aglais testnet only)
npm start                     # :3000; ENTROPY=csprng (default) | qvrf (returns 501 by design)
npm run demo                  # in another shell: create -> enter x6 -> close (tx) -> draw -> verify

# API
POST /raffles {name,winners} · POST /raffles/:id/entries {entry} · POST /raffles/:id/close
POST /raffles/:id/draw (425 until the beacon block exists) · GET /raffles/:id · GET /raffles/:id/verify · GET /health
```

Env vars: `PORT`, `ENTROPY`, `BEACON_DELAY` (default 3), `AGLAIS_RPC`, `KEY_FILE`.

npm scripts defined: `start`, `test`, `demo`, `keygen`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/testnet.json`, read by `scripts/keygen.js`, `src/chain.js`

Environment variables the code reads: `BASE`, `AGLAIS_RPC`, `KEY_FILE`, `BEACON_DELAY`, `ENTROPY`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
