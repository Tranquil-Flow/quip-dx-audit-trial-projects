# FRICTION — moments a real person would be confused, misled, stuck, or annoyed

1. DuckDuckGo bot CAPTCHA
   URL: https://duckduckgo.com/?q=Quip+Network+quantum+compute+QUBO+max+cut
   Screen: "Unfortunately, bots use DuckDuckGo too. Please complete the following
   challenge to confirm this search was made by a human. Select all squares
   containing a duck"
   Expected: search results for Quip Network.
   Happened: a 3x3 image CAPTCHA whose squares could not be clicked — an invisible
   "anomaly-modal__mask" div intercepted every click ("Timeout 8000ms exceeded").
   Even after identifying the correct duck squares I could not submit.

2. Google 429 / sorry page
   URL: https://www.google.com/sorry/index?continue=...
   Screen: "HTTP 429" plus Google's sorry/rate-limit page.
   Expected: results. Happened: the first search from the browser was blocked as
   automated traffic. Also had to deal with a French cookie-consent dialog first.

3. Bing finds the wrong "Quip"
   URL: https://www.bing.com/search?q=Quip+Network+quantum+compute+QUBO
   Screen: results for quip.com ("Quip is real-time collaborative documents...
   inside Salesforce"), getquip.com ("Dentist-Recommended Electric Toothbrushes"),
   and Wikipedia's Quip (software).
   Expected: quip.network at the top. Happened: the quantum computing Quip is
   nowhere on page one of Bing for "Quip Network quantum compute QUBO". Only
   guessing the URL (quip.network) got me there.

4. Docs example code doesn't show how to read the result
   URL: https://developers.quip.network/docs/compute/submit-a-job
   Screen: example ends with "print(result.sample, result.energy)".
   Expected: sample to be a plain list/tuple of spin values.
   Happened: result.sample is an XQMX object; iterating it raises
   "TypeError: 'XQMX' object is not iterable". The values live in
   sample.get_linear(i) — undocumented on the page. Cost me a debugging cycle.

5. Binary model silently gives nonsense for max-cut
   Same URL. The docs describe the Ising model with spins -1/+1 but the install
   example builds XQMX.binary_model(size=4) (0/1 domain). Following that example
   for max-cut, the CPU solver returned the trivial all-same partition (cut 0)
   with energy 0 — a valid but useless local optimum, and the network job also
   returned nothing useful with the wrong encoding. No guidance on when to use
   binary_model vs spin_model.

6. PlacementError on a tiny 12-node graph
   URL: n/a (SDK error)
   Screen: "xqsa.quip_codec.PlacementError: placement search budget exhausted after
   200000 steps; the model may be too large to place within this budget, or its
   coupling graph may not be a subgraph of the topology."
   Expected: a 12-node, 20-edge graph to be trivially placeable.
   Happened: default placement failed on a toy problem. The docs mention
   topology="native" only much further down the same page ("Placed or native"), so
   the fix was non-obvious. The error message mentions raising max_steps but the
   actual fix (native mode) is elsewhere in the docs.

7. No block explorer or chain viewer anywhere in the docs
   URLs: developers.quip.network/docs (welcome, submit-a-job, ising-topologies,
   quickstart).
   Expected: a link like "view your job at explorer.aglais.quip.network/order/206".
   Happened: nothing. To get evidence (block hash, miner id, order id) I had to
   enable DEBUG logging on substrateinterface and grep the noise. A researcher
   would really want a per-job status URL.

8. Faucet funding is magic until it isn't
   The docs say solve() auto-drips 10 AGLS "if your balance is too low" but never
   state the threshold. Balances I observed (7.996 -> 6.994 -> 3.988 -> 8.979 AGLS)
   suggest drips happen at some invisible low-water mark and the extra 10 AGLS
   appears with no log line announcing it. Manual funding requires copying the
   account_id_hex out of ~/.quip/keystore.json (a file full of key material),
   which feels unsafe to touch.

9. French-language interstitial dialogs on every search engine
   Google and Bing both served cookie-consent and UI chrome in French (region
   detection), adding a translation step before searching. Minor, but it
   compounded with #1-#3.

10. No stated expectation for job latency
    Jobs took 88-130 s each on a 6-node problem with no explanation of why
    (block time? competition window? miner count?). A user comparing against a
    0.03 s CPU solve has no way to know what latency is normal.
