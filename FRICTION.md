# FRICTION
(none yet)

## F1 — Search "Quip Network quantum compute submit max-cut QUBO problem" returns nothing about Quip
- URL: web search. Expected vendor page in top results; got only generic max-cut papers. Cost ~1 min. Needed a second search with just the vendor name.

## F2 — Stale docs URL in search results
- URL: https://quip.gitbook.io/docs (search result titled "Welcome to Quip Network | Quip"). Expected docs; got HTTP 404. Real docs are at developers.quip.network. Cost ~1 min.

## F3 — Submit-a-Job page says the network can't be reached yet
- URL: https://developers.quip.network/docs/compute/submit-a-job
- Quote: "Connection details for the public test network have not been published yet."
- Expected: a URL to plug into `SolverQuip(url="<websocket address of a Quip node>")`. Got a placeholder. Homepage links "Submit a Job" as a live CTA. (Checking other pages for the address.)

## F4 — Testnet pages don't give the RPC address, chain id or faucet
- URLs: .../docs/getting-started/quickstart, .../docs/getting-started/quip-sdk, .../docs/nodes/run-a-node-testnet
- Expected: a `wss://` URL for QUIP_RPC_URL and a way to get test funds ("Funded account" is required by submit-a-job). Got nothing on any of the three. Cost ~4 min.
- Also: Quickstart says nothing about submitting jobs, only "run a node" and WOTS+ keys.

## F5 — Ising topologies page lists no concrete topology
- URL: https://developers.quip.network/docs/compute/ising-topologies
- Quote: "Your problem must fit inside a hardware topology that is registered on the chain."
- Expected: name(s) and size of registered topologies (e.g. Zephyr/Pegasus) so I can tell if a max-cut graph fits and what to do (embed myself?). Got constraints only. Max-cut on arbitrary graph needs embedding which the docs say isn't done.

## F6 — Real testnet coordinates only discoverable from the installed Python package's docstrings
- URL: https://developers.quip.network/docs/compute/submit-a-job says "Connection details for the public test network have not been published yet." Yet `SolverQuip.for_network("aglais")` exists (xqsa 0.4.1 docstring) and https://aglais.quip.network publishes RPC + faucet. Neither the docs nor quip.network homepage link to aglais.quip.network (I only found it in the `xqsa.quip_networks` docstring). Also the docs never mention faucet or `QUIP_FAUCET_URL`/autofund. Cost ~12 min (incl. install).
- Also the docs example passes `keystore="<path>"` but package default is ~/.quip/keystore.json outside any project (auto-created if omitted) — surprising side effect; I avoided by passing explicit keystore.

## F7 — Docs say Ising, example uses binary_model
- submit-a-job says "Problems must be expressed as Ising models" but the code sample is `XQMX.binary_model(size=4)`. Spin model is `XQMX.spin_model` (found via dir()). Unclear if binary is auto-converted. Also `print(result.sample, ...)` prints an `XQMX(mode=SAMPLE ...)` object rather than values.

## F8 — Default-topology placement fails silently-ish for ordinary graphs; "native" option undocumented
- URL: https://developers.quip.network/docs/compute/submit-a-job ("Mismatches fail before reward commitment, so you lose nothing").
- N=20 random 3-regular graph -> `PlacementError: placement search budget exhausted after 200000 steps`. Error doesn't say which topology / how big it is. The fix (`topology="native"`) is only in the SolverQuip docstring, and it warns QPU miners can't embed arbitrary graphs. Docs never say max-cut on arbitrary graphs needs this. N=16 happened to fit. Cost ~5 min.

## F9 — Solve takes 70-95 s with no progress output beyond a quote; `query()` needs the model again
- `solve()` blocks ~75-95 s; docs don't say to expect this. `SolverQuip.query(order_id)` fails with "missing 1 required positional argument: 'model'" (docstring explains, docs page says "queryable on-chain by order ID" only). No tx hash is surfaced in result.metadata (only order_id); had to use status() and there's no doc pointing to the Subscan explorer for the order.

## F10 — Docs list units inconsistent: docs say coefficients are integers in thousandths
- Docs: "a value of 1.5 is transmitted as 1500" — the SDK does the scaling itself (result.energy = -18 in natural units, metadata best_energy_milli=-18000). Fine but the docs make it sound like the user must scale.

## F11 — Python 3.13+ requirement while system default is 3.14/3.12 etc.
- Minor: needed `uv venv --python 3.13`. Requirement is stated (good).
