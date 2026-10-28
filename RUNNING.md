# Running m1-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip@{'network/ethereum-sdk': '0.3.0-beta.8'}`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
npm install                      # installs @quip.network/ethereum-sdk@0.3.0-beta.8 + viem
node quip-wallet.mjs init        # throwaway EOA + SHRINCS mnemonic -> ./keys (already created)
node quip-wallet.mjs info        # EOA, predicted smart-account address, balances

# Live Base Sepolia (needs ~0.001 Base Sepolia ETH on the EOA in keys/eoa.json):
node quip-wallet.mjs create
node quip-wallet.mjs fund 0.01
node quip-wallet.mjs transfer 0x1111111111111111111111111111111111111111 0.002           # spends the smart account's balance
node quip-wallet.mjs transfer 0x1111111111111111111111111111111111111111 0.001 --from-eoa  # SDK-default semantics
node quip-wallet.mjs status

# Full end-to-end run on an anvil fork of Base Sepolia (needs Foundry):
./demo-fork.sh                   # output in evidence/fork-run.log

# Quip's own testnet faucet (Aglais, chain 20033):
node quip-wallet.mjs aglais-faucet
# Experimental: self-deploy Quip's verified contracts on Aglais, then use the CLI there
node deploy-aglais.mjs && QUIP_NETWORK=aglais node quip-wallet.mjs create   # see Aglais section
```

Env overrides: `QUIP_NETWORK` (`base-sepolia` | `aglais`), `QUIP_RPC`, `QUIP_EXPLORER`, `QUIP_MAX_SIGNATURES` (default 64; it must stay the same after `create`), and `DEBUG=1`.

npm scripts defined: `test`, `wallet`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/aglais-deployment.json`, read by `deploy-aglais.mjs`, `quip-wallet.mjs`
- `keys/eoa.json`, read by `demo-fork.sh`, `deploy-aglais.mjs`, `neg-test.mjs`
- `keys/quip-shrincs.json`, read by `neg-test.mjs`

Environment variables the code reads: `QUIP_RPC`, `QUIP_NETWORK`, `QUIP_EXPLORER`, `QUIP_MAX_SIGNATURES`

## 4. Networks it touches

- Base Sepolia (84532)
- Aglais testnet (Quip chain, chain id 20033)
- local Anvil / fork

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
