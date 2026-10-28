# DEVLOG — Quip Network quantum portfolio demo

Goal: solve an 8-asset portfolio QUBO on Quip Network's quantum compute, record
solution + job id on-chain in a smart contract on Quip's testnet (Aglais), and
write a read-back script. Throwaway keys only (kept in ./keys). No mainnet, no money.

## Sources consulted (in order)

1. https://quip.network/ — main site. Confirms: two layers (Compute-Consensus
   layer = PoUW blockchain; Asset Layer on EVM/SVM/Bitcoin), D-Wave partnership,
   docs at quip.gitbook.io, GitHub org quipnetwork, "compute marketplace coming soon".
2. https://quip.gitbook.io/docs — 404 "Content owner not found" via extractor AND
   via curl. The GitBook space is dead/moved. (New docs live at
   https://developers.quip.network/docs — found later via aglais page.)
3. https://github.com/quipnetwork — org page. Key repos: quip-miner, ethereum-sdk,
   quip-validator (Substrate fork), quip-solver-core, xquad, quantum-portfolio-optimization.
4. https://github.com/QuipNetwork/ethereum-sdk — Asset Layer contracts + TS SDK.
   Targets Ethereum Sepolia/Base/OP (NOT the Quip testnet itself). Not used for
   our demo: we deploy directly on Quip's own testnet EVM (pallet-revive).
5. https://github.com/QuipNetwork/quantum-portfolio-optimization — only a yfinance
   CLI for building portfolio matrices; no quantum solver / no network job API.
   Name is misleading for our purpose.
6. https://github.com/QuipNetwork/quip-solver-core — solver/MINER side contract
   (gRPC session protocol). Not the consumer API.
7. https://github.com/QuipNetwork/quip-validator README — testnet details:
   chain EIP-155 20033, token AGLS 12 decimals, chain spec at
   nodes.quip.network/chain-specs/aglais-network.json, runtime 117 = H2/H4 wipe.
8. https://github.com/QuipNetwork/faucet README — faucet API:
   POST /request {dest, amount} funds SS58, 0x+64-hex AccountId, or EVM H160.
9. https://github.com/QuipNetwork/nodes.quip.network README — compose stack,
   public RPC wss://cpu-1.nodes.quip.network/rpc, faucet.aglais.quip.network.
10. https://github.com/QuipNetwork/explorer.quip.network README — Blockscout on
    aglais EVM; sidecar evm-rpc.aglais.quip.network:20049 serves eth_* only;
    no pubsub; EIP-155 chain id 20033; block time ~6s; EVM history from block 0.
11. https://github.com/QuipNetwork/xquad README — **XQuad**: official toolchain
    (QUBO/Ising VM + solvers). Python: pip install xquad[quip] -> "Quip Network
    solver" extra, needs QUIP_RPC_URL + signer. This is the consumer API.
12. xquad docs book, chapter docs/book/src/solving/README.md — Solver interface,
    SolverQuip among 5 backends.
13. xquad docs book, docs/book/src/solving/quip-network.md — full SolverQuip
    reference: env vars, job lifecycle (propose_job -> JobProposed event ->
    miners discover from event stream -> submit solution -> finality by block
    height), topology constraint, coefficient encoding (milli-scale i32),
    cost model (MinReward 1 AGLS + metered fee), metadata keys
    (order_id, solver, best_energy_milli, energy_matches_chain, num_submissions,
    num_solutions), failure taxonomy.
14. xquad docs book, docs/book/src/solving/quip-first-job.md — worked TSP example
    run against aglais on 2026-09-24 (specVersion 117): MinReward 1 AGLS, fee
    ~0.0022 AGLS, faucet drip 10 AGLS, ~94s solve, order_id in metadata.
    topology="native" used because TSP graph had no placement in default topology.
15. https://aglais.quip.network — canonical endpoint list:
    - Substrate RPC: wss://bootnode-{1-3}.aglais.quip.network:20049/rpc
    - EVM JSON-RPC: https://evm-rpc.aglais.quip.network:20049 (chain 20033,
      AGLS 18 decimals on EVM side, gas price 1 gwei, pallet-revive backend)
    - Faucet: POST https://faucet.aglais.quip.network/request {"dest": addr},
      10 AGLS per request, EVM addresses accepted.
    - Explorers: explorer.aglais.quip.network (Blockscout/EVM),
      subscan.aglais.quip.network (substrate).
    - "One chain, two front doors": substrate + EVM share balances, but
      different account formats and token precision (12 vs 18 decimals).
16. https://github.com/QuipNetwork/quip-validator runtime/src/lib.rs — pallets:
    pallet_xqvm (idx 8), pallet_quantum_compute_mempool (idx 9), pallet_quantum_pow
    (idx 10), pallet_revive (idx 14), pallet_evm_chain_id (idx 15).
    docs/quantum-compute-mempool.md + pallets/quantum-compute-mempool/src/*.rs —
    the on-chain job pallet (propose_job, lifecycle, delivery, rewards).

## Dead ends / notes

- GitBook docs (quip.gitbook.io/docs) are gone (404 "Content owner not found").
  Real docs: https://developers.quip.network/docs (linked from aglais page).
- quantum-portfolio-optimization repo does NOT do quantum portfolio optimization
  on the network; it's a yfinance data CLI. We build the QUBO ourselves with xqcp/xqvm_py.
- ethereum-sdk targets Ethereum-family testnets (Sepolia etc.), not Quip's own
  testnet. Quip's own testnet has a pallet-revive EVM — deploy there directly.

## Environment

- macOS aarch64. uv 0.11.8, cargo/rustc 1.95, forge/cast (Foundry), node 22.
- venv: .venv (CPython 3.13.13 via uv). `uv venv` created it without pip;
  use `uv pip install --python .venv/bin/python`.
- Install: uv pip install "xquad[quip]" web3  (xqffi + quip-signer build from
  source on macOS aarch64 — needs Rust >= 1.85; we have 1.95.)

## Commands run (important ones)

- mkdir -p keys; git init
- uv venv --python 3.13 .venv  (no pip in venv — first quirk)
- uv pip install --python .venv/bin/python "xquad[quip]" web3   [BACKGROUND]

## Plan

A. Build 8-asset QUBO (BINARY, pick 4 of 8: return - risk - cardinality penalty)
   with xqvm_py.XQMX (or xqcp), solve via SolverQuip.for_network("aglais").
B. Get order_id + sample bits from result.metadata.
C. Generate throwaway EVM key (./keys/), faucet-fund the EVM address, deploy a
   tiny Solidity contract (forge create --rpc-url https://evm-rpc.aglais.quip.network:20049),
   call record(jobId, bits, energy, solver).
D. read_back.py (web3) reads contract storage; verify against solver output.

## Session events (chronological)

1. Env: uv venv --python 3.13 .venv (uv venv ships no pip — use `uv pip`). 
2. uv pip install --python .venv/bin/python "xquad[quip]" web3 — 46s. Installed
   xquad/xqsa/xqcp/xqvm-py 0.4.1, quip-signer 0.3.0, substrate-interface 1.8.1,
   web3 7.16.0. (Wheels for macOS aarch64 were available — no Rust build needed.)
3. cast wallet new --json makes an encrypted foundry keystore, NOT a raw key.
   Workaround: python3 secrets.token_hex(32) -> keys/evm.key; address via
   cast wallet address. Throwaway EVM addr 0xc7DaA66B57E9b2b1af53D4E79ad2D108f9c84C3E.
4. Faucet: POST https://faucet.aglais.quip.network/request {dest: EVM addr}
   -> extrinsic 0x8cffb36c791c8e29807afe3a799a35a2e27befa571356cb49d09bd1e66c71b0c,
   10 AGLS requested. EVM balance afterwards: 9.999 AGLS (9999000000000000000 wei;
   0.001 AGLS gone — mint/fee handling on the faucet path; unexplained but harmless).
5. EVM RPC checks (cast): chain-id 20033, gas-price 1 gwei, block 377991. Works
   over HTTPS with standard JSON-RPC. No EIP-1559; use --legacy / gasPrice.
6. Contract deploy (forge, --legacy --broadcast):
   PortfolioProof -> 0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591
   tx 0xf6d5c7dcfcfc557c55e8326b61cc42bbb131c194e7d1b5f4505c2aa33d7997ce
   (Blockscout: block 378003, indexed OK).
   NOTE: forge create now DRY-RUNS by default; needs explicit --broadcast.
7. Solver: default topology = chain QuantumPow.DefaultTopology: 4577 nodes,
   41514 edges, max degree 20, avg degree 18.1, ~2.05 triangles/edge
   (D-Wave-Advantage2/Zephyr-like). Our 8-asset model has ALL 28 pairwise
   couplings (dense risk matrix) -> placement needs an 8-clique; a sparse
   annealer graph has none -> PlacementError "budget exhausted after 200000
   steps" (the message is misleading; the real cause is no 8-clique).
   FIX: topology="native" (order carries its own nodes/edges inline; solved
   by the SA miner fleet). This matches the official tutorial, which also had
   to use native mode. NOTE: native mode means QPU miners cannot answer.
8. Classical baseline (dwave-cpu, local): bits [0,1,1,0,1,0,1,0], mask 86,
   energy -3360 -> BBB, CCC, EEE, GGG selected. Hand-verified arithmetic.
9. substrate-interface raw query broken for this chain: scalecodec raises
   "Index '16' not present in Enum type mapping" while decoding metadata.
   xqsa's own chain access works (it fetched the topology fine), so we rely
   on xqsa rather than raw substrate-interface.
10. solve_portfolio.py rerun with native fallback [BACKGROUND proc_8e2cb08543c3].

11. Network solve succeeded (native mode, ~77s):
    - faucet funded 0xecb10465...8761 (10 AGLS) -> ss58 5HR3k3pydqjXmijWu6PWWTFzG97FZc14rJno43t3T8uxysk3
    - order_id=167, solver=5EXN4YzJoqb7GnMTdMDmDo7wYpMz5HtQwcAvy1LmJVHTB943,
      best_energy_milli=-457500, energy_matches_chain=True, 11 submissions
    - bits [0,1,1,0,1,0,1,0] mask 86 energy -3360 == classical baseline exactly
    - keystore scheme: hybrid-falcon512, account_id in keys/quip_keystore.json
12. record_solution.py: tx 0x9e60d4b7127da0510f0b81b4c429a628bb5f2c6963fe2a2f03eba34e4f45d549
    block 378051 status 1; SolutionRecorded event log confirmed via Blockscout
    API (data encodes 0xa7=167, 0x08=8, 0x56=86, negative energy).
13. read_back.py: ALL FIELDS VERIFIED; cardinality 4/8 OK.
14. Wrote README.md + RESULT.md. Total wall time ~60 min.

## Key numbers for the report

- aglais chain id 20033; EVM RPC https://evm-rpc.aglais.quip.network:20049
- substrate RPC wss://bootnode-1.aglais.quip.network:20049/rpc
- job cost: reward 1 AGLS, fee 0.0019 AGLS (quote: fee exact)
- contract 0xA71E173DE6eEee18Cb33cEf4d7542f6F510e5591
