# DEVLOG — Quip Network demos (sign_demo.py + compute_job.py)

Project: /private/tmp/projects/proj-72071d
Goal: (1) PQ sign/verify demo using Quip tooling; (2) 6-job/3-machine load-imbalance
QUBO/Ising solved locally + a real job on Quip's compute network. All via pip, testnet only.

## Sources consulted (in order)

1. https://quip.network — vendor homepage. Found: docs link (quip.gitbook.io), GitHub org
   (github.com/quipnetwork), "worldwide quantum computer" compute marketplace, post-quantum
   wallets, testnet live, QUIP token, D-Wave partner.
2. https://github.com/quip-network — 404. Correct org is capitalized: QuipNetwork.
3. https://pypi.org/pypi/quip/json — DEAD END: PyPI package "quip" is an unrelated
   "Quick user interfaces for Python" (github.com/feihong/quip). Not Quip Network.
4. https://quip.gitbook.io/docs/ — 404. Stale link from homepage.
5. https://docs.quip.network/ — redirects to https://developers.quip.network/docs
   (canonical docs host).
6. https://developers.quip.network/docs/getting-started/quip-sdk — OFFICIAL SDK PAGE:
   Python packages are `xquad` (modeling, Ising format) and `xqsa` (solver adapters,
   incl. SolverQuip network backend via `xquad[quip]`). JS: @quip.network/ethereum-sdk@beta,
   @quip.network/hashsigs-wasm@rc (SHRINCS, current sig scheme). WOTS+ libs are
   previous-generation. Requires Python 3.13+.
7. https://developers.quip.network/docs/compute/submit-a-job — job flow docs:
   `pip install "xquad[quip]"`; local solver = SolverDWaveCPU (simulated annealing);
   network solver = SolverQuip(url=..., keystore=...); coefficients are fixed-point
   thousandths; jobs must fit a registered mineable topology; "Connection details for
   the public test network have not been published yet" (as of doc's writing) — POTENTIAL
   BLOCKER for real submission; result readable via query() by order identifier.
8. https://api.github.com/orgs/QuipNetwork/repos — org has xq-py ("A python implementation
   of the Quip Network's quantum virtual machine"), quip-miner, hashsigs-*, etc.

## Commands that mattered

- curl probes of docs.quip.network subpaths (found redirect to developers.quip.network).
- PyPI JSON API probes for candidate package names (quip* → only unrelated "quip" exists).

## Guesses / deviations / workarounds

- GUESS: signing demo may need Quip's Python signing extension inside xqsa's [quip]
  extra (hybrid classical + post-quantum signatures), since JS-side SHRINCS signer is
  npm-only per docs. Will verify by reading installed package source/docs.
- DEVIATION so far: none from official install command (pip install "xquad[quip]").
- RISK: Python 3.13+ required by xquad — must check this machine's python3; may need to
  install CPython 3.13.

(kept appending below as work proceeds)

## Continued

9. https://developers.quip.network/docs/getting-started/use-with-ai.md — docs have `.md`
   mirrors (append .md to any page URL) + /llms.txt + /llms-full.txt indexes. Used .md
   mirrors from here on; they are MORE CURRENT than the HTML pages (see #13).
10. https://developers.quip.network/docs/llms.txt — full page index (24 pages).
11. https://developers.quip.network/docs/getting-started/quickstart.md — PQ keys via
    account.quip.network or hashsigs libraries (rust/c++/ts/solidity listed; python
    hashsigs NOT listed in docs though PyPI has one by QuipNetwork — see #5/#16).
12. https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts.md —
    Quip Accounts use SHRINCS (XMSS/FIPS 205 lineage, RFC 8391); slot discipline for
    one-time keys. No Python API documented here.
13. https://developers.quip.network/docs/compute/submit-a-job.md — CURRENT VERSION:
    `SolverQuip.for_network("aglais", keystore=...)` connects to the PUBLIC TEST NETWORK
    "aglais" with published node+faucet addresses (the earlier HTML page said testnet
    details "have not been published" — stale). Faucet: POST
    https://faucet.aglais.quip.network/request {"dest": addr}; solve() auto-funds from
    faucet by default. `topology="native"` submits over the model's own graph (skips
    placement; SA miners on testnet can solve native jobs). quote() previews cost.
    NOTE: keystore defaults to ~/.quip/keystore.json — project rules require ./keys instead.
    NOTE: on macOS, quip-signer builds from source (needs Rust) — machine has rustc 1.95.
    Tutorial links: /docs/xquad/solving/quip-first-job.html, quip-network.html (failure
    taxonomy) — .md mirror 404s; see command log.
14. https://developers.quip.network/docs/compute/ising-topologies.md — topology constraints:
    jobs placed as subgraph of registered topology; min 16 nodes / max 5000 nodes, 50000
    edges; coefficients = whole numbers ×1000 (thousandths), 32-bit signed; native mode
    skips placement. 6-jobs×3-machines = 18 vars (OK ≥16) with 45 couplings (3 disjoint
    6-cliques) — native mode is the safe fallback if embedding fails.
15. PyPI JSON: quip-signer 0.3.0 "Quip hybrid (sr25519 + FN-DSA-512) transaction signer"
    (Falcon-512 = post-quantum), pulled by xqsa[quip]. xqcp = CP DSL; xqffi = PyO3 bindings.
16. PyPI JSON: hashsigs 0.0.2 (github.com/quipnetwork/hashsigs-py) — WOTS+ in Python,
    requires_python>=3.8, no hard deps. Docs call WOTS+ "previous-generation" vs SHRINCS.

## Commands that mattered (continued)

- `python3 -m venv .venv_probe && .venv_probe/bin/pip install xquad` with system python3
  = 3.9.6 → ERROR "Could not find a version that satisfies the requirement xquad (from
  versions: none)". Vendor requires Python >=3.13. WORKAROUND: create .venv with
  /opt/homebrew/bin/python3.13. The user's literal command only works where `python3`
  resolves to >=3.13.
- Background: `/opt/homebrew/bin/python3.13 -m venv .venv && pip install "xquad[quip]==0.4.2"`
  (session proc_ad4d6ed12822). quip-signer builds from source on macOS via cargo.
- curl fetches of docs .md mirrors into docs_cache/.

## Guesses / deviations / workarounds (continued)

- KEystore path deviation (rule-driven): use keystore="./keys/keystore.json" instead of
  docs' ~/.quip/keystore.json default; fresh throwaway key per rules; never print key contents.
- Python interpreter deviation (constraint): venv built with python3.13, not system python3.
- The solver-reference pages linked from submit-a-job (.html) have no working .md mirror
  at the paths tried — will try HTML variants; if unavailable, inspect installed xqsa
  source for exact SolverQuip signature/behavior (reading installed package code, not docs).
- (update: those pages exist at .html URLs, no .md mirror; fetched via web_extract —
  the .md 404 pages were saved into docs_cache/*.md by mistake; HTML content captured
  in transcript. Full reference content summarized in next entries.)

17. https://developers.quip.network/docs/xquad/solving/quip-network.html — SolverQuip
    reference (derived from xqsa/quip.py + spec/xqsa/SOLVERS.md). Key facts:
    `SolverQuip.for_network("aglais")` preset (public testnet; "devnet" = local Docker
    stack — NOT touched per machine rules). Config precedence: ctor args > env vars
    (QUIP_RPC_URL, QUIP_SIGNER_SEED, QUIP_KEYSTORE, QUIP_REWARD, QUIP_FAUCET_URL,
    QUIP_AUTOCONFIRM, QUIP_AUTOFUND, QUIP_TOPOLOGY). Keystore default ~/.quip/keystore.json
    → we override to ./keys/keystore.json. quote() = JobQuote without submitting.
    solve() polls to finality by block height; result.metadata carries order_id, solver
    (miner account), best_energy_milli (milli-scale SPIN), energy_matches_chain (canary),
    num_submissions, num_solutions. BINARY→SPIN basis change folds quadratics into
    linears (h_i = a_i/2 + Σb/4) — watch i32 milli overflow for high-degree vars.
    Native mode: topology="native" (ctor, per-call, or QUIP_TOPOLOGY=native) — model's
    own graph, placement identity, no PlacementError; SA miner fleet can solve natives.
    Failure taxonomy: EncodingError, PlacementError, QuipSigningError, QuipConnectionError,
    QuipMetadataError, QuipSubmissionError, QuipCancelledError, QuipFaucetError,
    QuipTimeoutError (carries order_id), QuipJobFailedError (carries order_id).
18. https://developers.quip.network/docs/xquad/solving/quip-first-job.html — end-to-end
    tutorial against aglais (2026-09-28, specVersion 118): 16-var BINARY TSP model,
    `SolverQuip.for_network("aglais", topology="native")`, quote ≈1.0019 AGLS
    (MinReward=1 AGLS + fee ~0.0019 burned), solve() drew 10 AGLS faucet drip
    automatically (autofund default True) and returned in ~89s; order_id=150 example.
    Import in tutorial: `from xquad.sa import SolverQuip`. Native mode used because
    even the tutorial's TSP model fails placement on the default topology — confirms
    native mode is the practical path for arbitrary shapes. AGLS token has 12 decimals
    (1 AGLS = 1e12 planck). Failed/no-solution job: reward reclaimed best-effort, fee burned.
19. https://developers.quip.network/llms.txt — site-root index notes hashsigs-rs "with
    ports for TypeScript, Solidity, Python, and C++" — i.e. the Python hashsigs
    package IS an official port (the quickstart page just doesn't list Python).

## Environment / toolchain notes (commands + errors)

- quip-signer sdist fetched into vendor_src/ (34 kB) and unpacked; its Python API read
  from python/quip_signer/__init__.pyi + transaction-crypto-py/README.md + tests:
  HybridSigner.from_seed(32B) -> .public_key (929B H4), .account_id (32B), .sign(bytes)
  -> SCALE envelope; verify_envelope(payload, envelope, account_id) -> bool (False for
  wrong message; QuipSignerError for malformed envelope). H4 = sr25519 + FN-DSA-512
  (Falcon-512, NIST PQC). sign_demo.py built on exactly this API.
- FIRST INSTALL ATTEMPT (background, python3.13 -m venv + pip install xquad[quip]):
  pip stalled 15+ min at ~0% CPU inside PEP-517 build isolation while "Installing
  build dependencies: maturin" — build-env overlay stayed empty. lsof showed one
  ESTABLISHED + one CLOSE_WAIT TCP connection to PyPI (Fastly 151.101.x.x). Root cause:
  the machine's network is throttled to ~10-40 KB/s right now (curl measurements:
  files.pythonhosted ~12 KB/s, speed.cloudflare ~42 KB/s). Killed ONLY my own process
  tree (PIDs 67240/80205/80206/80243 — the install I launched; no other processes
  touched). 
- SECOND INSTALL ATTEMPT: pip install maturin first, then xquad[quip] with
  --no-build-isolation (avoids re-downloading maturin/setuptools per sdist build env)
  plus --timeout 90 --retries 50 --progress-bar off (auto-retry through stalls).
  Ran ~2 min, still crawling on pypi.org.
- THIRD INSTALL ATTEMPT (current): measured mirror speeds — tuna
  (pypi.tuna.tsinghua.edu.cn) numpy wheel 5.3 MB at ~32 KB/s vs pythonhosted at
  ~12 KB/s. Killed the second attempt (own PIDs only) and restarted with
  PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple. DEVIATION: mirror index
  used only because this machine's route to PyPI/Fastly is throttled; requirements.txt
  is unchanged and installs from normal PyPI for the user.
- PARALLEL PATH: to unblock sign_demo sooner, building quip-signer directly from the
  already-downloaded sdist with the local Rust toolchain:
  `cargo build --release` in vendor_src/quip_signer-0.3.0/transaction-crypto-py
  (crate _quip_signer, pyo3 0.23 abi3-py39; deps incl. pqhybridsign 0.0.0-rc9 — the
  hybrid Falcon+sr25519 crate). ~/.cargo/registry already has a 395MB cache on this
  machine (pre-existing; cargo uses it as a standard cache, nothing was read/modified
  beyond builds). Fallback if bare cargo misses macOS extension link args:
  RUSTFLAGS="-C link-arg=-undefined -C link-arg=dynamic_lookup".
  Plan: drop built _quip_signer.abi3.so into the sdist's python/quip_signer/ package
  dir and run sign_demo with PYTHONPATH pointing at it (pure-Python __init__.py
  re-exports the extension) while pip grinds on the full toolchain for compute_job.py.
- compute_job.py hardened: if SolverQuip.for_network("aglais") cannot connect, retry
  with QUIP_RPC_URL=wss://bootnode-1.aglais.quip.network:20049/rpc +
  QUIP_FAUCET_URL=https://faucet.aglais.quip.network (the endpoints published on
  https://aglais.quip.network, fetched and recorded in docs_cache/aglais.html).
  Note from docs: an explicit url= suppresses the faucet env var, hence env-var form.
- SIGN_DEMO EXECUTED SUCCESSFULLY (part 1 DONE): built _quip_signer cdylib with bare
  cargo → LINK FAILED (undefined Python symbols: exactly the `-undefined
  dynamic_lookup` quirk the crate's Cargo.toml comment warns about). Rebuilt with
  RUSTFLAGS="-C link-arg=-undefined -C link-arg=dynamic_lookup" → OK in 32s
  (target/release/lib_quip_signer.dylib). Copied it to the sdist's
  python/quip_signer/_quip_signer.abi3.so and ran:
  PYTHONPATH=vendor_src/quip_signer-0.3.0/python python3.13 sign_demo.py
  → EXIT 0: fresh throwaway seed in keys/sign_demo_seed.bin (never printed),
  H4 keypair (929B public + 32B account id), verify(original)=True,
  verify(tampered message)=False, verify(tampered signature)=False,
  verify(other account)=False. Public key + signature hex printed as evidence
  (public material only; seed/private key never printed).
- pip xquad[quip] phase-2 attempt #1 FAILED: FileNotFoundError 'maturin' during
  xqffi metadata generation — pip's build subprocess did not see .venv/bin on PATH
  because the venv was never activated. maturin itself WAS installed (.venv/bin/
  maturin exists). Fix: export PATH="$PWD/.venv/bin:$PATH" (or activate) and re-run.
- Killed the parallel pip-download prefetch (own PID 10506 + its children only,
  via pkill -P 10506 — precise, not a broad pattern) to free bandwidth.
- FINAL INSTALL ATTEMPT (PATH fixed, tuna index, retries 50): ran ~7 more minutes;
  site-packages never grew past {maturin, pip}; pip sat at ~0% CPU with no active
  TCP transfer. The machine's network could not deliver the remaining ~25 MB of
  wheels/sdists (numpy 5.3 MB, dwave-samplers, dimod, substrate-interface, xqffi,
  quip-signer) within the run budget. Stopped my own install process (PID 82243
  tree, precise pkill -P + kill; nothing else touched). compute_job.py therefore
  did NOT execute against the network on this machine; its QUBO was validated
  offline (check_qubo_math.py) and its code follows the official docs exactly.
- Closing state of deliverables: sign_demo.py EXECUTED (exit 0, full evidence in
  RESULT.md); compute_job.py complete + validated offline, execution BLOCKED by
  the environment's network; requirements.txt correct for a normal network
  (python>=3.13 + Rust toolchain needed on macOS for quip-signer, as documented
  by the vendor); DEVLOG.md and RESULT.md current.
- PyPI JSON API intermittently returns truncated bodies on this network (json.loads
  failed mid-document for maturin/hashesigs queries) — retry with smaller endpoints.
- CWD quirk: terminal() and execute_code() share a persistent cwd; a `cd vendor_src`
  in an early command moved BOTH, which made later relative-path finds fail. Fixed by
  explicitly cd-ing back to the project root; all work stays in the project dir.
- check_qubo_math.py (stdlib-only, run with system python3): validates that the QUBO
  expansion in compute_job.py has its global optimum at loads 9/9/9 and that the
  expanded-coefficient form equals the direct objective for all 3^6=729 assignments.

