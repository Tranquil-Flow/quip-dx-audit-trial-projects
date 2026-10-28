# Running h2-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity).

```sh
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run it"), verbatim:

```
export PK=$(sed -n 's/^Private key: //p' keys/deployer.json)   # throwaway key
RPC=https://evm-rpc.aglais.quip.network

# fund (10 AGLS per request, EVM address fine):
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' -d '{"dest":"0xf76110804651FBDb9EAAbaf544BCE1a932f046a0"}'

forge create --broadcast --rpc-url $RPC --chain-id 20033 \
  --private-key $PK --gas-price 1000000000 src/AGLS20.sol:AGLS20

cast send <TOKEN> "mint(address,uint256)" 0x1bc89f594BdB52FbDd99f86A8AD76FFE1925966E 500ether \
  --rpc-url $RPC --chain-id 20033 --private-key $PK --gas-price 1000000000

forge verify-contract --chain-id 20033 --verifier blockscout \
  --verifier-url https://explorer.aglais.quip.network/api <TOKEN> src/AGLS20.sol:AGLS20
```

Gotchas: `--gas-price 1000000000` (1 gwei fixed); HTTP RPC only (no pubsub/filters, so no
`cast send --wait` style waiting via websocket); balances read one existential deposit low.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x foundry dependency dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
