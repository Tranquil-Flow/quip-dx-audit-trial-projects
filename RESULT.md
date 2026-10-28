# RESULT — Quip Network max-cut run vs classical solver

STATUS: WORKING

The full flow was completed end to end: researched the docs in a real browser,
installed the vendor SDK, funded a throwaway testnet account, submitted max-cut
(Ising) jobs to the Quip Network Aglais testnet, received on-chain-verified
solutions, and compared them against a classical CPU solver and brute force.

## What was built

- maxcut_quip.py      — 6-node max-cut, classical CPU solver vs Quip Network
- maxcut_quip_12.py   — 12-node random graph version (needs topology="native")
- verify_optimal.py   — brute-force enumeration of all 2^6 partitions
- final_run.py        — clean validation run that captures evidence (order id,
                        block hash, miner id, energy, timing)
- keys/wallet.key     — brand-new throwaway browser wallet
                        (0x6AcE09d9Ce103b85f067918e63E25b12678bd49B)
- ~/.quip/keystore.json — auto-created solver account (no password),
                        account_id 0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a

## How to run

    # one-time setup (needs Python >= 3.13)
    python3.13 -m venv .venv
    source .venv/bin/activate
    pip install "xquad[quip]"

    # the comparison (CPU solve is instant; Quip Network solve takes ~90-130 s)
    python final_run.py

## Evidence (all on Aglais testnet, no real money)

- Account: 0x5b78be36c4d8d7fbd11dfa28ab3ca33143efbfa2ae323bda1e62fe47b3795d5a
  (funded automatically from the faucet, 10 AGLS drips; only testnet tokens)
- Final validation job:
  order_id=211
  block 0x4cd54134529bb6c88edb4bf90174ac18727ae0da66274b07ce15d29a209d8501
  spec_id 0x8f46f3a31321d1d093314fc769c42cbe7a83d71a0b69e6571a0f68e2a04067f0
  reward 1,000,000,000,000 planck (1 AGLS) paid to winning miner
  miner/solver 5DXr9LokuLE5bs2ZZyhDwbJfR9SqceL7kohQbgMebDcymhfD
  best_energy_milli=-5,000,000, energy_matches_chain=True, 5 submissions, 1 solution
- Earlier successful jobs: order_id=206 (solver 5DPhy7jpFj3ikUZgVpwkrXnjFLYXqsWWPNUCrEvmzq2AEwFJ),
  order_id=208 (solver 5GEXqCpB1gty3EERx1rjymHuhwJCXpXnBRS9xY5uYmpq87EB,
  block 0xdc64debb252a7785dff9a89705b82c4e08731390e78aa979af1764fecf087ba0)
- 12-node job also succeeded in native mode (energy -12,000, cut 16/20)
- WSS RPC auto-resolved: wss://bootnode-1.aglais.quip.network:20049/rpc

## Results

| Problem            | Brute force | CPU (simulated annealing) | Quip Network      |
|--------------------|-------------|---------------------------|-------------------|
| 6 nodes, 9 edges   | 7/9         | 7/9 in 0.07 s             | 7/9 in ~129 s     |
| 12 nodes, 20 edges | n/a         | 16/20 in 0.03 s           | 16/20 in 88.8 s   |

- Both solvers reached the optimum in every run.
- Quip Network answers are verified on-chain (energy_matches_chain=True), include
  the winning miner's identity and the inclusion block hash, and the reward is
  escrowed and paid out automatically.
- For these toy sizes the classical solver is ~1000x faster; the value of the
  network is the on-chain verifiability/marketplace, not speed at this scale.

## What did not work / gotchas

- Search engines blocked or buried quip.network: DuckDuckGo bot-CAPTCHA could not
  be clicked through; Google returned 429; Bing's top results were Salesforce
  Quip and a toothbrush brand. Direct navigation to quip.network was the fix.
- Default topology placement failed on a 12-node random graph (PlacementError);
  solved with topology="native".
- result.sample is an XQMX object (use sample.get_linear(i)), not a list — the
  docs example misleads here.
- The docs' install example uses binary_model (QUBO 0/1); for max-cut the spin
  model (-1/+1) is the correct encoding. Using the binary model silently returns
  a useless all-zeros "solution" from the CPU solver.
- No block explorer exists (or is linked), so on-chain evidence required enabling
  DEBUG logging on substrateinterface.

## Top 5 vendor doc/site improvements

1. Add a block explorer / job-status page (e.g. aglais.quip.network/order/<id>)
   and link each solve() result to it. Right now there is no way to view a job
   on-chain without debug logging.
2. Make the "Submit Your First Compute Job" example complete and copy-pasteable:
   show reading result.sample values (get_linear), and show both binary_model
   (QUBO) and spin_model (Ising/max-cut) side by side with guidance on when each
   applies.
3. Document topology="native" prominently at the top of the placement section,
   and make PlacementError suggest it ("try topology='native'") instead of only
   mentioning max_steps.
4. State normal job latency (block time, competition window) so users can
   interpret a 90-130 s solve on a toy problem.
5. Improve SEO/discoverability: quip.network does not rank on Bing/DuckDuckGo for
   "Quip Network quantum compute QUBO"; the toothbrush brand and Salesforce Quip
   bury it. Also, document the faucet threshold for auto-funding and show the
   balance/address from inside the SDK instead of asking users to copy
   account_id_hex out of a key file.

Screenshots of every page visited: /private/tmp/qbrowse/v3-mimo-v2.5/shots/0001.png
through 0029.png (see DEVLOG.md for the mapping).
