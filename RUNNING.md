# Running v2-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
npm ci
forge build
```

## 2. How the builder ran it

From `README.md` (section "Run"), verbatim:

Generate a new wallet in `keys/` and fund its **EVM address** using the portal's faucet. This exercise already has throwaway keys in `keys/wallet.key` and `keys/recipient.key`, ignored by git; never commit or share them. The example commands below refer to that freshly generated deployer key. The portal also documents a `POST /request` JSON faucet route if its web form fails. Confirm funding:

```sh
cast chain-id --rpc-url https://evm-rpc.aglais.quip.network:20049
cast balance 0x6fA30D473FaA1b05Bb7951CB896993217ff16e22 --rpc-url https://evm-rpc.aglais.quip.network:20049
```

Deploy a **new** copy (the already deployed contract is below):

```sh
forge create src/AglaisToken.sol:AglaisToken --rpc-url https://evm-rpc.aglais.quip.network:20049 --private-key "$(tr -d '\n' < ./keys/wallet.key)" --broadcast --gas-price 1000000000
```

Take the `Deployed to` address from that output. To mint 100 tokens to the second test address, replace `CONTRACT_ADDRESS` with your newly deployed address:

```sh
cast send CONTRACT_ADDRESS 'mint(address,uint256)' 0x4843cF886682bE85B9cA7e3A9F17760DC0061EBA 100000000000000000000 --rpc-url https://evm-rpc.aglais.quip.network:20049 --private-key "$(tr -d '\n' < ./keys/wallet.key)" --gas-price 1000000000
cast call CONTRACT_ADDRESS 'balanceOf(address)(uint256)' 0x4843cF886682bE85B9cA7e3A9F17760DC0061EBA --rpc-url https://evm-rpc.aglais.quip.network:20049
```

The contract is owner-mintable; only the deployer may call `mint`. The testnet uses unusually high EVM gas-unit accounting: the deployed example's creation used 791,163,106 units at 1 gwei (0.791163106 AGLS), while mint used 7,582,131 units (0.007582131 AGLS). Keep enough faucet balance, and check actual estimates/fees before repeating.

npm scripts: `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x clone/mirror of a public Quip repo

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
