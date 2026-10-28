# Running g3-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Rust.

```sh
cd meta-inspect && npm ci
cargo build
```

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

cd /private/tmp/devtrials5/g3-glm-5.2
  cargo build --release            # or use ./target/debug/agls-tool
  ./target/debug/agls-tool keygen
  ./target/debug/agls-tool faucet <new-ss58-address>
  ./target/debug/agls-tool balance <address>
  ./target/debug/agls-tool transfer --seed keys/seed-*.txt \
      --to <recipient> --amount 2        # dry-run first with --dry-run

`cargo test` runs 7 unit tests incl. SCALE-compact vectors pinned to a live
faucet extrinsic, SS58 vector cross-checked against @polkadot/util-crypto,
and an H4 sign/verify roundtrip.

npm scripts: `meta-inspect/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `AGLS_RPC`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
