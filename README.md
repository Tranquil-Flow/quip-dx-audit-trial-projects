# Quip Network post-quantum signature demo (TypeScript)

A minimal, dependency-light demo of **Quip Network's post-quantum hash-based
signatures**, built on the official WebAssembly release of the audited
`hashsigs-rs` crate:

- npm package: `@quip.network/hashsigs-wasm` (profile `shrincs-256s-keccak`)
- scheme: **SHRINCS** — a hybrid hash-based signature construction
  (ePrint 2025/2203, appendix) with a stateful *UXMSS / WOTS-C* fast path and a
  stateless *SPHINCS+C* recovery path. The same signatures verify on-chain
  against the Solidity and Solana verifiers in the `QuipNetwork/hashsigs-*` repos.

It does four things:

1. generates a brand-new post-quantum keypair from fresh OS entropy,
2. signs a 32-byte message digest (keccak-256, the EVM hash),
3. verifies the signature (passes),
4. tampers with the message / signature / key and shows verification **fails**.

## Run it

```bash
npm install
npm run demo
```

The demo exits non-zero if any signature check behaves unexpectedly, so it is
usable as a CI smoke test.

## What it prints

- the loaded wasm version and SHRINCS profile
- the fresh `publicKeyCommitment`, stateless public key, and remaining leaves
- the message, its keccak-256 digest, and the signature (size in bytes)
- 9 pass/fail assertions covering genuine verify + 4 tamper cases
- a final `RESULT: OK` / `RESULT: FAILED` line

## Files

| Path | Purpose |
| --- | --- |
| `src/demo.ts` | the whole demo |
| `keys/shrincs-demo-signing-key.hex` | throwaway 264-byte SHRINCS secret, regenerated on every run |
| `keys/shrincs-demo-public.json` | public material + commitment (safe to share) |
| `DEVLOG.md` | sources, commands, errors, and guesses made while building this |
| `RESULT.md` | status and evidence |

## Security notes

- Every run generates a **new** keypair from `crypto.randomBytes(32)`; nothing is
  reused. `./keys` holds throwaway demo material only — never point it at funds.
- The wasm build deliberately contains **no RNG**: the caller must supply the
  32-byte seed (we take it from the OS).
- SHRINCS signs a **fixed 32-byte digest**, not raw text — we hash the message
  first. On-chain, that digest is the canonical action hash / ERC-7913 digest.
- WOTS-C signatures are **one-time per leaf**. `shrincs.sign()` advances the
  stateful leaf counter in place; persist the secret after every signature and
  never re-sign from an older snapshot. (This demo is single-process, so it just
  signs once per leaf.)

## Wired into an EVM dApp?

This demo covers keygen / sign / verify / tamper-detection locally. To move
value on a chain you would additionally use `QuipNetwork/ethereum-sdk` (Solidity
contracts + TS SDK: a `QuipFactory` that installs the key commitment into a
"lockbox" account, verified by the on-chain WOTS/SHRINCS verifier). That path
needs an RPC provider (Alchemy) and a funded testnet key — see `ethereum-sdk`'s
README. This demo needs neither.
