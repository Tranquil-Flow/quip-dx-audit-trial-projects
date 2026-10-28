# Running g4-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/solana-sdk@0.0.1`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "Run"), verbatim:

From `/private/tmp/devtrials5/g4-gpt-6-sol`:

```sh
npm ci
npm test
npm start -- status
npm start -- airdrop 1
npm start -- create 0.05
npm start -- fund 0.01
npm start -- send 0.005
npm start -- status
```

`./keys` already contains the newly created throwaway keys, so **do not run `init` again** here. In a fresh clean copy, run `npm start -- init` before the other commands. If the public faucet stays blocked, use only a *permitted devnet-only* faucet to fund the generated payer address, then proceed with `create`, `fund`, and `send`. Never fund from an existing wallet or use mainnet/real funds. The official faucet website states that AI agents must not use its web UI; it recommends programmatic means instead. If a transfer fails mid-way, do not blindly retry: `keys/wots-attempts.json` prevents reusing the same one-time PQ key, and `keys/send.lock` guards concurrent sends. Details and commands are in `README.md` and the full chronological `DEVLOG.md`.

npm scripts: `build`, `start`, `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Solana devnet

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x added by a later rebuild run, not part of the trial
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
