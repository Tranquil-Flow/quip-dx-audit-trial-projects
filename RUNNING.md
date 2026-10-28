# Running t06-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Hardhat.

```sh
npm ci
npx hardhat compile
```

## 2. How the builder ran it

From `RESULT.md` (section "How to Run"), verbatim:

### Local (works now)
```bash
cd /private/tmp/devtrials2/t06-mimo-v2.5
npm install
npx hardhat compile
npx hardhat run scripts/deploy_and_interact.js
```

### Sepolia (requires testnet ETH)
```bash
# 1. Get 0.1 Sepolia ETH from a faucet (requires mainnet balance)
# 2. Fund the address: 0xa54597221a3C5C91AffE3f93903031FacbE945B2
# 3. Deploy:
npx hardhat run scripts/deploy.js --network sepolia
# 4. Interact:
npx hardhat run scripts/increment.js --network sepolia
```

npm scripts defined: `compile`, `deploy`, `increment`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `PRIVATE_KEY`, `RPC_URL`

## 5. What was removed from this branch

- 1 x secret-named file
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
