# Running p3-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
cd quip-client && npm ci
forge build
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

- Contract tests: `cd tip-dapp && forge test` (5/5 pass)
- Deploy TipJar: see `tip-dapp/README.md` (`cast send --rpc-url aglais --keystore ../keys/deployer --create $(jq -r .bytecode.object out/TipJar.sol/TipJar.json)`)
- Frontend: `cd tip-dapp/web && python3 -m http.server 8000` → http://localhost:8000 (adds/switches the wallet to Aglais, chain 20033)
- Tip from a Quip PQ account: `cd quip-client && npm install && node tip.mjs <creator> 0.01 "gm"` (uses keys/deployer.key as the gas-paying owner and keys/quip-mnemonic.txt for the SHRINCS keys)
- Redeploy the Quip account stack (only on a fresh chain or after a reset): `quip-client/deploy-quip-stack.sh` (needs `vendor/ethereum-sdk` built, see DEVLOG)

npm scripts: `quip-client/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `RPC`, `TIPJAR`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x clone/mirror of a public Quip repo

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
