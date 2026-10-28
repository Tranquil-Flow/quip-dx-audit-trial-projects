# Result

Status: WORKING (local XQuad demo); live Quip Network job BLOCKED by unpublished testnet connection details.

## What I built

A tiny weighted room-splitting demo (`demo.py`, `interactions.json`): six people and ten weighted pairwise interactions. Quip's XQuad `XQMX` model expresses Max-Cut; `xqsa.SolverDWaveCPU` finds a split with maximum cross-room interaction weight via local simulated annealing. A separate exhaustive enumerator verifies the optimum for inputs with at most 20 people. This uses Quip's published toolchain, but it is **not** quantum hardware, on-chain execution, or a network job.

## Run it

From this directory on macOS with `uv` available:

```sh
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python "xquad[quip]"
.venv/bin/python demo.py
.venv/bin/python -m unittest discover -v
```

`--data other.json`, `--seed 7`, and `--reads 200` are supported. JSON format: `{ "people": ["Ada", "Ben"], "interactions": [["Ada", "Ben", 5]] }`. If a standard Python 3.13 venv with pip is already active, the vendor's install command is `pip install "xquad[quip]"`. The network extra is not needed for local CPU use; `xquad` alone should also install that backend.

## Evidence

- `.venv/bin/python docs_example.py` (the docs' example) returned `XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0) -1`.
- `.venv/bin/python demo.py` returned rooms A=[Ben, Dee, Flo], B=[Ada, Cam, Eli], `cut_weight=44`, `energy=-44`, `exact_optimum=44`, `optimal=true`, `network_job=false`.
- `.venv/bin/python demo.py --seed 7 --reads 200` returned the complementary partition and the same optimal cut/energy.
- `.venv/bin/python -m unittest discover -v` returned `Ran 3 tests ... OK`.
- No tx hash, address, job ID, funded account, or throwaway key: no chain/testnet operation occurred and no existing wallet was accessed. No mainnet, money, public posts, or Docker changes.

## What did not work and why

The older indexed GitBook quickstart returned `Content owner not found`/404; the current docs live at `https://developers.quip.network/docs`. The compute guide explicitly says public testnet connection details have not been published; it also requires a funded account, so I did not guess an RPC endpoint or submit a transaction. The docs example prints a sample object's summary rather than the actual assignment; displaying the partition required using `sample.get_linear(i)`. The machine's default Python 3.9.6 was too old, and `uv`'s venv lacked a pip binary; `uv pip install` solved the local install. One intermediate test discovery ran before tests existed and returned `NO TESTS RAN`; subsequent three tests pass.

## Top five vendor docs/site improvements

1. Redirect all old `quip.gitbook.io/docs` URLs to the current developer portal, including indexed quickstart links.
2. Publish a public testnet WebSocket RPC address, faucet/funding path, throwaway-wallet instructions, and a complete runnable `SolverQuip` example (or explicitly label network submission as not yet available).
3. Make Quickstart distinguish what works locally today (XQuad CPU) from unavailable/public-network features; link a five-minute no-credentials demo.
4. Show how to extract the actual assignment from `result.sample`, not just print its `XQMX` representation; include a small verified Max-Cut example.
5. Include Python 3.13 installation/venv setup for macOS and keep registry/README reference links reachable or mirrored (the linked GitLab solver guide failed to load here).

Sources: https://developers.quip.network/docs/getting-started/quickstart ; https://developers.quip.network/docs/getting-started/quip-sdk ; https://developers.quip.network/docs/compute/submit-a-job ; https://github.com/QuipNetwork/xquad/blob/main/docs/book/src/concepts/quadratic-models.md . Full chronology and errors: `DEVLOG.md`, `FRICTION.md`.
