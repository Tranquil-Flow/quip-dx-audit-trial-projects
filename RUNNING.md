# Running t08-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
cd /private/tmp/devtrials2/t08-mimo-v2.5
npm install        # express only
npm test           # runs unit tests
node server.js     # starts on :3456
```

npm scripts defined: `start`, `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `RANDOMNESS_BACKEND`, `QVRF_RPC_URL`, `QVRF_KEYSTORE`

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
