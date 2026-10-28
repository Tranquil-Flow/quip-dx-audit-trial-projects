# TipJar

A small tipping dApp. Tip a creator with ETH, optionally plus an ERC-20, and creators withdraw what they've collected. Contract in `src/TipJar.sol` (Foundry), frontend in `web/` (plain HTML + ethers v6, no build step).

Currently configured for **Aglais, the Quip Network testnet** (chain id 20033, gas token AGLS). Ported from Base Sepolia; see `../PORTING.md`.

Deployed: `TipJar` at `0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b` (https://explorer.aglais.quip.network).

## Test

    forge test

## Deploy to Aglais

You need a funded Aglais account and a Foundry keystore for it. Free AGLS (10 per request) comes from the faucet, which takes an EVM address:

    curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"0xYOUR_ADDRESS"}'
    cast wallet import deployer -k ../keys --interactive    # keep the keystore in the project, not ~/.foundry

`forge script script/Deploy.s.sol --broadcast` does **not** work on Aglais: forge sets the gas limit from its local EVM simulation (~1.2M), while Aglais (pallet-revive) charges ~337M gas for this deployment, so the node rejects the tx with `1010: Invalid Transaction`. Deploy with `cast`, which lets the node estimate gas:

    forge build
    cast send --rpc-url aglais --keystore ../keys/deployer --timeout 300 \
      --create $(jq -r .bytecode.object out/TipJar.sol/TipJar.json)

The receipt's `contractAddress` is the TipJar. Deploying costs about 0.34 AGLS. The public RPC is slow and sometimes times out, so pass a generous `--timeout`.

## Run the frontend

Put the deployed address into `TIPJAR_ADDRESS` at the top of `web/app.js`, then serve the folder:

    cd web && python3 -m http.server 8000

Open http://localhost:8000, connect an injected wallet (MetaMask etc.; it will offer to add and switch to Aglais), enter a creator address and an amount in AGLS, and hit Tip. The ERC-20 fields are optional: the token is approved first, then pulled by the contract. Recent tips are read from the `Tipped` events of the last ~5000 blocks (`eth_getLogs` works on Aglais; `eth_newFilter`/subscriptions do not).

## Tip from a Quip post-quantum account

`../quip-client/tip.mjs` sends the tip from a Quip SHRINCS account (hash-based, post-quantum signatures) using `@quip.network/ethereum-sdk@beta`. TipJar sees the Quip account as `msg.sender`/`tipper`; the account's classical owner key only pays gas. Quip has not deployed its account contracts on Aglais, so `../quip-client/deploy-quip-stack.sh` deploys them first (already done; addresses are in `../quip-client/quip-stack.json`):

    cd ../quip-client && npm install
    node tip.mjs <creatorAddress> 0.01 "gm"

Creators call `withdrawEth()` / `withdrawToken(token)` from their own account (e.g. with `cast send`) to collect.
