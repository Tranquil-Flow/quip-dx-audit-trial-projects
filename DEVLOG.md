# DEVLOG

Started: 2026-09-28

Scope constraints observed:
- Work only in this project directory and on the public internet.
- Any testnet keys will be newly created under `./keys`; no existing wallets will be used.
- No mainnet, real money, public posts, or interference with unrelated Docker resources.

## Chronological log

1. Began public-web research for Quip Network compute documentation, QUBO/Ising tooling, SDK, and testnet submission workflow.
   - https://developers.quip.network/docs/compute/submit-a-job
   - https://developers.quip.network/docs/getting-started/quickstart
   - https://quip.network/
   - https://quip.network/blog/testnet-is-live
   - https://github.com/QuipNetwork
   - https://github.com/QuipNetwork/quip-miner
   - https://github.com/QuipNetwork/ethereum-sdk
   - https://developers.quip.network/docs/nodes/miners
   - https://developers.quip.network/docs/nodes/run-a-node-testnet
2. The official compute guide says to install `xquad[quip]` (Python >=3.13), use `SolverDWaveCPU` locally and `SolverQuip` remotely. It also explicitly says public testnet connection details have not been published, which may block a real public submission. The guide requires a funded account and a registered mineable topology.
3. Initial command: `pwd && /bin/ls -la` confirmed the requested project was empty except for this newly created log. (Used `/bin/ls` only for this initial directory check.)
4. Consulted newer upstream toolchain material:
   - https://github.com/QuipNetwork/xquad
   - https://developers.quip.network/docs/xquad-toolchain
   - https://aglais.quip.network
   - https://faucet.aglais.quip.network (base URL itself returns 404; documented API is `/request`)
   - Upstream files `xqsa/README.md`, `xqsa/quip.py`, `xqsa/quip_networks.py`, `docs/book/src/solving/quip-network.md`, and `docs/book/src/solving/quip-first-job.md` from commit `5239d71bfbd025a91f06d872ad7e98da4b5e4556`.
5. Discovery correction/deviation: the developer-portal compute page is stale where it says public connection details are unpublished. The current Aglais site and unreleased/upstream XQuad docs publish the testnet: `wss://bootnode-{1-3}.aglais.quip.network:20049/rpc`, faucet `https://faucet.aglais.quip.network`, free valueless AGLS only. The newer docs report an end-to-end job on 2026-09-24.
6. Commands/environment:
   - `python3 --version; command -v python3; uname -m; git --version; curl ...` found system Python 3.9.6 on arm64. The curl failed with `No space left on device` while writing `/tmp`; disk had only 373 MiB available. This is an environmental risk/workaround point.
   - `df -h .; command -v uv; command -v brew; command -v rustc; git clone --depth 1 https://github.com/QuipNetwork/xquad.git vendor-xquad` found uv, Homebrew, and Rust, then cloned upstream source locally for docs/source inspection.
   - `du -sh . vendor-xquad; git -C vendor-xquad rev-parse HEAD; git -C vendor-xquad log -1 ...` showed a 9.4 MiB checkout at commit `5239d71...` dated 2026-09-25.
   - `uv venv --python 3.13 .venv` created a Python 3.13.14 environment.
   - `UV_CACHE_DIR=.uv-cache uv pip install 'xquad[quip]'` succeeded, installing published XQuad/XQSA 0.4.1 and building `xqffi` and `quip-signer` 0.3.0 from source on macOS. A preceding direct metadata request to https://pypi.org/pypi/xquad/json was the curl that failed for lack of temporary disk space.
7. Important version mismatch investigated: public PyPI installed 0.4.1, while the cloned repository identifies the next workspace version as 0.4.2.dev0. Runtime inspection showed the released 0.4.1 already includes `SolverQuip.for_network`, the `aglais` preset, H4-compatible `quip-signer==0.3.0`, and the same public coordinates, so no unreleased source code was imported or installed.
8. Formulation/build:
   - Created `FORMULATION.md`, `schedule_qubo.py`, `.gitignore`, then later `README.md`, `pyproject.toml`, and `test_schedule_qubo.py`.
   - Chose binary variables `x[i,m]`, target load 9, and objective `sum_m(load_m-9)^2 + 100 sum_i(sum_m x[i,m]-1)^2`. Penalty 100 is not guessed as a heuristic threshold: because every term is nonnegative and a feasible zero-objective assignment exists, any positive penalty makes every global optimum both feasible and balanced.
   - Used native topology for the network because the official first-job tutorial says this bypasses placement failure for arbitrary model graphs and is supported by Aglais simulated-annealing miners.
9. Local run command: `.venv/bin/python schedule_qubo.py local --output local_result.json | tee local_run.log`.
   - Result: valid assignment, loads `[9,9,9]`, XQMX energy `-843`, recovered objective `0`, runtime about 0.603 s. Exact enumeration found six machine-labelled optima.
10. Network submission command: `set -o pipefail; .venv/bin/python schedule_qubo.py network --output network_result.json --keystore keys/aglais-scheduling.json 2>&1 | tee network_run.log` (run as a managed background process, then polled/waited).
   - This generated a brand-new throwaway keystore only at `./keys/aglais-scheduling.json` (mode 0600).
   - Exact quote: reward 1 AGLS, fee 0.001905750333 AGLS, total 1.001905750333 AGLS. Faucet funded the fresh AccountId with 10 valueless testnet AGLS.
   - Submitted `QuantumComputeMempool.propose_job`; order/job id **111**, inclusion block hash `0x11c81f6eb952b3a5e3680bdfbe14694e44515837e703cf51bf8087dffc2bb25f`.
   - Result after 77.266 s: loads `[9,9,9]`, QUBO energy `-843`, recovered objective 0, 19 miner submissions, winner `5DPhy7jpFj3ikUZgVpwkrXnjFLYXqsWWPNUCrEvmzq2AEwFJ`, chain energy `-765000` milli, `energy_matches_chain=true`.
11. Independent recovery/verification command: `.venv/bin/python schedule_qubo.py query 111 --output network_query_result.json --keystore keys/aglais-scheduling.json`, followed by JSON assertions and SHA-256 checksums. The later query independently returned the same job id, valid perfect balance, energy, and chain-energy canary. Keystore fields were inspected without printing secret material; mode was confirmed as 0600.
12. Error/dead end: the first combined query/assertion command was rejected before execution by the terminal safety parser because Python's bitwise `& 0o777` was mistaken for shell backgrounding. Replaced that expression with `stat.S_IMODE(...)`; the revised command succeeded.
13. Verification command: `.venv/bin/python -m unittest -v test_schedule_qubo.py && .venv/bin/python -m py_compile schedule_qubo.py test_schedule_qubo.py`.
   - Both tests passed in 11.847 s. The main test exhaustively checked all 262,144 binary vectors against the unexpanded objective; byte-compilation passed.
14. Transaction-evidence workaround/source inspection: XQSA result metadata omits the submission extrinsic hash, and `xqsa/quip.py` showed it only returns `order_id` after reading `JobProposed`. I used the solver's chain client to decode the recorded inclusion block and identify extrinsic index 6.
   - Block number 374812, call `QuantumComputeMempool.propose_job`, submitter `5G5NsthyBhwv2Ks4vgWDAmnE7aM2C8aZWWZsYH2UYjzGDoDf`, extrinsic hash `0x3b73ed6b8757a5f270a844e5fabcc9eac190b0fe2e90d814583ad5ae2bae886b`.
   - Wrote non-secret evidence to `network_chain_evidence.json`.
15. Final artifacts and checksums were documented in `RESULT.md`. No mainnet, real money, pre-existing wallet/key, public post, or Docker operation was used.
16. Final validation command reparsed all four evidence/result JSON files and asserted order 111, loads `[9,9,9]`, objective 0, and `energy_matches_chain=true`; it printed `FINAL VALIDATION OK`. A scan of the run/query logs found no seed/private-key/secret strings.

