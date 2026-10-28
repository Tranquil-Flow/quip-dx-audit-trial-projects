# Running m3-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js, Foundry (Solidity), Python.

```sh
npm ci
forge build   # first restore dependencies: see foundry.toml / remappings / soldeer.lock / .gitmodules
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
```

Python modules imported (pip names may differ): `scripts`, `xqsa`, `xqvm_py`

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

From the project root:

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]' pytest
npm install
```

Local smoke test and exhaustive comparison:

```sh
.venv/bin/python scripts/portfolio_job.py --local --output artifacts/local-result.json
.venv/bin/pytest -q
```

Submit a new live Aglais compute job using only the throwaway key in `./keys`:

```sh
.venv/bin/python scripts/portfolio_job.py --network aglais
```

Recover an existing order, including this run:

```sh
.venv/bin/python scripts/portfolio_job.py --network aglais --query-id 144
```

Compile and deploy a new immutable record from `artifacts/compute-result.json`:

```sh
npm run compile
npm run deploy
```

Read the deployed result and verify it against the canonical artifact:

```sh
npm run read
```

The existing `artifacts/deployment.json` points the read script at the live contract above. The keys in `./keys` are newly generated, testnet-only, mode `0600`, and ignored by Git. AGLS has no value. Do not reuse these keys anywhere.

npm scripts defined: `compile`, `deploy`, `read`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Environment variables the code reads: `AGLAIS_EVM_RPC`

## 4. Networks it touches

- Aglais testnet (Quip chain, chain id 20033)

Endpoints, faucets and chain parameters have changed over time. Take current values from <https://developers.quip.network/llms.txt> rather than from the code or notes here. Deployed contract addresses in the notes belong to the original run and may not exist anymore.

## 5. What was removed from this branch

- 3 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
