# Running t02-c

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
# Install dependencies
cd /private/tmp/devtrials2/t02-mimo-v2.5
npm install

# Run the script (generates keys, creates PQ wallet, polls for funding)
node quip-pq-cli.mjs

# After manual funding, re-run to complete (fund + withdraw)
node quip-pq-cli.mjs

# Check balances
node quip-pq-cli.mjs --status
```

The script will:
1. Generate a throwaway EOA private key (saved to `keys/eoa.json`)
2. Connect to Base Sepolia via public RPC
3. Generate SHRINCS post-quantum keys via `@quip.network/hashsigs-wasm`
4. Deploy a SHRINCS wallet via the WalletFactory contract
5. Poll for faucet funding (or exit with instructions)
6. Fund the PQ wallet from the EOA
7. Withdraw 1/3 of the PQ wallet balance back to the EOA

All keys are saved in `./keys/` and are throwaway testnet-only.

---

npm scripts defined: `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 4. Networks it touches

- Base Sepolia (84532)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
