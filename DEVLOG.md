# DEVLOG
Start: 2026-09-28 14:04 CEST. Python 3.14.4, macOS arm64.

## Log
1. [14:05] Web search: "Quip Network quantum compute submit max-cut QUBO problem"
   -> Results: generic max-cut papers only; no Quip mention. (query too specific)
2. [14:06] Web search: "Quip Network quantum blockchain" -> found quip.network, press coverage (testnet launched 2026-04-02, D-Wave consult)
3. [14:07] Web search: "Quip Network docs quantum compute API developers" -> result pointing at https://quip.gitbook.io/docs and github QuipNetwork/quip-protocol
4. https://quip.network/ (WebFetch) - looking for how to submit a problem. Nav: Docs=https://developers.quip.network/docs, Submit a Job=https://developers.quip.network/docs/compute/submit-a-job, points.quip.network, account.quip.network, research.quip.network
5. https://quip.gitbook.io/docs (from search) -> HTTP 404
6. https://developers.quip.network/docs/compute/submit-a-job -> `pip install "xquad[quip]"` (Py>=3.13), Ising model, SolverQuip(url=..., keystore=...). KEY: "Connection details for the public test network have not been published yet."
7. .../docs/getting-started/quickstart -> only node runner + WOTS+ key libs; nothing on job submission
8. .../docs/getting-started/quip-sdk -> pip xquad/xqsa; npm packages need @beta/@rc tags. No RPC URL.
9. .../docs/compute/ising-topologies -> registered topologies; limits 16..5000 nodes, 50000 edges, no minor embedding (must be subgraph of hardware graph). Did not name any registered topology.
10. .../docs/nodes/run-a-node-testnet -> node manager (gitlab), docker repo gitlab.com/quip.network/nodes.quip.network, port 20049. No public RPC URL, chain id or faucet.
11. https://pypi.org/project/xqsa/ (0.4.1, 2026-09-25, py>=3.13, extra [quip]); https://pypi.org/project/xquad/ (0.4.0, py>=3.13)
12. [14:20] uv venv --python 3.13 .venv; `uv pip install "xquad[quip]"` -> OK (xquad/xqsa 0.4.1, quip_signer built). 
13. Ran docs local example verbatim (docs_local.py) -> prints `XQMX(mode=SAMPLE, ...) -1` (sample is an XQMX object, not a plain list; not explained in docs).
14. help()/docstrings of xqsa.SolverQuip and module xqsa.quip (the docs page said connection details unpublished) -> discovered `SolverQuip.for_network("aglais")` = public testnet, `fund_from_faucet`, topology="native", env vars QUIP_RPC_URL etc., default keystore ~/.quip/keystore.json (OUTSIDE project; I will pass keystore=./keys/...).
   Noted: a pre-existing docker container `quip-validator` is running on this machine (not mine) — not touched.
15. https://aglais.quip.network (WebFetch) -> public testnet: wss://bootnode-{1-3}.aglais.quip.network:20049/rpc, faucet https://faucet.aglais.quip.network (10 AGLS), Subscan subscan.aglais.quip.network, chain `quip-testnet`. (Found via docstring in installed package, NOT from developers.quip.network docs.)
16. [14:08] Wrote probe.py: SolverQuip.for_network("aglais", keystore=./keys/keystore.json, autofund=True) -> connected OK; keystore auto-created in ./keys.
17. Wrote maxcut.py (3-regular random graph, seed 7, spin model J=+1). Classical: brute-force + SolverDWaveCPU.
18. `QUIP=1 python maxcut.py` (N=16, default topology): OK. Order 122, energy -18 (cut 21) == exact optimum, 93.6s wall, faucet auto-funded. 
19. `N=20 QUIP=1 python maxcut.py`: ERROR xqsa.quip_codec.PlacementError: "placement search budget exhausted after 200000 steps; ... coupling graph may not be a subgraph of the topology. Raise max_steps ... or supply an explicit mapping."
20. `N=20 NATIVE=1 QUIP=1 python maxcut.py` (topology="native"): OK. Order 123, energy -22 (cut 26) == exact optimum, 79.6s.
21. s.status(122/123) -> is_final True; account_id_hex=0xa77016a2c943311a283ffe61b0364c6287414530bdb51b265b12d740e951e47f
