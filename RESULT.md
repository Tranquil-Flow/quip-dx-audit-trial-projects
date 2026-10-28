# RESULT — Quip post-quantum account PoC

## Status: WORKING on Quip's Aglais testnet, with one important caveat (read "What did not work")

- **Quip's Aglais testnet (chain 20033):** the CLI creates a Quip Account and funds it from the faucet. It then withdraws part of the balance to a normal EOA with a transaction signed by SHRINCS, Quip's hash-based post-quantum scheme. All tx hashes are visible on https://explorer.aglais.quip.network.
  - **Caveat:** Quip has **not deployed** the Quip Account contracts on Aglais. I deployed them myself, using Quip's exact Base Sepolia bytecode with the constructor args re-pointed. That means our throwaway EOA owns this WalletFactory. It is not an official Quip deployment.
- **Base Sepolia**, where Quip's official V1.0.1 contracts are live: the same CLI works end-to-end, but only against a **local anvil fork**. I could not get Base Sepolia ETH without signing up for a third-party faucet, so there are no public Base Sepolia tx hashes.

## How to run

Requirements: Node ≥ 20.

```bash
npm install                        # installs @quip.network/ethereum-sdk@0.3.0-beta.8 (+viem)
node quip-pq.mjs init              # throwaway keys -> ./keys (owner EOA, recipient EOA, SHRINCS mnemonic)
```

**Quip Aglais testnet**
```bash
export RPC_URL=https://evm-rpc.aglais.quip.network:20049/
# faucet (no auth): funds the owner EOA with 10 QUIP
curl -X POST https://faucet.aglais.quip.network/request -H 'Content-Type: application/json' \
     -d "{\"dest\":\"$(node -p 'require("./keys/owner.json").address')\"}"
node aglais-deploy.mjs             # one-time: deploy Quip's contract stack (skips what's already in keys/aglais-deployment.json)
node quip-pq.mjs create            # create the Quip Account (prints tx hash + explorer link)
node quip-pq.mjs fund 1            # owner EOA -> Quip Account
node quip-pq.mjs withdraw 0.4      # Quip Account -> recipient (SHRINCS-signed); optional 3rd arg = any address
node quip-pq.mjs status
node quip-pq.mjs tamper-check 0.1  # negative test (simulation only): tampered amount must revert
```
Aglais txs can take anywhere from seconds to about 6 minutes to be included, and the CLI waits up to 15 minutes. You can also run the whole sequence with `node quip-pq.mjs all <fund> <withdraw>`.

**Base Sepolia (official Quip deployment):** send about 0.005 Base Sepolia ETH to the owner EOA printed by `init`, then:
```bash
export RPC_URL=https://sepolia.base.org
node quip-pq.mjs create && node quip-pq.mjs fund 0.002 && node quip-pq.mjs withdraw 0.001
```
To rehearse it without funds, fork Base Sepolia with `bin/anvil --fork-url https://sepolia.base.org` and use `KEYS_DIR=./keys-fork RPC_URL=http://127.0.0.1:8545`.

## Evidence: Quip Aglais testnet (chain 20033)

Explorer prefix: `https://explorer.aglais.quip.network/tx/`

| What | Address / tx hash |
|---|---|
| Owner EOA (classical key, throwaway) | `0xfDB778Ff1B8dA5989Ac7587aE1753c1CfB3BB67D` |
| Faucet mint to owner (Substrate extrinsic) | `0x6545d2f03053026e5747dce13b2f49c0b5a3bdf719e8e1e02bdbbf58c8cd766b` |
| **Create Quip Account** → `0xa4eb42332378Dca2032F906e8E455Dc59424AffE` | `0xbdd047f924e59426dbc47cec539fa878d85754c660bdd39bbe043c3117ec8341` |
| **Fund** 1 QUIP → Quip Account | `0xe7b28e17c2b3a4707f4d025487724b4d0dd78db1dde0b87bb7072401686a6ea1` |
| **Withdraw** 0.4 QUIP → `0x62b825B6802A2eaE75b7caf6CD5A83Eb6D64963b` (SHRINCS-signed `execute`, msg.value 0) | `0xb9d259ba4843035275ee0f5729596933be80492694002e146de248085d2585e6` |
| Deploy SHRINCS256sKeccak verifier → `0xbcb2c1c0dee8f84c0c575002e8f36a79eaf5a53e` | `0x216da87b17ace03b6bd1389d3f7839614dfa24708c30f3d39ea56f40a45f19d3` |
| Deploy WalletFactory impl → `0x93b48ee23101d946f2a7058a5c763db14f9034fa` | `0xae15c987bc493f9406cf8436570fedf9dfdbbd4ecb17122b0809db1843ffb9b1` |
| Deploy WalletFactory proxy → `0xc8f8ba715debc8cb5ce39a55d586f823db0ab3a1` | `0x96a519f894438ee33db9403b105e70e4365dce7587cf1d1c68fa48f1c667abb6` |
| Deploy ShrincsWallet impl → `0xd1672f08c4c66138f0be023b2739fbdc69dac387` | `0x4880a7a5f8af9cc22f971ed9ab47f31344e3c034b9d5ac089528b8318bd0cb48` |
| vetImplementation | `0xd2396da09119caba6ebb526ca3ab4476b333f9ccf82552d48c07c52bccaeda6a` |

Final state from `status`: owner ≈3.41 QUIP, recipient 0.4 QUIP, Quip Account 0.6 QUIP, `actionNonce=1`, `leavesUsed=1/16`.
`tamper-check`: signing 0.1 and submitting 1 → `The contract function "execute" reverted` (expected).

Base Sepolia **fork** rehearsal (local only, not on a public explorer): Quip Account `0xB517F13B01FaB9cbfa2d2F8b1FE614382a86Cb14` was created against the real canonical factory `0xA2B2…8cc8`. Fund and withdraw worked, and the account balance went 0.002 → 0.0005 after withdrawing 0.0015.

## What the Quip Account gives you

The Quip Account is a smart-contract wallet. Every `execute` needs **both** a transaction from the classical owner EOA **and** a one-time SHRINCS hash-based signature over `(target, value, dataHash, maxFee, nonce, keyVersion)`. A stolen or quantum-broken ECDSA key alone cannot move funds, which is what `tamper-check` demonstrates.

## What did not work / caveats

1. **No Quip Account contracts on Quip's own testnet.** On Aglais, the SDK's canonical addresses (factory, wallet impl, verifier, paymaster, EntryPoint v0.7, CreateX) are all empty. I redeployed Quip's own verified Base Sepolia creation bytecode, fetched from the Base Sepolia Blockscout API, with my own factory owner. So this is Quip's code on Quip's chain, but not Quip's deployment, and no Quip-run paymaster or bundler is involved.
2. **No public Base Sepolia run.** Every Base Sepolia faucet I know of requires an account or a mainnet balance. I did not sign up for anything.
3. **SDK `execute` pays from the owner EOA, not the account.** `ShrincsWalletClient.execute({target, value})` attaches `msg.value = value + maxFee` from the owner EOA. Taken literally, a "withdrawal" is paid by the EOA and the Quip Account balance never moves. `quip-pq.mjs` overrides `msg.value` to `maxFee`, which is 0 at the moment. That makes the contract pay `value` from its own balance. `msg.value` is outside the SHRINCS-signed payload, so this doesn't weaken the signature, but it is a deviation from SDK defaults. For production, confirm the intended pattern with Quip; the ERC-4337 path through `buildExecuteUserOp` plus a bundler is the likely alternative.
4. **SDK assumes a browser wallet.** It passes `account: "<address>"` to viem, so a local private-key signer fails with `No Signer available`. I worked around this by wrapping `writeContract` and `sendTransaction`.
5. **Aglais quirks.** pallet-revive charges the code storage deposit as "gas", so estimates are huge (784M for the verifier, 1.8B for wallet creation, 1.7M for a plain transfer). A fixed gas limit reverts, or gets the tx banned from the pool, after which an identical resubmit is refused. The eth-rpc pending nonce doesn't see the Substrate pool, which caused a "nonce too low" error while a tx was still queued. Inclusion took up to about 6 minutes.
6. **Environment:** the host disk was nearly full (about 120 MB free of 926 GB, not caused by this project). That caused ENOSPC failures and ruled out installing Foundry to build the contracts from source.
7. Key-slot management: each withdraw spends one SHRINCS leaf (16 per account here). The CLI relies on the SDK reading used leaves from the chain. A treasury integration would need persistent leaf journaling and a key-rotation plan, as the docs warn.

## What would have made this easier (vendor feedback)

- Put the testnet details in the developer docs: the Aglais EVM RPC, chain ID 20033, the faucet endpoint and the explorer. I found them only by reading the source of the `links.quip.network` and `explorer.quip.network` repos. The press/search link `quip.gitbook.io/docs` returns 404.
- Deploy the Quip Account stack (factory, SHRINCS wallet impl, verifier, EntryPoint, paymaster) on Aglais, or state clearly that "testnet" for Quip Accounts means Base Sepolia. Also fix the SDK comment claiming OP Sepolia is live: the wallet impl `0xc4E4…35E7` is missing there.
- A short "Quip Account in Node.js" quickstart covering create, deposit, withdraw with a private-key signer, and faucet guidance for Base Sepolia.
- SDK fixes:
  - pass a viem `Account` (or omit `account`) so local signers work
  - return tx hashes and receipts from `createShrincsWallet`
  - document or offer an `execute` mode that pays from the wallet's balance instead of `msg.value`
  - expose a receipt timeout option
- The GitHub `ethereum-sdk` default branch still shows the old WOTS+/hardhat README. The current code lives on `deploy/testnet` and in the npm `beta` tag, and npm `latest` is stale; the docs do mention this, but it's easy to miss.
- Document the pallet-revive gas and storage-deposit behaviour on Aglais.

## Files

- `quip-pq.mjs`: the CLI (init / create / fund / withdraw / status / tamper-check / all)
- `aglais-deploy.mjs`: deploys Quip's contract stack onto Aglais; `aglais/*.json` holds the cached Blockscout bytecode
- `aglais-probe.mjs`: EVM-compatibility probe
- `keys/`: throwaway testnet keys and state (`owner.json`, `recipient.json`, `shrincs.json`, `account.json`, `aglais-deployment.json`); `keys-fork/` holds fork-only keys
- `DEVLOG.md`: sources, commands, errors and deviations in order
- `bin/anvil`: used only for the local fork rehearsal
