# Running t03-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
npm install                      # viem, @quip.network/ethereum-sdk@0.3.0-beta.8, @quip.network/hashsigs-wasm@0.2.1-rc9
./run-fork.sh                    # needs foundry (anvil/cast); no funds needed
# after funding both EOAs on Base Sepolia:
./run-testnet.sh                 # writes evidence/happy.json, evidence/refund.json and *.log
```

npm scripts defined: `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `WALLET_TAG`, `RPC_URL`, `STEP_SECONDS`, `ETH_LEG_WEI`, `MAX_SIGNATURES`, `TOKEN_LEG`

## 4. Networks it touches

- Base Sepolia (84532)
- local Anvil / fork

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x build output / large research dir (>1 MB)

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
