# Running m4-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

See `README.md`. In short: `npm install`; `(cd contracts && forge build && forge test)`; `node scripts/genkeys.mjs`; fund the 5 addresses from `POST https://faucet.aglais.quip.network/request {"dest":"0x…"}`; `GAS_MULT=5 node scripts/run-raffle.mjs`. Output goes to `evidence/raffle-run.json`. Keys are throwaway, in `./keys` (git-ignored).

npm scripts defined: `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/organizer.json`, read by `research/probe-eth.mjs`
- `keys/raffle-secret.json`, read by `scripts/run-raffle.mjs`

Environment variables the code reads: `AGLAIS_WS`, `GAS_MULT`, `TICKET`, `BOND`, `ENTRY_BLOCKS`, `REVEAL_WINDOW`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
