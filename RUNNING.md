# Running t06-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity).

```sh
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

## 2. How the builder ran it

From `README.md` (section "Quickstart"), verbatim:

```bash
# 1. throwaway testnet key (NEVER use a real wallet for this)
mkdir -p keys && chmod 700 keys
cast wallet new --json > /tmp/k.json
python3 -c "import json;d=json.load(open('/tmp/k.json'))[0];open('keys/deployer.json','w').write(json.dumps(d,indent=2))"
chmod 600 keys/deployer.json

# 2. fund it from the faucet (10 AGLS per request; must be run from a terminal)
ADDR=$(cast wallet address --private-key "$(python3 -c "import json;print(json.load(open('keys/deployer.json'))['private_key'])")")
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d "{\"dest\":\"$ADDR\"}"

# 3. deploy
./scripts/deploy.sh

# 4. increment and read back
./scripts/increment.sh
```

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`).
Nothing else — no npm, no node_modules.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `RPC_URL`, `KEY_FILE`, `CONTRACT`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
