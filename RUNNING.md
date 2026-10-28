# Running m1-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/hashsigs@^0.1.0`, `@quip.network/solana-sdk@^0.0.1`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
cd /private/tmp/devtrials6/m1-glm-5.2
npm install && npm run build

# LIVE DEVNET (works when the faucet isn't quota-blocking your IP):
node dist/quipwallet.cjs generate
node dist/quipwallet.cjs create 0.05
node dist/quipwallet.cjs transfer <recipient> 0.01
node dist/quipwallet.cjs show
# then open the printed explorer.solana.com links (cluster=devnet)

# LOCAL REPRODUCIBLE RUN (real Quip program cloned from devnet):
solana-test-validator --reset --url https://api.devnet.solana.com \
  --clone-upgradeable-program Quipr1sgzkAgNKZ58yqiiT6AyGJ8sB2Ua6jUabpapJj \
  --clone A9pdWuTNwG3Br6E8yqEJFWis3PgjJJqR471EEUa6uUV4 --ledger .validator-ledger &
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs generate
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs create 0.05
QUIP_CLUSTER=custom QUIP_KEYS_DIR=keys-local QUIP_RPC_URL=http://127.0.0.1:8899 \
  node dist/quipwallet.cjs transfer 2zwLT7t3SGnbjEUxo35zvisqRHd1Dwvn6BxPhMAyrXwn 0.005
# QUIP_CLUSTER=custom makes explorer links use cluster=custom&customUrl=http://127.0.0.1:8899
# so the local txs are viewable in the real explorer.solana.com UI while the validator runs.
```

npm scripts defined: `build`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/devnet-recipient.json`, read by `scripts/devnet-run.sh`

Environment variables the code reads: `QUIP_RPC_URL`, `QUIP_KEYS_DIR`, `QUIP_CLUSTER`

## 4. Networks it touches

- Solana devnet

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 2 x key material dir
- 1 x dependency/build/cache dir
- 1 x build output / large research dir (>1 MB)

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
