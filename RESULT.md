# RESULT — On-chain raffle on Quip Network testnet (Aglais)

## Bottom line
| Component | Status |
|---|---|
| Quip QVRF randomness | **BLOCKED** — no callable interface exists |
| Raffle smart contract on Aglais testnet | **WORKING** (deployed, used, verified on chain) |
| End-to-end script (`scripts/run-raffle.mjs`) | **WORKING** (one full raffle run, all checks passed) |
| **Overall** | **PARTIAL** — raffle works end to end, but with fallback randomness, not Quip QVRF |

## Why QVRF was not used (exact reasons)
1. Quip's own doc (`developers.quip.network/docs/compute/qvrf`, source `docs/compute/qvrf.md`) says: "The request interface is not yet final, so no function names or parameters appear here", and that installable packages and code examples will follow. No contract address, endpoint, ABI, SDK or fee is published anywhere I looked (docs, llms.txt/llms-full.txt, ~45 repos in the GitLab/GitHub orgs, npm `@quip.network/ethereum-sdk`).
2. The marketing page (`quip.network/qvrf/`) says access is via a "Request Access" contact form and "on-chain verification contracts" are "in development". I did not submit the form: it is an outward message to the vendor, which I wasn't authorised to send.
3. The Aglais chain has no QVRF pallet or runtime API (pallets: Xqvm, QuantumComputeMempool, QuantumPow, MinerRegistry, Revive, …; no randomness/QVRF one). Payment is described as going over QuipSwap from "any supported chain"; Aglais is not listed.
4. Even if it were available, the doc says QVRF "is not a verifiable random function in the cryptographic sense", and V0 is operator-trusted (Quip runs generation and delivery; can withhold, cannot swap). So it would not by itself make a raffle *provably* fair.

## What I fell back to
`contracts/src/Raffle.sol`: organizer **commit-reveal** plus the hash of a **future block**, with a forfeitable **bond**:
- Organizer commits `keccak256(secret)` and posts a bond at deployment; entries are fixed-price.
- After the entry window, anyone calls `closeEntries()`, which fixes `drawBlock = current + 2` (unknown at that time).
- Organizer reveals; `seed = keccak256(secret, blockhash(drawBlock), numEntries, contract)`; winner = `seed % n`. Anyone can recompute this from public data (`computeWinner` and the `Drawn` event).
- If the organizer doesn't reveal within `revealWindow`, anyone can `abort()`; entrants get refunds plus a share of the bond.

Honest limitations: the organizer can still abort after seeing the outcome (cost = the bond); block authors can influence `blockhash` by transaction selection. On pallet-revive, `blockhash()` returns the **Ethereum-format block hash** (verified: equals `reviveApi.ethBlockHash`, differs from the Substrate header hash). This is **not** quantum randomness and is only suitable for a testnet demo. `abort()/claimRefund()` were tested locally with Foundry only, not on chain.

## How to run
See `README.md`. In short: `npm install`; `(cd contracts && forge build && forge test)`; `node scripts/genkeys.mjs`; fund the 5 addresses from `POST https://faucet.aglais.quip.network/request {"dest":"0x…"}`; `GAS_MULT=5 node scripts/run-raffle.mjs`. Output goes to `evidence/raffle-run.json`. Keys are throwaway, in `./keys` (git-ignored).

## Evidence (Aglais, chain id 20033, RPC `wss://bootnode-1.aglais.quip.network:20049/rpc`, genesis `0x59e064bd…b0c286`)
- Raffle contract: `0x47AbbA4c03a3Acd7444EDcCa0beD1d3e948A93C9`
- Deploy: eth tx `0x413b5a7f…29e2`, block 377029 (extrinsic `0x765a2e7a…9d07`)
- 4 entries (alice/bob/carol/dave, 0.01 AGLS each), block 377031, e.g. alice `0xca2d5579…c184`
- closeEntries: block 377181, drawBlock 377183 (`0x60d1829f…97b9`)
- draw: block 377185 (`0x58d21c55…2e5a`)
- Winner: alice `0x473C8443467A28330f1CeA70a0A7baEC774E770B` (index 2 of 4), prize 0.04 AGLS
- Seed `0x5dd77433…95b2`; commit `0xfb0aacaf…4fda`; secret revealed `0x8a719604…4044`; blockhash used `0x88bb2431…2fa0`
- Independent checks (script): commit matches, seed recomputed, index recomputed, winner is an entrant, `Drawn` event present — all true. Post-run: winner balance +0.04 AGLS, contract balance 0 (bond returned).
- Full hashes and per-step data: `evidence/raffle-run.json`, `evidence/run1-console.log`, `evidence/post-run-verification.txt`.
- Faucet funding txs (10 AGLS each) are in DEVLOG.md (e.g. `0x27e2dfe1…889c`).

## What did not work / surprises (details in DEVLOG.md)
- **No Ethereum JSON-RPC.** Aglais exposes only Substrate RPC. Hardhat/Foundry `--rpc-url`/MetaMask can't be used. I wrote `scripts/lib.mjs`: sign an Ethereum tx with ethers, wrap it as a **bare v4** `Revive.ethTransact` extrinsic (hand-encoded), submit via `author_submitExtrinsic`, gas from the `reviveApi.ethTransact` dry-run.
- polkadot-js 17 encodes that call as a (dummy-)signed extrinsic → `1010 bad signature`; it also can't decode blocks containing v5 general extrinsics, so I scan blocks via raw `chain_getBlock`. `GenericTransaction.input` is a struct; passing a bare hex string silently produced a bogus `StackUnderflow` (my bug, but the types are undocumented).
- **Pool congestion.** At normal gas price my first deploy sat ~21 minutes behind miner-proof traffic and then reverted (I had used an absolute deadline block; fixed with a relative window). With `GAS_MULT=5` txs were included in ≤ ~40 s (one experiment; inference, not documented).
- The full run took ~16 minutes, mostly my 150-block entry window.
- Not investigated: whether Xqvm / QuantumComputeMempool can serve as an on-chain randomness source; QuipSwap payment; running a local eth-rpc adapter.

## What would have made this easier (vendor docs/tools)
1. A "Deploy a Solidity contract on Aglais" page: chain id 20033, `allowEVMBytecode`, Revive, gas price, faucet; today docs say connection details are unpublished and list no contract pages, although the repo README has RPC + faucet.
2. A public Ethereum JSON-RPC endpoint (Parity's `eth-rpc` adapter) — the faucet README mentions such a sidecar but none is documented or deployed.
3. A published QVRF interface (Solidity interface, callback signature, fee, addresses, testnet coordinator), or a mock QVRF contract for testnets; rename or clearly label it since it is not a VRF and V0 is operator-trusted.
4. Working docs for the tx priority/fee behaviour on a congested testnet, and a fee-priority example.
5. An up-to-date `llms-full.txt` (it contradicts llms.txt and the node repo) and a JS example that submits an Ethereum tx as an extrinsic.
