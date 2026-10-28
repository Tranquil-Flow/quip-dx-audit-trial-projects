# Friction log

Record each confusing or broken element with URL, exact quote, expected/actual behavior, and time cost.

1. https://quip.gitbook.io/docs/getting-started/quickstart — search result "Quickstart | Quip" promised the starter guide. Expected a guide; actually "Content owner not found" and 404. Found replacement developer portal from official website. Cost ~2 min.

2. https://developers.quip.network/docs/compute/submit-a-job — "Connection details for the public test network have not been published yet, so this page cannot include a node address." Expected a copy-paste testnet endpoint and funded test account/faucet; cannot run actual job through public network. Local CPU solver instead. Cost ~2 min.

3. https://developers.quip.network/docs/compute/submit-a-job — install block extracted as `pip install "xquad[quip]" pip  install "xquad[quip]"` and Python example duplicated every token/line. Expected clean copy-paste source; text extraction mangles syntax highlighting and browser timed out retrieving raw code. Reconstructed documented example and tested. Cost ~2 min.

4. https://developers.quip.network/docs/getting-started/quickstart — "There are two things you can do with it today: run a node, and generate quantum-resistant keys." Expected this to name the local optimization workflow linked under "Submit Your First Compute Job" in the same site's navigation. Actually the compute job page supports local jobs, but public network RPC is unpublished; unclear distinction between local SDK demo and network availability. Cost ~1 min.

5. https://developers.quip.network/docs/compute/submit-a-job — "It requires Python 3.13 or newer" and `pip install "xquad[quip]"`. Expected default macOS Python to suffice or an explicit environment bootstrap; this machine's `python3` was 3.9.6, and `uv venv --python 3.13 .venv` produced a venv without pip, so `.venv/bin/pip` failed with `No such file or directory`. Switched to `uv pip install --python .venv/bin/python "xquad[quip]"`. Cost ~1 min. The uv missing-pip aspect is tooling, not a Quip defect; a Python 3.13 venv setup snippet would still help.

6. https://developers.quip.network/docs/compute/submit-a-job — `print(result.sample, result.energy)`. Expected a displayed assignment ready to use; actual sample printed `XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0) -1`, not its bit vector. Printed runtime public attributes and used `get_linear(i)` to show partition. Cost ~2 min.

7. https://pypi.org/project/xqsa/ — "[Solving Overview](https://gitlab.com/quip.network/xquad/-/blob/main/docs/book/src/solving/README.md)". Expected linked GitLab docs to load; web extraction failed. GitHub mirror at `https://github.com/QuipNetwork/xquad/blob/main/docs/book/src/solving/README.md` worked. Cost ~1 min.
