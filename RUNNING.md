# Running m3-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Foundry (Solidity), Python (scripts).

```sh
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
```

Python modules imported (pip names may differ): `xqsa`, `substrateinterface`, `eth_account`, `web3`, `numpy`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

Prereqs: Python ≥3.13, `uv`, Foundry, `jq`. The `.venv` is already built here. To rebuild it:
```sh
uv venv -p 3.14 .venv
uv pip install -p .venv "xquad[quip]==0.4.1" numpy "web3>=7"
```

Read what's stored (read-only, needs no keys):
```sh
.venv/bin/python scripts/read_result.py                # list all records
.venv/bin/python scripts/read_result.py --job 147 --verify
# or with nothing but foundry:
cast call 0x29ae4f0C3B375F1C4fD542974b64cf9DFC9DB8AE 'count()(uint256)' --rpc-url https://evm-rpc.aglais.quip.network
```

Full pipeline (spends testnet AGLS only; keys live in `./keys`):
```sh
./run_demo.sh --qpu     # solve on D-Wave-typed miners -> record -> read back + verify
./run_demo.sh --open    # any miner (in practice GPU)
./run_demo.sh --local   # local CPU simulated annealing only
```

The pieces can also be run on their own:
- `quantum/solve.py [--qpu|--local] [--quote]`
- `scripts/record_result.py <result.json>`
- `scripts/read_result.py`

To redeploy the contract:
```sh
cd contracts && forge build
cast send --rpc-url https://evm-rpc.aglais.quip.network --private-key <key> \
  --gas-limit 770000000 --gas-price 1000000000 --priority-gas-price 1 \
  --create $(jq -r .bytecode.object out/QuipResultRegistry.sol/QuipResultRegistry.json)
```
Expect "not confirmed within the timeout". Find the tx by hash; it is usually mined after 2–3 min. Then update `deployments.json`.

Funding: `curl -X POST https://faucet.aglais.quip.network/request -H 'content-type: application/json' -d '{"dest":"0x<H160>"}'` gives 10 AGLS. The compute-job signer is auto-funded by the SDK (`autofund=True`).

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/evm-deployer2.json`, read by `scripts/record_result.py`
- `keys/quip-signer-seed.hex`, read by `quantum/solve.py`

Environment variables the code reads: `QUIP_DEADLINE_BLOCKS`, `QUIP_TIMEOUT`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
