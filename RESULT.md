# RESULT

Status: WORKING. Both demos ran, and a real Aglais TESTNET compute job returned a solver result. Project: /private/tmp/projects/proj-220d14.

## Run

Use Python >=3.13 (the vendor toolchain requires it). On a machine whose `python3` is >=3.13:

    python3 -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
    python sign_demo.py
    python compute_job.py

Here the unqualified `python3` is 3.9.6, so replace the FIRST command with `python3.13 -m venv .venv`. `python compute_job.py --local-only` skips the testnet. `python sign_demo.py --legacy-wots` tries Quip's earlier one-time signature algorithm. The requirements install only pip packages, selecting included macOS arm64 pip wheels for `quip-signer`/`xqffi` via `--find-links ./dist`; those wheels were built from the vendor's officially documented PyPI sdists because vendor publishes no Mac wheels. Other dependencies come from PyPI. Never commit the `keys/` directory; keys/keystores are created fresh for each script run, with private files mode 0600. No existing wallet, mainnet, Docker container, or real money used. Every compute run creates a new, funded testnet wallet and posts one paid-in-AGLS optimization job; use `--local-only` if you don't want a testnet transaction.

## Actual evidence

- `python sign_demo.py`: current Quip hybrid sr25519 + FN-DSA-512, signature 1660 bytes, original verification `True`, tampered verification `False`. Public-key SHA-256 fingerprint `a5f1d7e0199b42af73f3088b`. Optional legacy WOTS+ also passed True/False (2144-byte signature); NEVER reuse a WOTS+ key.
- `python compute_job.py --local-only`: QUBO 18 binary variables, 63 quadratic interactions, one-hot penalty 1000. SolverDWaveCPU returned jobs `[[1,4],[2,3],[0,5]]` (zero-based indices), machine loads `[9,9,9]`, imbalance range 0, sum of squared loads 243, XQMX energy -5757 (the omitted constant is +6000). Independent exhaustive search of 729 valid assignments confirms the optimum 243.
- On Aglais testnet (Substrate genesis `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`): new task-created account `5DUAtLJwVavkVwGycXbVqWW7V6c5FZWwgHnQ1dxhjrawrAjr`, project-local wallet `./keys/aglais-5c45454eb7db43b3bf65257d10bb335b.json`, SS58 faucet extrinsic `0xde6ca5a33e6ff20e099022b4b3d380d90ffb1af29e4f904c35fbd9272ffc44dd` (10 valueless AGLS). Quoted job reward 1 AGLS + fee 0.001905750333 AGLS.
- Real `propose_job` extrinsic hash `0xe697e5a3ea531b60d19740bd4d50bf5dcb8d522d33299ee22c5cbea312a73796`, block 478842, block hash `0x182dd50ea9f7bed4ba281bef198c49529b9076af17dcae9167eb809aa7a42b56`. Independently read the on-chain `JobProposed` event for order ID **251**, proposer matches the SS58 address above. The network backend returned jobs `[[2,3],[0,5],[1,4]]`, loads `[9,9,9]`, squared-load score 243, XQMX energy -5757; metadata: `order_id=251`, `best_energy_milli=-6408000` (Ising representation has a different energy offset), `energy_matches_chain=True`, `num_submissions=160`, `num_solutions=1`, winning miner `5EpDX17DV1mK2EY2Pcvg7XqbfRauRf28X5AyAMt6XP4kwHKD`. The chain's raw order storage showed `status=Opened, solution_count=160` at the later read; do not equate the backend's returned result with an independently verified `Closed` status.
- `pip install -r requirements.txt && pip check` succeeded in the project .venv after build artifacts were installed. A separate clean Python 3.13 `.verify-venv` successfully ran `pip install -r requirements.txt`, `pip check`, `python sign_demo.py` (True/False), and `python compute_job.py --local-only` (optimal [9,9,9]). Pip's install log confirmed it selected `./dist/xqffi-0.4.2-cp313-abi3-macosx_11_0_arm64.whl` and `./dist/quip_signer-0.3.0-cp39-abi3-macosx_11_0_arm64.whl`, with NO source build in the clean environment. The fresh install used an Aliyun PyPI mirror for download speed, and the supplied vendor wheels were built here from official sdists.

## Failures / workarounds and vendor documentation feedback

- Literal `python3 -m venv .venv` on this host creates a Python 3.9 environment, incompatible with XQuad's documented Python >=3.13; explicitly use `python3.13` here.
- Quip's published `xquad[quip]` transitive packages `xqffi` and `quip-signer` have no macOS arm64 wheels on PyPI; macOS sdists require Rust/maturin and lengthy Cargo registry downloads. The official PyPI package descriptions permit sdist builds. Included wheels in `dist/` eliminate that build on this Mac. Publishing official arm64 wheels would simplify a pip-only quickstart.
- The compute docs `submit-a-job` page claims no public testnet RPC is published even though `https://aglais.quip.network/` and the SDK's named `aglais` preset list `wss://bootnode-1.aglais.quip.network:20049/rpc`; link the current endpoint/preset and a live full example. The SDK supports `topology="native"`, used here for the QUBO, but the generic docs say a model must fit a registered topology; document the native mode and miner-availability tradeoff.
- SDK `autofund=True` attempted faucet funding with the hex AccountId and received `transfer failed` before submission. Funding that SAME newly generated account using its SS58 encoding succeeded; the script now SS58-prefunds a fresh account and disables SDK autofund. The faucet/API and SDK should agree on supported formats (or return a useful diagnostic). The first attempt made no compute job.
- Full chronological sources, commands, dead ends and deviations are recorded in DEVLOG.md. No posts made to forums/Discord/issues/social.
