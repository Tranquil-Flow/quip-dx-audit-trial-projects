# DEVLOG — Quip Network scheduling QUBO (6 jobs / 3 machines)

## Sources consulted (in order)
1. web_search "Quip Network quantum computing QUBO" → found vendor: Quip.Network by Postquant Labs; testnet w/ D-Wave Advantage2; tooling xquad/xqsa.
2. https://quip.network/ — homepage. Points at https://quip.gitbook.io/docs (old docs host, now 404) and developers docs.
3. https://quip.gitbook.io/docs , /docs/basics/quip-the-quantum-unit-interlock-pathway , /docs/nodes/run-a-node-testnet — all 404 (stale links from search index & homepage).
4. https://developers.quip.network/docs/compute/submit-a-job — KEY doc: install `xquad[quip]`/`xqsa[quip]`, `XQMX.binary_model`, `SolverDWaveCPU`, `SolverQuip(url=, keystore=, seed=)`, fixed-point milli coefficients, topology subgraph requirement, order lifecycle, quality floors.
5. https://developers.quip.network/docs/xquad-toolchain — package layout (xqvm_py, xqsa, xqffi...), backends table.
6. https://developers.quip.network/ (portal index) — testnet "aglais": EVM RPC https://evm-rpc.aglais.quip.network (chain 20033), explorer https://explorer.aglais.quip.network, faucet POST https://faucet.aglais.quip.network/request {"dest": addr}.
7. https://developers.quip.network/docs/llms.txt — full docs index.
8. https://developers.quip.network/docs/getting-started/quickstart.md , /docs/nodes/miners.md — background; miners solve Ising ground state (PoUW), Ocean/Qiskit stacks published.
9. Source code (read instead of docs, docs don't cover it):
   - xqsa/quip_networks.py — preset "aglais": rpc wss://bootnode-1.aglais.quip.network:20049/rpc, faucet https://faucet.aglais.quip.network; `SolverQuip.for_network("aglais")`.
   - xqsa/quip_faucet.py — drip = 10 AGLS, 1-drip ceiling, 429 retry.
   - xqsa/quip.py — SolverQuip signature: reward, topology, mode, resolution, deadline_blocks, faucet, autoconfirm, autofund; solve() = quote → gates → propose_job → await finality → decode best; query() recovers later; `_build_signer` (keystore/seed/env); `topology="native"` = submit over the model's own coupling graph.
   - xqsa/quip_codec.py — model_to_ising, find_placement (greedy backtracking, 200k step budget), Topology with allowed_h/allowed_j/allowed_spin.

## Commands that mattered
- `uv venv --python 3.13 .venv` (pip venv failed: disk almost full — 2.2 GiB free; uv is leaner)
- `UV_CACHE_DIR=$PWD/.uvcache uv pip install --python .venv/bin/python "xqsa[quip]"` → xqsa 0.4.1, xqvm-py 0.4.1, xqffi 0.4.1, quip-signer 0.3.0, substrate-interface 1.8.1
- `.venv/bin/python scheduling_qubo.py` → brute force ground state −843, 6 optimal assignments, loads (9,9,9)
- `.venv/bin/python solve_local.py` → SolverDWaveCPU: energy −843 (= ground state), assignment [1,2,0,0,2,1], loads [9,9,9], imbalance 0, 0.2 s
- `.venv/bin/python solve_network.py` → order_id 114 on aglais (see below)

## Errors & dead ends (honest)
- `pip install` into a plain venv: "No space left on device" (machine disk 100% full, 2.2 GiB free) → switched to uv with project-local cache.
- quip.gitbook.io docs URLs all 404 — the gitbook is stale; developers.quip.network is the live docs host. Search results still index gitbook.
- Submit-a-job doc says "Connection details for the public test network have not been published yet, so this page cannot include a node address" — WRONG/stale: the RPC endpoint is published on the portal page and shipped as a preset inside xqsa. Had to read package source to find `for_network("aglais")`.
- First `quote()` attempt: `PlacementError: placement search budget exhausted after 200000 steps` — my 18-variable model is nearly a complete graph (18-clique ≈ 153 edges); the default advantage2 topology (4577 nodes, 41515 edges) cannot host a clique that large, and the greedy placer burns its budget proving it.
  → Fix: `topology="native"` (found in SolverQuip docstring/source, not in the docs page). Native mode builds the topology from the model's own coupling graph; no placement search, mempool size bounds only.
- Registered topologies expose allowed_h = {0}, allowed_j = {±1000 milli} (zero-field, ±1 couplings). My coefficients violate this. BUT `_maybe_warn_allowed_values` says the chain accepts out-of-spec values (pallet does not enforce), SA miners solve as-is, hardware rescales monotonically → warning only, never blocks. With topology="native" not even a warning fired (native topology inherits the model's own values).
- `result.sample` is an XQMX sample object, not a dict — `dict(result.sample)` raises TypeError. Extract with `result.sample.iter_linear()` → [(var_index, 1), ...]. Undocumented; found by introspection.
- My first hand-rolled `energy_from_assignments` had a bug (quadratic term1 counted unconditionally); replaced by evaluating the built model directly (`qubo_energy(sample)` reading model.iter_linear/iter_quadratic). Brute force then confirmed 6 optima.
- `s._signer.ss58_address` doesn't exist (AttributeError caught); account_id is raw 32-byte bytes. SS58 address not easily printed — used faucet via solver's autofund instead of manual POST.

## Guesses / deviations from official instructions
- Docs' install line is `pip install "xquad[quip]"` (umbrella); I installed `xqsa[quip]` — the developer portal's own front page gives exactly `pip install "xqsa[quip]"`, and xqsa is the piece SolverQuip lives in. Both pull the same [quip] extras.
- Constraint penalty A=100 chosen by me (must exceed max objective cross-term 2·7·6=84). Verified by brute force that all 6 ground states are valid schedules.
- Used `topology="native"` rather than a registered hardware topology (docs emphasize the topology-subgraph route; native is the pragmatic path for dense models and is fully supported by the client).
- autoconfirm=True / autofund=True to run non-interactively.

## Network run log (2026-09-28, ~11:15 CEST)
- quote: reward 1.000000000000 AGLS, fee 0.001905750333 AGLS, total 1.001905750333 AGLS, balance 0 → autofund dripped 10 AGLS from faucet.
- solve() → order_id 114, 7 miner submissions, winning solver 5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD
- chain best_energy_milli −759000 (spin basis), model energy (binary basis) −837, energy_matches_chain: true
- decoded assignment [1,1,2,0,0,2] → loads [11,8,8], imbalance 6, all constraints satisfied (each job exactly one machine).
- NOTE: network result is FEASIBLE but not the global optimum (−843, imbalance 0). Local CPU solver found the optimum. Retry below with higher reward.
- Retry with reward=5 (rookie unit error: reward is planck, 5 < MinReward=10^12 → on-chain `ExtrinsicFailed`, module 9 error 0x0d = BelowMinReward). Fixed to 5_000_000_000_000.
- Retry order 115 (reward 5 AGLS, 12 submissions): still −837 / imbalance 6. Higher reward didn't change quality.
- Reweighted objective (imbalance ×15, same feasible set; brute-force optimum −4245 at loads (9,9,9)):
  **order 116 → network returned the ground state**: assignment [1,2,0,0,2,1], loads [9,9,9], imbalance 0,
  model energy −4245, chain best_energy_milli −3075000, energy_matches_chain True, 13 submissions.
  Verified again post-hoc via `solver.query(116, model)`.
- SDK v1 limitation: quality floors (min_energy_milli, min_solutions, min_diversity) are hardcoded `None`
  in `_propose_call_params` ("advisory and unset in v1"), so you cannot force an energy threshold from Python.

## Artifacts
- scheduling_qubo.py — QUBO construction, brute-force oracle, decoder
- solve_local.py — local SolverDWaveCPU run
- solve_network.py — network submission (order 114)
- solve_network2.py — retry with reward=5
- keys/testnet-throwaway.ks — throwaway testnet keystore (created fresh for this task)
- network_result.json / network_result2.json, network_run.log / network_run2.log
