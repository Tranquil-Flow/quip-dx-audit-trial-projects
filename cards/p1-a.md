# p1-a

- **Round:** Round 5
- **Model:** Claude Sonnet 5.5
- **Task:** Rust dev: PQ keygen, sign, verify and tamper check with the Rust crate
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Rust dev: PQ keygen, sign, verify and tamper check with the Rust crate | Claude Sonnet 5.5 | hashsigs-rs 0.2.1-rc9 (SHRINCS) | Built and working (off-chain) | 25 min | The crate's README and `examples/` have no sign/verify snippet, so the builder read the source; docs.rs `latest` is the legacy 0.0.2 [C-PER-02, C-SDK-11]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** Claude Sonnet 5.5.
- **What it does:** A Rust command-line demo, run with `cargo run --release`. It derives a SHRINCS key from a random seed, signs a SHA-256 payload hash through the stateful action API, verifies it, and shows that a different payload hash fails. Off-chain only.
- **Quip products and integration:** `hashsigs-rs` 0.2.1-rc9 (crates.io) — NATIVE. The builder pinned the pre-release because the crate's default version is the legacy 0.0.2.
- **Evidence:** Off-chain; no transactions or addresses. First rebuild: works (built from a clean copy with cargo 1.95.0; keygen about 43 ms, sign 662 µs, a 2304-byte signature, original valid, tampered invalid, exit 0). Second rebuild: works (clean build from the lockfile with a fresh key; original valid, tampered invalid). Three claims in the builder's write-up were wrong: it says verifying an arbitrary raw message is not public, which holds for the `verify_*_unsafe_raw` functions (crate-private) but not for the public raw-hash verify on `ShrincsVerifier`, so the workaround through the action context was unnecessary; it says the crate tarball is 548 MB, when the `.crate` file is 3.1 MB; and its demo is narrower than the other Rust build (stateful path only, no saved key state).
- **Time:** 25 min.
- **Key Quip call** (`src/main.rs:36-37, 44-45, 50, 54`, excerpt):
```rust
let (mut sk, pk) = ShrincsSigner::keygen::<SelectedProfile, NUM_CHAINS, NUM_LAYERS>(&seed, 4)
    .expect("keygen");
...
let sig = ShrincsSigner::sign_stateful_action::<SelectedProfile, NUM_CHAINS>(&mut sk, &pk, &c)
    .expect("sign");
...
let ok = v.verify_stateful(commitment, &pk, &c, &sig);
...
let bad = v.verify_stateful(commitment, &pk, &tampered, &sig);
```
- **What got in the way:** The crate's README has one Rust snippet, a type-alias import, and `examples/` holds only benchmarks, so both Rust builders read the source to learn the API and reached different public verify paths [[C-PER-02](https://docs.rs/crate/hashsigs-rs/0.2.1-rc9/source/examples/)]. docs.rs `latest` still resolves to the legacy 0.0.2 crate [[C-SDK-11](https://crates.io/crates/hashsigs-rs/versions)]; docs.rs has since built 0.2.1-rc9, so the builders' claim that no rc9 docs exist is out of date.
