# Running p3-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
cd tip-dapp && npm ci
forge build
```

Quip packages pinned: `@quip.network/ethereum-sdk@0.3.0-beta.8`, `@quip.network/hashsigs-wasm@0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

The builder did not write a run section. Start with `RESULT.md` and `DEVLOG.md`.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/creator.json`, read by `tip-dapp/scripts/pq-tip.mjs`, `tip-dapp/scripts/smoke-tip.mjs`
- `keys/deployer.json`, read by `tip-dapp/scripts/deploy-pq.mjs`, `tip-dapp/scripts/deploy.mjs`, `tip-dapp/scripts/pq-tip.mjs`
- `keys/pq-deployment.json`, read by `tip-dapp/scripts/deploy-pq.mjs`, `tip-dapp/scripts/pq-tip.mjs`, `tip-dapp/scripts/serve.mjs`
- `keys/pq-leaves.json`, read by `tip-dapp/scripts/pq-tip.mjs`
- `keys/quip-seed.json`, read by `tip-dapp/scripts/create-keys.mjs`, `tip-dapp/scripts/deploy-pq.mjs`, `tip-dapp/scripts/pq-tip.mjs`

Environment variables the code reads: `TIPJAR_PORT`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x clone/mirror of a public Quip repo
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
