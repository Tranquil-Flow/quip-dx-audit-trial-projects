# Running t02-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@0.3.0-beta.8`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

Requirements: Node ≥ 20.

```bash
npm install                        # installs @quip.network/ethereum-sdk@0.3.0-beta.8 (+viem)
node quip-pq.mjs init              # throwaway keys -> ./keys (owner EOA, recipient EOA, SHRINCS mnemonic)
```

**Quip Aglais testnet**
```bash
export RPC_URL=https://evm-rpc.aglais.quip.network:20049/
# faucet (no auth): funds the owner EOA with 10 QUIP
curl -X POST https://faucet.aglais.quip.network/request -H 'Content-Type: application/json' \
     -d "{\"dest\":\"$(node -p 'require("./keys/owner.json").address')\"}"
node aglais-deploy.mjs             # one-time: deploy Quip's contract stack (skips what's already in keys/aglais-deployment.json)
node quip-pq.mjs create            # create the Quip Account (prints tx hash + explorer link)
node quip-pq.mjs fund 1            # owner EOA -> Quip Account
node quip-pq.mjs withdraw 0.4      # Quip Account -> recipient (SHRINCS-signed); optional 3rd arg = any address
node quip-pq.mjs status
node quip-pq.mjs tamper-check 0.1  # negative test (simulation only): tampered amount must revert
```
Aglais txs can take anywhere from seconds to about 6 minutes to be included, and the CLI waits up to 15 minutes. You can also run the whole sequence with `node quip-pq.mjs all <fund> <withdraw>`.

**Base Sepolia (official Quip deployment):** send about 0.005 Base Sepolia ETH to the owner EOA printed by `init`, then:
```bash
export RPC_URL=https://sepolia.base.org
node quip-pq.mjs create && node quip-pq.mjs fund 0.002 && node quip-pq.mjs withdraw 0.001
```
To rehearse it without funds, fork Base Sepolia with `bin/anvil --fork-url https://sepolia.base.org` and use `KEYS_DIR=./keys-fork RPC_URL=http://127.0.0.1:8545`.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/aglais-deployment.json`, read by `aglais-deploy.mjs`
- `keys/owner.json`, read by `aglais-deploy.mjs`, `aglais-probe.mjs`

Environment variables the code reads: `RPC_URL`, `KEYS_DIR`, `MAX_SIGNATURES`, `EXPLORER`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)
- Base Sepolia (84532)
- OP Sepolia (11155420)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 2 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
