# RESULT

Status: PARTIAL — both paths worked on an ephemeral local EVM using an independently written, protocol-inspired hashlock. **No QuipSwap testnet transactions occurred.** The hashes below are local Ganache chain ID 31337, not Quip Network or Base Sepolia; the chain disappears when the script exits. This is neither QuipSwap's deployed contract nor a post-quantum Quip Account flow. Do not use this contract with real assets.

## Run

From this project directory: `npm install && npm test` (or `npm run demo`). Requires Node 22. Each run creates new throwaway private keys under `./keys/` (directory mode 0700, files mode 0600), launches an in-process ephemeral Ganache chain with those keys, compiles `contracts/IllustrativeHashlock.sol`, deploys it, runs both paths, and overwrites `evidence.local.json` with that run's receipts. No public-chain funding or Docker needed. The key files and evidence are gitignored. Dependencies are pinned in `package-lock.json`; npm audit reported 36 advisories, so this is local-only tooling.

Script: `scripts/local-demo.mjs`. It checks the chain ID, receipt status, contract balances, closed locks, recipient balance increases, secret extraction from the first execution's event, wrong recipient/secret rejection, duplicate execution rejection, early refund rejection, and refund after simulated time advancement. This only demonstrates the mechanics; it does not prove QuipSwap's implementation or cross-chain safety.

## Evidence from final `npm test` (exit 0)

Contract (local): `0x16eD1a62e397c43fa65F5DF8E933127239D93fA7`
Initiator: `0x4eA4D5be879a5cA282aF1E10a94F8a53F585f590`
Counterparty: `0x7e60AFF5dC87f88781e466641664f390630bd170`
Deployment: `0xb07ca2c36e2a6de075b6c6ecbb5b48b1ccf73488b7cd3e6bc9ac9db12c44a103`

Happy path (both locks executed, contract balance zero):
- Initiator commit: `0xb35eee39bfa58f3d8a5988724275ad53eaaafb927879bf914ceee7ae47b699f2`
- Counterparty commit: `0xb07b74b23f73000d2a1e9116bf02f2053080d395f2f08ff690243653d5fe897f`
- Initiator execute/reveal: `0x2ede2e9b07d480043f44d86565dc95de918891d8b13114d82edfe4af5f377ea8`
- Counterparty execute using revealed secret: `0xe1d6c5c4de720b8f3c3d496da7e7e60d4a743536f87f1316b885d427910a45e6`

Disappearing counterparty (only initiator commits; early reclaim rejected; clock advanced 121 simulated seconds; funds returned, contract balance zero):
- Initiator commit: `0xa0d9dd34dcb358965592cefb7bc3c43dfe39f692d191e33f30825bf0af6d9716`
- Initiator reclaim: `0xbef806de79649a350fa787897f06bb99bdca968082f01566c0a08047896b8b5a`

All six scenario receipts have status 1. `evidence.local.json` has the IDs, blocks, addresses, and machine-readable receipts. Seven unique hashes including deployment were checked for shape and uniqueness. **Public testnet hashes: none.**

## What did not work / why

The actual requested vendor-testnet prototype is blocked by the public integration surface. Quip's [swap docs](https://developers.quip.network/docs/quip-interlock-protocol/quipswap) say the settlement contract is gated to Quip wallet contracts, not EOAs or custom contracts. The [SDK docs](https://developers.quip.network/docs/getting-started/quip-sdk) explicitly say there is no public swap SDK and instruct using the wallet. They provide no scripted bilateral swap API, deployed testnet settlement addresses/ABI, programmatic Quip-account creation/signing walkthrough, or testnet faucet/credit procedure for this workflow. The current beta account SDK package inspected had no swap/escrow/HTLC module. We did not bypass the gate, use an existing wallet, connect an account login, claim the local contract was vendor code, or manufacture testnet hashes. Marketing demos contain illustrative data, not transaction evidence.

Vendor improvements: publish a testnet-only end-to-end script with throwaway Quip Account creation, funding instructions and chain RPC/contract addresses, ABI or typed client for commit/execute/reclaim through the wallet, precise timeout guidance for two chains, and independently verifiable transaction links for both success and reclaim. Document the difference between the public swap page's no-slashing rule and the generic QUIP Lifecycle page's slashing language.

See `DEVLOG.md` for sources, commands, failures, and deviations.
