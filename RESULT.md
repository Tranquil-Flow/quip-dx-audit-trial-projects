# RESULT
**Status: WORKING**

## Run
`cargo run --release` (Rust 1.95+, first build ~3 min). Creates a throwaway seed in `./keys/demo_seed.bin` (not printed).

## What it does
Uses Quip's crates.io crate `hashsigs-rs` (=0.2.1-rc9, SHRINCS hash-based scheme): keygen -> sign -> verify -> tampered message fails.

## Evidence (actual output)
```
keygen: 43.78ms
public key commitment: 0xfd12252a025e7197818230638b7c944c31b0e380c5a27c33a7cdd0e47d5a1527
sign (stateful path): 598µs, 2304 bytes
verify original message : VALID
verify tampered message : INVALID (expected)
```

## Caveats
- Only a pre-release (0.2.1-rc9) has SHRINCS; the "stable" 0.0.2 is legacy WOTS+. Pinned exactly.
- License is AGPL-3.0-or-later: check compatibility with your backend before adopting.
- Public API verifies *actions* (ActionContext with payload hash), not raw messages (raw verify is test-only). I hashed the message into `payload_hash`.
- Stateful signatures are one-time-leaf; production needs persisted signer state. Demo does not. Stateless path not demoed.
- Crate is chain/Solidity-oriented (ABI encodings, keccak); no standalone docs for plain sign/verify.

## Docs that would have helped
- A README quickstart (keygen/sign/verify) and a runnable `examples/` file for sign+verify (existing examples are benchmarks).
- A public raw-message verify, or documentation of the recommended message->ActionContext mapping.
- Note on crates.io page that the default version is legacy and rc is the recommended one; the crates.io repo link (gitlab) vs GitHub mirror is confusing; the .crate tarball is huge due to fixtures.
