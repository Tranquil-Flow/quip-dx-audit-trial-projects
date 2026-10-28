# Quip Aglais Counter

A minimal Solidity `Counter` deployed to Quip Network's EVM-compatible Aglais testnet. It exposes public `count()` and `increment()`.

## Live deployment

- Network: Aglais Testnet (Quip Network), chain ID `20033`
- Contract: `0x9E81d0b542b759D8A23141ba92da0d71C025C13d`
- Deployment tx: `0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618`
- Increment tx: `0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1`
- Read-back: `count = 1`

See `RESULT.md` for links and independently captured evidence, `METAMASK.md` for wallet setup, and `DEVLOG.md` for the complete execution log.

## Requirements

- Node.js 22 (the implementation was exercised with v22.22.2)
- npm
- Test AGLS only; never use real money

## Read and verify the existing deployment

No private key is needed:

```sh
npm install
npm run compile
npm run verify:rpc
npm run read
npm run verify:evidence
```

`verify:evidence` checks both receipts through JSON-RPC, checks runtime bytecode and `count`, checks both transactions through the Blockscout API, and refreshes `evidence/verification.json`.

## Deploy from a fresh throwaway wallet

The key generator refuses to overwrite an existing key:

```sh
npm install
npm run wallet:new
npm run compile
```

The generated key is `keys/deployer.json`, is created with mode 0600, and is ignored by git. It is a disposable testnet key only. Never fund it with real assets or reuse it elsewhere.

Copy the public address printed by `wallet:new`, then request valueless AGLS:

```sh
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' \
  -d '{"dest":"0xYOUR_NEW_ADDRESS"}'
```

Then deploy and exercise the contract:

```sh
npm run deploy
npm run increment
npm run read
npm run verify:evidence
```

`npm run deploy` records deployment details in `deployments/aglais.json`. `npm run increment` waits for the transaction, asserts that the value increased by exactly one, and records the increment receipt details. Both transaction scripts reject any RPC chain ID other than 20033 and submit legacy transactions at Quip's documented 1 gwei gas price.

## Files

- `contracts/Counter.sol` — contract source
- `scripts/create-wallet.mjs` — one-time throwaway wallet creation
- `scripts/compile.mjs` — local solc compilation targeting Paris EVM
- `scripts/deploy.mjs` — chain-checked deployment
- `scripts/increment-and-read.mjs` — increment and before/after read-back
- `scripts/read-count.mjs` — read-only code/count check
- `scripts/verify-evidence.mjs` — independent RPC and explorer verification
- `deployments/aglais.json` — transaction and address record
- `evidence/verification.json` — machine-readable live verification

## Important network limitation

Quip documents the EVM endpoint as a `pallet-revive` backend with no pubsub or filter API. These scripts use HTTP polling, not WebSockets or event filters. Quip also says EVM balances appear one existential deposit lower than the corresponding Substrate-side balance.
