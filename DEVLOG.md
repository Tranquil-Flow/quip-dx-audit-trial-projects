# DEVLOG — Provably-fair on-chain raffle on Quip Network's testnet (Aglais)

Task: build a provably-fair raffle smart contract on Quip Network's testnet,
draw the winner with Quip's quantum randomness (QVRF) if available, and run one
full raffle end to end. Fall back gracefully and explain exactly why, if QVRF
cannot be used.

Session started 2026-09-28 ~16:00 local. Model: deepseek-v4-pro, macOS host.

## Sources consulted (in order)

1. https://developers.quip.network/docs/getting-started/quickstart
2. https://developers.quip.network/docs
3. https://developers.quip.network/docs/getting-started/quip-sdk
4. https://developers.quip.network/docs/nodes/run-a-node-testnet
5. https://developers.quip.network/docs/compute/qvrf   (KEY: QVRF request interface "not yet final")
6. https://developers.quip.network/docs/compute/submit-a-job
7. https://quip.network/qvrf/  (marketing: "On-chain verification contracts — in development")
8. https://quip.network/blog/quantum-echoes-qvrf-launch  (2026-09-11 launch post)
9. https://links.quip.network/
10. https://echoes.quip.network  (Quantum Echoes, first QVRF consumer; mint on Ethereum)
11. https://github.com/QuipNetwork (org; 40 repos, NO public QVRF repo)
12. GitHub API repo listing (rate-limited; saved under /tmp)
13. git clone https://github.com/QuipNetwork/quip-validator.git (Substrate solochain source; AGENTS.md is gold)
14. git clone https://github.com/QuipNetwork/chains.git  (chain registry)
15. git clone https://github.com/QuipNetwork/faucet.git   (faucet source/README)
16. https://agls.quip.network/  (THE testnet landing page: RPCs, faucet, explorers, chain id)
17. git clone --sparse https://github.com/QuipNetwork/polkadot-sdk.git (Quip's pinned SDK fork,
    path substrate/frame/revive — pallet-revive + eth-rpc sidecar source; used to verify
    prevrandao constant, BLOCKHASH opcode, deposit mechanics, weight caps)
18. https://explorer.aglais.quip.network (Blockscout, EVM view)
19. https://subscan.aglais.quip.network (Substrate view; indexer found STALE)
20. https://nodes.quip.network (unreachable: TLS alert on this host)
21. Search: x.com / web results re QVRF launch (corroboration only)

## Key facts established

- Quip Network = quantum compute marketplace. Two subnets: optimization and
  randomness (QVRF). It is NOT an EVM L1; its own chain is a Substrate
  solochain ("quip-testnet", a.k.a. Aglais testnet), fork of polkadot-sdk
  pinned at commit f17113f (pallet-revive 0.13.0).
- Quip's public testnet: name "Aglais Testnet (Quip Network)", EIP-155 chain
  id 20033 (0x4e41), native token AGLS (18 decimals on EVM side / 12 native),
  ~6s blocks, base fee 1 gwei, SS58 prefix 42.
- Smart contracts: pallet-revive with AllowEVMBytecode=true → plain Solidity
  (EVM bytecode) can be deployed permissionlessly. Ethereum JSON-RPC sidecar
  (pallet-revive-eth-rpc, "eth-rpc" binary) at
  https://evm-rpc.aglais.quip.network:20049.
- Faucet: POST https://faucet.aglais.quip.network/request {"dest": "<addr>"}
  dispenses 10 AGLS per request, rate-limited per destination, browser UA blocked.
- QVRF status (the critical finding):
  * Live as a service (launched 2026-09-11) but the developer request
    interface is NOT PUBLISHED: docs say "The request interface is not yet
    final, so no function names or parameters appear here" and "Integration
    documentation with installable packages and code examples will follow".
  * Access is gated: "Request Access" contact form on quip.network/qvrf.
  * On-chain verification contracts are "in development" (marketing page).
  * No QVRF repo/package in the public GitHub org or on npm/PyPI.
  * Grep of the quip-validator runtime: NO QVRF pallet, NO randomness
    precompile (Precompiles = ()). Only standard BABE epoch randomness on the
    substrate side, not exposed to EVM contracts.
  → QVRF CANNOT be used by a third-party contract today. Decision: fall back,
    document exactly why (see RESULT.md).
- Randomness inside Aglais EVM (verified in pinned SDK source):
  * DIFFICULTY/PREVRANDAO opcode returns hard-coded constant 2.5e15
    (substrate/frame/revive/src/vm/evm.rs line 50). eth_getBlockByNumber
    shows difficulty 0x0, mixHash = 0x0000000000000008e1bc9bf04000 (same
    constant, big-endian). → prevrandao unusable for randomness.
  * BLOCKHASH opcode returns the REAL substrate block hash
    (exec.rs: `System::<T>::block_hash`). → usable as the anchor for the draw.

## Commands that mattered

- pip3 install web3 (v7.16.0), npm install solc@0.8.26 (solc-js)
- Python eth_account: generated 4 throwaway keys in ./keys (owner/alice/bob/carol)
- Faucet requests: 4x (extrinsics 0xfb62..., 0xa19d..., 0x6e7e..., 0x1af1...)
- Compile: solcjs --bin --abi --optimize → 4,697 bytes bytecode (v1)
- Deploys (all on chain 20033):
  * v1 raffle deploy 0x664f558f... FAILED (revert, gasUsed 2.64M)
  * Tiny test 0xfe... FAILED (2.49M), TinyNoCtor 0xc0800023... FAILED (2.32M)
  * TinyNoCtor gas 1.2e9 0x7e1290e9... SUCCESS → discovered deposit mechanics
  * v1 raffle gas 1.7e9 0x26a0e07b... SUCCESS at 0xB1a8e77C... (later found
    phase-transition bug: nothing moved Commit→Reveal; contract stuck by design)
  * v2 raffle (phases derived from block numbers) 0x3885e581... SUCCESS at
    0x76A8A6EC6B0C239b1d6980b31458d334a60e7082

## Errors / dead ends

1. web3 v7: SignedTransaction.rawTransaction → raw_transaction (API rename).
2. First 3 deploys reverted at ~2.3-2.6M gasUsed. Initial hypothesis: 90%
   weight cap on eth_transact. DISPROVEN by math (cap ≈ 1.8e12 ref-time ≈
   ~1.8e9 gas at 25k ref-time/gas). Real cause found via eth_estimateGas
   revert payload: `ModuleError { index: 14, error: [23,0,0,0],
   "StorageDepositNotEnoughFunds" }` (pallet-revive).
3. Root cause of #2: pallet-revive pays storage deposits OUT OF THE GAS
   OVERPAYMENT (storage_deposit = eth_fee − tx_fee, call.rs:245). A deploy
   needs ~0.72-0.78 AGLS of deposit ≈ 720-780M gas at 1 gwei. Fix: send
   creation txs with gas ≈ 1.2-1.7e9. Also explains the 60k-gas transfer
   rejection ("Invalid Transaction", code 1010).
4. eth_estimateGas FAILS for value-bearing calls ("TransferFailed", revive
   error index 4) — dry-run cannot charge the deposit. Worked for the
   value-less creation. Workaround: hardcode generous gas on entries.
5. Subscan API (subscan.aglais.quip.network/api/...) returns 404s on /api/scan
   paths; and its indexer is STALE (latest indexed block 131,317 ≈ 17 days
   behind the chain at 373k+). Could not read extrinsics/events there.
6. explorer.quip.network does not resolve; nodes.quip.network TLS alert from
   this host. Used explorer.aglais.quip.network instead (works).
7. DESIGN BUG in contract v1: `phase` was a stored enum but no function ever
   transitioned Commit→Reveal; reveal()/closeReveals() required Phase.Reveal
   → raffle would be permanently stuck. Fixed in v2: currentPhase() is
   derived from block.number; removed stored phase. (Honest catch; logged.)
8. First solc compile after the fix failed: modifier body without `_`,
   leftover `phase = Phase.Closed` identifier — trivial, fixed.
9. Python 3.9 on this host: py-substrate-interface has no wheel; skipped the
   substrate-RPC debugging route (wasn't needed after finding #3).
10. COMMITMENT ENCODING BUG (cost one full cycle): Web3.solidity_keccak(
    ['address','bytes32']) does NOT reproduce keccak(abi.encode(...)) — it
    produced a653bb8f... where true abi.encode gives e73d0452...
    (eth_abi.encode). The contract checks keccak256(abi.encode(msg.sender,
    salt)); I stored the solidity_keccak variant → every reveal reverted
    BadCommitment(). Fixed by using Web3.keccak(eth_abi.encode(...)) in v4.
    NOTE: web3's solidity_keccak apparently hashes the canonical
    string/hex representation rather than the ABI encoding for address.
11. closeReveals PHASE BUG (cost another cycle): in v2-v4, currentPhase()
    returns Closed once block.number > revealDeadline, and closeReveals()
    required Phase.Reveal → closeReveals could NEVER run after the deadline.
    Fixed in v5: closeReveals/draw use explicit block-number/anchor checks
    instead of the phase modifier.
12. eth_estimateGas returns a value that INCLUDES the storage-deposit gas for
    creations (784M ≈ actual gasUsed) — but FAILS on value-bearing calls
    ("TransferFailed") because the dry run cannot charge the deposit.
13. v5 PAYOUT-ORDER BUG: claim() drained the entire pot before the non-winners
    refunded, so refunds reverted (contract had 0 balance). Fixed in v6:
    claim() reserves ENTRY_FEE × (revealedCount − 1 − refundedCount); refund()
    is idempotent via a per-entry flag.
14. v6 drawEvidence() COSMETIC BUG: the 6th return value (anchorHash) reads 0
    on the deployed bytecode — the named return parameter shadowed the local
    `anchorHash` in the return statement. The true value is in the
    DrawExecuted event (verified equal to the keccak-fold of the 5 anchor
    hashes). Fixed in source (state var + renamed return param), compile
    checked, NOT redeployed (time budget).
15. run_full.py crashed at the very end on json.dump of bytes (evidence dict);
    the raffle itself had already completed on-chain. Fixed by hexifying.

## Guesses / deviations / workarounds

- GUESS (confirmed by source): sidecar eth_sendRawTransaction maps creation
  txs (to=null) to Revive::eth_instantiate_with_code. Verified in
  pallet-revive evm/call.rs.
- GUESS (confirmed empirically): gas limits must cover storage deposits via
  overpayment. gasUsed ≈ estimateGas on creations; both ≈ 784M for the raffle.
- Deviated from docs: Quip docs describe QVRF conceptually but ship no
  interface; the only live consumer (Quantum Echoes) is on ETHEREUM MAINNET,
  not Aglais. Nothing in the docs tells you how to make QVRF calls from
  Aglais contracts. We did not request access (would be posting a contact
  form — allowed, but 90-min budget; also the docs say interface not final).
- The agls.quip.network EVM notes: "Balances read one existential deposit
  low" — observed (9.999 AGLS shown after 10 dispensed).

## Notes on vendor product friction (for RESULT.md)

- Two products don't fit together: QVRF (randomness) has no public contract
  interface; Aglais (the EVM testnet) has no randomness precompile. The
  "randomness for smart contracts" story is aspirational at this date.
- pallet-revive deposit-via-gas-overpayment is undocumented anywhere in Quip
  docs; standard EVM tooling (cast/web3 defaults) fails with inscrutable
  "Invalid Transaction"/revert. This will bite every early EVM dev on Aglais.
- The chain registry entry (eip155-20033.json) lists faucets: [] — the real
  faucet exists but isn't registered. Explorer URL in registry
  (explorer.testnet.quip.network) 404s/DNS-fails; the live one is
  explorer.aglais.quip.network. Docs drift.
- Subscan indexer is stale by ~17 days.
- quip-validator docs/pallet-revive-integration.md validation checklist still
  has unchecked: "Contract upload, deployment, calls, events, and termination
  work" — deployments on the public EVM sidecar appear untested by the vendor.
  (We appear to be among the first to deploy Solidity on Aglais.)

## Timeline of the successful run (chain 20033)

Earlier attempts (all logged above, useful as evidence of the pitfalls):
- v1 0xB1a8e77C... (deploy 0x26a0e07b...) — phase-transition bug, unusable
- v2 0x76A8A6EC... (deploy 0x3885e581...) — solidity_keccak commitment bug, reveals reverted
- v3 0x0C41cd6F... (deploy 0x9fa55a63...) — same commitment bug (found via eth_call)
- v4 0xB344cc8B... (deploy 0xa4a6652e...) — closeReveals phase bug, close reverted
- v5 (deploy tx in run_full.py log) — draw OK (winner alice, claimed) but
  refunds reverted: claim drained the pot first
- v6 = FINAL RUN — 0x1179b9b7d5e9DA6dA2a594b2721874842048aEe7:
  * deploy 0x5a6c5e26646943d6ca4a6dc0224e6b8fcf0b4df2b2e0547644ec98e76ca9b3f0 (blk 378268)
  * enters: 0x4fc8ef9a… (alice), 0x88e3c897… (bob), 0x649dbda0… (carol)
  * reveals: 0xe246fe5d…, 0x171d2918…, 0x191ad659…
  * closeReveals 0xc4f7af4e… anchor 378300, aggregate c5f23ded…
  * DRAW 0x124b8c21… (blk 378306) winner index 1 = BOB, anchorHash (event)
    cd19bc5d… = fold of blockhash(378300..378304)
  * claim 0x820f3e47… (bob 1 AGLS), refunds 0x2649aff5… (alice),
    0x07d441a6… (carol); pot 0
  * verify.py: PASS (aggregate ✓, 5 anchor hashes match chain ✓, anchorHash ✓,
    winner recomputed = bob ✓)
