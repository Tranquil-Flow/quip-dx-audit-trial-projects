# RESULT — QuipSwap OTC prototype (Base Sepolia)

## Status: **PARTIAL**

- ✅ Both flows work end-to-end against the **real, deployed QuipSwap contract and Quip wallet factory**, running on a local **anvil fork of Base Sepolia**:
  - (a) happy path: both sides commit, then the swap settles atomically
  - (b) counterparty disappears: Alice reclaims her escrowed ETH after the deadline
- ❌ **No transactions on the live testnet yet.** The two fresh throwaway EOAs have 0 Base Sepolia ETH. Every faucet I found needs a login or a captcha, and I did not bypass captchas. That includes the Alchemy faucet the Quip app itself links to. **To finish:** send about 0.002 Base Sepolia ETH to each address below, then run `./run-testnet.sh` (takes about 8 minutes).
  - alice EOA `0x1D9326571DcAb9C8076CF79087eC64728B4DD6Aa`
  - bob EOA `0x4197ff18cA3B3691F4475bbd0644E49FcFcdfcE8`

## What was built
| File | Purpose |
|---|---|
| `scripts/lib.mjs` | Config, Quip SHRINCS wallet create/open (via `@quip.network/ethereum-sdk@beta`), commit/claim/reclaim calldata, deadline schedule, wait/time-travel helper, SDK signer workaround |
| `scripts/setup-wallets.mjs` | Creates a Quip wallet for Alice and for Bob. QuipSwap only accepts commits from Quip wallet contracts. |
| `scripts/deploy-token.mjs` + `contracts/OtcToken.sol` | Throwaway ERC-20 "tUSD", minted to Bob's Quip wallet, used as Bob's side of the trade |
| `scripts/swap-happy.mjs` | (a) Alice locks 0.0001 ETH → Bob checks on-chain that Alice's lock exists → Bob approves and locks 250 tUSD → Alice claims with the secret → both sides settle in one transaction |
| `scripts/swap-refund.mjs` | (b) Alice locks 0.0001 ETH → Bob never locks → an early reclaim is rejected (`WindowViolated`) → after `reclaimRelease` Alice reclaims |
| `scripts/check-funding.mjs` | Checks the EOAs have enough gas money before a testnet run |
| `run-testnet.sh` / `run-fork.sh` | One-command runners (`STEP_SECONDS`, default 60, sets the deadline spacing) |
| `scripts/QuipSwap.abi.json` | QuipSwap ("Omnibus") ABI extracted from the swap.quip.network JS bundle. No published ABI exists. |

Contracts used (Base Sepolia, chain 84532, checked on-chain with `cast`):
- QuipSwap Omnibus `0xA7955981D5759a799267063110Be0F7AeCc26F8A`: `VERSION()` = `QUIP:Omnibus:v1.0.0-beta.3`, `commitmentFee()` = 0
- WalletFactory `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`: `creationFee()` = 0

### How to run
```bash
npm install                      # viem, @quip.network/ethereum-sdk@0.3.0-beta.8, @quip.network/hashsigs-wasm@0.2.1-rc9
./run-fork.sh                    # needs foundry (anvil/cast); no funds needed
# after funding both EOAs on Base Sepolia:
./run-testnet.sh                 # writes evidence/happy.json, evidence/refund.json and *.log
```

## Evidence (fork of Base Sepolia at block ~47,409,1xx; chain id 84532). **These are fork tx hashes, not live testnet hashes.**
Clean run from scratch: `evidence/run-fork.full.log`. Earlier runs: `evidence/happy.fork.json`, `evidence/refund.fork.json`.

Quip wallets (fork): Alice `0x2d6ecfb4ACc8fc53f934cdF6c7E46c9cDA1379F8`, Bob `0x820bFc8541a811Ff5F3147F874d6B035240a401c`; tUSD `0xe3378796806e32625331a1e595118a494381e231`

**(a) Happy path**
| Step | tx | Result |
|---|---|---|
| Alice commit 0.0001 ETH | `0x8910927342a2af46e5c2edc3b9515c341f4d073917c859292942fcec9f558cb8` | lockState `Free` |
| Bob approve tUSD | `0x6be10e9a5228552b95f47c78f5042dc54542578e7af2da3067755610e6a5a5da` | |
| Bob commit 250 tUSD | `0x0890bb6dc72d5ac33d1c328fd554d2f64beefc264a54c36aa6c668b78bf400c3` | lockState `Committed` |
| Alice claim (reveals secret) | `0x35480137c59f328b854b9c96c26f30a8c1e8676b9908227a80a5f696ac9ead9e` | 2 `Claim` events, lockState `Spent` |

Balances: Alice's wallet 0 → 250 tUSD (her ETH was paid from her EOA); Bob's wallet 0 → 0.0001 ETH and 1,000,000 → 999,750 tUSD.

**(b) Counterparty disappears**
| Step | tx | Result |
|---|---|---|
| Alice commit 0.0001 ETH | `0x7d765588ef34e2a91526d3c3b04c4b7a3687dd9d544b2758d72b35cecbb171f8` | Omnibus escrow +0.0001 ETH |
| early reclaim (simulated only) | n/a | reverts `WindowViolated()` (0x32e5164b) |
| Alice reclaim after `reclaimRelease` | `0x3a1746cc4d588f30dfe88842ca005bcbe0730f99c548fda50c276f6b875d7d7e` | `Reclaimed(recipient = Alice's wallet)`, escrow back to the pre-commit amount, Alice's wallet +0.0001 ETH |

## What did not work / surprises
1. **No live-testnet run (the only blocker).** Faucets need a login or captcha. The fork proves the logic against the real contract code and state, but it is not on-chain evidence.
2. **No documented developer interface for QuipSwap.** The docs say "no swap SDK is published today. Use the wallet for swaps" and list no contract addresses or ABI. I got the address, ABI, enums, the `auth.signer` format and the timing-window rules by reading the minified JS of swap.quip.network and account.quip.network.
3. **Contract is gated to Quip wallets** (`NotQuipWallet`). A plain EOA can't commit, so each party needs a SHRINCS post-quantum wallet, and every action is a wallet `execute` with a one-time signature slot.
4. **SDK bug:** in `ethereum-sdk@0.3.0-beta.8`, `createShrincsWallet` and `execute` pass the account as a bare address. viem then asks the RPC node to sign, which fails with "No Signer available". I worked around it with a wallet-client proxy that signs locally (`lib.mjs`).
5. **My first guess about `Terms.recipient` was wrong.** It means where *this* party receives the *other* side's assets, not who receives this party's assets. With the wrong value, each party got its own asset back.
6. **A same-chain swap settles in one claim.** One claim pays out both sides. A second claim reverts with `InvalidLockState`. The docs describe the two-claim, cross-chain flow.
7. **Deadline ordering differs from the docs.** The contract enforces proposer.commit < taker.commit < proposer.claim < taker.claim < proposer.reclaim < taker.reclaim, and the taker can only commit *after* the proposer's commit deadline. So whoever commits first gets the *shorter* windows, while the docs say the initiator takes the longer one.
8. **Guessed parameters:** `maxSignatures=32` and `erc1271.derivationIndex=1` for wallet creation, and `vaultId` = the wallet's commitment in `auth.signer`. The contract accepted them, but none are documented.
9. **Environment:** the machine's disk was full (about 120 MB free on a 926 GB volume, not caused by this project), which briefly broke the shell. I freed space by deleting my own research clones.

## What would have made this easier (vendor docs/tools)
- A published **QuipSwap page with contract addresses per chain and the ABI**, and ideally the Solidity source. The address table and ABI already exist inside the web bundle.
- A **swap SDK or CLI** (commit / claim / reclaim / watch) with a documented `Terms` schema, especially what `recipient` means and what `auth.signer` should contain.
- The **timing window rules** in the docs, including which side gets the shorter windows, plus a same-chain vs cross-chain note: one claim settles both sides on the same chain.
- A **testnet faucet or sponsored paymaster** for Base Sepolia. The app points to Alchemy's faucet, which needs a login.
- A fix for the SDK's local-account signing (issue 4) and documented defaults for `maxSignatures` and the erc1271 key spec.
- Restoring or redirecting the dead `quip.gitbook.io/docs` links, which are still referenced from search results and repos.
