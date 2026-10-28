# Running m2-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.1.7`, `@quip.network/hashsigs@^0.1.0`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
cd /private/tmp/devtrials6/m2-minimax-m3
npm install                      # done; deps: ethers, @quip.network/ethereum-sdk, @quip.network/hashsigs, @noble/hashes
anvil --host 127.0.0.1 --port 8545   # (already running as background proc)
node scripts/01_create_signed_offers.js trade1
node scripts/01_create_signed_offers.js trade2
node scripts/02_deploy.js
node scripts/03_settle_trade1.js
node scripts/04_refund_trade2.js
```

All scripts are idempotent (fresh keys/contracts per run). Keys are brand-new, generated in `./keys` — nothing else on the machine was touched.

npm scripts defined: `otc:create-trade-1`, `otc:create-trade-2`, `deploy`, `trade1:settle`, `trade2:refund`, `all`, `anvil`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/alice-pq.json`, read by `scripts/03_settle_trade1.js`, `scripts/04_refund_trade2.js`
- `keys/alice.json`, read by `scripts/03_settle_trade1.js`, `scripts/04_refund_trade2.js`
- `keys/bob-pq.json`, read by `scripts/03_settle_trade1.js`, `scripts/04_refund_trade2.js`
- `keys/bob.json`, read by `scripts/03_settle_trade1.js`, `scripts/04_refund_trade2.js`

## 4. Networks it touches

- local Anvil / fork

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 2 x secret-named file
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
