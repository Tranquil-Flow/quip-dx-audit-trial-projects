# Dev log

2026-09-28 ~14:05 CEST. Empty project directory confirmed with `pwd && /bin/ls -la`; Node v22 toolchain, Python, curl, Docker present (`command -v node npm python3 curl docker`); `date` returned Mon 28 Sep 2026 14:05:01 CEST. Searched web for `Quip Network developer docs quickstart testnet SDK`: results included official GitBook quickstart, SDK, and node instructions. Will pursue the shortest documented app path, avoiding mainnet and existing keys.

Pages visited (chronological):

- https://quip.gitbook.io/docs/getting-started/quickstart — searched quickstart; browser showed "Content owner not found", extraction 404.
- https://quip.gitbook.io/docs — tried old landing, extraction 404.
- https://quip.network/ — official homepage; found docs link and Quip SDK/compute positioning. Browser unexpectedly landed on redirected developer portal then homepage on next call.
- https://developers.quip.network/docs — new developer docs landing; linked Quickstart, Quip SDK, compute job.
- https://developers.quip.network/docs/getting-started/quickstart — only currently available actions listed are run a node or generate quantum-resistant keys; points to libraries.
- https://developers.quip.network/docs/getting-started/quip-sdk — npm beta/rc package versions and Python xquad/xqsa; chose local CPU solver path.
- https://developers.quip.network/docs/compute/submit-a-job — local solver example and network prerequisites; public testnet RPC unpublished. Web extractor duplicates syntax-highlighted code; browser stalled twice trying to read exact pre blocks.

Commands: `python3 --version; command -v uv; command -v brew; npm --version; date` → Python 3.9.6, uv and brew available, npm 10.9.7. Browser page click and subsequent navigation timed out in Runtime.evaluate; used extracted docs instead.

- https://developers.quip.network/docs/xquad-toolchain — followed compute page's XQuad toolchain link; local CPU backend advertised.
- https://pypi.org/project/xquad/ — registry README, installation and package map.
- https://pypi.org/project/xqsa/ — registry README, solver results and backend details; links solver documentation.
- https://github.com/QuipNetwork/xquad — README from registry/search; linked books and examples; early-public-release warning.
- https://gitlab.com/quip.network/xquad/-/blob/main/docs/book/src/solving/README.md — link from xqsa PyPI; web extraction failed.
- https://github.com/QuipNetwork/xquad/blob/main/xqsa/README.md — GitHub README, same solver description, linked docs.
- https://github.com/QuipNetwork/xquad/blob/main/docs/book/src/solving/README.md — followed documented solver overview at GitHub mirror; sample XQMX and energy explanation.
- https://github.com/QuipNetwork/xquad/blob/main/docs/book/src/solving/local.md — followed overview's Local Solvers link; CPU parameters and seed.
- https://github.com/QuipNetwork/xquad/blob/main/docs/book/src/concepts/quadratic-models.md — followed Max-Cut modeling link; exact QUBO formula used in demo.

Commands and outcomes:
- `uv venv --python 3.13 .venv && .venv/bin/python --version && .venv/bin/pip install "xquad[quip]"` → Python 3.13.14 venv created but `No such file or directory` for pip (uv default venv omits pip).
- `uv pip install --python .venv/bin/python "xquad[quip]"` → installed xquad 0.4.1, xqsa 0.4.1, xqvm-py 0.4.1 and 39 dependencies successfully. Network extra installed but no network connection used.
- `.venv/bin/python docs_example.py` → `XQMX(mode=SAMPLE, domain=BINARY, size=4, linear_terms=1, quadratic_terms=0) -1`. This is the docs' local CPU example, transcribed without duplicated HTML-extraction text.
- `.venv/bin/python -c '...XQMX.binary_model...SolverDWaveCPU(seed=42)...'` → 3-node documented Max-Cut model produced SAMPLE with `linear: {0: 1, 2: 1}`, energy -8. Printed public attributes and `vars()` of this runtime result to learn how to display assignments; no source/dist inspected.
- Created `demo.py` and `interactions.json`: six-person weighted split/Max-Cut with Quip XQuad local CPU backend and independent exhaustive optimum check.
- `.venv/bin/python demo.py && .venv/bin/python demo.py --seed 7 --reads 200 && .venv/bin/python -m unittest discover -v` → both runs cut 44, energy -44, exact optimum 44; test discovery returned exit 5 `NO TESTS RAN` (tests not written yet).
- Created `test_demo.py`. `.venv/bin/python -m unittest discover -v && .venv/bin/python demo.py` → 3 tests pass, default run partition A=[Ben, Dee, Flo], B=[Ada, Cam, Eli], cut=44, energy=-44, optimum=44. No network transaction, address, job ID or test keys created.
- `date; /bin/ls -la` → 14:10 CEST; project entries verified. No Docker resources touched.
