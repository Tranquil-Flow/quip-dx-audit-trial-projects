# Running m5-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`, `@quip.network/quip-swap-sdk@^0.1.0-beta.9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
npm install                      # installs @quip.network/ethereum-sdk@beta, hashsigs-wasm@rc, quip-swap-sdk@beta, viem
npm run build-token              # forge build contracts/TestUSD.sol
npm run fork                     # terminal 1: anvil fork of Base Sepolia on :8547
LABEL=my-run node flow.mjs all   # terminal 2: full flow (≈40 s; SHRINCS keygen ≈10 s/bundle)
node flow.mjs approve            # individual steps are also runnable; state lives in state/<LABEL>.json
npm run verify-live              # re-verify all saved approvals against LIVE Base Sepolia (no gas needed)
RPC_URL=https://sepolia.optimism.io node verify-live.mjs
RPC_URL=https://evm-rpc.aglais.quip.network VERIFIER=0x79d1b0969640d8a79e912f8a1593862ed28ce55b node verify-live.mjs
```

To run live on Base Sepolia, fund `keys/eoa-operator.json` and `keys/eoa-maker.json` with Base
Sepolia ETH, then run `RPC_URL=<base sepolia rpc> IS_FORK=0 LABEL=live SWAP_BUFFER=300 node flow.mjs all`.
Real time passes between windows (about 10 min with a 300 s buffer). This is **untested live**.

Keys are in `./keys` (throwaway and testnet-only): EOAs, three SHRINCS mnemonics (treasury,
approver, maker), slot ledgers and swap secrets.

npm scripts defined: `test`, `fork`, `flow`, `build-token`, `verify-live`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `RPC_URL`, `VERIFIER`, `LABEL`, `IS_FORK`, `SWAP_BUFFER`, `PAYOUT_ETH`

## 4. Networks it touches

- Base Sepolia (84532)
- local Anvil / fork
- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x build output / large research dir (>1 MB)

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
