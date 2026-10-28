# FRICTION.md — Confusion, Stuck Moments, and Annoyances

## 1. "Connection details for the public test network have not been published yet"

- **URL**: https://developers.quip.network/docs/compute/submit-a-job
- **Exact sentence**: "Connection details for the public test network have not been published yet, so this page cannot include a node address."
- **What I expected**: A working RPC URL to actually test the network solver
- **What actually happened**: The docs page that tells you HOW to submit a job explicitly says the connection details aren't published. This is a dead end in the documentation flow — you follow the "Submit Your First Compute Job" link, read the whole page, get to the `SolverQuip` code block, and then discover you can't use it.
- **Resolution**: I found the URL by cross-referencing the nodes.quip.network GitHub repo (bootnode addresses), the chainlist.org entry, and probing WebSocket endpoints manually. The correct URL `wss://bootnode-1.aglais.quip.network:20049/rpc` is discoverable but never stated in the developer docs.
- **Time cost**: ~15 minutes of searching, probing, and guessing

## 2. XQMX sample object is not a plain list

- **URL**: https://pypi.org/project/xqsa/0.4.1b1/ (and the developer docs)
- **Exact output**: `result.sample` prints as `XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0)`
- **What I expected**: A list or array of binary values like `[0, 1, 0, 1]`
- **What actually happened**: `result.sample` is an opaque XQMX object. You can't iterate over it, index it, or convert it with `list()` or `np.array()`. The PyPI example just prints it and shows the energy — it never extracts the actual assignment values.
- **Resolution**: Discovered by probing the API that `result.sample.iter_linear()` yields `(index, value)` tuples for non-zero variables, and `result.sample.linear` is a dict. Variables not listed are 0. The `size` attribute tells you the total variable count.
- **Time cost**: ~10 minutes of trial and error

## 3. Python 3.13 requirement vs system Python 3.9.6

- **URL**: https://pypi.org/project/xqsa/0.4.1b1/ (requires Python >=3.13)
- **Exact text**: "Requires Python >=3.13"
- **What I expected**: Maybe a note in the quickstart about needing a newer Python
- **What actually happened**: The quickstart just says `pip install "xquad[quip]"` without mentioning the Python version requirement. On macOS with Homebrew Python 3.9.6, this silently fails with an "externally-managed-environment" error, which is actually a PEP 668 issue, not the version issue. You don't discover you need 3.13+ until you read the PyPI metadata.
- **Resolution**: Created a venv with `python3.13 -m venv .venv` (Python 3.13 happened to be installed via Homebrew)
- **Time cost**: ~2 minutes (but would be longer if 3.13 wasn't installed)

## 4. GitLab docs return empty/404

- **URLs**: 
  - `https://gitlab.com/quip.network/xquad/-/blob/main/docs/book/src/solving/README.md`
  - `https://gitlab.com/quip.network/xquad/-/blob/main/spec/xqsa/SPEC.md`
- **What happened**: Both URLs returned empty content or failed to fetch. The PyPI page references these as "the normative reference" but they're inaccessible via web extraction.
- **What I expected**: Readable documentation pages
- **Resolution**: Gave up on reading the spec; worked from the developer docs and PyPI examples instead
- **Time cost**: ~3 minutes

## 5. Intermittent EncodingError on network solve

- **URL**: N/A (runtime error from SolverQuip)
- **Exact error**: `EncodingError: spin vector length 2 does not match topology node count 6`
- **What I expected**: Consistent behavior — either it works or it doesn't
- **What actually happened**: The first two network solves succeeded (orders 129, 136). One intermediate attempt failed with this encoding error. Retrying with the same model and parameters succeeded. The error is not reproducible and seems timing/state-dependent.
- **Resolution**: Just retried. Worked on second attempt.
- **Time cost**: ~2 minutes

## 6. Faucet URL gives 404 on GET

- **URL**: https://faucet.aglais.quip.network
- **What happened**: `GET /` returns 404 with empty body. POST to various endpoints also returns empty.
- **What I expected**: Either a working faucet API or documentation about how to request funds
- **Resolution**: The `autofund=True` parameter on `SolverQuip.for_network()` handles faucet interaction internally. The faucet URL is used by the SDK, not by direct HTTP calls. Manual curl attempts all failed.
- **Time cost**: ~5 minutes

## 7. xq-py GitHub repo has empty README

- **URL**: https://github.com/QuipNetwork/xq-py
- **What happened**: The README is the default GitLab template with no project-specific content. No code examples, no API docs, no usage instructions.
- **What I expected**: At minimum a "getting started" section for the Python QVM
- **Resolution**: Ignored this repo; the real docs are at developers.quip.network and the PyPI pages
- **Time cost**: ~2 minutes (reading and realizing it's useless)

## 8. Developer docs say "no testnet address" but testnet IS live

- **URL**: https://developers.quip.network/docs/compute/submit-a-job
- **Exact text**: "Connection details for the public test network have not been published yet"
- **What actually happened**: The Aglais testnet has been live since 2026-09-02 with bootnodes, a faucet, an explorer, and chainlist entries. The developer docs are stale — they were written before the testnet launch and never updated.
- **Time cost**: This caused most of the friction in the entire experiment
