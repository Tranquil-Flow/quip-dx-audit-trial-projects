# Running t07-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity).

```sh
cd offchain && npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

Quip packages pinned: `@quip.network/hashsigs@^0.1.0`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```bash
# prerequisites: foundry, node 18+
(cd offchain && npm install)
forge build
forge test -vv                                  # 10 pass + 1 skipped (FFI)
QUIP_FFI=true forge test --ffi -vv              # also signs a fresh message via node during the test

# make a new off-chain signature
node offchain/sign.mjs "my message" test/fixtures/mine.json

# testnet (Aglais). Deploy:
PK=$(python3 -c "import json;print(json.load(open('keys/deployer.json'))[0]['private_key'])")
forge create lib/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus --rpc-url aglais --private-key $PK --broadcast
forge create src/QuipSignatureVerifier.sol:QuipSignatureVerifier \
  --libraries lib/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus:<WOTSPLUS_ADDR> \
  --rpc-url aglais --private-key $PK --broadcast
# verify against the deployed contract (use a fresh fixture for --consume: keys are one-time)
script/testnet-verify.sh 0x078D7D275F3A64349f72e6541b8fb38b7C6B7e4D test/fixtures/mine.json --consume
```

npm scripts defined: `offchain/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/deployer.json`, read by `script/testnet-verify.sh`

Environment variables the code reads: `QUIP_FFI`, `RPC`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 3 x secret-named file
- 1 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
