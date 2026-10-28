# p1-b

- **Round:** Round 5
- **Model:** GLM-5.2
- **Task:** Rust dev: PQ keygen, sign, verify and tamper check with the Rust crate
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Rust dev: PQ keygen, sign, verify and tamper check with the Rust crate | GLM-5.2 | hashsigs-rs 0.2.1-rc9 (SHRINCS) | Built and working (off-chain) | 28 min | Same [C-PER-02, C-SDK-11]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GLM-5.2.
- **What it does:** A Rust command-line demo, run with `cargo run --release`, in eight sections: a fresh SHRINCS keypair, a stateful sign, verification, three tamper cases (message, signature, commitment), a stateless SPHINCS+C sign and verify, then a reload of the saved key from `./keys` and a second sign on the next one-time leaf. Off-chain only.
- **Quip products and integration:** `hashsigs-rs` 0.2.1-rc9 (crates.io) — NATIVE.
- **Evidence:** Off-chain; no transactions or addresses. First rebuild: works (clean copy, cargo 1.95.0; all eight sections passed, exit 0; the stateful envelope is 2784 bytes, as the README gives, and the stateless one 91,680 bytes; the stateless path took 572 ms against the 565 ms claimed). Second rebuild: works (clean build from the lockfile; every positive and negative check passed). The builder's note that docs.rs documents only 0.0.2 was true when written and is out of date. Its report of a TLS failure on the apex `quip.network` could not be reproduced, so we do not count it. It also reported one leaf-reuse bug of its own, fixed before the final run.
- **Time:** 28 min.
- **Key Quip call** (`src/main.rs:98-102, 129, 138`, excerpt):
```rust
let (mut keys, public_key) = ShrincsSigner::keygen::<SelectedProfile, NUM_CHAINS, NUM_LAYERS>(
    &seed,
    max_stateful,
)
.expect("keygen");
...
let envelope = sign::<SelectedProfile, NUM_CHAINS>(&mut keys, &hash).expect("stateful sign");
...
let v = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &hash, &envelope);
```
- **What got in the way:** The same missing sign/verify example as p1-a; this builder found the public `shrincs::sign` and `ShrincsVerifier::verify` path, the other builder did not [[C-PER-02](https://docs.rs/crate/hashsigs-rs/0.2.1-rc9/source/examples/)]. docs.rs `latest` resolves to the legacy 0.0.2 crate, so the builder pinned the pre-release [[C-SDK-11](https://crates.io/crates/hashsigs-rs/versions)].

## About this branch

This branch contains the project as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). The agent worked in a temporary directory that was later deleted; the project was recovered from the agent runner's file snapshots and its session log. Where a later rebuild run had changed or added files, those were put back or removed, so the branch shows the trial's own result. Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
