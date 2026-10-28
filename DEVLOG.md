# Development log

All times UTC. This project started in an empty directory. I did not inspect any other local directories and did not use any pre-existing wallet or key.

## 2026-09-28

### Sources consulted, in order

1. https://quip.network/ — product overview; says compute marketplace is “coming soon,” while the testnet and node participation are live.
2. https://developers.quip.network/docs/getting-started/quickstart — official quickstart; initially says there is little to do besides mine and that the smart-contract layer is being built, but later links to compute submission docs.
3. https://quip.network/blog/testnet-is-live — official testnet announcement and two-layer architecture.
4. https://github.com/QuipNetwork/xquad — official XQuad repository and advertised `SolverQuip` backend.
5. https://github.com/QuipNetwork/nodes.quip.network — official node deployment repository; Aglais testnet details, Substrate validator, faucet and RPC topology.
6. https://developers.quip.network/docs/compute/submit-a-job — official compute submission guide. Critical limitation: it explicitly says public-testnet connection details have not been published, so its example leaves RPC URL and keystore blank.
7. https://developers.quip.network/docs/getting-started/quip-sdk — official SDK/package matrix.
8. https://developers.quip.network/docs/getting-started/what-is-quip — official explanation that compute and asset/smart-contract layers are orthogonal; asset contracts live on existing chains.
9. https://developers.quip.network/docs/quip-interlock-protocol/how-quip-fits-together — official explanation that Quip account/swap contracts deploy on supported existing chains, not necessarily the compute chain.
10. https://developers.quip.network/docs/nodes/miners — official miner and hardware overview.
11. https://raw.githubusercontent.com/QuipNetwork/xquad/main/xqsa/README.md — solver adapters and `SolverQuip` package details.
12. https://raw.githubusercontent.com/QuipNetwork/xquad/main/docs/book/src/solvers/quip.md — attempted source; returned 404 (wrong path).
13. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/chain-specs/aglais-network.json — Aglais chain spec (very large); confirms Substrate chain, SS58 42, 12 decimals, AGLS symbol.
14. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/config/quip-miner.toml — miner config, Aglais faucet, hybrid signer, and D-Wave backend details.
15. https://raw.githubusercontent.com/QuipNetwork/nodes.quip.network/main/docker-compose.yml — validator image/config and example public WSS endpoint.

Searches for Quip smart-contract deployment/pallet-contracts and job APIs produced no useful results or transient DuckDuckGo errors; those dead ends are retained here.

### Material commands

```text
pwd && git status --short --branch 2>/dev/null || true
# /private/tmp/devtrials4/m3-gpt-5.6-sol (empty, not yet a repository)

date -u '+%Y-%m-%dT%H:%M:%SZ'; git --version; python3 --version; node --version; rustc --version; docker --version
# 2026-09-28T12:23:19Z
# git 2.50.1; system Python 3.9.6; Node 22.22.2; Rust 1.95.0; Docker 29.1.3
```

### Early compatibility finding / unresolved question

The requested two products initially appeared not to be one deployable smart-contract platform. The compute testnet is a custom Substrate chain and the asset-layer docs emphasize contracts on existing chains. Inspection resolved part of this: Aglais exposes `pallet-revive` through a separate EVM JSON-RPC and explicitly supports Solidity tooling. The products do fit on one underlying chain, but through two front doors, two account formats, and two token precisions. The official compute guide page was stale/contradictory when it said public RPC details were unpublished; newer XQuad source and the Aglais page publish them.

### Additional sources consulted

16. https://api.github.com/orgs/QuipNetwork/repos?per_page=100 — enumerated official public repositories; revealed `quip-validator`, `quantum-portfolio-optimization`, and `faucet`.
17. https://github.com/QuipNetwork/quip-validator — runtime source; confirms `pallet-revive`, EIP-155 chain ID 20033, and EVM support.
18. https://github.com/QuipNetwork/quantum-portfolio-optimization — vendor portfolio example; it is primarily a data/optimizer CLI and not direct glue to `SolverQuip`.
19. https://github.com/QuipNetwork/faucet — faucet source.
20. https://aglais.quip.network — authoritative current testnet page: Substrate RPCs, EVM RPC, chain ID 20033, faucet syntax, and the warning that the two interfaces use different account formats/precisions.
21. https://github.com/polkadot-api/revive-deploy-solidity — found through web search as a pallet-revive Solidity deployment example.
22. https://github.com/paritytech/revive — found through web search; upstream `resolc` compiler.
23. Local source `vendor/xquad/docs/book/src/solving/quip-first-job.md` — newer official walkthrough, verified against Aglais on 2026-09-24; includes current endpoint, faucet workflow, observed order IDs, and caveats.
24. Local source `vendor/xquad/docs/book/src/solving/quip-network.md` — detailed `SolverQuip` lifecycle and important limitation: the result identifies the winning miner account but does not attest which hardware that miner used.
25. Local source `vendor/xquad/xqsa/quip_networks.py` — current `aglais` preset (`wss://bootnode-1.aglais.quip.network:20049/rpc`).
26. Local source `vendor/quip-validator/runtime/src/configs/mod.rs` — `pallet_revive::Config`, EVM bytecode allowed, 12-to-18 decimal conversion.

### Additional material commands and observations

```text
git clone --depth 1 https://github.com/QuipNetwork/xquad.git vendor/xquad
# commit 5239d71bfbd025a91f06d872ad7e98da4b5e4556

git clone --depth 1 https://github.com/QuipNetwork/nodes.quip.network.git vendor/nodes-quipment
# commit 14d99799832caf68747bd7f2beff4dad2d00f93e

git clone --depth 1 https://github.com/QuipNetwork/quip-validator.git vendor/quip-validator
# commit c236a6866951ea29a91c281188883daed928bc7b

git clone --depth 1 https://github.com/QuipNetwork/quantum-portfolio-optimization.git vendor/quantum-portfolio-optimization
# commit c0715dba852ffc455464e9074c2741734b8a1669

git clone --depth 1 https://github.com/QuipNetwork/faucet.git vendor/faucet
# commit 2d4e9d0bb3aef4154ef8a89a7a6495ff0c441483

curl JSON-RPC to https://bootnode-{1-3}.aglais.quip.network/rpc
# all reset the connection; this omitted the required :20049 port.

curl JSON-RPC to https://bootnode-{1-3}.aglais.quip.network:20049/rpc
# bootnodes 1 and 3 returned “AGLS (Quip Testnet)”; bootnode 2 returned “Too many connections”.

curl https://faucet.aglais.quip.network/
# 404, because the actual endpoint is POST /request.
```

### Product-fit conclusion

The compute job and Solidity result registry can be placed on Aglais, but not through one SDK or account. XQuad submits a hybrid-signed Substrate extrinsic through WSS; the contract transaction is an Ethereum transaction through the revive HTTP RPC. Glue must preserve the compute `order_id` and bridge the result manually into a second transaction. Also, Quip is a heterogeneous CPU/GPU/QPU marketplace: a submitted job uses the quantum-capable network, but the returned metadata does not prove the winning miner was a QPU. I will state that limitation rather than claim hardware provenance the chain does not provide.

### Build and execution commands

```text
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]' pytest
# Installed xquad/xqsa/xqvm-py 0.4.1, quip-signer 0.3.0, and dependencies.

forge --version; cast --version; resolc --version
# Foundry 1.5.1 stable; resolc 1.4.0.

cast wallet new --json > keys/evm-wallet.json
chmod 600 keys/evm-wallet.json
# Created a brand-new throwaway EVM key, address 0x90bc4324c0772887F9c04D75a28cccc41Df739d8.
# I used shell redirection so the private key never appeared in command output.

npm install
# Installed ethers; zero reported vulnerabilities.

.venv/bin/pytest -q
# First attempt accidentally collected tests under research-only vendor clones and also could not import this project's scripts. It failed with 41 collection errors. Added pyproject.toml with testpaths=["test"] and pythonpath=["."].

npm run compile
# First attempt failed because resolc 1.4.0 does not accept --overwrite.
# Second attempt failed because resolc emits .polkavm, not .bin.
# Inspection then showed .polkavm is raw binary, not hex text; fixed the compiler script to hex-encode bytes.

.venv/bin/pytest -q
# After fixes: 2 passed.

.venv/bin/python scripts/portfolio_job.py --local --output artifacts/local-result.json
# Local smoke test selected BRAV+GAMA, the brute-force optimum; QUBO energy -37.

.venv/bin/python scripts/portfolio_job.py --network aglais
# The tool refused a requested 1200-second foreground timeout; reran as a managed background process.
# XQuad created keys/quip-keystore.json (brand-new hybrid signer), quoted 1.001899026564 AGLS total, auto-funded from the public faucet, and submitted the job.
# It warned that 20 coefficients are outside the topology's advertised allowed-value set but explicitly said Quip accepts/solves and hardware rescales monotonically.
# The job completed, but my first script version incorrectly required the heuristic winner to equal the brute-force optimum. It raised after receiving a valid feasible selection. This happened after submission, so the chain job remained valid.

# Queried QuantumComputeMempool.NextOrderId and recent JobOrders through the XQuad interface.
# NextOrderId was 146. Matching proposer SS58 5EAj...G2DK identified this run as order 144; concurrent order 145 belonged to another account.

.venv/bin/python scripts/portfolio_job.py --network aglais --query-id 145
# Dead end: queried the concurrent order before checking its proposer; its model differed and decoded as infeasible against this model.

.venv/bin/python scripts/portfolio_job.py --network aglais --query-id 144
# Recovered the actual result and wrote artifacts/compute-result.json.
# Chosen DRAY+ECHO, mask 24, energy -30, valid one-per-sector, objective 10; brute-force optimum is 3 (gap 7).
# Metadata: winner 5Dn1...rAsW, 4 submissions, chain energy match true.

curl -X POST https://faucet.aglais.quip.network/request ...
# Funded only the new throwaway EVM address. Faucet extrinsic: 0x515e249c346a109a8aec6b44afc173e1062d2c5580f535a6772b3882ade31f72.

npm run compile && npm run deploy
# First deployment attempt incorrectly passed raw .polkavm bytes to ethers ContractFactory as if they were EVM CREATE initcode.
# It returned hash 0x7aafd41e...462e8d97 but never entered the chain: receipt and transaction remained null and nonce stayed zero. The 300-second wait timed out. This is not claimed as a transaction.

cast receipt ...0x7aafd41e...
# Timed out; direct eth_getTransactionReceipt and eth_getTransactionByHash both returned null.

git clone --depth 1 https://github.com/polkadot-api/revive-deploy-solidity.git vendor/revive-deploy-solidity
# commit d42323e4d8a9f3028caa78a84c809dd09aa7a9df
# Source showed the native PVM route requires separate code upload + instantiate_with_code, not a raw Ethereum CREATE payload.

forge build
# Built standard EVM bytecode. Quip runtime source explicitly has AllowEVMBytecode=true, so the deployment script now preserves the resolc artifact but deploys the EVM artifact via the advertised Ethereum RPC.

npm run compile && npm run deploy
# SUCCESS: tx 0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc
# Contract 0x86846DC4136DB93d067b6fF6F78D8882FfF7589a, block 377010.

npm run read
# SUCCESS: read job 144, mask 24, DRAY+ECHO, energy -30, and result hash; all five independent checks true.

cast code ...; cast receipt ...
# SUCCESS: non-empty contract code; status 0x1; receipt contains ResultRecorded event in block 0x5c0b2.

.venv/bin/pytest -q
# Final: 2 passed.
```

One tooling note: while inspecting `cast wallet new --help`, I piped output through `sed -n` once. That was unnecessary; subsequent filtering used Python. No files outside this project were searched.

### Later sources consulted

27. https://docs.polkadot.com/smart-contracts/dev-environments/foundry/ — upstream Foundry deployment workflow for pallet-revive chains.
28. https://docs.polkadot.com/smart-contracts/dev-environments/foundry.md — concise markdown source of the same guide.
29. https://docs.polkadot.com/smart-contracts/dev-environments/hardhat/ — PVM compiler/plugin guidance.
30. https://docs.polkadot.com/smart-contracts/for-eth-devs/contract-deployment.md — explains EVM single-step vs PVM upload/instantiate deployment.
31. https://polkadot-fellows.github.io/RFCs/proposed/0172-eth-rpc-compatibility-pallet-revive.html — discovered while diagnosing the Ethereum RPC adapter.
32. https://explorer.aglais.quip.network/tx/0x7f7621ad1229b120f6cab0e677b2f8693702465d13db140856d887f9346a1ccc — attempted extraction after deployment; the extractor could not fetch the client-rendered explorer, so verification used live JSON-RPC instead.
33. https://explorer.aglais.quip.network/address/0x86846DC4136DB93d067b6fF6F78D8882FfF7589a — same extraction limitation; live RPC returned non-empty code and successful receipt.

### Final product-fit observations

- The official high-level compute guide was stale: it said public endpoint details were unpublished while the current XQuad package and Aglais page expose working endpoints.
- Quip's two products share one chain but have no end-to-end glue: separate RPC protocols, signer schemes, account formats, and decimal representations are required.
- XQuad returns an order ID and miner account but no compute extrinsic hash and no QPU/CPU/GPU attestation. The result is demonstrably from Quip's heterogeneous compute network, not demonstrably from quantum hardware.
- Native PolkaVM compilation worked, but direct ethers deployment of raw PVM bytes did not. The PVM flow requires a Substrate code-upload/instantiate path. Aglais's `AllowEVMBytecode=true` made the EVM-bytecode path work through the advertised Ethereum RPC.
- The network winner was feasible but not globally optimal for this tiny instance (gap 7 against exhaustive search). The demo records exactly what the network chose rather than silently replacing it with the local optimum.
