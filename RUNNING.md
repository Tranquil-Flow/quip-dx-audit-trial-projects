# Running g6-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
cd signer && npm ci
```

Quip packages pinned: `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
cd signer && npm i && node sign.mjs 1 > ../sig1.json      # new key in ../keys on first run; leaf 1 (use a new leaf/hash each time)
R=https://evm-rpc.aglais.quip.network:20049
cast call 0x145968ae1D26B342D699F3b147BB25308C2CF05c "verify(bytes,bytes32,bytes)(bytes4)" $(jq -r .key ../sig1.json) $(jq -r .hash ../sig1.json) $(jq -r .sig ../sig1.json) --rpc-url $R
# in-contract: cast send <PQGate> "submit(bytes32,bytes)" $HASH $SIG --gas-limit 16000000 --legacy --private-key ...
```
Deploy: `hashsigs-solidity` at origin/shrincs-main, remove the two unknown ignored_error_codes from foundry.toml (forge 1.5.1), `FOUNDRY_PROFILE=production forge create contracts/SHRINCS256sKeccak.sol:SHRINCS256sKeccak --legacy ...`. Consumer: consumer/PQGate.sol. Note: the signer key (keys/shrincs-secret.hex) is stateful/one-time per leaf; a given leaf must not sign two different messages (I signed leaf 1 once for the tested hash).

npm scripts: `signer/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore. Aglais was relaunched from a new genesis in October 2026, so the Aglais transactions in the notes are on the earlier chain.

## 5. What was removed from this branch

- 2 x clone/mirror of a public Quip repo
- 1 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
