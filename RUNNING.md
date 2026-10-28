# Running t07-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity), Python (scripts).

```sh
cd signer && npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

Python modules imported (pip names may differ): `test`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

    # 1. install signer deps (once)
    cd signer && npm install && cd ..
    # 2. generate OFF-CHAIN test vectors (Quip WOTS+ signatures, TS)
    node signer/generate-vectors.js
    # 3. run Foundry tests (valid passes / tampered fails)
    forge test -vv
    # 4. live demo against Aglais testnet
    export RPC=https://evm-rpc.aglais.quip.network:20049
    export VERIFIER_ADDRESS=0x32640c693aA5202CA030C4D714A521D54E5d1719
    node signer/make-live-vector.js        # fresh throwaway WOTS+ key -> keys/live-wots-key.json
    forge script script/AglaisLive.s.sol --rpc-url $RPC  # static-check (no --broadcast; see notes)

Deploy (what I ran):

    forge create src/WOTSPlus.sol:WOTSPlus --rpc-url $RPC --private-key <throwaway> --legacy --broadcast
    forge create src/QuipWOTSVerifier.sol:QuipWOTSVerifier --rpc-url $RPC --private-key <throwaway> \
      --legacy --broadcast --libraries src/WOTSPlus.sol:WOTSPlus:0x986744B4Dc63AbE4Fc51B0154c75701A311CbfB8

Live on-chain verify + attestation (cast path — see "what did not work"):

    cast call $VERIFIER_ADDRESS $(cat keys/verify-calldata.txt) --rpc-url $RPC          # -> 0x...01
    cast call $VERIFIER_ADDRESS $(cat keys/verify-calldata-bad-sig.txt) --rpc-url $RPC  # -> 0x...00
    cast send $VERIFIER_ADDRESS $(cat keys/submit-calldata.txt) --private-key <throwaway> \
      --rpc-url $RPC --gas-price 1000000000 --legacy

npm scripts defined: `signer/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/submit-calldata.txt`, read by `signer/build-calldata.py`
- `keys/verify-calldata.txt`, read by `signer/build-calldata.py`

Environment variables the code reads: `VERIFIER_ADDRESS`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir
- 1 x dependency/build/cache dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
