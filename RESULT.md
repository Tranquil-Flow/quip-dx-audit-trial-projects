# Result

## Overall status: WORKING

The same four-variable QUBO was solved through Quip's local CPU adapter and submitted to Quip Network's Aglais testnet through `SolverQuip`. Both returned the unique exact optimum, and the on-chain proposal was independently verified through Aglais Subscan's API.

No mainnet, real money, existing wallet, existing browser, port 9222, or Docker resource was used. The only private key is a newly generated throwaway testnet key under this project at `keys/aglais-keystore.json` (mode 0600, ignored by Git). Its secret contents were never printed or read during reporting.

## Component status

| Component | Status | Evidence |
|---|---|---|
| Python/XQuad environment | WORKING | Python 3.13.13; `xquad==0.4.1`, `xqsa==0.4.1`, `xqvm-py==0.4.1`, `quip-signer==0.3.0`; locked in `uv.lock` |
| Exact QUBO oracle | WORKING | Exhaustive enumeration of all 16 assignments found one optimum: `[1,0,1,0]`, energy `-7` |
| Local Quip solver | WORKING | `xqsa.SolverDWaveCPU` returned `[1,0,1,0]`, energy `-7`; `outputs/local.json` |
| Throwaway testnet identity | WORKING | Fresh project-local account generated; keystore mode 0600 |
| Testnet identity guard | WORKING | Observed block-0 hash exactly matched the documented Aglais genesis before funding or submission |
| Testnet faucet and quote | WORKING | Empty account was funded with no-value AGLS through the documented automatic faucet path; exact chain quote recorded |
| Testnet compute job | WORKING | Order 179 received five submissions and returned `[1,0,1,0]`, energy `-7`; `energy_matches_chain=true`; `outputs/testnet.json` |
| Local/testnet comparison | WORKING | Same problem, sample, and energy; delta `0`; both equal the exhaustive optimum; `outputs/comparison.json` |
| Independent chain verification | WORKING | Aglais Subscan reports the proposal extrinsic successful and finalized and decodes the expected Ising payload; all nine checks passed; `outputs/subscan_verification.json` |
| Automated tests | WORKING | Four unittest cases passed, including a real local XQSA solve |

## Problem solved

Binary variables: `x0, x1, x2, x3 in {0,1}`.

Minimize:

```text
-3*x0 - 2*x1 - 4*x2 - x3
+ 6*x0*x1 + 6*x1*x2 + 6*x2*x3
```

This is maximum-weight independent set on path `0--1--2--3`, with vertex weights `3,2,4,1` and adjacency penalty `6`. The unique optimum selects vertices 0 and 2:

```text
sample = [1, 0, 1, 0]
energy = -7
```

The exact enumerator, local solver, and testnet solver all agree.

## Comparison

| Measure | Local CPU | Aglais testnet |
|---|---:|---:|
| Backend | `xqsa.SolverDWaveCPU` | `xqsa.SolverQuip` |
| Sample | `[1,0,1,0]` | `[1,0,1,0]` |
| Natural-scale QUBO energy | `-7` | `-7` |
| Exact global optimum | Yes | Yes |
| Recorded duration | about 0.013 s | about 83.99 s |

The timing numbers are not a solver-performance benchmark. The local duration is the local sampler call; the network duration includes proposal inclusion, miner competition, block production, and finality by effective block height.

The network metadata additionally reports:

- Chain-side best Ising energy: `-6500` milli.
- XQSA local-vs-chain energy canary: `true`.
- Miner submissions: `5`.
- Solution vectors in the winning submission: `1`.

The Ising energy is in a converted basis with milli scaling and an offset, so it is not expected to numerically equal the natural-scale binary QUBO energy.

## On-chain evidence

Network:

- Name: Aglais Testnet (Quip Network).
- RPC: `wss://bootnode-1.aglais.quip.network:20049/rpc`.
- Expected and observed genesis: `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`.
- Token: AGLS, a no-value test token.

Accounts and job:

- Throwaway submitter AccountId: `0x7549d99160b46f3bdeeb007ab538e126394a8cac825193cadcff602a82f938b1`.
- Submitter SS58 address reported by Subscan: `5EiVQ213q55cB1sE5aqHinxMmJyYuAtex8oFGnJjg7DkFb9H`.
- Winning miner: `5E7fgcQm3WEdURyzGnxVZWGvHcQrhrasTKfKPUV7VpUD9Wgp`.
- Order ID: `179`.

Proposal transaction:

- Extrinsic hash: `0xf920ce02f4b0557f0bb529313466e42d823cfcb9cce9196f838733ae6ecd6fbc`.
- Extrinsic index: `389539-6`.
- Block number: `389539`.
- Block hash: `0x0752f2872cdc82484a7149d259253bae404c39e19556c6ae4bcb82dad4f4fe67`.
- Call: `QuantumComputeMempool.propose_job`.
- Dispatch success: `true`.
- Later Subscan finality: `true`.

Initial quote on the empty account:

- Reward: `1,000,000,000,000` planck = `1 AGLS`.
- Exact fee: `1,897,254,289` planck = `0.001897254289 AGLS`.
- Total: `1,001,897,254,289` planck = `1.001897254289 AGLS`.
- AGLS has no monetary value and came from the public testnet faucet.

Subscan independently decoded the wire payload to nodes `[0,1,2,3]`, edges `(0,1),(1,2),(2,3)`, Ising fields `[0,2000,1000,1000]`, and couplings `[1500,1500,1500]`, exactly matching the binary-to-spin conversion of this QUBO.

Note: the immediate XQSA receipt records in-block inclusion rather than waiting for extrinsic finalization, so its `is_finalized` field is false. The later independent Subscan check reports the same extrinsic finalized. Also, order storage still said `Opened` while XQSA computed `is_final=true`; the vendor docs explain that order status is lazy, while finality is computed from block heights.

## How to run

From `/private/tmp/devtrials5/g5-gpt-5.6-sol`:

```sh
export UV_PYTHON_INSTALL_DIR="$PWD/.python"
export UV_CACHE_DIR="$PWD/.uv-cache"
uv sync --python 3.13

uv run python -m unittest -v test_solve_qubo.py
uv run python solve_qubo.py local
uv run python solve_qubo.py testnet
uv run python solve_qubo.py compare
uv run python verify_subscan.py
```

`testnet` reuses only `keys/aglais-keystore.json` on later runs. It refuses a keystore outside the project's direct `keys/` directory and refuses to fund or submit if the RPC's genesis does not match Aglais.

Generated evidence:

- `outputs/local.json`
- `outputs/testnet.json`
- `outputs/comparison.json`
- `outputs/subscan_verification.json`

Implementation and audit trail:

- `solve_qubo.py`
- `verify_subscan.py`
- `test_solve_qubo.py`
- `README.md`
- `DEVLOG.md`

## What did not work and why

1. **The documented `pip install "xquad[quip]"` failed on Apple Silicon macOS.** PyPI has no macOS wheel for `quip-signer==0.3.0`, so maturin builds its sdist. The sdist's two Cargo crates claim to be isolated workspaces but omit `[workspace]` tables. In this project location, Cargo walked up to an unrelated parent `Cargo.toml` and failed workspace inheritance. The checksum-verified official sdist built after adding empty `[workspace]` tables to both extracted crate manifests. No cryptographic code was changed.
2. **The main compute docs said the public RPC had not been published.** That page is stale relative to the current canonical XQuad source documentation and `aglais.quip.network`, which publish the endpoint and a complete first-job workflow. The source's named `aglais` preset worked.
3. **Direct Subscan frontend routes returned 404.** Guessed `/extrinsic/...`, `/account/...`, and `/block/...` pages did not resolve on this deployment. The public `POST /api/scan/extrinsic` endpoint worked and gave stronger machine-readable evidence. The attempted account API route also returned 404.
4. **Several public-web searches timed out or returned no results.** Direct official docs, GitLab source, PyPI JSON, the Aglais status page, and Subscan API were sufficient; no forum or social post was made.

## What would make the vendor docs/tools easier

- Update the main `Submit Your First Compute Job` page to show `SolverQuip.for_network("aglais", topology="native")`, the public RPC/faucet, genesis hash, and the current end-to-end walkthrough. It currently contradicts the current source docs by saying no endpoint is published.
- Reconcile install wording across the portal (`xqsa[quip]`) and compute page (`xquad[quip]`). Both can be valid, but the umbrella-vs-adapter distinction should be explicit everywhere.
- Publish an Apple Silicon wheel for `quip-signer`, or fix its sdist by preserving explicit Cargo workspace boundaries and test installation beneath an unrelated parent Cargo workspace.
- Expose proposal `extrinsic_hash` and inclusion `block_hash` in `SolverResult.metadata` (or a public receipt/callback). The package already computes both; users should not need a private-method wrapper to retain transaction evidence.
- Have named network presets pin and verify the genesis hash, not only the moving RPC/faucet coordinates.
- Link the machine-readable Aglais Subscan API and document which frontend routes exist. The testnet page links Subscan, but obvious entity routes returned 404.
- Return or expose the faucet response from automatic funding so clients can retain faucet transaction evidence without reimplementing `_fund`.
- Clarify prominently that an order can remain storage-status `Opened` after it is final by effective block height; this behavior is documented deep in the source book but is initially surprising.
