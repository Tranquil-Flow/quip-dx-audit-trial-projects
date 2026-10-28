# RESULT.md — Quip Network quantum portfolio demo

Overall status: **WORKING** (end to end, verified on-chain)

A QUBO for selecting 4 of 8 portfolio assets was solved by Quip Network's
compute layer on the aglais testnet (order_id 167, 11 miner submissions), and
the job id + solution were recorded in a Solidity contract deployed on Quip's
own testnet EVM (pallet-revive, chain id 20033). A read-back script verifies
every stored field against the solver output over the public JSON-RPC.

## Component status

| Component | Status | Evidence |
|---|---|---|
| XQuad toolchain install (xquad[quip]) | WORKING | xquad/xqsa/xqcp/xqvm-py 0.4.1, quip-signer 0.3.0 in .venv |
| QUBO formulation (8 assets, pick 4) | WORKING | energy arithmetic hand-checked; local baseline agrees with network result |
| Quip Network solve (SolverQuip -> QuantumComputeMempool) | WORKING | order_id 167, solved in ~77s, reward 1 AGLS + 0.0019 AGLS fee |
| Faucet funding | WORKING | substrate acct 5HR3k3…ysk3 and EVM 0xc7DaA6…c84C3E each dripped 10 AGLS |
| Smart contract deploy on Quip testnet EVM | WORKING | 0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591, deploy tx 0xf6d5c7dc…7997ce, block 378003 |
| On-chain recording of job id + solution | WORKING | tx 0x9e60d4b7…45d549, block 378051, status 1, SolutionRecorded event |
| Read-back + cross-check | WORKING | ALL FIELDS VERIFIED (jobId, nAssets, mask, energy, solver) |

## Evidence

Quantum solve (results/solve_result.json):
- order_id: 167 (QuantumComputeMempool order on aglais)
- solver (winning miner): 5EXN4YzJoqb7GnMTdMDmDo7wYpMz5HtQwcAvy1LmJVHTB943
- best_energy_milli: -457500; energy_matches_chain: true
- num_submissions: 11; num_solutions: 1
- solution bits: [0,1,1,0,1,0,1,0] -> mask 86 -> assets BBB, CCC, EEE, GGG
- energy: -3360 (matches local dwave-cpu baseline exactly)
- job proposed at block 0x2e2608445a353c556b28e8b3a626f81aa4915f34efb8ebf0e57d76be2ee822d6

On-chain:
- chain: aglais (Quip testnet), EIP-155 chain id 20033
- contract: 0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591
  (https://explorer.aglais.quip.network/address/0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591)
- record tx: 0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549
  (block 378051; log data encodes 167, 8, 86, -3360)
- deploy tx: 0xf6d5c7dcfcfc557c55e8326b61cc42bbb131c194e7d1b5f4505c2aa33d7997ce (block 378003)
- faucet extrinsic (EVM drip): 0x8cffb36c791c8e29807afe3a799a35a2e27befa571356cb49d09bd1e66c71b0c

Keys (throwaway, created for this demo, in ./keys):
- EVM deploy/record key -> 0xc7DaA66B57E9b2b1af53D4E79ad2D108f9c84C3E
- Quip solver keystore -> account 5HR3k3pydqjXmijWu6PWWTFzG97FZc14rJno43t3T8uxysk3

## How to run

    uv venv --python 3.13 .venv
    uv pip install --python .venv/bin/python "xquad[quip]" web3
    .venv/bin/python solve_portfolio.py    # solve on Quip Network (auto-faucet-funded)
    .venv/bin/python record_solution.py    # record job id + bits + energy on-chain
    .venv/bin/python read_back.py          # read + verify the stored record

## What did not work, and why

1. Default-topology (QPU-placable) placement — BLOCKED, by design.
   The model's dense 28-pair coupling graph (K8) needs an 8-clique in the
   hardware graph; the network's default topology (4577 nodes, 41514 edges,
   max degree 20, Zephyr-like) has none. xqsa raises PlacementError with a
   misleading message ("search budget exhausted"). Fix used: topology="native"
   (the official tutorial hits the same wall and uses the same fix). In native
   mode only the simulated-annealing miner fleet can answer (no QPU miner), so
   the job was not solved on a physical annealer.
2. Raw substrate-interface queries — BROKEN for this chain with scalecodec
   1.2.12: metadata decode raises "Index '16' not present in Enum type
   mapping". Worked around by using xqsa's own chain access (which reads the
   topology fine). Not needed for the demo flow itself.
3. cast wallet new cannot produce a raw private key (creates encrypted foundry
   keystores). Used python secrets + cast wallet address instead.
4. forge create now dry-runs by default; deploy needed --broadcast.
5. GitBook docs (quip.gitbook.io/docs) 404 — the space is gone; real docs at
   developers.quip.network and in the xquad book (solving/quip-network.md,
   solving/quip-first-job.md), which are excellent.

## Gaps between the vendor's products worth noting

- "One chain, two front doors": substrate side uses AGLS with 12 decimals and
  ss58 accounts; the EVM side uses 18 decimals and H160 addresses. The faucet
  bridges both, but nothing else does — the two account formats/balances do
  not share tooling.
- quip's ethereum-sdk (Asset Layer) targets Ethereum-family testnets
  (Sepolia/Base/OP), NOT Quip's own testnet; Quip's own EVM is a separate,
  simpler pallet-revive surface with no pubsub/filters/traces.
- The quantum-portfolio-optimization repo is a yfinance data CLI, not a
  network solver; the actual consumer compute API lives in xqsa's SolverQuip,
  discoverable only through the xquad book.
- No consumer API exists to *choose* quantum vs classical miners; the solver
  is whichever miner wins the order.

## What would have made this easier

- A public getter for the default topology (nodes/edges/cliques) documented
  next to SolverQuip, and a clearer PlacementError (clique impossibility, not
  "budget exhausted").
- The proposed-job extrinsic hash (or block link) returned by SolverQuip in
  metadata alongside order_id, for immediate Subscan cross-referencing.
- SolverQuip exposing the winning submission's raw spin vector (not only the
  decoded sample) so consumers can store the wire-format proof on-chain.
- Official docs migration note at the dead GitBook URL pointing to
  developers.quip.network.
