# DEVLOG
1. `cargo search quip` -> no obvious signature crate (quip-proto, quip-protocol, quip-solver-* are annealing solver stuff, not signatures).
2. Web search "Quip Network post-quantum hash-based signatures Rust crate" -> pointed to github.com/quipnetwork (hashsigs-rs).
3. `cargo info hashsigs-rs` (first try hung >120s in a multi-command loop, moved to background; finished OK). `hashsigs`, `quip-hashsigs` do not exist.
4. curl crates.io API (zsh glob error on unquoted `?`; retried quoted) -> hashsigs-rs max 0.2.1-rc9, default/stable 0.0.2. Repo URL in crates.io = gitlab.com/quip.network/hashsigs-rs; homepage github.
5. Read README via raw.githubusercontent.com/quipnetwork/hashsigs-rs/main. README says WOTS+ is legacy, use SHRINCS. Cargo.toml says rust-version 1.95 (we have 1.95.0), AGPL-3.0 license (note for commercial backend!).
6. Downloaded crate tarball into ./src_ref to read source (docs gap).
7. Tarball download via curl `-m 60` was truncated (tar: "truncated gzip input" on a huge test fixture JSON; ~290KB downloaded, uncompressed original ~548MB(!) per gzip header). Source files I needed (src/, examples/) extracted fine anyway. No docs.rs/API usage guide read; I **read source code** (src/shrincs/signer.rs, verifier.rs, action_context.rs, examples/bench_keygen_sign.rs) because README has no quickstart snippet.
8. Guess/deviation: verifying arbitrary raw messages is not public (`verify_*_unsafe_raw` are `#[cfg(test)]`). I used the public action API: message -> SHA-256 -> `ActionContext.payload_hash`, fixed other context fields, `sign_stateful_action` + `ShrincsVerifier::verify_stateful`. Tamper = different payload hash. This is my interpretation, not an official example.
9. Used the stateful (cheap) path only; did not demo the stateless SPHINCS+C path (slow 256s profile). Stateful leaves are one-time: state must be persisted by the caller (demo uses max 4 signatures and does not persist counter).
10. Dependency must be pinned `=0.2.1-rc9` (pre-release; default `0.0.2` is legacy WOTS+ with a different API). License AGPL-3.0-or-later.
11. `cargo run --release` : first build ~3 min, no errors. Output: keygen 44ms, sign 0.6ms, sig 2304 bytes, original VALID, tampered INVALID. Seed generated with getrandom into ./keys/demo_seed.bin, never printed. Removed ./src_ref afterwards.
