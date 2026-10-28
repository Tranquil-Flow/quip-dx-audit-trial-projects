# RESULT.md — Quip Network Max-Cut Experiment

## Status: WORKING

## What I Built

A max-cut problem on a 6-node graph with 8 edges, solved three ways:

1. **Quip Network (Aglais testnet)** — submitted as an Ising model via `SolverQuip.for_network("aglais")`, solved by a remote miner, result verified on-chain
2. **Local CPU simulated annealing** — D-Wave samplers via `SolverDWaveCPU()`
3. **Classical brute-force** — exhaustive enumeration of all 2^6 = 64 binary assignments

All three methods found the same optimal energy (-8) and the same optimal cut (8/8 edges).

## How to Run

```bash
# Setup (requires Python 3.13+)
python3.13 -m venv .venv
source .venv/bin/activate
pip install "xquad[quip]"

# Run the full comparison
python3.13 comparison.py

# Or just the local solver
python3.13 maxcut_quip.py
```

## Evidence

### Quip Network Submissions

- **Order 129**: energy=-8, miner=`5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD`, 10 submissions from miners, 1 valid solution, `energy_matches_chain: True`
- **Order 136**: energy=-8, miner=`5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk`, 2 submissions, 1 valid solution, `energy_matches_chain: True`
- **Order 141**: energy=-8, miner=`5DXeTU5xcTuukNfgDLZsZn8Xxr1qpsfTxdYTjfzbYtDsu541`, 5 submissions, 1 valid solution, `energy_matches_chain: True` (final comparison run)

### Local CPU Solver

- Energy: -8, assignment: `[1, 0, 1, 0, 1, 0]`, time: ~29ms

### Brute-Force

- 64 assignments enumerated in 0.1ms, 4 optimal solutions found

### Account

- Seed saved to: `./keys/throwaway_seed.txt`
- Address: `0x32d19aad762e497ecbea3b88ea61fafb8734541688f6d555ad1ebb34f54b8457`
- Network: Aglais testnet (chain ID 20033)
- RPC: `wss://bootnode-1.aglais.quip.network:20049/rpc`

## What Did Not Work and Why

1. **GitLab spec docs inaccessible**: The PyPI page references `spec/xqsa/SPEC.md` and `docs/book/src/solving/README.md` on GitLab as normative references, but both return empty/404 when accessed via web extraction.

2. **xq-py GitHub repo is a skeleton**: The README is the default GitLab template with no project-specific content.

3. **Developer docs are stale**: The "Submit Your First Compute Job" page says "Connection details for the public test network have not been published yet" — but the Aglais testnet has been live since 2026-09-02 with bootnodes, faucet, and explorer.

4. **Intermittent EncodingError**: One network solve failed with `EncodingError: spin vector length 2 does not match topology node count 6`. Retrying succeeded. Not reproducible.

5. **Faucet API undocumented**: The faucet URL exists but manual HTTP requests all return empty/404. The SDK handles it internally via `autofund=True`.

6. **XQMX sample object API undocumented**: The docs never explain how to extract assignment values from `result.sample`. You have to discover `iter_linear()` and the `linear` dict by trial and error.

## Top 5 Documentation Changes That Would Have Helped Most

1. **Add the testnet RPC URL to the "Submit Your First Compute Job" page.** The page currently says "Connection details for the public test network have not been published yet" — this is false and blocks every developer from following the tutorial. Adding `wss://bootnode-1.aglais.quip.network:20049/rpc` and `SolverQuip.for_network("aglais", ...)` would eliminate the single biggest blocker.

2. **Document how to extract values from `result.sample`.** The XQMX object returned by `solve()` is not a plain list. Add a code example showing `result.sample.iter_linear()` or `result.sample.linear` to read the assignment. Without this, every user has to reverse-engineer the API.

3. **Mention the Python 3.13+ requirement in the quickstart.** The install command `pip install "xquad[quip]"` fails on older Pythons. A one-line note like "Requires Python 3.13 or newer" at the top of the quickstart would save users from confusing PEP 668 errors.

4. **Fix or remove the GitLab spec links.** The PyPI page for xqsa references `spec/xqsa/SPEC.md` and `docs/book/src/solving/README.md` on GitLab as normative specs, but both are inaccessible (404/empty). Either make them public or remove the references.

5. **Add `for_network()` to the quickstart example.** The current example shows `SolverQuip(url="", keystore="")` with empty placeholders. Replace it with `SolverQuip.for_network("aglais", seed=..., autofund=True)` which is the actual working pattern. Also document that `autofund=True` handles faucet interaction automatically.
