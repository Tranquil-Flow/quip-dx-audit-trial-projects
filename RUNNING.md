# Running m2-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`, `@quip.network/quip-swap-sdk@^0.1.0-beta.9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `README.md` (section "Run it"), verbatim:

Prereqs: node >= 20, foundry (`anvil`, `forge`), internet (forks https://sepolia.base.org).
```bash
npm install
node gen-keys.mjs                       # throwaway keys -> ./keys  (already done if ./keys exists)
(cd contracts-src && forge build)       # MockUSDC artifact
anvil --fork-url https://sepolia.base.org --port 8547 --chain-id 84532 &     # local fork (real Omnibus/factory/verifier state)

npm test                                 # offline PQ-order tests
npm run demo:settled                     # ~1 min: settled trade
npm run demo:refunded                    # ~2.5 min: both legs escrowed, maker never reveals, both refunded
npm run demo:wallet                      # ~2.5 min: Quip-wallet route (needs anvil: uses anvil_autoImpersonateAccount)
npm run simulate:live                    # real Base Sepolia, no funds needed (eth_call only)
RPC_URL=http://127.0.0.1:8547 npm run verify   # independent on-chain check of evidence/*.json
```
`GAP=20` (seconds between the six schedule timestamps) is a **demo-only** value; the SDK default is 1800 s.

### Running on the real Base Sepolia
`RPC_URL=https://sepolia.base.org npx tsx src/run.ts settled` — needs >= 0.005 Base Sepolia ETH on each address in
`keys/{partyA,partyB,relayer}.eoa.json` (public faucets need a captcha/account, so this was **not** done).
The keyed-route script should work unchanged on a real chain (untested); the wallet-route script will not, see RESULT.md.

npm scripts defined: `test`, `keys`, `demo:settled`, `demo:refunded`, `demo:wallet`, `simulate:live`, `verify`, `probe`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/partyA.eoa.json`, read by `src/simulate-live.ts`
- `keys/partyB.eoa.json`, read by `src/simulate-live.ts`

Environment variables the code reads: `RPC_URL`, `GAP`, `LIVE_RPC`

## 4. Networks it touches

- Base Sepolia (84532)
- local Anvil / fork
- OP Sepolia (11155420)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
