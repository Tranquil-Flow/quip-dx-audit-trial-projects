# Running g1-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/quip-swap-sdk@^0.1.0-beta.9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
npm install                     # deps: @quip.network/quip-swap-sdk@beta (0.1.0-beta.9), @quip.network/ethereum-sdk@beta (0.3.0-beta.8), viem
npm run genkeys                 # only if keys/keys.json doesn't exist (never overwrites)
npm run probe                   # read-only check of the live contracts + EOA balances
npm run typecheck

# Live Base Sepolia. First send ≥0.0003 Base Sepolia ETH to EACH EOA:
#   alice 0x8C2Da2c664ad9B6826A077413c8CBe993A1F55B0
#   bob   0x1f3E552187A6C22D087C6424C8a2603FCc3f4F02
npm run swap                    # takes ~11 min of real time (see "timing" below); resumable via runs/84532-state.json

# Reproduce the fork result (no funds needed):
anvil --fork-url https://sepolia.base.org --port 18545 --silent &
for a in 0x8C2Da2c664ad9B6826A077413c8CBe993A1F55B0 0x1f3E552187A6C22D087C6424C8a2603FCc3f4F02; do
  cast rpc --rpc-url http://127.0.0.1:18545 anvil_setBalance $a 0x16345785D8A0000; done
RPC_URL=http://127.0.0.1:18545 FORK_WARP=1 STATE_FILE=runs/fork-state.json npx tsx src/swap.ts
```
Env knobs: `RPC_URL`, `OMNIBUS`, `BUFFER_SECS` (default 300 = SDK `DEFAULT_BUFFERS.fastL2`), `ALICE_GIVES` / `BOB_GIVES` (ETH), `WALLET_TOPUP`, `MIN_EOA_BALANCE`, `FORK_WARP=1` (Anvil time warp), `STATE_FILE`.

**What the swap does:** a same-chain native-ETH swap on Base Sepolia. Alice's Quip wallet gives 0.00002 ETH and Bob's Quip wallet gives 0.00001 ETH.
1. Each party's EOA deploys a SHRINCS Quip wallet (derivation 0, ERC-1271 key at derivation 1, 64 signatures).
2. Each EOA tops up its wallet.
3. Alice is the proposer: `prepareCommit(..., {account: aliceWallet})` builds the call, and `aliceWallet.execute(call)` sends it with a SHRINCS signature.
4. The script waits for the taker window, then Bob commits the same way.
5. The script waits for the claim window, then Alice's EOA sends `claim(secret)`, which settles both legs.

npm scripts: `genkeys`, `probe`, `swap`, `typecheck`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/keys.json`, read by `src/genkeys.ts`, `src/probe.ts`, `src/swap.ts`

Environment variables the code reads: `ALICE_GIVES`, `BOB_GIVES`, `BUFFER_SECS`, `FORK_WARP`, `MIN_EOA_BALANCE`, `OMNIBUS`, `RPC_URL`, `STATE_FILE`, `WALLET_TOPUP`

## 4. Networks it touches

- Base Sepolia (84532)
- OP Sepolia (11155420)
- local Anvil / fork

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
