# RESULT: WORKING

Submitted an 8-node max-cut (as QUBO) to Quip's public Aglais testnet via `xqsa.SolverQuip`, got the optimal answer, and compared with brute force and a local annealer.

## Run
```
python3.13 -m venv .venv && .venv/bin/pip install "xquad[quip]"
.venv/bin/python maxcut.py        # local only
.venv/bin/python maxcut.py net    # also submits to aglais (auto faucet drip, ~100 s)
```
Uses a throwaway keystore at ./keys/keystore.json (created on first use, faucet-funded automatically).

## Evidence
- Graph: networkx gnp_random_graph(8, 0.5, seed=7), 18 edges.
- Brute force max cut: 14.
- Local SolverDWaveCPU: energy -14, cut 14, 0.01 s.
- Aglais (topology="native"): energy -14, cut 14, sample [1,0,0,1,1,1,0,0], 102.2 s wall.
- Quote: reward 1 AGLS + fee 0.0019 AGLS.
- I did not capture a tx hash or job id; the SDK printed none in what I saw.
- Screenshots: search failures 0001-0027; quip.network 0028; docs 0032; submit-a-job 0034-0042 (in /private/tmp/qbrowse/v3-claude-sonnet/shots/).

## What didn't work
- Web search never found quip.network (Salesforce Quip / toothbrush results only; DuckDuckGo blank, Google captcha). I guessed the domain.
- Default placement failed (PlacementError, 200000 steps) for my 18-edge graph; needed topology="native".
- Sample extraction: result.sample is XQMX, not iterable.
- The network run is a simulated-annealing miner, not a QPU, as far as the docs say; I got no evidence of quantum hardware use. Also the network is slower (100 s vs 10 ms) so the comparison is about API fit, not speed.

## Top 5 doc/site changes
1. Get "Quip Network" findable: page titles/meta mentioning "quantum optimization QUBO Ising API", so a search doesn't return Salesforce Quip.
2. Add a max-cut/QUBO-from-a-graph example to submit-a-job, with the classical baseline side by side, and show how to read result.sample as a bit list.
3. Put the placement caveat up front: arbitrary graphs beyond sparse ones need topology="native"; make PlacementError fail fast and mention native in its message.
4. Show job id / tx hash / explorer link in solve() output, and progress while waiting; say expected latency.
5. Explain quote() "shortfall" vs auto-faucet in one line, and warn if ~/.quip/keystore.json already exists (or say which QPU/CPU miner solved it).
- Account (throwaway): 0x1638f695bb678c0b879c2ec44efa8bab0848bc0e2af8ae17be1efa60f94f31a3
