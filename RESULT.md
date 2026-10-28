# RESULT

## Status: WORKING

Built and ran a complete end-to-end demo against the Quip Network Aglais testnet:
submitting an NP-hard optimization problem (Max-Cut on the Petersen graph) as an Ising
model, having real network miners solve it on-chain, and comparing against a local
simulated-annealing baseline.

## What I built

`demo.py` — Max-Cut on the Petersen graph (10 nodes, 15 edges), a classic
combinatorial optimization benchmark.

The script:
1. Builds an Ising model (SPIN domain, positive couplings => different spins are
   rewarded => exactly the Max-Cut objective).
2. Solves it locally with xqsa's CPU solver (Simulated Annealing).
3. Creates a SolverQuip client for the "aglais" testnet, signs the job with a fresh
   post-quantum (hybrid-falcon512) keystore, submits a propose_job extrinsic
   on-chain, waits for finality, and decodes the winning solution.
4. Compares local vs network results and prints on-chain job metadata.

## Evidence (all real, from live runs)

- Account (freshly generated throwaway, key in ./keys and ~/.quip/keystore.json):
  0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a
- Faucet funding tx (10 AGLS = 10,000,000,000,000 planck):
  0x87975a5eedfef11809b7245fe9838ac1c2a3d5299d383bee4c379c406bd61ac9
- Network order 207 (Petersen Max-Cut): solved in 93.4s, energy -9000 = 12/15 edges cut
  (provably optimal for the Petersen graph), 16 miner submissions,
  energy_matches_chain: true, winning solver
  5GEXqCpB1gty3EERx1rjymHuhwJCXpXnBRS9xY5uYmpq87EB
- Network order 204 (4-node cycle Max-Cut): energy -4000, 8 miner submissions
- Local baseline: 12/15 cuts in 0.028s (same optimum)
- Chain health at time of work: 38-40 peers, isSyncing false
  (wss://bootnode-1.aglais.quip.network:20049/rpc)
- Screenshots of every docs page visited: /private/tmp/qbrowse/v7-mimo-v2.5/shots/0001.png
  through 0025.png

## How to run it

```
cd /private/tmp/devtrials5/v7-mimo-v2.5
python3.13 -m venv .venv
source .venv/bin/activate
pip install "xquad[quip]"
python3.13 demo.py
```

Requires Python 3.13+. The network part takes 1-3 minutes (miners need time to find
the order and solve it). If your account is unfunded the SDK auto-draws a faucet drip;
fund manually with:

```
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'Content-Type: application/json' \
  -d '{"dest": "0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a"}'
```

(Replace with your own address from `account_id_hex` in ~/.quip/keystore.json.)

## What did not work / was hard

- DuckDuckGo and Google both CAPTCHA-blocked the very first docs search (a human-harness
  side effect, but a real user on a flagged IP would hit it too).
- The docs' flagship tutorial code is wrong in two places (import path, function
  signature) — see FRICTION.md item 6.
- Default solve timeout was too short for miner finality; needed timeout=300.
- Binary vs spin domain semantics for Max-Cut had to be re-derived by hand.

## Top 5 changes I'd ask the vendor for

1. Fix the tutorial code on /docs/compute/submit-a-job: it must import from
   `xqsa.solver` (not `xqmx`) and call `set_quadratic(i, j, value)` (not a tuple).
   Make the page a single copy-paste-run script.
2. Publish the docs under a conventional URL (docs.quip.network) and make the homepage
   "Docs" nav item navigate reliably; also add a docs link to the GitHub org profile so
   devs coming from GitHub find it in one click.
3. Own the search results for "Quip Network": the brand collides with Salesforce Quip and
   the toothbrush brand, and Bing showed zero relevant results for the project itself.
4. Put "Submit Your First Compute Job" front and center in the Quickstart (it is the
   single most demo-able dev path), with an expected end-to-end wall-clock time
   ("~1-3 minutes for miners") and a worked Max-Cut example with correct signs.
5. Stop listing packages that don't exist in the install table, mark @beta/@rc as the
   default install command instead of a warning box, and use example coefficients that
   fall inside the default topology's allowed-value set so tutorials don't emit warnings.
