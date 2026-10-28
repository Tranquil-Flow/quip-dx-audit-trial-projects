# RESULT: WORKING

## What I built
`demo.py`: a max-cut solver on a 5-node graph. Solves it locally (xqsa CPU annealer), then submits the same Ising/QUBO model as a real job to Quip's public **Aglais testnet** and prints the miner's answer.

## Run
```
python3 -m venv .venv && .venv/bin/pip install "xquad[quip]"   # Python >= 3.13
.venv/bin/python demo.py        # local only
.venv/bin/python demo.py net    # + Aglais testnet job (creates ./keys/keystore.json, auto-faucet, ~90s)
```

## Evidence
- Throwaway account (keystore in ./keys): `0x4712c760b3ecac6b1c347dec6c2e8d0e10ce0b6010bacd348eeb20911f1f5cbd`
- Aglais order_id 182 (probe) and 183 (demo), solver `5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD`, `energy_matches_chain: True`, 8 submissions. Full output: `run_output.txt`.
- Quote: reward 1 AGLS + fee 0.0019 AGLS; faucet auto-funded the account. Balance afterwards ~8.0 AGLS.
- Docs screenshots: /private/tmp/qbrowse/v7-claude-sonnet/shots/0008.png (home), 0010 (docs home), 0013-0018 (submit-a-job).
- No tx hashes captured (the SDK exposes order_id, not tx hash).

## What didn't work
- DuckDuckGo would not load in qb; Bing found no Quip Network page for 3 queries (Salesforce Quip/toothbrush dominate). I guessed quip.network. Docs link then opened in a new tab silently.
- Docs' code sample doesn't say `result.sample` is an XQMX object; indexing it fails.
- Did not try wallet/browser flows, QVRF, or account.quip.network; chose the compute path as the easiest.

## Top 5 doc/site changes
1. Make Quip Network findable: SEO/title "Quip Network developer docs", and a link to developers.quip.network in obvious places; the name collides with Salesforce Quip.
2. Put one copy-paste, end-to-end script on the docs landing/Quickstart (install, model, SolverQuip.for_network, print). Quickstart currently says there is "not much to do other than mine blocks", hiding the compute-job path.
3. Document the SolverResult shape (`sample` is an XQMX; how to read a bit vector; `metadata` fields incl. order_id and how to look it up in an explorer).
4. State expected latency (~90s) and show progress output; explain balance-0 quote followed by auto-faucet, and the energy vs best_energy_milli difference.
5. Make Docs nav open in the same tab (or indicate new tab); state the Rust requirement for macOS up front with a fallback wheel; suppress the allowed-values warning for the docs' own example.
