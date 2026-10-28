# Running p1-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Rust.

```sh
cargo build
```

Quip packages pinned: `hashsigs-rs { version = "=0.2.1-rc9" }`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
cd /private/tmp/projects/proj-17e77a
cargo run --release
```

- Requires Rust 1.95+ (host has 1.95.0). No network needed at runtime.
- Generates a FRESH throwaway keypair each run (seed from OS CSPRNG via getrandom;
  the library deliberately has no RNG). Secret (264 B) saved to `./keys/shrincs-demo.secret`
  with mode 0600; contents never printed. No wallets, chains, or mainnets touched.

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Solana devnet

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x deleted by the trial itself before it finished

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
