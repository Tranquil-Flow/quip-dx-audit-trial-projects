# DEVLOG.md — Quip Network Quantum Compute Experiment

## Date: 2026-09-28

### Pages Visited (in order)

1. **Web search: "Quip Network quantum compute"** — Found main site, docs, GitHub, Product Hunt, PR announcements
2. **Web search: "Quip Network quantum computing API"** — Found xq-py repo on GitHub, GitBook docs, X/Twitter primer
3. **https://developers.quip.network/docs/getting-started/quickstart** — Entry point. Shows `xquad` and `xqsa` packages on PyPI. Points to "Submit Your First Compute Job" page.
4. **https://github.com/QuipNetwork/xq-py** — Python QVM repo. Empty README (just GitLab template). Not useful.
5. **https://developers.quip.network/docs/compute/submit-a-job** — THE KEY PAGE. Full walkthrough: install `xquad[quip]`, build Ising model, solve locally or on network. Notes "Connection details for the public test network have not been published yet."
6. **https://developers.quip.network/docs/getting-started/quip-sdk** — SDK overview. Confirms `xquad` and `xqsa` on PyPI. No additional install steps.
7. **https://pypi.org/project/xqsa/0.4.1b1/** — PyPI page. Shows full API example with `build_solver()`. Reveals `result.sample` is an XQMX object.
8. **https://chainlist.org/chain/20033** — Found EVM RPC URL: `https://evm-rpc.aglais.quip.network:20049`
9. **https://github.com/QuipNetwork/nodes.quip.network** — Found bootnode addresses and Substrate RPC architecture
10. **https://developers.quip.network/docs/nodes/run-a-node-testnet** — Confirmed testnet is "Aglais", points to docker-compose repo
11. **GitLab spec docs (attempted)** — Both `spec/xqsa/SPEC.md` and `docs/book/src/solving/README.md` returned empty/failed to fetch from GitLab

### Key Technical Details

- **Package**: `pip install "xquad[quip]"` (requires Python >= 3.13)
- **Model format**: Ising model (spin ±1), or binary (0/1) which gets auto-converted
- **Local solver**: `SolverDWaveCPU()` from `xqsa` — D-Wave simulated annealing on CPU
- **Network solver**: `SolverQuip.for_network("aglais", seed=..., autofund=True)` from `xqsa`
- **Energy**: `sum(bias * spin) + sum(coupling * spin_i * spin_j)` — lowest wins
- **Coefficients**: transmitted as integers with thousandths (1.5 → 1500)
- **Constraints**: problem graph must be subgraph of a registered hardware topology on-chain
- **Testnet**: "Aglais" (replaced previous testnet 2026-09-02)
  - Substrate RPC: `wss://bootnode-1.aglais.quip.network:20049/rpc`
  - EVM RPC: `https://evm-rpc.aglais.quip.network:20049`
  - Faucet: `https://faucet.aglais.quip.network`
  - Chain ID: 20033
  - Token: AGLS
- **XQMX sample API**: `result.sample.iter_linear()` yields `(index, value)` tuples for non-zero variables. `result.sample.linear` is a dict. `result.sample.size` gives variable count.
- **for_network()**: Resolves network presets from `xqsa.quip_networks.NETWORKS` dict. Available: `aglais`, `devnet`.

### Commands That Mattered

```bash
# Create virtualenv (system Python is 3.9.6, need 3.13+)
python3.13 -m venv .venv
source .venv/bin/activate

# Install the toolchain
pip install "xquad[quip]"

# Run local solver
python3.13 maxcut_quip.py

# Run full comparison (local + network + brute force)
python3.13 comparison.py
```

### Successful Network Submissions

- **Order 129**: energy=-8, solver=`5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD`, 10 submissions, 1 solution
- **Order 136**: energy=-8, solver=`5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk`, 2 submissions, 1 solution
- **Order 141**: energy=-8, solver=`5DXeTU5xcTuukNfgDLZsZn8Xxr1qpsfTxdYTjfzbYtDsu541`, 5 submissions, 1 solution

All confirmed `energy_matches_chain: True` — the on-chain verification agreed with the client's energy calculation.

### Final Comparison (Order 141 run)

| Method                     | Energy | Cut   | Time      |
|----------------------------|--------|-------|-----------|
| Brute-force (2^6=64)       | -8     | 8/8   | 0.1ms     |
| CPU simulated annealing    | -8     | 8/8   | 13.9ms    |
| Quip Network (Aglais)      | -8     | 8/8   | 110.5s    |

Quip Network total round-trip: ~12s connect (with autofund) + ~98s solve = 110.5s.
The network routed the job to a miner who solved it; the chain verified the energy independently.
