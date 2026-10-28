# Running h2-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity).

```sh
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run it yourself"), verbatim:

Prereqs: foundry (`forge`/`cast`), internet access.

```bash
# 1. throwaway keys (any password is fine, this is throwaway)
cast wallet new keys/alice alice --unsafe-password quip-test-pw
cast wallet new keys/bob   bob   --unsafe-password quip-test-pw

# 2. faucet both  (free, no rate-limit hit during testing)
ALICE=$(jq -r .address keys/alice/alice)  # or read the create.log
BOB=$(jq   -r .address keys/bob/bob)
curl -sS -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$ALICE\"}" https://faucet.aglais.quip.network/request
curl -sS -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$BOB\"}" https://faucet.aglais.quip.network/request

# 3. build & deploy
forge build
forge create --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --broadcast src/QuipToken.sol:QuipToken \
  --constructor-args 1000000000000000000000000        # 1,000,000 * 1e18

# 4. mint from deployer to bob
TOKEN=<paste Deployed-to address>
cast send --rpc-url https://evm-rpc.aglais.quip.network:20049 --chain-id 20033 \
  --keystore keys/alice/alice --password quip-test-pw \
  --gas-limit 6000000 \                               # *** crucial on this chain, see below ***
  --priority-gas-price 1 --gas-price 1000000000 \
  $TOKEN "mint(address,uint256)" $BOB 500000000000000000000000

# 5. read state
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 $TOKEN 'totalSupply()(uint256)'
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 $TOKEN 'balanceOf(address)(uint256)' $BOB
```

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
