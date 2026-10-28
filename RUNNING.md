# Running v1-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/hashsigs@0.1.0`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
cd /private/tmp/devtrials7/v1-gpt-5.6-sol
npm install
npm test
npm run typecheck
npm run dev
```

Open `http://localhost:3000`.

1. Click **Generate one-time key → Sign → Verify**.
2. Confirm **SIGNATURE VALID**.
3. Click **Tamper with message and verify again**.
4. Confirm **SIGNATURE INVALID**.

Production mode:

```bash
npm run build
npm start
```

No wallet, chain, testnet funds, key file, RPC endpoint, or public post is needed for this message-signing boundary demo.

npm scripts: `dev`, `build`, `start`, `typecheck`, `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)
- Base Sepolia (84532)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x added by a later rebuild run, not part of the trial
- 1 x dependency/build/cache dir
- 1 x clone/mirror of a public Quip repo

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
