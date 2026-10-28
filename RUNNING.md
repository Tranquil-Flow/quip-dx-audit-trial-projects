# Running h5-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Python (scripts).

```sh
cd evm && npm ci
cd sdk && npm ci
cd browse && npm ci
```

Quip packages pinned: `@quip.network/ethereum-sdk@^0.3.0-beta.8`, `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

Python modules imported (pip names may differ): `xqvm_py`, `xqsa`

## 2. How the builder ran it

The builder did not write a run section. Start with `RESULT.md` and `DEVLOG.md`.

npm scripts: `evm/test`, `sdk/test`, `browse/test`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/evm-throwaway.json`, read by `evm/genkey.mjs`
- `keys/quip-keystore.json`, read by `compute/network_example.py`
- `keys/shrincs-throwaway-mnemonic.txt`, read by `sdk/keygen.mjs`, `sdk/keypair.mjs`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)
- local Anvil / fork
- Solana devnet

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
