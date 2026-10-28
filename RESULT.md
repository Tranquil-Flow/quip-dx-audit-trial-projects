# RESULT — Quip post-quantum wallet prototype (CLI)

## Overall: **PARTIAL**

The CLI works end-to-end with Quip's own SDK (`@quip.network/ethereum-sdk@0.3.0-beta.8`, SHRINCS hash-based signatures) against **Quip's real deployed contracts on Base Sepolia**. It can create the post-quantum smart account, fund it, sign a transfer with a SHRINCS one-time leaf, and submit it. Every step succeeded on an **anvil fork of Base Sepolia**, but no live Base Sepolia transaction was sent. The only blocker was getting Base Sepolia ETH for a brand-new key:

* Quip has no faucet for the chains its smart-account SDK supports.
* Every public Base Sepolia faucet needs an account, a captcha, or a mainnet balance.

Quip's own testnet, Aglais, has a working faucet, and I funded the key there on the live chain. But Quip has deployed none of its smart-account contracts on Aglais. I tried deploying them myself; see the Aglais section below for how far that got.

| Component | Status | Notes |
|---|---|---|
| Discover the right SDK / network | WORKING (with effort) | The npm `latest` tag and GitHub `main` are stale. The current SDK is `@beta` with SHRINCS, and only Base Sepolia has the full current stack. |
| Key generation (EOA + SHRINCS mnemonic in `./keys`) | WORKING | SDK `generateMnemonic`, `ShrincsSigner.fromMnemonic`, `maxSignatures=64`. |
| Predict the smart-account address | WORKING | `0x5D923eD6b2FEE4631010d851D62d72AA60D761c1` (CREATE3 prediction matched the deployed address on the fork). |
| Create the PQ smart account (`WalletFactory.deploySpecificWalletProxy` via `ShrincsFactoryClient`) | WORKING on fork / BLOCKED live | Live is blocked only by gas funds on Base Sepolia. Creation fee is 0; about 500k gas. |
| Fund on testnet | BLOCKED on Base Sepolia / WORKING on Aglais | Base Sepolia: no usable faucet. Aglais: the Quip faucet paid about 10 AGLS to the EOA (live). |
| Sign the transfer with Quip's PQ SDK (SHRINCS stateful leaf) | WORKING | Signing is local. On-chain verification passed on the fork, and a tampered payload reverts with `InvalidSignature`. |
| Submit the transfer | WORKING on fork / BLOCKED live | Same funding blocker. |
| Show on a block explorer | PARTIAL | The CLI prints Basescan links, but the fork txs are not on the public chain. Live Aglais txs appear on explorer.aglais.quip.network. |

## How to run

```bash
npm install                      # installs @quip.network/ethereum-sdk@0.3.0-beta.8 + viem
node quip-wallet.mjs init        # throwaway EOA + SHRINCS mnemonic -> ./keys (already created)
node quip-wallet.mjs info        # EOA, predicted smart-account address, balances

# Live Base Sepolia (needs ~0.001 Base Sepolia ETH on the EOA in keys/eoa.json):
node quip-wallet.mjs create
node quip-wallet.mjs fund 0.01
node quip-wallet.mjs transfer 0x1111111111111111111111111111111111111111 0.002           # spends the smart account's balance
node quip-wallet.mjs transfer 0x1111111111111111111111111111111111111111 0.001 --from-eoa  # SDK-default semantics
node quip-wallet.mjs status

# Full end-to-end run on an anvil fork of Base Sepolia (needs Foundry):
./demo-fork.sh                   # output in evidence/fork-run.log

# Quip's own testnet faucet (Aglais, chain 20033):
node quip-wallet.mjs aglais-faucet
# Experimental: self-deploy Quip's verified contracts on Aglais, then use the CLI there
node deploy-aglais.mjs && QUIP_NETWORK=aglais node quip-wallet.mjs create   # see Aglais section
```

Env overrides: `QUIP_NETWORK` (`base-sepolia` | `aglais`), `QUIP_RPC`, `QUIP_EXPLORER`, `QUIP_MAX_SIGNATURES` (default 64; it must stay the same after `create`), and `DEBUG=1`.

## Evidence

* Throwaway EOA: `0x417532b34057aa4B0d047746437A56032A892323`. SHRINCS mnemonic is in `keys/quip-shrincs.json`.
* Smart-account address (deterministic, identical on the fork and live): `0x5D923eD6b2FEE4631010d851D62d72AA60D761c1`.
* Quip contracts used on Base Sepolia:
  * WalletFactory proxy `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`
  * ShrincsWallet impl `0xc4E4652898bB12C4f0Ba9083829689B1963135E7`
  * SHRINCS256sKeccak verifier `0xF2f9E6D692da41b089c3c261c41509669eEc5567`
* Fork run (`evidence/fork-run.log`, Base Sepolia fork at block 47415512):
  * create → deployed at the predicted address.
  * fund 0.01 → tx `0xe6bc6362…4cc7` success.
  * transfer 0.002 from the account balance → leaf 1/64, tx `0x7c5db43c…a83b`, gasUsed 296,650. Account balance went from 0.01 to 0.008.
  * transfer 0.001 `--from-eoa` → leaf 2/64, gasUsed 263,208. Account balance unchanged.
  * status → `statefulLeavesUsed: 2`, `remainingStatefulSignatures: 62`.
  * Tampered-value replay → `InvalidSignature` revert.
  * These hashes exist only on the fork, not on the public chain.
* Live Aglais (Quip testnet, chain 20033):
  * Faucet extrinsic `0xff88aca9bb33618e98430847886f0ec8492bcf9c800b7fb018d0afef1d280aed` credited the EOA with 9.999 AGLS.
  * Test contract deploy tx `0x8a2b01896f968628f4c1f9f57ac499f74f7bc37350fb5cc7e0bbbde9af0878be`.
  * SHRINCS verifier (Quip's bytecode, deployed by me) at `0xbaEB060a213Ad4A3a15Bb242Ea66DE2aCa63aFF1`, tx `0xcd03a9dc38ca57431a90e2146d779dc16b32f7d2846984a510c112f586cd8008`.
  * Explorer: https://explorer.aglais.quip.network/address/0x417532b34057aa4B0d047746437A56032A892323

### Aglais port (experiment) — BLOCKED

I tried deploying Quip's own Blockscout-verified bytecode on Aglais with my throwaway key as factory owner (`deploy-aglais.mjs`). The plan was to point the unmodified SDK at it through its `factoryAddress`/`walletImplementation` overrides (`QUIP_NETWORK=aglais`).

* **Verifier:** deployed. It took about 5 minutes to be included.
* **WalletFactory implementation:** never included. Tx `0xa7c0e1df684c197dc022e4fa2583ea0c5697ac67460c74e125abd32bdadb863f` needed an estimated ~828M gas units. After 15 minutes it still wasn't in a block, `eth_getTransactionByHash` returned null, and the nonce didn't move.
* **Not attempted:** the factory proxy, the 20 KB wallet implementation, and vetting.

So I couldn't create a smart account on Quip's own testnet. The pooled factory-implementation tx may still land later. `keys/aglais-deployment.json` records only the verifier, so a re-run of `deploy-aglais.mjs` will redeploy the factory implementation.

## What did not work, and why

1. **No testnet funds where the SDK works.**
   * The SHRINCS smart-account stack is live only on Base Sepolia. On OP Sepolia the wallet implementation is missing, even though an SDK comment says it is live there.
   * Quip has no Base Sepolia faucet, and none of the third-party faucets can be used headlessly with a fresh key.
   * Quip's own faucet funds Aglais, where none of the account contracts exist.
2. **The SDK can't send transactions with a local private key.** `ShrincsFactoryClient` and `ShrincsWalletClient` pass `account: <address string>` to viem's `writeContract`. viem then uses node-side `eth_sendTransaction`, which only works with an injected browser wallet. I worked around it with a custom transport that signs locally.
3. **`factory.getShrincsWalletAddress()` returns the zero address for a wallet that isn't deployed yet.** Despite the name, it's a registry lookup, not a prediction. I used the exported pure `getShrincsWalletAddress(factory, …)` instead.
4. **The SDK's `execute` spends the EOA's ETH, not the smart account's.** It sets `msg.value = value + maxFee`, so the transferred amount comes from the EOA and the post-quantum account's own balance is never touched. Spending from the account needs the non-public `buildExecuteCall()` with `msg.value = maxFee`. This is undocumented; I confirmed on the fork that it works.
5. **Docs and source don't match the published package.**
   * GitHub `main` is v0.1.7 (WOTS+). The `deploy/testnet` branch and its `SDK_README.md` describe a WOTS+ `QuipSigner`/`QuipClient` API that the npm beta doesn't export.
   * I found no public SHRINCS SDK source. I had to read the compiled `dist/` code and the contract sources verified on Blockscout.
   * The old GitBook quickstart returns 404. `/llms-full.txt` returns 404 even though the docs say it is live. The chainlist entry for chain 20033 points at dead `*.testnet.quip.network` hostnames.
6. **Aglais specifics.**
   * A pallet-revive EVM deploy costs about 325M–830M "gas" units.
   * Pooled transactions are invisible to `eth_getTransactionByHash`.
   * A stuck transaction can't be replaced by bumping the fee (`1014 Priority is too low (5 vs 5)`).
   * Inclusion takes minutes or longer.

## What would have made this easier

* One page that says: "smart accounts are live on chain X; get gas from faucet Y; the explorer is Z", plus a copy-paste Node example: create → fund → execute.
* A Quip faucet (or a public sponsored paymaster/bundler) for Base Sepolia. Alternatively, deploy the SHRINCS stack on Aglais so that Quip's own testnet, faucet, and explorer work together.
* Accept a viem `LocalAccount` in `ShrincsFactoryClient`/`ShrincsWalletClient`, not just an address, so CLIs and servers can sign.
* A documented `execute` option to spend from the account's balance, and a pure `predictWalletAddress()` helper.
* Publish the SHRINCS SDK and `ShrincsWallet.sol` source on GitHub. Make `latest` point at the current generation, or deprecate the old one. Fix the stale chainlist entry and the `llms-full.txt` 404.
* Document recommended `maxSignatures` values and the keygen cost: about 3–7 s per keypair in Node at 64 leaves.
