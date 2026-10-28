# Running m4-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Python (scripts).

```sh
npm ci
```

Python modules imported (pip names may differ): `web3`, `eth_account`, `eth_abi`

## 2. How the builder ran it

From `RESULT.md` (section "How to run what we built"), verbatim:

Prereqs: python3 + pip install web3 eth-account eth-abi, node + npm install
solc@0.8.26 (for solcjs). Everything lives in this directory.

    cd /private/tmp/devtrials6/m4-glm-5.2
    ./node_modules/.bin/solcjs --bin --abi --optimize --base-path . -o build contracts/AglaisQuantumRaffle.sol
    python3 raffle.py fund      # faucet-fund keys in ./keys (10 AGLS each)
    python3 raffle.py deploy    # or run the whole lifecycle:
    python3 run_full.py         # deploy -> 3 entries -> reveals -> close -> draw -> claim/refunds
    python3 verify.py           # independently recompute the winner from on-chain data

Files: contracts/AglaisQuantumRaffle.sol (contract), run_full.py (end-to-end),
raffle.py (stepwise runner), verify.py (verification), raffle_state.json
(deployed addresses, salts, tx hashes, draw evidence), keys/ (throwaway
testnet keys — never reuse), DEVLOG.md (full narrative).

Chain parameters: chain id 20033, RPC https://evm-rpc.aglais.quip.network:20049,
gas price 1 gwei. CRITICAL Aglais quirk: pallet-revive charges contract storage
deposits out of the tx GAS OVERPAYMENT, so state-writing txs need huge gas
limits (deploy ~1.7e9, entry ~1.4e9, other writes ~2e8). Standard EVM tooling
defaults fail with "Invalid Transaction" or a revert
(StorageDepositNotEnoughFunds). See DEVLOG items #3 and #12.

npm scripts defined: `test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/owner.json`, read by `finalize.py`

Environment variables the code reads: `QUIP_RPC`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 3 x binary/archive
- 1 x key material dir
- 1 x build output / large research dir (>1 MB)

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
