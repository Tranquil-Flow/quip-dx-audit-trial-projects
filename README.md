# Quip post-quantum wallet prototype

Node 22+, npm. Install with `npm ci`. Run from this directory. All keys are generated here in `./keys` (ignored by git, directory mode 0700, files mode 0600); never supply or import an existing wallet. This is a disposable testnet prototype, not audited production software. Do not use mainnet or real funds.

Commands:

```
node wallet.mjs init                  # one-time fresh EOA + SHRINCS seed
node wallet.mjs inspect               # Aglais and Base Sepolia balances
node wallet.mjs faucet-aglais         # Quip's 10-AGLS faucet to the EOA (not PQ)
node wallet.mjs transfer-aglais       # 0.001 AGLS EOA test transfer (NOT PQ)
node wallet.mjs sign-demo             # local Quip SHRINCS sign/verify (NOT a transfer)
node wallet.mjs create                # Quip SHRINCS account on Base Sepolia; needs Base Sepolia ETH
node wallet.mjs fund-account 0.001   # EOA transfers Base Sepolia test ETH to PQ contract
node wallet.mjs transfer 0xRECIPIENT 0.0001  # PQ-signed contract transfer; EOA pays gas
```

To complete the Base Sepolia path, fund the new EOA displayed by `init` using a Base Sepolia faucet that accepts brand-new wallets (not the Aglais faucet), then run create, fund-account, transfer. `QUIP_RPC` may override the Base Sepolia RPC, but the CLI enforces chain ID 84532 and checks factory, implementation and verifier code. `transfer` reserves the next SHRINCS leaf in `./keys/burned-leaves.json` before signing; never delete or roll back this file. The signer demo also burns a slot from the same bundle. Do not run concurrent copies of this CLI against the same keys. Outputs include explorer URLs after successful transactions.

Important boundary: Quip's Aglais testnet is chain 20033 and dispenses AGLS. The current `@quip.network/ethereum-sdk@beta` SHRINCS contracts/registry support Base Sepolia 84532 (and other EVM networks), not Aglais. AGLS cannot fund Base Sepolia; an Aglais EOA transfer is not PQ. The public Base Sepolia faucets encountered had eligibility/UI restrictions; see RESULT.md and DEVLOG.md.
