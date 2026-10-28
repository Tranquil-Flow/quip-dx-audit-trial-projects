# DEVLOG — Quip Network QUBO → on-chain demo

Start: 2026-09-28 14:20 CEST. Machine: macOS arm64, node v22.22.2, python 3.14.4, foundry (forge/cast) preinstalled, uv, docker.

## Sources consulted (in order)
1. WebSearch: "Quip Network quantum compute API developer docs testnet"

## Log
- 14:21 `curl https://quip.gitbook.io/docs/nodes/run-a-node-testnet` (URL from press coverage) -> **404**. Old Gitbook URL is dead. Dead end #1.
- 14:22 Found `https://docs.quip.network` (200). `llms.txt` + `llms-full.txt` available (good!). Pages actually live at developers.quip.network/docs/*.md.
- Key doc facts (from llms-full.txt, "Submit your first compute job"):
  - Jobs are submitted with Python `pip install "xquad[quip]"` -> `xqsa.SolverQuip(url=<ws node>, keystore=...)`. Requires Python >= 3.13.
  - **Doc explicitly says: "Connection details for the public test network have not been published yet, so this page cannot include a node address."** -> no official RPC URL for compute jobs.
  - Problems must be Ising, fixed-point x1000, and must be a *subgraph* of a registered topology (no minor embedding). **Minimum nodes = 16** (Ising Topologies page). An 8-asset QUBO has 8 vars -> may be below minimum; will need padding.
  - Quickstart: "we are building out the smart contract layer" -> docs do not describe any smart-contract / EVM facility on the Quip testnet. Accounts/QuipSwap contracts are deployed on *other* chains (Ethereum, Base...).

## Sources (cont.)
2. https://quip.gitbook.io/docs/nodes/run-a-node-testnet (404)
3. https://docs.quip.network/llms.txt, https://docs.quip.network/llms-full.txt
- 14:26 Listed GitLab group `quip.network` via API (`https://gitlab.com/api/v4/groups/quip.network/projects`). Found repos: nodes.quip.network, faucet, chains, chainlist, explorer, xquad, quip-validator, polkadot-sdk mirror, quip-miner-*, quantum-portfolio-optimization...
- Shallow-cloned several into .scratch/ and grepped for URLs (**reading source instead of docs**, because the docs say testnet connection details are unpublished).
  - `chains/_data/chains/eip155-20033.json`: "Aglais Testnet (Quip Network)", chainId 20033, rpc `https://evm-rpc.testnet.quip.network:20049` -> **does not respond** (curl empty / timeout). explorer.testnet.quip.network also no response.
  - `https://evm-rpc.aglais.quip.network` (found in nodes.quip.network/faucet sources) -> **works**: eth_chainId 0x4e41 (=20033). `cast client` = `eth-rpc/HEAD-f17113f` -> this is the Polkadot SDK **pallet-revive** ETH-RPC sidecar. The Quip chain is Substrate, EVM compatibility via pallet-revive.
  - Faucet README (faucet repo): `POST /request {"dest": "0x<H160>"}`; H160 is mapped to native account `h160 ++ 0xEE*12`.
- 14:28 Generated throwaway EVM key: `cast wallet new --json > keys/evm-deployer.json` -> 0x6b89c5B5dbAFf4d0632946c63c344349b10a4aD7
- 14:29 `curl -X POST https://faucet.aglais.quip.network/request -d '{"dest":"0x6b89..."}'` -> 200, amount 10000000000000 plancks, extrinsic 0x6b59e8d5dd3264dd451b50852419675b3ba6cf6113fbdd262a4b6b17239c4207.
  - `cast balance` -> 9999000000000000000 wei (=~10 AGLS). Note unit mismatch: faucet says 1e13 plancks (12-decimal native) but ETH-RPC reports 1e19-ish wei (18 decimals) — pallet-revive scales native balance x1e6. Minor confusion, not a blocker. (Balance being 9.999 not 10 suggests some existential deposit/fee accounting.)
  - Gas price 1 gwei, block gasLimit reported as u64::MAX (pallet-revive quirk).
- 14:35 Found in xquad repo source (`xqsa/quip_networks.py`): preset `SolverQuip.for_network("aglais")` -> `wss://bootnode-1.aglais.quip.network:20049/rpc`, faucet `https://faucet.aglais.quip.network`. **This preset is not mentioned in the published docs** (docs say testnet connection details are unpublished). Contradiction between docs and SDK.
- 14:37 `uv venv -p 3.14 .venv && uv pip install "xquad[quip]==0.4.1"` -> OK in ~2s (quip-signer 0.3.0 installed without needing a Rust build on macOS arm64).
- 14:38 Generated throwaway Quip (Substrate, hybrid sr25519+FN-DSA) master seed -> keys/quip-signer-seed.hex. **Note: two separate identities are needed** — an EVM key for contracts (eth-rpc sidecar) and a hybrid-signed Substrate account for compute jobs. The SDK can't use the EVM key and cast can't use the hybrid key. Missing glue #1.
- 14:39 `SolverQuip.for_network("aglais", seed=...)` connects in ~22s. Chain: token AGLS (12 decimals), MinReward 1e12 planck (=1 AGLS), default topology 0xcbec1eb4... with 4577 nodes / 41514 edges (Advantage2-like Zephyr graph). Chain constants in QuantumComputeMempool: MaxNodes 5000, MaxEdges 50000, **no MinNodes constant** (docs claim minimum 16 nodes — unverified/contradictory).
- 14:42 Placement experiments with `xqsa.quip_codec.find_placement` against the default topology (read source to find this helper):
  K4 OK, **K5/K6/K8 FAIL**, K4,4 OK, K4,4 + one perfect matching inside each side (20 edges) OK; any 21+ edge variant tried FAILS.
  => A textbook 8-asset Markowitz QUBO with a cardinality constraint (fully connected K8, 28 couplings) **cannot be submitted to the QPU-backed default topology** (no minor embedding supported). Must reformulate to fit a subgraph. The alternative `topology="native"` is documented in source as excluding QPU miners — defeats the "quantum" purpose.

> Note on timestamps: entries above marked 14:2x–14:4x were estimated when written; the solver log timestamps show the real times ran earlier (the first job was submitted at 14:30:23). From here on, times come from `date` or the logs.

- 14:28 Wrote `quantum/portfolio.py`. It reformulates the problem to fit the hardware graph: 8 ETFs in 4 "sleeves" (SPY/QQQ, EFA/EEM, TLT/IEF, GLD/VNQ). Rule: pick exactly one per sleeve. Sleeve one-hot penalties sit on the matching edges. Covariances are exact on the K4,4 equity×defensive edges. **The US-eq×Intl-eq and Bonds×Real-asset covariance terms are dropped** because the hardware has no couplers for them. Brute force: the sparse optimum is SPY,EFA,TLT,GLD, but the full-covariance optimum is SPY,EFA,IEF,GLD, so topology sparsification changes the answer. Stated honestly in RESULT.md.
- 14:29 `python quantum/solve.py --local` (xqsa SolverDWaveCPU) -> SPY,EFA,TLT,GLD, which matches brute force.
- 14:30 First network submit **FAILED** before any funds were spent: `EncodingError: h[0] = -0.00325 is not representable at milli precision`. Cause: the SDK converts binary to spin (h = q_ii/2 + Σq_ij/4, J = q_ij/4), so QUBO coefficients rounded to 0.001 turn into non-milli spin coefficients. The docs only say "coefficients travel as thousandths". They don't warn that *binary* models must sit on a 0.004 grid. Fix: quantise the QUBO to multiples of 0.004.
- 14:30 `forge create ... --broadcast` to evm-rpc.aglais -> "Error: contract was not deployed". Re-running gave `error code 1013: Transaction Already Imported`, then `1014: Priority is too low: (2 vs 2)`. `cast nonce` stayed 0 for minutes. Raising the gas price does not help: pool priority appeared fixed at 2 whatever the fee, so the tx can't be replaced. A plain value transfer at nonce 0 was mined later (tx 0x2d29fc52628d9ce48b39328b362b8d69f319528d899ad9dac5fb534e8c191f6e). By then the forge tx had apparently dropped or been superseded.
- 14:33 Second job submit **succeeded**. SDK auto-funded the Substrate signer from the faucet (5EmB1EzT... / 0x7755abb7...). **order_id=145**, reward 1 AGLS, fee 0.0019 AGLS, solve() returned after 100 s with 3 submissions. Winner 5EXN4Yz... selected QQQ,EFA,IEF,GLD (feasible; 4th-best of 256 on the QUBO, energy -40.392 vs optimum -40.580). `energy_matches_chain: true`.
  - **Reading storage showed all 3 submitting miners have `solver_type: Gpu`.** With the default `mode="Open"`, no quantum hardware touched our job. `JobOrders[145].status` still read "Opened" after solve() returned.
- 14:37 `cast send --create` with nonce 1 and 10 gwei: the CLI timed out or produced non-JSON output, yet the tx *was* imported. Retrying with the same nonce hit "Already Imported" / "Priority too low" for about 5 min (14:41–14:45 loop). The one successful deployment on this chain (AGLS20 at 0xe50E4bc4..., tx 0xac573b12..., found through the Blockscout API `/api/v2/smart-contracts`) used maxFee 1 gwei, tip 1 wei and gasLimit ≈ estimate. I copied those fee params. **Dead end / time sink ~10 min.**
- 14:46 New throwaway key keys/evm-deployer2.json (0x51Af88B2FA682A9383FB1fc417fb96E3F21C1eCD), funded from the faucet. `cast send --create` (gas 770M, maxFee 1 gwei, tip 1 wei) -> "transaction was not confirmed within the timeout" (150 s). **But it was mined**: I rebuilt the tx hash offline with `cast mktx` + `cast keccak` and found the receipt: block 377003, status 1, contract **0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE**, tx 0xc58ce6173609e7afd05a83de3a93547d32ca7b96805986d84ecfbbd425668809. Inclusion took about 2–3 min. The earlier "stuck" tx from key 1 was also mined eventually (key 1 nonce -> 2, code at 0xFddA024589D2125C3261D1A6465303a7affA3f57, an unused duplicate). Conclusion: contract creation on this pallet-revive chain is **slow to be included** (minutes, while transfers take seconds), and forge/cast default timeouts make it look like failure.
  - Gas numbers are huge: deploy estimate 759,947,338 gas (≈0.76 AGLS at 1 gwei; mostly storage deposit expressed as gas). `record()` used 27.6M gas.
- 14:48 `scripts/record_result.py` -> record(145, ...) tx 0xdd310613ff47575ec10aee23e80628ee6ff6cf331cd42dc5e1713baa279cd6a9, block 377019, status 1 (web3.py 8, waited for the receipt).
- 14:50 `scripts/read_result.py --job 145 --verify` -> all 5 checks OK (hash, energy, feasibility, solver submitted to job, selection present in the solver's on-chain submission).
- 14:50 Inspected runtime metadata (V14 via the SDK shim; read from source). `JobMode` = `Open | Bid{miners: Option<Accounts>, miner_types: Option<MinerTypes>}`. `MinerType` = Cpu, Gpu, QpuDwave, QpuIbm, QpuIonq, QpuPasqal, Asic, ... The SDK says "Data-carrying variants (Bid / TopN* / Callback*) are out of v1", so **you cannot request quantum hardware through the documented SDK surface**. The docs say "you can instead restrict a job to named miners or to particular hardware types" but give no API for it.
  - `Solvers` storage: 436 Cpu, 91 Gpu, **2 QpuDwave** (one has 0 solutions; one, 5DUkH4FL..., has submitted 2 solutions ever).
- 14:53 Passed `mode={"Bid": {"miners": None, "miner_types": (["QpuDwave"],)}}` straight through `SolverQuip(mode=...)` (undocumented; the `(list,)` 1-tuple wrapping for BoundedVec was copied from `_wrap_bounded` in the SDK source). The chain accepted it: **order_id=147**, on-chain mode `{'Bid': {'miners': None, 'miner_types': ['QpuDwave']}}`, deadline 200 blocks.
- 14:57 Order 147 got 1 submission at block ~377087 (about 3 min after proposal), from **5DUkH4FL... with solver_type QpuDwave**. solve() returned after 234 s: SPY,EFA,TLT,VNQ (feasible; 9th-best of 256; energy -38.84 vs optimum -40.58). `energy_matches_chain: true`.
  - Caveat: `solver_type` is what the miner declared at registration. I found nothing on-chain that proves the answer came from a QPU (unlike QVRF, the optimisation path has no quantum-certification step that I could find).
- 14:57 `record_result.py out/quip_qpu_result.json` -> tx 0x7dc150d518058a4bb3156803bdb81695fc20b4c10fc9f82856b6ddf34fca8bc1, block 377096, status 1.
- 14:58 `read_result.py --verify` (all records) -> every check OK for jobs 145 and 147. Output saved in out/read_result_verify.txt. Blockscout API shows the contract and txs indexed.
- Did NOT verify the contract source on Blockscout. That would publish to a public service, which the task rules ask me to avoid.

## Where Quip's products didn't fit together (summary)
1. **Two chains/identities in one network**: compute jobs live on the Substrate side (hybrid sr25519+FN-DSA-512 signatures, SS58 accounts, 12-decimal planck), while smart contracts live on the pallet-revive EVM side (secp256k1 keys, H160, 18-decimal wei through the eth-rpc sidecar). No EVM precompile or contract API lets a contract read `QuantumComputeMempool` state, so the contract can't verify a job id itself. An off-chain relayer (my script) has to copy the result across, and anyone checking has to query both RPCs. `read_result.py` does exactly that.
2. **Docs vs SDK vs chain registry disagree on endpoints**: docs say "testnet connection details have not been published". The SDK hard-codes `wss://bootnode-1.aglais.quip.network:20049/rpc`. The `chains` registry (eip155-20033.json) lists `https://evm-rpc.testnet.quip.network:20049`, which is dead. The working EVM RPC `https://evm-rpc.aglais.quip.network` is only discoverable from repo source (faucet/explorer repos).
3. **Docs promise hardware-type restriction; SDK blocks it**: "you can instead restrict a job to ... particular hardware types" (docs), but xqsa v0.4.1 says Bid mode is "out of v1". It worked only by passing a raw SCALE enum dict through `mode=`.
4. **"Quantum compute" by default isn't quantum**: with the documented defaults, GPU miners answered (3/3). Only 2 of 529 registered solvers are QpuDwave.
5. **Topology vs typical QUBOs**: no minor embedding and a K4 max clique, so a standard dense portfolio QUBO can't be submitted to the QPU topology. Docs mention the subgraph rule but give no guidance on reformulating dense problems or on the max clique.
6. **Docs "minimum nodes 16"**: not enforced; an 8-node job was accepted.
7. **Binary→spin milli precision**: undocumented 0.004 grid requirement for binary models.
8. **pallet-revive deploy UX**: contract creation takes minutes to be included, and forge/cast time out and report failure even though the tx lands later. Pool priority is fixed, so stuck txs can't be replaced by raising the gas price. No docs for deploying contracts to Aglais at all.

## All sources consulted, in order
1. WebSearch "Quip Network quantum compute API developer docs testnet" (press articles: thequantuminsider.com, prnewswire, quantumcomputingreport; pointed at quip.gitbook.io)
2. https://quip.gitbook.io/docs (WebFetch 404), https://quip.gitbook.io/docs/nodes/run-a-node-testnet (404), https://quip.gitbook.io/ (404)
3. https://quip.network (200), https://docs.quip.network (200)
4. https://docs.quip.network/llms.txt, https://docs.quip.network/llms-full.txt (main documentation source; pages mirror developers.quip.network/docs/*.md)
5. https://gitlab.com/api/v4/projects/quip.network%2F{quip-protocol,nodes.quip.network,quip-node-manager} and https://gitlab.com/api/v4/groups/quip.network/projects
6. git clone --depth 1 https://gitlab.com/quip.network/{nodes.quip.network,chains,chainlist,faucet,explorer.quip.network,xquad,quip-validator,quantum-portfolio-optimization}.git (grepped for endpoints; read faucet/README.md, explorer.quip.network/README.md, xquad/xqsa/quip.py, quip_networks.py, quip_codec.py)
7. RPC probes: https://evm-rpc.aglais.quip.network (works), https://evm-rpc.testnet.quip.network[:20049] (dead), https://faucet.aglais.quip.network/{request,health}, https://explorer.aglais.quip.network, https://explorer.testnet.quip.network (dead)
8. https://pypi.org/pypi/{xquad,xqsa,quip-signer}/json
9. wss://bootnode-1.aglais.quip.network:20049/rpc (Substrate RPC via the xqsa SDK)
10. https://explorer.aglais.quip.network/api/v2/{smart-contracts,stats,addresses/...,transactions/...} (Blockscout API, used to find a known-good deploy tx)
(I skimmed the cloned quantum-portfolio-optimization repo but didn't use it.)
