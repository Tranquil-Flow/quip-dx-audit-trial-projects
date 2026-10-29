# DEVLOG

## Sources consulted (in order)

1. Google/DuckDuckGo/Bing/Brave search attempts via `web_extract` tool — FAILED
   (tool's backend is search-only for DDG and refused all extractions).
2. `https://quip.network/` — main site (Netlify), exists.
3. `https://docs.quip.network/` — 301 → `https://developers.quip.network/docs`
   (docs are markdown mirrors: append `.md` to any docs URL).
4. `https://developers.quip.network/docs/llms.txt` — doc index.
5. `https://developers.quip.network/docs.md` (Welcome).
6. `.../docs/getting-started/quickstart.md` — run node / keys / libraries.
7. `.../docs/getting-started/quip-sdk.md` — SDKs; `pip install "xquad[quip]"`.
8. `.../docs/getting-started/what-is-quip.md`
9. `.../docs/compute/submit-a-job.md` — THE key page: local solver
   `SolverDWaveCPU`, network solver `SolverQuip.for_network("aglais")`,
   Ising/QUBO format, milli-scale coefficient rule, faucet contract,
   job lifecycle, order_id as job identifier.
10. `.../docs/compute/ising-topologies.md` — subgraph placement vs native
    mode; size limits (min 16 / max 5,000 nodes, max 50,000 edges);
    allowed values advisory; >2,147,483 natural-scale coefficients rejected.
11. `.../docs/xquad-toolchain.md` — XQuad components/backends.
12. `https://developers.quip.network/docs/xquad/solving/quip-first-job.html`
    — mdBook tutorial with full end-to-end output against aglais
    (specVersion 118, 2026-09-28): quote, autofund, solve ~89s,
    order_id, energy_matches_chain, query() after QuipTimeoutError.
    NOTE: the `.md` mirror of this page 404s (3449-byte "Page not found");
    only the `.html` mdBook render exists. Same for the other
    `/docs/xquad/solving/*` pages referenced from submit-a-job.
13. `.../docs/xquad/solving/quip-network.html` — SolverQuip reference:
    config env vars (QUIP_RPC_URL, QUIP_KEYSTORE, QUIP_SIGNER_SEED,
    QUIP_TOPOLOGY, ...), named presets (aglais, devnet), job lifecycle,
    coefficient encoding (milli-scale i32, binary→spin basis change),
    metadata keys, 12-class failure taxonomy.
14. `https://aglais.quip.network` — testnet status page: confirms public RPC
    `wss://bootnode-{1-3}.aglais.quip.network:20049/rpc` (matches the SDK
    preset), AGLS 12 decimals on substrate side, faucet, explorers.
15. `https://gitlab.com/quip.network/xquad/-/raw/main/README.md` — XQuad
    repo readme (AGPL, early public release).
16. Package source read (installed by pip, not docs):
    `.venv/lib/python3.13/site-packages/xqsa/quip_networks.py` — presets:
    aglais rpc=`wss://bootnode-1.aglais.quip.network:20049/rpc`,
    faucet=`https://faucet.aglais.quip.network`.
17. `.../xqsa/quip_signing.py` — keystore: fresh 32-byte seed, mode 0600,
    `account_id_hex` cached field; `generate_keystore(path)`,
    `load_or_generate_keystore`; refuses overwrite by default.
18. `.../xqsa/quip_faucet.py` — `POST <base>/request` with `{"dest": addr}`;
    drip default 10 AGLS (10_000_000_000_000 planck); 429→one retry,
    403 = already funded above one drip.
19. `.../xqvm_py/xqmx.py` — XQMX API: `binary_model(size)`,
    `add_linear`/`add_quadratic` accumulate (needed: terms from both
    penalty and objective touch the same variables); SAMPLE mode stores
    variable assignments in `.linear`.
20. `.../xqsa/dwave_cpu.py` — `SolverDWaveCPU` wraps dwave-samplers
    SimulatedAnnealingSampler; energy recomputed locally via
    `_recompute_energy`.
21. `.../xqsa/quip.py` — SolverQuip constructor signature and keystore
    resolution order: `seed` → `keystore=`/`QUIP_KEYSTORE` →
    `~/.quip/keystore.json` (default avoided; we pass `./keys` explicitly).

## Commands run that mattered

- `curl -sIL https://quip.network https://docs.quip.network ...` — found docs
  redirect to developers.quip.network.
- `curl .../docs/llms.txt` + bulk `.md` fetches into `docs_src/`.
- `curl -sL https://astral.sh/uv/install.sh | sh` → uv 0.12.23 in
  `$HOME/.local/bin` (no root available; uv manages Python versions).
- `uv venv --python 3.13 .venv` → CPython 3.13.16 in project dir
  (system python3 is 3.12.3; xquad requires 3.13+).
- `uv pip install --python .venv/bin/python "xquad[quip]"` → xquad 0.4.2,
  xqsa 0.4.2, xqvm-py 0.4.2, xqcp 0.4.2, xqffi 0.4.2, quip-signer 0.3.0,
  substrate-interface 1.8.1, dimod 0.12.22, dwave-samplers (pulled by xqsa).
- `.venv/bin/python qubo_scheduling.py` — built 18-var QUBO, solved locally:
  SolverDWaveCPU found loads [9,9,9], imbalance 0, energy -5757, matching
  exhaustive 3^6 brute force. WORKING.
- `.venv/bin/python setup_account.py` — fresh keystore at `keys/keystore.json`
  (mode 0600), address `0xd5f6c16b52d6f79b93a643b78dfc31fea327feb4475d95fa6cbdb28c7d3d691a`,
  faucet drip 10 AGLS, faucet extrinsic hash
  `0x0d3c04005067026f9424ca1c1c9d70326266d19e6faf1f7111c4fd58f80e70c0`.
- `.venv/bin/python submit_network.py` (background) — quote + solve against
  aglais, topology="native", keystore=`keys/keystore.json`.

### Network job results so far

- **Job 1 — order_id 248** (solved in 95.3s, 4 miner submissions):
  miner `5Eb82sAEyRToSgRK51njamL6xMT2gGriDKtXTMBfR31PSvwk`,
  best_energy_milli −6370000, energy_matches_chain True,
  result.energy −5719, assignment [2,1,1,2,2,0], loads [6,7,14],
  **imbalance 8 — valid but SUBOPTIMAL** (local optimum is [9,9,9],
  imbalance 0, energy −5757).
- `.venv/bin/python query_order.py 248` — on-chain readback: status
  'Opened' but is_final True (the pallet has no close hook; the client
  computes finality from block height — created_at 477933,
  first_solution_at 477937, effective_expiry 477947, current 478004,
  solution_count 4). `query(order_id, model, topology="native")`
  re-decoded the same sample from chain: values
  [0,0,1,0,1,0,0,1,0,0,0,1,0,0,1,1,0,0] → [2,1,1,2,2,0] ✓.
- `.venv/bin/python verify_network.py` — reproduced the chain's exact
  coefficient pipeline (dimod BINARY→SPIN with offset discarded,
  milli scale via `_ising_coefficients`/`_to_milli` from xqsa.quip_codec):
  chain milli energy of the returned sample = −6370000 == best_energy_milli
  (canary independently reproduced), brute-force optimum = −6408000.
  Confirms the chain's model IS the submitted model and that the fleet
  returned a locally-optimal-but-not-global point (gap 38000 milli).
- **Job 2 — order_id 249** (solved in 91.6s, 6 miner submissions):
  miner `5DVvgbz4LUpoNnQ4EPUg6yxcn7mpsJgp2HiPLTQGEPzU7mNS`,
  best_energy_milli −6400000, result.energy −5749,
  assignment [1,0,2,2,1,0], loads [11,7,9], **imbalance 4** — better
  than job 1 but still not the optimum (gap 8000 milli).
- Pattern: more miner submissions → better answer (4 subs → gap 38;
  6 subs → gap 8). Job 3 submitted with a longer competition window
  (deadline_blocks=300, block_wait=60 vs the 100/10 defaults) to let more
  miners answer and beat the first solution, per the docs' description
  of the post-first-solution competition window.
- `https://subscan.aglais.quip.network/api/scan/extrinsic` (POST
  {"hash": ...}) — independent explorer confirmation. The faucet drip is
  block 477924-1, Balances.transfer_keep_alive, success True, from the
  faucet account 5CyTXAkbWe9yMKorLpXeTt6M4hsmohErzp2NUfaNodFVco6G.
- `https://subscan.aglais.quip.network/api/scan/extrinsics` (POST
  {"address": <ss58>, "row":10, "page":0}) — lists our account's
  extrinsics. NOTE: this endpoint rejects the hex address ("Invalid
  Account Address"); it wants SS58 (prefix 42), derived with
  substrateinterface `ss58_encode(account_id_hex, 42)` =
  5GuFMjcFhMcBuQt3KBmJUfWs4bjKacEJT6chSrvU8Xn5hw92. Found three
  successful `QuantumComputeMempool.propose_job` extrinsics:
    - block 477933-6  hash 0x65feb596a015920c82f5e7029b939f19c38d8c4c3f815976578db2a4c1e45e2c  (order 248)
    - block 478001-11 hash 0x665f54998868dd835bec8be6593253c62e13f92a7242c677a27f5e85b129a2de  (order 249)
    - block 478030-7  hash 0x036a1d2f4ad6a1ff1c7386745d1262df0d5b6a4c565be9914c3431c6d90f2059  (order 250, job 3)
  The block numbers line up exactly with each order's created_at
  (248: 477933 from status()), confirming order_id ↔ extrinsic
  correspondence.
- **Job 3 — order_id 250** (392.1s, 115 miner submissions, longer
  window deadline_blocks=300/block_wait=60): miner
  `5DcfRBCJdTy57YzGX6LGeksK9RwDRoYgaj7nynaPp7Gtp9rN`,
  best_energy_milli −6408000, result.energy −5757,
  assignment [1,0,2,2,0,1], loads [9,9,9], **imbalance 0 — the
  provable global optimum, identical to the local solve**. On-chain:
  created_at 478030, first_solution_at 478034, effective_expiry 478094
  (the 60-block window), solution_count 115, is_final True;
  query(250, model, topology="native") re-decoded the same sample
  [0,1,0,1,0,0,0,0,1,0,0,1,1,0,0,0,1,0] from chain.
- `.venv/bin/python verify_network.py <file>` run over all three result
  files: order 248 canary ✓ gap 38000 milli; order 249 canary ✓ gap
  8000; order 250 canary ✓ gap 0 → `network sample is optimal: True`.
- Final balance read via a read-only `quote()` (docs: signs but submits
  nothing): 6,994,282,749,001 planck = 6.994282749001 AGLS =
  10 − 3 × 1.001905750333 exactly (reward to miners + fee burned).

## Errors

- `web_extract` tool: refused DuckDuckGo/Bing/Brave/Google URLs with
  "DuckDuckGo (ddgs) is a search-only backend and cannot extract URL
  content. Set web.extract_backend to firecrawl, tavily, exa, or parallel."
  → worked around by using `curl` directly in the terminal.
- `execute_code` sandbox runs a different Python than the project venv
  ("No module named 'xqsa'") → ran all SDK code via
  `.venv/bin/python` through `terminal()`.
- xquad sub-docs `/docs/xquad/solving/*.md` return 404 ("Page not found"
  HTML, 3449 bytes) while the `.html` mdBook render of the same path works.
  → fetched `.html` and converted to text.
- `uv pip install "xquad[quip]"` needed `--python .venv/bin/python` because
  uv's bare pip targets its own environment otherwise.
- quiptoken.com does not resolve (no DNS answer) — not the project's domain;
  the real project is quip.network / developers.quip.network.

## Final state

- Local solve: optimal, imbalance 0, energy −5757 (brute-force confirmed).
- Network: 3 real jobs on aglais (order ids 248, 249, 250); order 250
  returned the global optimum identical to the local solve.
- Account: throwaway testnet key in ./keys/keystore.json (0600), balance
  6.994282749001 AGLS after 3 jobs; nothing on any mainnet; no other
  keys, wallets, containers or processes on this machine were touched.
- All background submit processes exited on their own; nothing was
  killed.

## Guesses / deviations / workarounds

- QUBO formulation chosen: 18 binaries x[i,j] (job i → machine j);
  H = A·Σ_i(Σ_j x[i,j] − 1)² + B·Σ_j(Σ_i d_i x[i,j])² with A=1000, B=1.
  Rationale: total load 27 is fixed, so minimizing Σ L_j² is equivalent to
  minimizing Σ(L_j − 9)² (variance) and to max−min imbalance; the perfect
  split [9,9,9] exists ({7,2},{3,6},{5,4}) so the true optimum is
  imbalance 0. A=1000 exceeds the whole spread of the balance term
  (243..729 over valid assignments), so any one-hot violation is priced
  out. This is my choice; the vendor docs do not prescribe a scheduling
  encoding.
- Keystore path deviation: docs default to `~/.quip/keystore.json`; per the
  task rules every key file must stay inside the project, so the keystore
  was generated at `./keys/keystore.json` and passed explicitly via
  `keystore=` (also documented as supported; QUIP_KEYSTORE is the env
  equivalent). The default home path was never used.
- `topology="native"` for the network job: the docs' own first-job tutorial
  needed it (subgraph placement fails on one-hot clique encodings); my model
  has per-job triangles + per-machine triangles, which cannot be a subgraph
  of a sparse annealer connectivity graph without minor embedding, which the
  tools explicitly do not do. Native mode costs nothing extra and the SA
  miner fleet on aglais handles arbitrary graphs.
- `autoconfirm` passed as a callable (accept ≤2 AGLS) rather than the
  default True: makes the spend decision explicit and non-interactive.
- Keystore generated explicitly with `quip_signing.generate_keystore()`
  (before SolverQuip saw it) instead of letting SolverQuip create it on
  first use — same SDK code path, but makes the "fresh throwaway key"
  step auditable and guarantees the file lands in ./keys.
- The account address is printed (it is the public identifier the faucet
  requires, per the docs); no seed or private key material is ever printed
  or cat'ed.
