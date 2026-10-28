# DEVLOG
1. qb open duckduckgo.com -> chrome-error blank page (shots/0001.png, 0002.png). Could not load DDG.
2. bing "Quip Network developer docs" (shots/0003.png): results all about Salesforce Quip / quip toothbrush / Wikipedia; nothing for Quip Network.
3. bing "quip.network blockchain developer documentation testnet" (shots/0004.png blank until scroll, 0005.png): only Wikipedia/toothbrush/Salesforce/Capterra results.
4. bing '"Quip Network" Aglais testnet quantum developers' (shots/0006.png blank, 0007.png): identical result list to query 1 (126,000 results, quip.com first) - no Quip Network hit.
5. Search failing -> guessing domain https://www.quip.network
6. quip.network home (shots/0008.png): nav Points/Products/Use Cases/Docs/Blog/Contact. Clicked Docs -> opened NEW TAB (shots/0009.png showed unchanged page) -> developers.quip.network/docs
7. developers.quip.network/docs (shots/0010.png): sidebar Getting Started / Interlock Protocol / Compute (Submit Your First Compute Job, QVRF, Ising Topologies).
8. Quickstart (shots/0011.png, 0012.png): only "run a node" (desktop app) and "generate keys" (account.quip.network) + WOTS+ libs (rust/c++/ts/solidity). "not much to do other than mine blocks". Going to Submit Your First Compute Job.
9. Submit Your First Compute Job (shots/0013-0015.png): pip install "xquad[quip]" (Python>=3.13; macOS builds quip-signer from source, needs Rust - cargo present). Local CPU example with xqvm_py XQMX + xqsa SolverDWaveCPU. Decision: build small Ising/max-cut demo, locally first then network.
10. Same page, shots/0016-0018.png: SolverQuip.for_network("aglais", keystore=~/.quip/keystore.json); job cost 1 AGLS + fee; solver.quote(model); auto faucet 10 AGLS; manual faucet curl POST https://faucet.aglais.quip.network/request {"dest": addr}. Will use keystore at ./keys/keystore.json (rule: keys in ./keys).
11. pip install ok (~1 min, no Rust build problem). demo.py local: result.sample is an XQMX, not a list (docs example just prints it) -> use get_linear(i). Local cut=5/6 edges.
12. demo.py net: SolverQuip.for_network("aglais", keystore="./keys/keystore.json") auto-created keystore, auto-drew faucet, posted job, miner solved. Orders 182 (probe, 3-var model, 82s) and 183 (demo, 87.6s). Output in run_output.txt.
