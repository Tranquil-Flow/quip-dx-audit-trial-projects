# Running v2-c

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity).

```sh
forge build
```

## 2. How the builder ran it

From `RESULT.md` (section "How to reproduce"), verbatim:

```sh
# 1. brand-new throwaway keys (absolute paths only)
qb keygen /private/tmp/devtrials7/v2-minimax-m3/keys/deployer.key
qb keygen /private/tmp/devtrials7/v2-minimax-m3/keys/recipient.key

# 2. fund via the public faucet (10 AGLS / call)
curl -X POST -H 'Content-Type: application/json' \
  --data "{\"dest\":\"$(cat .../deployer.key|qb derive addr)\"}" \
  https://faucet.aglais.quip.network/request

# 3. deploy
forge create --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  --private-key "$(cat .../deployer.key)" --chain-id 20033 \
  --broadcast src/QuipToken.sol:QuipToken \
  --constructor-args "Quip Demo Token" "QUIPDEMO" 1000000000000000000000000 0xDEPLOYER_ADDR

# 4. mint
cast send --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  --private-key "$(cat .../deployer.key)" --chain-id 20033 \
  0xCONTRACT "mint(address,uint256)" 0xRECIPIENT_ADDR 500000000000000000000

# 5. verify
cast call --rpc-url https://evm-rpc.aglais.quip.network:20049 \
  0xCONTRACT "balanceOf(address)(uint256)" 0xDEPLOYER_ADDR
```

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x dependency/build/cache dir
- 2 x added by a later rebuild run, not part of the trial
- 1 x clone/mirror of a public Quip repo
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
