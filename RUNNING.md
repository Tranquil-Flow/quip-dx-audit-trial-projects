# Running t06-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

To check the existing deployment without a key:

```sh
npm install
npm run compile
npm run verify:rpc
npm run read
npm run verify:evidence
```

To deploy with a new throwaway account, work in a clean copy where `keys/deployer.json` does not exist. The key generator deliberately refuses to remove or overwrite an existing key:

```sh
npm install
npm run wallet:new
npm run compile
# Fund the printed address only from the official valueless testnet faucet.
npm run deploy
npm run increment
npm run read
npm run verify:evidence
```

The exact faucet command and full safety notes are in `README.md`. End-user MetaMask instructions are in `METAMASK.md`.

npm scripts defined: `wallet:new`, `compile`, `deploy`, `increment`, `read`, `verify:rpc`, `verify:evidence`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `QUIP_RPC_URL`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
