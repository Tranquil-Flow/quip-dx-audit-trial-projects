# RESULT: Quip Network QUBO → on-chain record demo

**Overall: WORKING, with caveats.** An 8-asset portfolio QUBO was solved by Quip Network miners on the public **Aglais testnet**. One run went to any miner; one was limited to D-Wave-QPU miners. Both chosen solutions and their Quip job ids are stored in a Solidity contract on Aglais's EVM layer, and a read-only script reads them back and cross-checks them against the Quip compute chain.

Caveats (details under "What did not work"):
- (a) The textbook dense 8-asset QUBO cannot run on Quip's QPU topology, so the problem was reformulated to fit the hardware graph.
- (b) With the documented defaults, **GPU miners** solve the job, not quantum hardware. Getting a QPU miner required an undocumented, SDK-unsupported `Bid` mode.
- (c) Neither miner returned the true optimum. Both answers are feasible but not the best (4th and 9th-best of 256).
- (d) The contract can't verify Quip jobs itself. It stores what a relayer reports; `read_result.py` does the verification against both chains.

| Component | Status | Notes |
|---|---|---|
| QUBO model (`quantum/portfolio.py`) | WORKING (reformulated) | 4 sleeves × 2 ETFs, one-per-sleeve. Shaped to K4,4 + matchings because the hardware max clique is K4. Two covariance blocks are dropped. |
| Local solve (`solve.py --local`) | WORKING | Matches the brute-force optimum. |
| Quip compute job, open mode (`solve.py`) | WORKING | Job **145**, 3 GPU submissions, 100 s. |
| Quip compute job, QPU-only (`solve.py --qpu`) | WORKING (undocumented path) | Job **147**, `Bid{miner_types:[QpuDwave]}`, answered by a QpuDwave-registered miner in 234 s. |
| Contract `QuipResultRegistry` on Aglais EVM | WORKING | Deployed and recording. Deploy UX was painful (see below). |
| Record script (`scripts/record_result.py`) | WORKING | 2 records written. |
| Read-back + verify (`scripts/read_result.py`) | WORKING | Reads the contract, then re-checks hash, energy, feasibility and the job's on-chain submissions on the Quip Substrate chain. |

## Evidence

**Network:** Quip Aglais testnet
- EVM chainId 20033
- EVM RPC `https://evm-rpc.aglais.quip.network` (explorer: `https://explorer.aglais.quip.network`)
- Substrate RPC `wss://bootnode-1.aglais.quip.network:20049/rpc`

**Contract**
- `QuipResultRegistry` at **`0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE`**
- Deploy tx `0xc58ce6173609e7afd05a83de3a93547d32ca7b96805986d84ecfbbd425668809` (block 377003)
- Deployer `0x51Af88B2FA682A9383FB1fc417fb96E3F21C1eCD` (throwaway, `keys/evm-deployer2.json`)
- (There is an unused duplicate deployment at `0xFddA024589D2125C3261D1A6465303a7affA3f57` from key 1. The CLI reported failure but the tx landed later.)

**QUBO problem hash (sha256 of canonical JSON):** `0x5071dd32f54862d7c00fb9207b910282b9668fc743f985e6f46712628a240d7e`

**Job 145 (open mode, any miner)**
- Proposer (Quip account) 5EmB1EzTZ6enmSh6aZ8ap7piDCu11uEE9VtJXAiRq5ux3CTk
- Placed on topology `0xcbec1eb4…70e7`, hardware nodes [96,108,120,132,2496,2508,2520,2532]
- 3 submissions, all `solver_type: Gpu`. Winner 5EXN4YzJoqb7GnMTdMDmDo7wYpMz5HtQwcAvy1LmJVHTB943, Ising energy −21052 milli, `energy_matches_chain: true`
- Chosen: **QQQ, EFA, IEF, GLD** (bitmask 102), QUBO energy −40.392 (optimum −40.580)
- Recorded: tx `0xdd310613ff47575ec10aee23e80628ee6ff6cf331cd42dc5e1713baa279cd6a9` (block 377019)

**Job 147 (QPU-restricted)**
- Mode on-chain: `{'Bid': {'miners': None, 'miner_types': ['QpuDwave']}}`
- 1 submission, from 5DUkH4FL1jgbuibM72bBQ4rq82RBNhdFPAj21fcksXX8CtVv, `solver_type: QpuDwave`, Ising energy −19500 milli
- Chosen: **SPY, EFA, TLT, VNQ** (bitmask 149), QUBO energy −38.840
- Recorded: tx `0x7dc150d518058a4bb3156803bdb81695fc20b4c10fc9f82856b6ddf34fca8bc1` (block 377096)

**Brute-force optimum of the submitted QUBO:** SPY, EFA, TLT, GLD (−40.580).

**Read-back output:** `out/read_result_verify.txt` (every check `[OK]`, exit code 0). Raw solver outputs are in `out/quip_result.json` and `out/quip_qpu_result.json`, and logs in `out/*.log`.

## How to run

Prereqs: Python ≥3.13, `uv`, Foundry, `jq`. The `.venv` is already built here. To rebuild it:
```sh
uv venv -p 3.14 .venv
uv pip install -p .venv "xquad[quip]==0.4.1" numpy "web3>=7"
```

Read what's stored (read-only, needs no keys):
```sh
.venv/bin/python scripts/read_result.py                # list all records
.venv/bin/python scripts/read_result.py --job 147 --verify
# or with nothing but foundry:
cast call 0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE 'count()(uint256)' --rpc-url https://evm-rpc.aglais.quip.network
```

Full pipeline (spends testnet AGLS only; keys live in `./keys`):
```sh
./run_demo.sh --qpu     # solve on D-Wave-typed miners -> record -> read back + verify
./run_demo.sh --open    # any miner (in practice GPU)
./run_demo.sh --local   # local CPU simulated annealing only
```

The pieces can also be run on their own:
- `quantum/solve.py [--qpu|--local] [--quote]`
- `scripts/record_result.py <result.json>`
- `scripts/read_result.py`

To redeploy the contract:
```sh
cd contracts && forge build
cast send --rpc-url https://evm-rpc.aglais.quip.network --private-key <key> \
  --gas-limit 770000000 --gas-price 1000000000 --priority-gas-price 1 \
  --create $(jq -r .bytecode.object out/QuipResultRegistry.sol/QuipResultRegistry.json)
```
Expect "not confirmed within the timeout". Find the tx by hash; it is usually mined after 2–3 min. Then update `deployments.json`.

Funding: `curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"0x<H160>"}'` gives 10 AGLS. The compute-job signer is auto-funded by the SDK (`autofund=True`).

## What did not work / caveats and why

1. **The dense Markowitz QUBO doesn't fit the QPU topology.** Quip does subgraph placement only, with no minor embedding. Its default topology is an Advantage2-style graph (4577 nodes) on which the SDK placement search finds K4 but fails (budget exhausted) for K5, K6 and K8 — consistent with Zephyr-style graphs having max clique 4. The densest 8-node shape I found that places is K4,4 plus a perfect matching on each side (20 of 28 pairs).
   - I reformulated: one-hot sleeves on the matching edges; covariance on the equity×defensive edges.
   - The US-eq×Intl-eq and Bonds×Real-asset covariance terms are **dropped**. That changes the optimum: the full-covariance optimum is SPY, EFA, **IEF**, GLD, versus **TLT** for the sparse model.
   - `topology="native"` avoids this, but per the SDK source it excludes QPU miners.
2. **Default jobs don't use quantum hardware.** Open-mode job 145 was answered only by GPU miners. The docs claim you can restrict to hardware types, but xqsa 0.4.1 says `Bid` is "out of v1". I passed the raw SCALE enum through `SolverQuip(mode=…)`, copying the 1-tuple BoundedVec wrapping from SDK internals. It works but is unsupported.
   - Only 2 of 529 registered solvers are `QpuDwave`, and just one of them is active.
   - `solver_type` is self-declared at registration. I found no on-chain evidence that the answer really came from a QPU.
3. **Solution quality.** Both network answers are feasible but not optimal: rank 4/256 (GPU) and 9/256 (QPU). Quality floors (`min_energy_milli` etc.) exist on-chain, but the SDK always sends None, and I didn't try raw-setting them.
4. **The contract trusts the relayer.** The EVM side (pallet-revive) has no way to read `QuantumComputeMempool` storage or events, so the contract can't check that job 145/147 exists or matches. "Anyone can check" works in two steps: read the record from the EVM, then re-verify against the Substrate chain with `read_result.py --verify`.
   - The verifier assumes the placement maps variables to hardware nodes in ascending order. That holds for this model and the solver's energy canary confirms it, but it isn't a general guarantee.
5. **Deployment friction.** `forge create` said "contract was not deployed" and `cast send` timed out, yet both txs were mined minutes later. Resends failed with `1013 Already Imported` / `1014 Priority is too low (2 vs 2)`, and raising the gas price doesn't replace a pending tx. About 15 min were lost here, plus a second key.
6. First job submit failed: binary→spin conversion produced non-milli coefficients. Fixed by quantising the QUBO to a 0.004 grid.
7. `JobOrders[...].status` stays `Opened` after the SDK considers the job final (it decides by block height). This is confusing for anyone reading the chain directly.

## What would have made this easier (vendor docs/tools)
- **Publish the testnet endpoints** (Substrate WS, EVM RPC, faucet, explorer, chainId) on one docs page. Fix the dead `evm-rpc.testnet.quip.network:20049` in the `chains` registry entry. Mention `SolverQuip.for_network("aglais")` in the docs, since the SDK already has it.
- **A "deploy a contract on Aglais" guide**: that it's pallet-revive with EVM bytecode, the expected gas magnitudes, fee params that work, slow creation inclusion, and the non-replaceable pool priority.
- **First-class hardware selection** in xqsa (`miner_types=["QpuDwave"]`), and a public view of which miner types are online. The docs' "quantum compute" framing implies QPU by default.
- **Topology guidance for dense QUBOs**: publish the max clique and good 8/16/32-node patterns, or offer minor embedding. A portfolio example that actually fits would help (the docs list portfolio optimization as in-scope).
- **A bridge between the two layers**: an EVM precompile, or an oracle/callback (`ResultDelivery::Callback` exists on-chain) that delivers job results to a contract. That would let contracts verify job ids trustlessly instead of relying on a relayer.
- Document the binary-model 0.004 coefficient grid. Fix or remove the "minimum 16 nodes" claim (not enforced). Explain the 12-decimal planck vs 18-decimal EVM balance scaling.
- Expose quality floors (`min_energy_milli`, `min_solutions`) and `TopN` resolution in the SDK.
