# Aglais ERC-20 with Foundry

A simple owner-mintable OpenZeppelin ERC-20 on Quip Network's Aglais testnet. The deployed example is **Aglais Demo Token (AGDEMO)** with 18 decimals, owner `0x6fA30D473FaA1b05Bb7951CB896993217ff16e22`, and 100 AGDEMO minted to `0x4843cF886682bE85B9cA7e3A9F17760DC0061EBA`.

Chain ID: `20033`; EVM RPC: `https://evm-rpc.aglais.quip.network:20049`; testnet explorer: `https://explorer.aglais.quip.network/`. Faucet instructions and web form: `https://aglais.quip.network/#faucet` (the faucet's root URL gives 404; use the portal). Do not use real funds or a mainnet key.

## Build and test

Requires Foundry and Node.js. Dependencies are OpenZeppelin Contracts 5.x (`npm ci`) and forge-std (`lib/forge-std`; if missing, `forge install foundry-rs/forge-std --no-git`).

```sh
npm ci
forge build
forge test -vv
forge lint
```

## Run with your own fresh throwaway wallet

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

## Already deployed example

- Contract/token: `https://explorer.aglais.quip.network/address/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d`
- Creation tx: `https://explorer.aglais.quip.network/tx/0x744357e28f70dc60e40cc0d65c99789bc216c4c4b21e325f3586392ddf6067f6`
- Mint tx: `https://explorer.aglais.quip.network/tx/0xd98e715a51c93f32c694c708c90a47fbfae4b9aeb93deb99f1750d363fc7bffd`
- Token and holder: `https://explorer.aglais.quip.network/token/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d?tab=holders`

The explorer indexes the contract as an ERC-20 and shows both transactions and the recipient holding 100 AGDEMO. Source code was **not verified/published** on Blockscout; its Contract tab shows bytecode and a "Verify & publish" button. Solidity source is in `src/AglaisToken.sol`.
