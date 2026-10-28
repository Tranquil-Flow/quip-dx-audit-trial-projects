# RESULT.md — Quip Network demos

Status: PARTIAL — sign_demo.py WORKING (executed successfully on this machine);
compute_job.py COMPLETE and math-validated, its execution is blocked/limited by
this machine's severely throttled network during the final `pip install`
(cut-off risk: this file is kept current).

## What was built
1. sign_demo.py — Quip post-quantum keypair via Quip's official `quip-signer`
   package (H4 hybrid scheme: classical sr25519 + FN-DSA-512 / Falcon-512, the
   signer the Quip chain itself requires). Signs a message, verifies it, and
   proves tampered message / tampered signature / wrong account all FAIL.
2. compute_job.py — 6 jobs (3,5,2,7,4,6) -> 3 machines as a QUBO/Ising model
   (18 binary vars, penalty P=100, target load 9). Solves locally with Quip's
   xqsa SolverDWaveCPU (simulated annealing), then submits a REAL job to Quip's
   public test network "aglais" with xqsa SolverQuip (native topology), printing
   both results + the on-chain job identifier (order_id). Falls back to the
   bootnode endpoints published on aglais.quip.network if the preset cannot
   connect. --local-only flag skips the network step.

## How to run (final)
    python3.13 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
    python3 sign_demo.py
    python3 compute_job.py            # add --local-only to skip the network job

IMPORTANT: the vendor requires Python >= 3.13 (xquad/xqsa/xqffi/xqvm-py metadata
all say requires_python >=3.13). On THIS machine the default `python3` is 3.9.6,
so `python3 -m venv .venv` + pip install fails with "Could not find a version that
satisfies the requirement xquad (from versions: none)". Use a 3.13 interpreter
(here: /opt/homebrew/bin/python3.13). On macOS, `quip-signer` is built from
source during pip install and needs a Rust toolchain (this machine has rustc 1.95).

What the machine DID run (evidence for part 1; part 2 pending the install):
    PYTHONPATH=vendor_src/quip_signer-0.3.0/python /opt/homebrew/bin/python3.13 sign_demo.py

## Evidence — sign_demo.py (EXECUTED, EXIT 0)
    [keys] generated fresh throwaway seed -> keys/sign_demo_seed.bin (32 bytes; contents not shown)
    [1] keypair generated (Quip H4: sr25519 + FN-DSA-512)
        public key (929 bytes): c4468ad51fa42051...935010000  (truncated; full hex in terminal log)
        account id (32 bytes): 2d1a72bb3ce0160c48f4040ee6eadc036d99535e0dc7f7219ccfc056fa6ea10b
    [2] signed message (72 bytes) -> signature envelope (1660 bytes, SCALE-encoded)
    [3] verify(original message)  -> True
    [4] verify(tampered message)  -> False
    [5] verify(tampered signature) -> False
    [6] verify(other account)     -> False
    RESULT: keypair OK, signature verifies, all tamper tests fail as they must.

- Throwaway key material lives in ./keys (sign_demo_seed.bin chmod 600). The
  seed/private key was NEVER printed; only public key, account id and signature
  (public material) appear above.
- How the signer was obtained despite the network: official quip-signer 0.3.0
  sdist downloaded from PyPI into vendor_src/, its Rust cdylib compiled with the
  local toolchain (cargo build --release + RUSTFLAGS link args for macOS
  extensions), placed as python/quip_signer/_quip_signer.abi3.so. Under normal
  network conditions `pip install -r requirements.txt` builds it automatically.

## Evidence — QUBO model (check_qubo_math.py EXECUTED, stdlib-only)
    optimum energy (expanded QUBO, constants dropped): -843.0
    optimum assignment (job -> machine): [0, 1, 2, 2, 1, 0]  -> loads [9, 9, 9], imbalance 0
    expanded-form == direct-form minus constant for all 3^6=729 assignments: OK
    balanced 9/9/9 split confirmed: OK

## Evidence — compute_job.py on Quip Network (PENDING — install blocked by network)
- Script complete at /private/tmp/projects/proj-72071d/compute_job.py; validated
  offline (QUBO optimum known: energy -843, loads 9/9/9).
- Network path per official docs: SolverQuip.for_network("aglais", keystore=
  "./keys/quip_keystore.json", topology="native"); quote() then solve(); job
  identifier printed from result.metadata["order_id"]. Testnet endpoints
  confirmed on https://aglais.quip.network: wss://bootnode-{1-3}.aglais.quip.
  network:20049/rpc, faucet https://faucet.aglais.quip.network/request
  (solve() auto-draws a 10 AGLS drip on the testnet — free faucet money only).
- Blocker: `pip install "xquad[quip]==0.4.2"` could not complete in the time
  budget because this machine's route to PyPI/Cloudflare/crates.io is throttled
  to ~10-40 KB/s (measured). numpy alone is a 5.3 MB wheel. Multiple retry
  strategies were tried (see DEVLOG.md): long timeouts/retries, tuna mirror
  (2-3x faster), --no-build-isolation, pre-seeded maturin, PATH-fixed retries,
  parallel prefetch. Final state: site-packages held only maturin+pip when the
  budget ended; the install was stopped cleanly (own process only). On a normal
  network the documented flow works as written — the vendor's own tutorial
  (developers.quip.network/docs/xquad/solving/quip-first-job.html) shows a full
  end-to-end run against aglais with order_id returned in ~89 s.

## What did not work / why
- Default `python3` (3.9.6) cannot install the vendor toolchain (needs >=3.13).
- First pip attempt: hard-stalled 15+ min at ~0% CPU downloading maturin under
  build isolation (network). Killed own process tree only; retried.
- pip without venv activation: xqffi sdist metadata build could not find the
  `maturin` executable (FileNotFoundError) — fixed by putting .venv/bin on PATH.
- Bare `cargo build` of quip-signer: link failure (undefined Python symbols) —
  fixed with RUSTFLAGS="-C link-arg=-undefined -C link-arg=dynamic_lookup"
  (the crate's own Cargo.toml documents this macOS quirk; docs never mention it
  for the manual-build path).
- PyPI package "quip" is an unrelated project ("Quick user interfaces for
  Python"); Quip Network's Python packages are xquad/xqsa/quip-signer.
- Doc inconsistencies: quip.network homepage links quip.gitbook.io (404);
  docs.quip.network redirects to developers.quip.network; the HTML copy of
  submit-a-job says testnet connection details "have not been published" while
  the current .md mirror documents for_network("aglais") + faucet; quickstart's
  library list omits the Python hashsigs port; the xquad book's solving/*.html
  pages have no .md mirror.

## What would have made this easier (vendor docs/tools)
- Published macOS wheels for quip-signer and xqffi (both sdist-only on macOS →
  local Rust build; the Rust requirement is documented but wheels would remove it,
  and the manual-cargo link-arg quirk is undocumented).
- A single canonical, current copy of each docs page (HTML vs .md disagree on
  whether testnet endpoints are published).
- A "first job" tutorial output that includes the exact SolverQuip constructor
  kwargs for a non-default keystore path (docs always show ~/.quip/keystore.json).
- Listing the Python package (hashsigs) in the quickstart's "use the libraries"
  section alongside rust/c++/ts/solidity.
