# RESULT

Status: WORKING

Built a four-project hackathon picker with Quip's XQuad Python SDK. It encodes project rewards and incompatible pairs as a binary quadratic model. `demo.py` solves locally or submits to Quip's Aglais testnet, then independently scores the returned selection and checks the exact optimum.

## Run

From this project directory:

```sh
uv venv --python python3.13 .venv
uv pip install --python .venv/bin/python 'xquad[quip]'
.venv/bin/python demo.py
.venv/bin/python -m unittest -v test_demo
.venv/bin/python demo.py --network  # optional: new Aglais testnet job, faucet tokens only
```

`README.md` has safety and setup details. The first network run generated a fresh throwaway keystore at `./keys/quip-keystore.json` with private file permissions; the directory and file are `0700` and `0600` respectively, and `keys/` is gitignored. No pre-existing keys, mainnet, or real money were used.

## Evidence

- Real local execution: `Selected: chat bot, music player`; bits `(0, 1, 0, 1)`; Quip energy `-7`; independently checked energy `-7`; exact best energy `-7`; `Optimal: True`.
- Real Aglais testnet execution (exit 0): quote `1.000000000000 AGLS` reward + `0.001897254289 AGLS` fee, initially zero balance; SDK auto-faucet path; returned the same choice and energy, `order_id: 195`, `energy_matches_chain: True`, `num_submissions: 6`, `num_solutions: 1`. Winning solver public ID: `5E7fgcQm3WEdURyzGnxVZWGvHcQrhrasTKfKPUV7VpUD9Wgp`. SDK output did not expose a transaction hash or our account address. Chain `best_energy_milli: -4750` is in a different (SPIN milli-scale) basis, as explained in the tutorial.
- Verification: `python -m unittest -v test_demo` passed 2 tests; `compileall` passed. Key file permissions confirmed without opening or printing the keystore.
- Screenshots of docs: `/private/tmp/qbrowse/v7-gpt-6-sol/shots/0034.png` (docs navigation), `0040.png` (install), `0042.png` (local example), `0043.png` (network example), `0045.png` (faucet), `0049.png` (submit), `0050.png` (metadata explanation). `DEVLOG.md` records each page screenshot in order and commands; `FRICTION.md` records detours and confusion.

## What did not work / why

- Web search on DuckDuckGo, Google, Brave, Ecosia, Mojeek and Startpage was blocked by anti-bot pages; Bing results were unrelated; Yahoo returned HTTP 500. Directly trying `https://quip.network/` worked and its Docs link led to the actual developer docs. This is search/browser environment friction, not a demonstrated Quip outage.
- The model produced an SDK warning that 5 coefficients were outside the topology's allowed-value set. The SDK said they would be accepted and rescaled; the testnet job succeeded. No transaction hash or explorer deep link was returned, so the order ID and on-chain match flag are the available submission evidence.

## Top 5 vendor improvements

1. Put a five-minute **compute hello world** with a local run and optional Aglais switch directly on the Quickstart page; currently it starts with node operation and keys.
2. Show a macOS/Python 3.13+ setup recipe and a project-local throwaway keystore path rather than defaulting to `~/.quip/keystore.json` in the basic example.
3. Use beginner examples whose coefficients are within topology allowed values, or explain the warning immediately beside the code and distinguish advisory rescaling from rejection.
4. Print job progress during the finality wait and return transaction hashes plus an explorer deep link alongside `order_id` for an easy demo.
5. Add a prominent `Build a compute job` entry on the homepage and docs landing page, with unique searchable titles/keywords distinguishing Quip Network from Salesforce Quip; keep SDK prerelease package/version guidance next to it.
