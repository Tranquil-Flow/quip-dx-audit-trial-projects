# p2-a

- **Round:** Round 5
- **Model:** GPT-6
- **Task:** Python dev, pip only: PQ signing demo and a QUBO compute job
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Python dev, pip only: PQ signing demo and a QUBO compute job | GPT-6 | quip-signer, xquad/xqsa, Aglais compute network and faucet; hashsigs 0.0.2 (optional flag) | Built and working on testnet: signing demo and a live compute job on Aglais (order 251), but the Mac install needed wheels the builder compiled from sdists | 90 min | No macOS wheels for quip-signer and xqffi; nothing points to the Python signing usage; native topology only in the SDK source [C-CMP-11, C-PER-05, C-TRL-17, C-OS-03]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-6.
- **What it does:** Two scripts on macOS (Apple Silicon). `sign_demo.py` makes a Quip hybrid (sr25519 + FN-DSA-512) key with `quip-signer`, signs, verifies and shows tampering fail, with an optional legacy WOTS+ path. `compute_job.py` builds an 18-variable QUBO for 6 jobs on 3 machines, solves it locally with `SolverDWaveCPU`, cross-checks by brute force, funds a fresh Aglais wallet from the faucet, submits a native-topology job with `SolverQuip` and prints the order id. PyPI has no macOS wheels for `quip-signer` or `xqffi`, so the builder compiled wheels from the official sdists and shipped them in `./dist`; "pip only" holds only with those.
- **Quip products and integration:** `quip-signer` (PyPI) — NATIVE; `xquad`/`xqsa`/`xqvm-py`/`xqffi` — NATIVE; Aglais compute network, native topology — NATIVE; Aglais faucet — NATIVE; `hashsigs` 0.0.2 (WOTS+, optional flag) — OUTDATED. The builder tried the legacy `hashsigs` first and found `HybridSigner` only by reading the installed source.
- **Evidence:** The `propose_job` extrinsic [0xe697e5a3ea531b60d19740bd4d50bf5dcb8d522d33299ee22c5cbea312a73796](https://subscan.aglais.quip.network/sub/extrinsic/0xe697e5a3ea531b60d19740bd4d50bf5dcb8d522d33299ee22c5cbea312a73796) is in block 478842 (the blake2-256 of that extrinsic matches the claimed hash). `JobOrders[251]` shows the builder's proposer account, 160 solutions and status Opened; it was still Opened at block 492,026, as the write-up says. First rebuild: works (clean Python 3.13 environment using the shipped wheels; the signing demo printed a 1660-byte signature, original true, tampered false; its own network jobs, orders 259 and 260, completed; order 259 returned loads [9, 7, 11] from 8 submissions, valid but not optimal, while the builder's order returned the optimum [9, 9, 9]). Second rebuild: works (clean install from `requirements.txt` with the shipped wheels; both signing demos and the local QUBO optimum reproduced; the extrinsic, faucet transfer and order 251 checked on the RPC). It notes the shipped macOS wheels are the builder's own builds; their source tarballs match the PyPI ones. One claim did not hold: the write-up says the SDK's autofund fails with a hex account id ("transfer failed"); in the rebuild, hex-address faucet funding and `SolverQuip` autofund both succeeded.
- **Time:** 90 min.
- **Key Quip call** (`compute_job.py:136-137, 162, 168`, excerpt):
```python
solver = SolverQuip.for_network("aglais", keystore=str(wallet),
                                autofund=False, autoconfirm=True, timeout=900)
...
    result = solver.solve(model, topology="native")
...
print("Submitted job identifier:", result.metadata.get("order_id"), flush=True)
```
- **What got in the way:** `quip-signer` and `xqffi` still have only manylinux wheels, so a Mac install compiles Rust and a clean install took about 11 minutes [[C-CMP-11](https://pypi.org/project/xqffi/0.4.1/)]. The `quip-signer` PyPI description is empty and the developer docs never point to its Python sign/verify usage, which is documented only in a README inside the quip-validator repository [[C-PER-05](https://pypi.org/project/quip-signer/)]. Native topology, which its problem needed, came from the SDK source [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)]. A network job's answer quality varies with the default competition window [[C-OS-03](https://developers.quip.network/docs/compute/submit-a-job#:~:text=a%20shorter%20competition%20window%20opens)].
