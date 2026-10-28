# Result — Quip DAO treasury prototype

Overall: PARTIAL. This is a testnet integration probe and off-chain signing demonstration, NOT a funded treasury, on-chain Quip account, swap, or payout. No transaction was broadcast; no tx hash or swap/job ID exists. Do not use for real custody.

## Components

| Component | Status | Actual evidence |
| --- | --- | --- |
| Fresh keys | WORKING | New EOA and SHRINCS master seed in `keys/throwaway.json`; file 0600, directory 0700. Never loaded an existing wallet. |
| Quip account on Base Sepolia | PARTIAL | Counterfactual account `0xCBfCD77Df443DfbcE57C3273E62B894521430A0e`; factory `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` has code on chain 84532. SDK estimate returned 603788 gas units, creation fee 0. Account code absent and balance 0; it was NOT deployed. |
| PQ approval | PARTIAL | SDK `ShrincsSigner` generated two independent key bundles, stateless-signed a local payout intent with ERC-1271-designated key; `npm test` verifies authentic artifact and rejects amount tampering. This is a CUSTOM off-chain intent, not Quip wallet ERC-1271 ABI signature or an on-chain authorization. No DAO threshold/quorum, expiry, persistent nonce/replay database, nor independent public-key-only verifier implemented. |
| QuipSwap | BLOCKED | No public swap npm SDK per vendor docs, no swap code in examined SDK, no publicly listed QuipSwap repo/API found. Published settlement needs two funded Quip wallets, agreed terms, second party, and asymmetric deadlines. The public orderbook demo explicitly moves no funds. No swap or order submitted. |
| Recipient payout | BLOCKED | No swapped proceeds, no deployed/funded account. Recipient used for local demonstration is the freshly generated EOA `0xF5C1f5728Ae8bcB684B596a27a1cd71197154B43`; no transfer occurred. |

## Run

From this directory: `npm ci`, then `npm test` and `npm run probe`. Existing throwaway keys and signed artifact are included locally (gitignored). `node prototype.mjs verify` verifies `approval.json`; `node prototype.mjs approve <new-testnet-recipient> <positive-integer-wei>` makes a NEW file but fails if `approval.json` already exists (deliberate no-overwrite). To start a new isolated project, run `node prototype.mjs init` only with an empty `keys/` directory. `node prototype.mjs deploy` will attempt deployment ONLY on Base Sepolia when the fresh EOA has testnet gas; do not run with real money or on mainnet. `BASE_SEPOLIA_RPC` optionally overrides the public Base Sepolia RPC, but chain ID is checked before deployment.

Files: `prototype.mjs`, `approval.json`, `tampered.json`, `package.json`, `package-lock.json`, `DEVLOG.md`, `keys/throwaway.json`. Never publish the keys file or fund it with real assets. `approval.json` is not secret but includes a large signature. `.gitignore` excludes secrets, artifacts, caches and vendor clones.

## Evidence and blockers

`npm test` exit 0: untampered `verified: true`, amount changed from 1000 to 1001 `verified: false`. `npm run probe` exit 0: chain 84532; factory, EntryPoint, SHRINCS implementation, paymaster and verifier have code; predicted account has no code; both new EOA and predicted account have 0 wei. PQ public-key commitment for signing key: `0x033d04bdd79956b3d33c7f4d48ddad583f0ded9e7ed8449dc37195aa65e1c3eb`. Local approval nonce: `0x4afe97e3d024bf8cd8e2fe3881a1534b0c5853df78b2dc027c75af954f81a511` (NOT a transaction hash). `node prototype.mjs deploy` exited 1: zero Base Sepolia ETH for gas. QuickNode faucet's FAQ promised no minimum mainnet balance, but actual form rejected this new EOA with `Invalid ETH mainnet balance`; GetBlock faucet requires registration and mainnet ETH. No mainnet funds used. Estimation uses RPC balance override, not a funded transaction.

## Gaps / vendor improvements

* Vendor quickstart says only keys and node are usable today; QuipSwap docs describe a live gated settlement and marketing says Base live. A funded two-wallet end-to-end testnet tutorial, test tokens/faucet and accessible counterparty would resolve the gap.
* SDK docs correctly require `ethereum-sdk@beta` + `hashsigs-wasm@rc`, but GitHub default and `deploy/testnet` branches examined contain older WOTS+ generation; npm beta README references `SDK_README.md` / `DEPLOYMENTS.md` omitted from tarball. Publish current source/tag and an executable SHRINCS testnet account example with correct addresses and funding path.
* No swap SDK, settlement ABI/address, RFQ/order API, maker/taker sample, testnet deployment, or approval-to-swap adapter exposed in consulted docs/packages. QuipSwap requires a Quip wallet as initiator: an arbitrary signed policy blob or an EOA/DAO contract cannot initiate the settlement. A recipient payout is a separate final operation, not intrinsic to bilateral swap; an integrator must define asset, counterparty, both chains, timelocks, approval binding, nonce/expiry and output recipient.
* ERC-1271 view verification does NOT burn a one-time slot (vendor warning). A real DAO approval contract must enforce nonce and expiry, and bind asset, amount, counterparty, chain, wallet and payout recipient. This prototype's custom approval is locally verifiable only; it is not on-chain enforced.
* Quip Accounts docs refer to extension as available, while public QuipSwap page calls it not released and order book coming soon; paper demo says live book is a separate app. Clarify shipped surfaces and supported network/testnet combinations.

Sources and exact chronological commands/errors are in `DEVLOG.md`.
