# RESULT

Status: **WORKING**

## What this is

A Rust CLI demo of Quip Network's post-quantum (hash-based) signatures, using their
published crates.io crate. Quip's scheme is **SHRINCS**: a hybrid of a stateful
WOTS-C/UXMSS path (cheap, one-time leaves, for everyday signing) and a stateless
SPHINCS+C path (expensive, break-glass/recovery). Messages are 32-byte hashes; the
demo pre-hashes with SHA-256.

## The crate (answer to "is there one on crates.io?")

Yes — but it is NOT named `quip-*`:

- Crate: **`hashsigs-rs`** `0.2.1-rc9` (2026-08-27), license AGPL-3.0-or-later, MSRV Rust 1.95
- Repo: https://gitlab.com/quip.network/hashsigs-rs (mirror github.com/quipnetwork)
- Siblings: `hashsigs-{py,ts,cpp,solidity}`, `pqhybridsign*` (hybrid classical+PQ)
- Unrelated traps: crates.io `quip` = quasi-quote macros; `quip-proto`/`quip-protocol`/
  `quip-solver-core` = Quip's solver/mining protocol, not signatures.

## How to run

```
cd /private/tmp/projects/proj-17e77a
cargo run --release
```

- Requires Rust 1.95+ (host has 1.95.0). No network needed at runtime.
- Generates a FRESH throwaway keypair each run (seed from OS CSPRNG via getrandom;
  the library deliberately has no RNG). Secret (264 B) saved to `./keys/shrincs-demo.secret`
  with mode 0600; contents never printed. No wallets, chains, or mainnets touched.

## What it demonstrates (verified output below)

1. Fresh SHRINCS keypair (profile `shrincs-256s-keccak`, the default); 32-B public
   commitment = only on-chain key material.
2. Sign SHA-256(msg) on the stateful path; leaf counter advances (one-time leaf consumed);
   state persisted AFTER signing (slot discipline per Quip's docs).
3. Genuine signature verifies: `VerifyOutcome::Valid`.
4. Tampered message (1 bit flipped) -> `Invalid` (rejected).
5. Tampered signature (1 bit flipped) -> `Invalid` (rejected).
6. Wrong signer (commitment bit flipped) -> `Invalid` (rejected).
7. Stateless break-glass path: SPHINCS+C signature verifies, tampered message rejected,
   and NO one-time leaf is consumed.
8. Reload secret from ./keys via the validating import (`import_signing_key`, which
   recomputes both roots from seeds and rejects corruption); second message signs with
   the NEXT leaf and verifies; first signature still verifies.

## Evidence (actual `cargo run --release` output, Apple Silicon, Rust 1.95.0)

```
=== Quip Network post-quantum signature demo (hashsigs-rs / SHRINCS) ===
crate: hashsigs-rs 0.2.1-rc9 | profile: shrincs-256s-keccak (default)

[1] Generating fresh throwaway SHRINCS keypair
  keygen took 63.997ms
  public commitment   : 0x2e25b203af72c357c5f3969010f640158d11d57b37042d805aa83f005b3b18a8 (32 B, the only on-chain key material)
  public bundle       : 480 B (resupplied on every verify)
  stateful budget     : 16 one-time signatures (leaf counter at 1)
[2] Signing (stateful everyday path)
  SHA-256(msg)   : 0xd6b7f3620fd52cb7a313b3da2b2732a720fafbc93770515c5040ec4734130e3d
  signed in 2.927416ms; envelope 2784 B (abi.encode(PublicKey, Signature))
  leaf counter now 2
  saved secret key -> ./keys/shrincs-demo.secret (264 bytes, mode 0600)
[3] Verifying genuine signature
  outcome: Valid
[4] Tampering with the message (flip one bit)
  tampered SHA-256: 0x11f0a904461f9de507d780...  outcome: Invalid (crypto reject)  correctly REJECTED
[5] Tampering with the signature (flip one bit near the end)
  outcome: Invalid (crypto reject)  correctly REJECTED
[6] Tampering with the key commitment (wrong signer)
  outcome: Invalid (crypto reject)  correctly REJECTED
[7] Stateless (break-glass / recovery) path: SPHINCS+C, no leaf consumed
  signed in 564.9 ms; envelope 91680 B (big: this is the expensive path)
  verify: Valid ; verify(tampered msg): Invalid
  leaf counter still 2 (stateless signing consumes no one-time leaf)
[8] Reloading key from ./keys and signing a SECOND message (next leaf)
  reloaded; leaf counter at 2 of 16
  verify(msg#2): Valid ; verify(msg#1) after reload: Valid
  (each signature bound to its own message; leaf advanced to 3)

All checks passed. EXIT=0
```

(One earlier run's commitment `0x960e67a8...` and another's `0x9b4baf3f...` — keys are
fresh per run, as required. Full transcripts in DEVLOG.md.)

Sizes match the vendor's README exactly: stateful envelope 2,784 B at leaf 1
(documented "2,784 B at 256s leaf 1"), stateless blob ~91.2 KB (documented 91,200 B
packed + ABI framing = 91,680 B observed).

## What did not work / friction encountered

- DuckDuckGo web_search was rate-limited (3 failures) — used crates.io REST API +
  direct site fetches instead.
- `https://quip.network` apex: TLS handshake fails (SSL_ERROR_SYSCALL); only
  `www.quip.network` works. quipnetwork.com does not exist.
- **docs.rs for `hashsigs-rs` documents only ancient 0.0.2** (WOTS+ only). For the
  current API I had to read source from GitLab. I verified the 7 API-relevant source
  files are byte-identical between `main` and the published `v0.2.1-rc9` tag, so the
  source reading matches the artifact.
- No dev-portal quickstart exists for pure-Rust signing: developers.quip.network docs
  are account/wallet-integration oriented; the crate README + source is the real docs.
- Crate naming is undiscoverable (`hashsigs-rs`, not `quip-hashsigs`); found only via
  the GitLab group listing.
- First demo version had a slot-discipline bug (saved state BEFORE the first sign, so
  the reloaded key re-used leaf 1 — exactly the footgun Quip warns about). Fixed:
  persist after every stateful sign.
- Minor: my own ordering bug (`tampered_hash_pre` used before definition) — one compile
  error, fixed; and a non-ASCII byte-string literal the compiler rejected.

## What would have made this easier (vendor feedback)

1. Publish current docs to docs.rs (or mark 0.0.2 as superseded); rc versions never
   become the docs default.
2. A "sign & verify in Rust in 30 lines" quickstart on developers.quip.network linking
   the crate by exact name.
3. A crate alias or naming convention (`quip-hashsigs-rs`) so `cargo search quip`
   finds it.
4. The README's API examples are WASM/TS; the Rust doc-examples embedded in source
   (`signer.rs`, `verifier.rs`) are what actually worked — surfacing those in the
   README would help.
5. Docs should state prominently that the library has NO RNG (caller supplies the
   32-byte seed) and that messages must be exactly 32 bytes — both are in the README
   but buried in the WASM section.

## Licensing caution (important for a commercial backend)

`hashsigs-rs` is **AGPL-3.0-or-later**. Linking it into a proprietary backend has real
license implications (AGPL network-copyleft). Get legal review before shipping; the
separate `pqhybridsign` crates may carry the same terms. Nothing about this was stated
on the developer portal pages I read.

## Files

- `Cargo.toml`, `src/main.rs` — the demo
- `keys/` — throwaway demo secret (0600, gitignored, never printed)
- `DEVLOG.md` — full research/build log with every URL, command, error, guess
- `research/` — downloaded README/sources used for API reference (with scripts/compare_rc9.sh verifying main == rc9 tag)
