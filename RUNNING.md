# Running g1-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@0.3.0-beta.8`, `@quip.network/quip-swap-sdk@0.1.0-beta.9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "Reproduce"), verbatim:

Run from this directory on Node 22+:

```
npm install
npm run typecheck
npm test
npm run wallets   # ONLY on a new checkout with no ./keys/wallets.json
npm run probe
npm run faucet    # ONLY if the two brand-new gas-payer addresses need free Base Sepolia ETH
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com npm run swap
```

This run already has `./keys/wallets.json`, `./keys/swap-secret.json`, and `run-state.json`; do NOT regenerate wallet keys or erase swap state before resuming. `swap` resumes recorded transaction hashes and is idempotent once settled (verified by rerunning). Base Sepolia chain ID 84532 is checked before broadcasting; no mainnet code path. Same-chain swap uses tiny native ETH amounts 1000 wei versus 2000 wei, committed via `wallet.execute` by the corresponding Quip wallets; the owners' local EOA accounts pay network fees and provide the transaction value. The six deadlines use 600-second adjacent windows (below SDK's 1800-second default); leave the script running through the on-chain windows on a fresh run. `./keys` and `run-state.json` are gitignored. A new swap needs a new throwaway project/keys or deliberate state/secret rotation, not blind reuse of this settled swap.

npm scripts: `typecheck`, `test`, `wallets`, `probe`, `faucet`, `swap`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/wallets.json`, read by `src/faucet.ts`

Environment variables the code reads: `BASE_SEPOLIA_RPC_URL`

## 4. Networks it touches

- Base Sepolia (84532)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x added by a later rebuild run, not part of the trial

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
