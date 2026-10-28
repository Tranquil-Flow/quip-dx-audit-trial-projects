# DEVLOG

Project: Quip Network post-quantum (hash-based) signature demo in Rust.

Goal: Find Quip Network's published Rust crate on crates.io (if any), build a CLI demo
that generates a keypair, signs a message, verifies it, and shows tampered verification
failure. Must run with `cargo run --release`.

## Research log (URLs/sources in order consulted; no clock times)

1. web_search `"Quip Network" post-quantum signatures` — DuckDuckGo timed out / rate-limited (3 failures). Dead end; switched to direct API/site fetching.
2. https://crates.io/api/v1/crates?q=quip (curl, UA set) — found: `quip` (UNRELATED: quasi-quoting macros by michaelni678), and Quip Network crates `quip-proto` / `quip-protocol` / `quip-solver-core` / `quip-solver-conformance` (solver/mining protocol crates, homepage quip.network, repo gitlab.com/quip.network/quip-solver-core).
3. https://crates.io/api/v1/crates/quip — confirmed unrelated (quote/syn macros).
4. Direct probes of quip.network / www.quip.network / quipnetwork.com — apex https failed (SSL_ERROR_SYSCALL); https://www.quip.network/ 200 but slow (page partially timed out at 20s; fetched fully with longer timeout later). quipnetwork.com does not resolve.
5. https://www.quip.network/ (web_extract) — Quip Network = "worldwide quantum computer" blockchain (PoUW), Asset Layer with "quantum-resistant wallets" wrapping MetaMask/Ledger/Safe; testnet live; founders Colton Dillion, Dr. Richard Carback; token QUIP. Mentions "hash-based" signatures in docs.
6. Homepage HTML link harvest (curl + python) — found https://developers.quip.network/docs, https://github.com/quipnetwork, https://gitlab.com/quip.network/* (via repo fields), whitepaper PDF, audit report link (oak-security audit 2026-09-24), discord.
7. https://gitlab.com/api/v4/groups/quip.network/projects?per_page=100 — full repo list. KEY FINDING: repos `hashsigs-rs`, `hashsigs-py`, `hashsigs-cpp`, `hashsigs-ts`, `hashsigs-solidity` — the signature libraries. Also `arch-sdk`, `ethereum-sdk`, `cpp-sdk`, `pqhybridsign`.
8. https://crates.io/api/v1/crates?q=hashsigs — `hashsigs-rs` 0.2.1-rc9 "Hash-based signatures core library with WOTS+ and SHRINCS primitives", repo gitlab.com/quip.network/hashsigs-rs. THIS IS THE CRATE. (Also their `pqhybridsign` family exists for hybrid classical+PQ.)
9. Exact-name probes: `hashsigs`, `quip-hashsigs`, `quip-hashsigs-rs` → 404. Only `hashsigs-rs` exists.
10. https://gitlab.com/api/v4/projects/quip.network%2Fhashsigs-rs — public, default branch main.
11. https://crates.io/api/v1/crates/hashsigs-rs/versions — 0.0.1 (2025-03), 0.0.2 (2025-08), then 0.2.1-rc2..rc9 (2026-08). All AGPL-3.0-or-later.
12. https://crates.io/api/v1/crates/hashsigs-rs/0.2.1-rc9/dependencies — runtime deps: serde, sha2, sha3, zeroize (optional: wasm/rayon/solana/tsify). No getrandom at runtime (library has NO RNG — caller supplies the 32-byte seed; confirmed later in README).
13. https://docs.rs/hashsigs-rs/ — DOCS OUTDATED: only documents 0.0.2 (WOTS+ only). Had to read source instead. (docs.rs default-version lag for rc versions.)
14. https://developers.quip.network/docs/quip-interlock-protocol/quip-accounts — conceptual doc: SHRINCS = hash-based one-time keys under one commitment; stateful everyday path (slot budget, one-time use!) + stateless break-glass path; ERC-1271 view-only checks; "track your slots" discipline; RFC 8391 / FIPS 202 / FIPS 205 / ERC-7913 lineage.
15. Repo README (raw via GitLab API, saved to research/hashsigs-rs-README.md, 982 lines) — full API + profile docs: 6 profiles (256s keccak/sha2, 128s-q18/q20 keccak/sha2); default = 256s keccak; key sizes (SK 264 B, public bundle 164 B, on-chain commitment 32 B); signature sizes (stateful 2,084+32·L B; stateless 29 KB); timings (256s: keygen 440 ms, stateful sign 350 ms, verify 0.16 ms on 5950X); messages are exactly 32 bytes (caller pre-hashes); `import`/`to_bytes` 264-byte flat secret; MSRV Rust 1.95; AGPL-3.0.
16. Source files fetched from GitLab raw API into research/: src/lib.rs, src/verifier.rs, src/shrincs/{mod,signer,verifier,key,signature,uxmss}.rs, src/profiles/{mod,selected}.rs, src/sphincs_plus_c/mod.rs, examples/bench_keygen_sign.rs, Cargo.toml.
    - API used by demo (verified against source):
      - `hashsigs_rs::profiles::selected::{SelectedProfile, NUM_CHAINS, NUM_LAYERS}`
      - `ShrincsSigner::keygen::<P, NUM_CHAINS, NUM_LAYERS>(seed: &[u8], max_stateful_signatures: u32) -> Option<(Keys, PublicKey)>`
      - `hashsigs_rs::shrincs::sign::<P, NUM_CHAINS>(&mut keys, &[u8; 32]) -> Option<Vec<u8>>` (stateful envelope = abi.encode(PublicKey, Signature))
      - `ShrincsVerifier::new().verify(&commitment_bytes, &hash, &envelope) -> VerifyOutcome` via `VerifierInterface`
      - `Keys::to_bytes() -> [u8; 264]`, `Keys::from_bytes::<P>(&[u8])`, `ShrincsSigner::import_signing_key` (validating import)
      - state accessors: `keys.stateful().next_leaf_index()`, `.public_key().max_signatures`
      - `VerifyOutcome::{Valid, Invalid, Malformed}`
17. https://gitlab.com/api/v4/projects/quip.network%2Fhashsigs-rs/repository/tags — v0.2.1-rc9 = commit 0c878e84.
18. Diffed the 7 API-relevant source files between `main` and tag `v0.2.1-rc9`: ALL IDENTICAL → source reading is valid for the published crate. (First diff attempt had a filename collision + one curl HTTP2 error + a cwd drift into research/ and an over-long inline command blocked by the agent shell parser — rewrote as scripts/compare_rc9.sh, bash-3.2 compatible, and ran clean.)

## Commands that mattered (research phase)

- curl crates.io API searches (above)
- curl https://www.quip.network/ (needed -m 60; apex domain TLS fails, www works)
- curl GitLab API v4 group/project/file endpoints
- scripts/compare_rc9.sh (main vs rc9 tag diff)
- Toolchain check: cargo/rustc 1.95.0 aarch64-apple-darwin (matches crate MSRV exactly)

## Deviations / guesses so far

- DuckDuckGo web_search unusable (rate limit) → used crates.io REST API + direct site fetches instead.
- docs.rs stale for rc9 → read source from GitLab (recorded above).
- Quip publishes MANY crates; the signatures one is named `hashsigs-rs`, NOT `quip-*`. Naming is non-obvious (found only via GitLab group listing).
- No dev-portal quickstart for pure-Rust signing found so far (developer docs are account/wallet-oriented); the README + source is the real documentation.

## Build log

- `cargo build --release` — SUCCESS first try (18.7 s; deps: serde, sha2, sha3, zeroize, getrandom, hex). No build.rs issues, no feature flags needed (default profile = shrincs-256s-keccak).
- Error 1 (mine): non-ASCII em-dash inside a byte-string literal `b"..."` — compiler rejected. Fixed to ASCII hyphen.
- `cargo run --release` run #1 — all asserts passed, EXIT=0. BUT I noticed section [7] reloaded a secret saved BEFORE the first sign, so msg#2 was signed with leaf 1 again (one-time leaf REUSE — exactly the footgun Quip's docs warn about; the library permits it, security discipline forbids it). Fixed: persist state AFTER every stateful sign.
- Run #2 (after fix) — leaf counter 1->2, reload at 2, advances to 3. Correct slot discipline.
- Error 2 (mine): added stateless section using `tampered_hash_pre` before its definition — E0425 compile error. Hoisted the computation above section [4].
- Run #3 (final) — ALL PASS, EXIT=0. Added stateless break-glass path: 564.9 ms sign, 91,680 B envelope (README documents ~91,200 B packed + ABI framing — matches), verify Valid, tampered Invalid, leaf counter unchanged (stateless consumes no one-time leaf).
- Removed initial redundant save so ./keys always reflects post-sign state.

## Errors / dead ends (honest list)

1. web_search (DuckDuckGo) rate-limited 3x — abandoned for direct API fetches.
2. https://quip.network (no www) — TLS SSL_ERROR_SYSCALL, unusable.
3. quipnetwork.com — NXDOMAIN.
4. docs.rs hashsigs-rs — stale (0.0.2 only); read GitLab source instead.
5. crates.io `quip` — unrelated crate (quasi-quote macros); red herring.
6. compare script v1 — bash associative-array syntax on macOS bash 3.2 → syntax error; rewrote POSIX-ish.
7. compare script v2 — ran from wrong cwd after an earlier `cd research` persisted; also over-long inline command was blocked by the agent's shell-parser hardline (saved to blocked-scripts, not retried inline); rewrote as a file-based script and ran clean.
8. One curl HTTP2 framing error mid-download — retried with --http1.1, fine.
9. Non-ASCII literal compile error (above).
10. tampered_hash_pre ordering compile error (above).
11. Leaf-reuse logic bug in my demo (above) — the most important one; it reproduces exactly the "signing from a stale snapshot" footgun the vendor docs describe.

## Guesses / judgment calls

- Chose default profile (shrincs-256s-keccak) rather than a 128s variant: README marks 128s-q20 as lacking security-analysis backing, and 256s is the documented default. 128s also costs 45 s keygen.
- max_stateful_signatures = 16 (throwaway demo budget; limit is 4096).
- Used SHA-256 to pre-hash the message: README says messages are exactly 32 bytes and callers pre-hash; profile-256s scheme hashes are keccak internally but the signed "message" input is caller-chosen. (verify() recomputes everything from the commitment, so any 32-byte hash works.)
- Included hex dep for PUBLIC material only; secrets never printed.
- `.gitignore` covers /target and /keys.

## Final verification

- `cargo run --release` — EXIT=0, all 8 sections pass (transcript in RESULT.md).
- keys dir contains only the throwaway demo secret, mode 0600.
