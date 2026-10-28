# Running g6-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
cd signer && npm ci
forge build
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

- `./verify-onchain.sh` — replays every read-only on-chain check (verifies
  both signatures, reads the demo contract state). Needs the local foundry in
  ./.foundry/bin (already installed) and network access to
  evm-rpc.aglais.quip.network:20049.
- Signer: `cd signer && MSG_HASH=<32B hash> node sign.mjs` (npm install
  @quip.network/hashsigs-wasm@rc first). Regenerates keys each run — treat the
  existing keys/shrincs-demo.json as consumed (leaf 1 used).
- Contracts: `hashsigs-solidity-gitlab/` (Quip's repo, oak-03-and-06 branch)
  and `demo/` (my PqUnlock consumer + Quip's ERC-7913 interface).
- Deploy procedure used: `forge create --legacy --broadcast` against
  $RPC (plain CREATE; Quip's CreateX-based deploy scripts cannot run on
  Aglais because the CreateX singleton does not exist there).

npm scripts: `signer/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/shrincs-demo.json`, read by `verify-onchain.sh`

Environment variables the code reads: `MSG_HASH`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)
- OP Sepolia (11155420)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
