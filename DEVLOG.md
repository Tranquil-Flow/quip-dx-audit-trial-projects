# DEVLOG — Quip Network: local QUBO solve + testnet compute job comparison

Goal: use Quip Network's solver packages to solve a small QUBO locally, submit the
same problem to Quip's testnet compute network, and compare results.

## Sources consulted (in order)
1. https://developers.quip.network/docs/compute/submit-a-job — "Submit your first compute job".
   Points to `xquad[quip]` (umbrella: xqffi/xqcp/xqsa/xqvm_py). Local CPU solver
   `SolverDWaveCPU`, network solver `SolverQuip`. Says testnet connection details
   "have not been published yet" — STALE: later sources give them.
2. https://developers.quip.network/docs/getting-started/quickstart — run a node / key gen.
3. https://pypi.org/project/quip-solver-core/ — the miner-side solver contract
   (Sampler trait, gRPC stubs, session loop). Not the consumer-side path.
4. https://quip.network/blog/testnet-is-live — testnet live since 2026-04-02.
5. https://developers.quip.network/docs/nodes/run-a-node-testnet — node ops; not needed here.
6. https://pypi.org/project/xquad/ (fetch failed, used GitHub instead)
7. https://github.com/QuipNetwork/xquad — XQuad README: solver extras table, quip extra
   needs QUIP_RPC_URL + configured signer.
8. https://raw.githubusercontent.com/QuipNetwork/xquad/main/xqsa/README.md — solver adapter list.
9. Installed package source (ground truth, xqsa 0.4.1):
   - xqsa/quip.py — SolverQuip config: url/QUIP_RPC_URL, seed/QUIP_SIGNER_SEED,
     keystore/QUIP_KEYSTORE (default ~/.quip/keystore.json, auto-created), reward,
     topology, faucet, autoconfirm/autofund gates (both default True).
   - xqsa/quip_networks.py — presets: aglais (public testnet)
     rpc=wss://bootnode-1.aglais.quip.network:20049/rpc,
     faucet=https://faucet.aglais.quip.network ; devnet=localhost.
   - xqsa/quip_metadata.py — V16→V14 metadata shim; wss CA-bundle fallback on macOS.
10. https://gitlab.com/quip.network/xquad/-/raw/main/docs/book/src/solving/README.md — solver interface.
11. https://gitlab.com/quip.network/xquad/-/raw/main/docs/book/src/solving/quip-network.md — SolverQuip
    reference: job lifecycle, native topology mode, coefficient encoding (milli-scale i32),
    error taxonomy.
12. https://gitlab.com/quip.network/xquad/-/raw/main/docs/book/src/solving/quip-first-job.md — worked
    example: 16-var TSP, topology="native", keystore default, quote 1.0022 AGLS total
    (MinReward 1 AGLS + ~0.0022 fee), autofund draws 10 AGLS drip, solved in ~94 s.
13. https://aglais.quip.network — testnet portal: RPCs wss://bootnode-{1-3}.aglais.quip.network:20049/rpc,
    faucet POST https://faucet.aglais.quip.network/request {"dest": "<SS58|0x|EVM>"} (10 AGLS, rate-limited),
    SS58 prefix 42, 12 decimals, explorers: subscan.aglais.quip.network / explorer.aglais.quip.network.

## Decisions / guesses
- Primary path = XQuad toolchain (`xquad[quip]`), NOT quip-solver-core: the docs'
  "Submit your first compute job" page and both solver book chapters point there,
  and it provides BOTH the local solver and the network solver behind one interface.
  quip-solver-core is the miner-side contract (Sampler trait/session loop), the other
  side of the marketplace.
- Problem choice: small QUBO with fixed integer coefficients, n=6, with known
  brute-force optimum so both local and network answers can be checked against truth.
- topology: try default (chain DefaultTopology) first; fall back to "native" (docs'
  worked example uses native; default placement may fail for dense graphs).
- Keys: brand-new keystore under ./keys/ (never ~/.quip). Fund via faucet curl
  (and/or the solver's autofund drip).
- No mainnet, no real money: aglais testnet only, AGLS is worthless test token.

## Commands so far
- python3 --version → 3.9.6 (system); python3.13 → 3.13.14 available (xquad needs 3.13+).
- python3.13 -m venv .venv
- .venv/bin/pip install "xquad[quip]" → xquad-0.4.1, xqsa-0.4.1, xqvm-py-0.4.1,
  xqcp-0.4.1, xqffi-0.4.1, quip-signer-0.3.0, substrate-interface-1.8.1, dimod-0.12.22,
  dwave-samplers-1.8.0. (xqffi wheel for macos arm64 was prebuilt; quip-signer wheel too.)

## Errors / dead ends so far
- DuckDuckGo search for "QUIP_RPC_URL ... wss" returned no results (backend quirk).
- The submit-a-job docs page is stale re: testnet connection details; real coordinates
  found in xqsa.quip_networks + aglais.quip.network.

## Progress
- venv: python3.13, xquad[quip] 0.4.1 installed OK.
- XQMX API verified (binary_model/set_linear/set_quadratic; SAMPLE-mode .linear
  holds only non-zero vars -> filled missing with 0 in sample_to_dict).
- QUBO chosen: MaxCut on 6-node weighted graph (9 edges, weights 2..8, all even
  for milli-representability), binary QUBO L_i=-deg*w, Q_ij=+2w. E(x) = -(cut weight).
- BUG (mine): first formulation had L_i=+deg*w, Q_ij=-2w -> minimizes cut weight,
  optimum trivially 0 at all-equal. Flipped signs -> min E = -(max cut).
- Brute force (64 states): optimum energy -36 (max cut 36), 4 optimal assignments.
- Local: SolverDWaveCPU (dwave-samplers SA) seeds 1,2,3,42, 100 reads/1000 sweeps
  -> ALL found energy -36 (optimal). ~4ms per run. -> work/local_result.json
- Network submission started (background): SolverQuip.for_network("aglais"),
  brand-new keystore ./keys/keystore.json, default chain topology first with
  fallback to topology="native" on PlacementError; faucet drip if short;
  extrinsic hash captured via solver._prepare() (private API, same extrinsic
  solve() submits: immortal era => same hash).
- quip-solver-core 0.0.2rc3 (latest) installed too: exposes scoring.energy_milli
  (the consensus energy primitive, same one the chain uses) + wire codecs +
  miner session loop. Will cross-check chain's best_energy_milli with it.
- quip-solver-core Python surface: scoring.energy_milli(spins, h, j, edges)
  (milli-units, ValueError if len(j) != len(edges)); wire: encode/decode_spins,
  i32_le codecs; session: miner-side hello/config (not needed for a consumer job).

## Network run (aglais testnet) -- SUCCESS
- Fresh throwaway account (keystore ./keys/keystore.json, created by
  xqsa.quip_signing.generate_keystore):
  SS58 5GdSb2MzWqHHfT7ixQEXeVzDQcSPqARxK32nYGYbmGdeAt7r
  hex  0xc9e8a13122f84d4863ad63dfa7afa50d3d5e7a2e00d97096b161799e52f44410
- Placement: DEFAULT chain topology worked for this 6-node graph (no native
  fallback needed). Placed onto hardware nodes [96,108,120,2496,2520,2532].
  UserWarning: 7 coefficients outside topology's allowed-value set; per docs
  accepted as-is (real HW rescales monotonically, optimum preserved).
- Faucet: POST https://faucet.aglais.quip.network/request {"dest":"0x..."} -> 200,
  10 AGLS, faucet-side extrinsic 0x2390a6604b4b22a0b0d7a0212f1ea0449f8d3ccc2be13354448be1124fbb86c1
  (Balances.transfer_keep_alive, block 389402-1).
- propose_job extrinsic hash 0xaac2b349df599fd58ea6199b25ca669453f2f0946b549e3393b5cab2eabb74d4,
  included block 389404 index 5, success=True (confirmed via subscan API).
  Quote: reward 1.0 AGLS, fee 0.001898261115 AGLS (exact), total 1.001898261115 AGLS.
- order_id = 177. First solution arrived ONE BLOCK after proposal (389405);
  competition window closed at effective_expiry 389415; 36 submissions total,
  1 distinct solution after diversity collapse.
- Winner: miner account 5EXYq2gZ8ApHupvXSE8TNRosSMx9jq6z83phSFvGb245ZSnj
  (QuantumComputeMempool.JobOrders / OrderSolutions read on-chain).
- Network answer: sample [0,1,0,0,1,1] energy -36 == brute-force optimum.
  best_energy_milli (chain) = -15000; xqsa energy_matches_chain=True.
- query() in a NEW process recovered the same result from chain state;
  status(): created 389404, first_solution 389405, final at 389428. Works.
- Final balance 8.998101738885 AGLS = 10 - 1.001898261115 (math checks).
- subscan.aglais.quip.network: API endpoints /api/scan/extrinsics and
  /api/scan/extrinsic work (code 0). Web UI routes 404 for curl (Next.js SPA,
  custom explorer, not stock subscan routes) -- UI links not reliable; use the API.

## quip-solver-core cross-check
- quip-solver-core (0.0.2rc3) Python wheel: scoring.energy_milli(spins, h, j, edges).
- UNIT CONVENTION discovered by experiment (README does not state it):
  natural-scale coefficients IN, milli-scale energy OUT. Passing milli-scaled
  coefficients returned 1000x too much (-15000000 vs chain -15000). With
  natural inputs: -15000 == chain's best_energy_milli EXACTLY. Independent
  verification of the chain's energy: PASS.
- E_bin = E_spin + const, const = sum(L)/2 + sum(Q)/4 = -21 -> -15 + (-21) = -36. OK.

## Errors & dead ends (full list)
- DDG search "QUIP_RPC_URL ... wss" -> no results (search backend quirk).
- Stale docs: submit-a-job page claims testnet connection details unpublished;
  real endpoints in xqsa.quip_networks + https://aglais.quip.network.
- My first MaxCut QUBO had inverted signs (minimized cut weight, trivial
  optimum 0). Flipped to L=-deg*w, Q=+2w -> min E = -maxcut = -36.
- XQMX SAMPLE-mode .linear holds only non-zero vars; first sample_to_dict
  assumed full dict -> KeyError. Fixed to fill missing with 0.
- quip-solver-core energy_milli unit convention (see above).
- subscan UI deep links 404 via curl; used the JSON API instead.
- terminal heredoc containing ampersands was rejected by a false-positive
  backgrounding guard; switched to patch-tool appends for DEVLOG.
