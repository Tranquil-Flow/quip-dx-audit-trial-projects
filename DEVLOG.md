# Development log

This is a chronological record. No clock times are included, per the task instructions.

## 1. Initial workspace inspection

Commands:

- `pwd && git status --short --branch 2>&1 || true && printf '\nTop-level entries:\n' && printf '%s\n' *`

Results and errors:

- Working directory: `/private/tmp/devtrials5/g5-gpt-5.6-sol`.
- The directory was empty (`*` remained unexpanded).
- `git status` failed with `fatal: not a git repository (or any of the parent directories): .git`. This is expected for the supplied empty directory; I did not initialize Git because the task does not require it.

## 2. Initial public-web discovery

Sources consulted, in order:

1. DuckDuckGo search via the available web-search tool: `Quip Network documentation solver QUBO testnet` — no results (tool error).
2. DuckDuckGo search: `"quip-solver-core"` — no results (tool error).
3. DuckDuckGo search: `Quip Network GitHub QUBO solver` — no results (tool error).
4. DuckDuckGo search: `site:docs.quip.network testnet compute QUBO` — no results (tool error). This guessed docs hostname was not confirmed.
5. DuckDuckGo search: `site:quip.network solver testnet quantum optimization` — succeeded and returned these URLs/snippets:
   - https://quip.network/blog/testnet-is-live
   - https://quip.network/
   - https://developers.quip.network/docs/compute/submit-a-job
   - https://developers.quip.network/docs/getting-started/quickstart
   - https://quest.quip.network/users/0x9aeebf6d1489b37f9fa2e7c9142b116515e7d3bc

Notes:

- The first four searches unexpectedly failed with `DuckDuckGo search failed: DDGSException: No results found.` I changed to a broader query on the vendor's main domain rather than treating that as evidence that no documentation exists.
- The result snippets identify `developers.quip.network` as the likely official documentation site. The pages themselves had not yet been fetched at this point.

## 3. Official docs and package/repository discovery

Pages fetched directly, in order (all loaded successfully):

1. https://developers.quip.network/docs/compute/submit-a-job
2. https://developers.quip.network/docs/getting-started/quickstart
3. https://quip.network/blog/testnet-is-live
4. https://developers.quip.network/

Important findings:

- The compute guide says to install `xquad[quip]` (while the developer portal says `xqsa[quip]`; this is an inconsistency to resolve), requires Python 3.13+, and uses `xqvm_py.XQMX` plus `xqsa.SolverDWaveCPU` locally and `xqsa.SolverQuip` for the network.
- The compute guide explicitly says: `Connection details for the public test network have not been published yet, so this page cannot include a node address.` This may block remote job submission unless the machine-readable docs or source expose a current endpoint.
- The developer portal identifies the network as Aglais Testnet, EVM chain ID 20033, genesis hash `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`, and publishes an EVM HTTP RPC and faucet. This EVM RPC may not be the Substrate WebSocket endpoint that `SolverQuip` needs.
- The portal says GitLab is canonical and GitHub is a mirror, and links the `xquad`, `quip-validator`, `quip-miner`, and node deployment repositories.
- The launch blog says the testnet and optimization subnet are public and accepts optimization workloads, but points to older GitBook docs.
- The docs extractor duplicated some tokens/code in the compute page; I will prefer the documented markdown mirrors and package/source code before implementing.

Additional web searches, in order:

1. `site:developers.quip.network/docs quip solver local QUBO SDK`
   - https://developers.quip.network/docs/compute/submit-a-job
   - https://developers.quip.network/docs/getting-started/quickstart
   - https://developers.quip.network/docs/nodes/miners
   - https://developers.quip.network/docs/network/token
   - https://developers.quip.network/docs/quip-interlock-protocol/quip-lifecycle
2. `site:github.com/QuipNetwork OR site:github.com/quip-network quip solver core`
   - https://github.com/QuipNetwork/cpp-sdk
   - https://github.com/QuipNetwork/quip-miner
   - https://github.com/QuipNetwork/quip-miner/tree/main/
   - https://github.com/QuipNetwork/nodes.quip.network
   - https://github.com/QuipNetwork/quip-node-manager
3. `"Quip Network" "quip-solver-core" OR solver-core`
   - https://gitlab.com/quip.network/quip-solver-core
   - https://github.com/QuipNetwork
   - https://pypi.org/project/quip-solver-core/
   - https://github.com/orgs/QuipNetwork/repositories
   - https://docs.rs/quip-solver-core/latest/quip_solver_core/
4. `site:npmjs.com quip-solver-core` — returned only unrelated npm results; no useful Quip package was found.
5. `site:crates.io Quip solver QUBO` — no results (tool error).

Decision/possible deviation:

- The user mentioned `quip-solver-core` as an example. Official current docs instead point compute users to the higher-level Python packages `xquad` and `xqsa`; I will follow those docs. `quip-solver-core` appears to define the miner-side wire/session contract rather than the job-client workflow.

## 4. Machine-readable docs, package pages, and local prerequisites

Pages fetched directly, in order:

1. https://developers.quip.network/docs/llms.txt — succeeded; confirms the official docs index.
2. https://developers.quip.network/docs/compute/submit-a-job.md — succeeded and avoided the duplicated code produced by the HTML extractor.
3. https://developers.quip.network/docs/xquad-toolchain.md — succeeded; says QUBO is supported and identifies `xquad` as the umbrella package and `xqsa` as the solver-adapter package.
4. https://pypi.org/project/xqsa/ — extraction failed.
5. https://pypi.org/project/xquad/ — extraction failed.
6. https://gitlab.com/quip.network/xquad — loaded only sparse GitLab project metadata, not repository files.
7. https://gitlab.com/quip.network/quip-solver-core — loaded only sparse GitLab project metadata.
8. https://pypi.org/project/quip-solver-core/ — succeeded. Version 0.0.1 has an Apple Silicon wheel, but its own description confirms that it provides miner-side consensus primitives and gRPC stubs, not a local QUBO client or Python session loop.
9. https://github.com/QuipNetwork/quip-miner — succeeded. Its README confirms `quip-solver-core` is the miner wire/consensus contract and shows local devnet RPC conventions, but it does not document a public compute RPC.
10. https://developers.quip.network/docs/nodes/run-a-node-testnet.md — succeeded; this is node-operator guidance and does not publish a compute RPC.

Additional searches, in order:

1. `site:developers.quip.network/docs "SolverQuip" "QUIP_RPC_URL"` — only returned the already-read submit-a-job page.
2. `site:gitlab.com/quip.network/xquad SolverQuip` — failed due to a search-provider TLS handshake timeout.
3. `"QUIP_RPC_URL"` — returned only an unrelated advertisement; no useful result.

Command:

- `python3 --version; command -v python3; uv --version; brew --version | head -n 1; uname -m`

Result:

- System Python is 3.9.6, too old for the documented XQuad packages.
- `uv 0.11.8` and Homebrew 7.0.6 are available; host architecture is Apple Silicon (`arm64`).

Decision/workaround:

- Rather than modify the system Python or Homebrew installation, I will use `uv` to download Python 3.13 into this project and create a project-local virtual environment. I will also put uv's cache inside the project so the experiment stays self-contained.

## 5. Python setup and first official install attempt

Commands (run independently):

- `export UV_PYTHON_INSTALL_DIR="$PWD/.python" UV_CACHE_DIR="$PWD/.uv-cache"; uv python install 3.13 && uv venv --python 3.13 .venv && uv pip install --python .venv/bin/python 'xquad[quip]'`
- `mkdir -p vendor && git clone --depth 1 https://gitlab.com/quip.network/xquad.git vendor/xquad`
- Queried `https://pypi.org/pypi/xquad/json` and `https://pypi.org/pypi/xqsa/json` with Python's standard-library HTTP client, printing only selected package metadata.

Results:

- Python 3.13.13 downloaded successfully under `.python`, and `.venv` was created with it.
- `uv` also tried to install a convenience executable at `/Users/dev/.local/bin/python3.13`, outside the project. It did not overwrite or inspect the pre-existing file and reported a warning that it was not uv-managed. This was an unintended side effect of `uv python install`; subsequent work uses only the project-local interpreter.
- The canonical XQuad repository cloned successfully into `vendor/xquad` for source inspection.
- Current package metadata is `xquad==0.4.1` and `xqsa==0.4.1`; both require Python >=3.13. `xquad[quip]` resolves through `xqsa[quip]` to `quip-signer>=0.3.0,<0.4` and `substrate-interface>=1.7.4,<2`.

Error/dead end:

- The exact documented install, `xquad[quip]`, failed while building `quip-signer==0.3.0`. Maturin/Cargo reported that the package manifest tried to inherit `edition` from a workspace root but could not find a valid workspace root. Because the temporary build directory is nested under `/private/tmp`, Cargo encountered `/private/tmp/Cargo.toml`; per the user constraint, I did not open or inspect that file. The failure appears to expose either an incomplete `quip-signer` source distribution or an isolation-sensitive Cargo workspace declaration.
- The local-only dependencies had already resolved, but uv treated the failed transaction atomically; package installation needs to be retried with a workaround.

## 6. Canonical source inspection, current testnet coordinates, and local install

Sources consulted after cloning https://gitlab.com/quip.network/xquad.git at commit `4d892da922fe432ae246cdc1112a67a98516d1b0`, in order:

1. `vendor/xquad/AGENTS.md` -- repository conventions and package map.
2. `vendor/xquad/README.md` -- install/backend overview.
3. `vendor/xquad/xqsa/pyproject.toml` -- exact `quip` extra dependencies and macOS source-build policy.
4. `vendor/xquad/xqsa/README.md` -- local and network solver entry points.
5. `vendor/xquad/xqsa/quip.py` -- `SolverQuip` constructor, named-network preset, quote/funding/submission/lifecycle/result APIs.
6. `vendor/xquad/xqsa/quip_networks.py` -- current Aglais preset: `wss://bootnode-1.aglais.quip.network:20049/rpc` and `https://faucet.aglais.quip.network`.
7. `vendor/xquad/xqsa/tests/test_quip_live.py` -- vendor's live-test setup and observed public-testnet timing bounds.
8. `vendor/xquad/xqsa/quip_faucet.py` -- faucet request contract.
9. `vendor/xquad/docs/book/src/solving/quip-first-job.md` -- current end-to-end Aglais walkthrough, including `topology="native"` and testnet-only autofunding.
10. `vendor/xquad/docs/book/src/solving/quip-network.md` -- full network solver reference.
11. `vendor/xquad/docs/book/src/solving/local.md` -- CPU local-solver reference.

Public URLs fetched/queried, in order:

1. https://pypi.org/pypi/quip-signer/json -- `quip-signer==0.3.0` has Linux wheels but no macOS wheel; macOS must build the source distribution.
2. Web search `"quip-signer" GitLab Quip Network` -- failed due to a search-provider TLS handshake timeout.
3. https://aglais.quip.network -- succeeded and confirms Aglais has no-value test tokens, the public Substrate RPCs `wss://bootnode-{1-3}.aglais.quip.network:20049/rpc`, and the faucet.
4. https://gitlab.com/quip.network/xquad/-/blob/main/docs/book/src/solving/quip.md -- failed to fetch; guessed filename was wrong.
5. https://gitlab.com/quip.network/xquad/-/raw/main/docs/book/src/solving/quip.md -- HTTP 404; same wrong guessed filename.
6. https://gitlab.com/quip.network/xquad/-/raw/main/xqsa/quip_networks.py -- succeeded and independently confirms the source-tree preset.

Commands and results:

- `git -C vendor/xquad rev-parse HEAD && git -C vendor/xquad status --short --branch` recorded the inspected commit and confirmed a clean shallow clone.
- Queried selected fields from the PyPI `quip-signer` JSON API. The 0.3.0 source archive URL and SHA-256 were obtained there.
- `export UV_CACHE_DIR="$PWD/.uv-cache"; uv pip install --python .venv/bin/python xquad==0.4.1` succeeded. It built `xqffi` locally and installed the base CPU toolchain and `SolverDWaveCPU` without the network extra.
- Downloaded `https://files.pythonhosted.org/packages/60/29/05936bf404b00af7eecfae3a2ff3b344705fa9aa8a10d4623b379c1c15ac/quip_signer-0.3.0.tar.gz` to `vendor/`, verified SHA-256 `32fbaf97deb71a1f4c577d15a62944d2a8f653d4aa8a0d1c8503c3a5325aba4e` (matching PyPI), and extracted it under `vendor/quip_signer-0.3.0`.

Key finding and planned workaround:

- The current source docs are materially newer than the main developer compute page: they publish Aglais endpoints and an end-to-end job example. I will use the canonical source docs and named `aglais` preset.
- The `quip-signer` sdist's `transaction-crypto-py/Cargo.toml` says the crate is kept as its own workspace, but it has no `[workspace]` table. Cargo therefore walks into a parent manifest when one exists. I will add an empty `[workspace]` table only to the extracted throwaway copy and install that local copy. This deviates from the one-line official install solely to work around the macOS sdist build failure; the cryptographic source and dependency lock remain the vendor's published archive.

## 7. Signer workaround, project implementation, and local result

Commands, errors, and workaround:

1. Added an empty `[workspace]` table to the extracted sdist's `transaction-crypto-py/Cargo.toml`, then ran `uv pip install --python .venv/bin/python ./vendor/quip_signer-0.3.0` followed by the documented XQuad extra install.
2. That first workaround was incomplete. Cargo isolated the PyO3 crate but then treated its path dependency `transaction-crypto-core` as belonging to the unrelated parent manifest and failed with the same workspace-inheritance error. This was a second install error, not a network failure.
3. Added an empty `[workspace]` table to `transaction-crypto-core/Cargo.toml` too. Retried the same local signer install and `uv pip install --python .venv/bin/python 'xquad[quip]==0.4.1'`.
4. The retry succeeded: the unmodified signer code from the checksum-verified official sdist built on Apple Silicon, and the documented network dependencies installed. A version/import check confirmed `xquad==0.4.1`, `xqsa==0.4.1`, `quip-signer==0.3.0`, successful signer import, and the Aglais network preset.

Files implemented:

- `pyproject.toml` pins `xquad[quip]==0.4.1` and routes `quip-signer==0.3.0` to the patched official sdist copy.
- `uv.lock` records the resolved environment.
- `solve_qubo.py` defines one four-variable binary QUBO, enumerates all 16 assignments as an exact oracle, runs the official local and network solver adapters, persists JSON evidence, and compares results.
- `test_solve_qubo.py` checks the unique exact optimum, objective, model shape, and real local solver path.
- `README.md` contains setup and run commands; `.gitignore` excludes private key material and generated outputs.

Problem choice:

- I chose a maximum-weight independent-set QUBO on the path `0--1--2--3`: linear coefficients `[-3, -2, -4, -1]` and edge penalties `+6` on `(0,1)`, `(1,2)`, `(2,3)`. Exhaustive enumeration gives the unique optimum `[1,0,1,0]` at energy `-7`. A unique optimum makes the local/network comparison unambiguous while retaining nontrivial quadratic couplings.

Commands and observed local result:

- `export UV_PYTHON_INSTALL_DIR="$PWD/.python" UV_CACHE_DIR="$PWD/.uv-cache"; uv lock && uv sync --python 3.13 && uv run python -m unittest -v test_solve_qubo.py && uv run python solve_qubo.py local`
- Dependency lock/sync succeeded.
- All four tests passed.
- `xqsa.SolverDWaveCPU` returned sample `[1,0,1,0]`, energy `-7`; the independently recomputed objective and exhaustive optimum both matched. Evidence is in `outputs/local.json`.

Deviations/implementation notes:

- `SolverQuip` result metadata includes the order ID but omits the already-computed proposal extrinsic hash. To preserve requested transaction evidence, `RecordingSolverQuip` narrowly overrides the package's private `_submit_built` method, delegates to it unchanged, and records only the public hash/block receipt fields. This relies on an internal API and is isolated to one small class.
- The script uses `topology="native"` exactly as the vendor's current first-job walkthrough does; this avoids hardware-topology placement failure for arbitrary small coupling graphs, but excludes miners that cannot embed native graphs (notably some QPU-backed miners).
- Before any faucet or submission action, the script checks block 0 against the official Aglais genesis `0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`. A mismatch aborts, enforcing the no-mainnet requirement independently of the endpoint name.
- Two patch attempts to add that genesis check failed because the edit tool found duplicate JSON regions. Per the coding workflow, I re-read and rewrote the file once rather than retrying a stale patch. No failed patch changed the file.

## 8. Testnet submission, comparison, and independent explorer verification

Commands and results, in order:

1. Started a bounded background command that first asserted `keys/aglais-keystore.json` did not exist, then ran `uv run python -m unittest -v test_solve_qubo.py`, then `uv run python solve_qubo.py testnet`.
   - The pre-check confirmed there was no prior project keystore.
   - All four tests passed again.
   - XQSA generated a new throwaway H4 keystore at `keys/aglais-keystore.json`, connected to the named Aglais preset, and the script verified the expected genesis before any funding/submission.
   - The no-value faucet funded the fresh account automatically through `SolverQuip`'s documented `autofund=True` path.
   - The network job settled successfully in about 84 seconds. Five miner submissions were recorded; the winning submission carried one solution.
2. Ran `uv run python solve_qubo.py compare` and checked key permissions with `stat -f '%Sp %N' keys/aglais-keystore.json` without reading the file.
   - Comparison status: `WORKING`.
   - Both backends returned `[1,0,1,0]` at energy `-7`, exactly matching exhaustive enumeration; energy delta was zero.
   - The keystore mode is `-rw-------` (0600).
3. Tried public explorer GET pages in order:
   - https://subscan.aglais.quip.network/extrinsic/0xf920ce02f4b0557f0bb529313466e42d823cfcb9cce9196f838733ae6ecd6fbc -- 404.
   - https://subscan.aglais.quip.network/account/0x7549d99160b46f3bdeeb007ab538e126394a8cac825193cadcff602a82f938b1 -- 404.
   - https://subscan.aglais.quip.network/block/389539 -- 404.
   - Web search for the extrinsic hash also timed out. These explorer frontend routes were a dead end.
4. Posted the hash to https://subscan.aglais.quip.network/api/scan/extrinsic with the public Subscan API contract. This succeeded and independently reported finalized/successful extrinsic `389539-6`, `QuantumComputeMempool.propose_job`, the same hash, account, block, exact fee, reward, timing parameters, and decoded Ising payload.
5. Tried `https://subscan.aglais.quip.network/api/scan/account` with the 0x account ID; this installation returned HTTP 404. No account API data was needed because the extrinsic API returned the submitter's SS58 account.
6. Added and ran `uv run python verify_subscan.py`. It selected only non-secret evidence from the API and verified nine conditions, including hash/block/call/dispatch/finality, decoded Ising coefficients, reward, deadline, and block-wait. All checks passed and were saved to `outputs/subscan_verification.json`.

Observed evidence:

- Throwaway submitter AccountId: `0x7549d99160b46f3bdeeb007ab538e126394a8cac825193cadcff602a82f938b1`.
- Subscan's SS58 rendering of the same submitter: `5EiVQ213q55cB1sE5aqHinxMmJyYuAtex8oFGnJjg7DkFb9H`.
- Order ID: `179`.
- Proposal extrinsic hash: `0xf920ce02f4b0557f0bb529313466e42d823cfcb9cce9196f838733ae6ecd6fbc`.
- Proposal block: number `389539`, hash `0x0752f2872cdc82484a7149d259253bae404c39e19556c6ae4bcb82dad4f4fe67`, extrinsic index `389539-6`.
- Winning miner: `5E7fgcQm3WEdURyzGnxVZWGvHcQrhrasTKfKPUV7VpUD9Wgp`.
- XQSA returned network sample `[1,0,1,0]`, natural-scale QUBO energy `-7`, chain-side best Ising energy `-6500` milli, and `energy_matches_chain=true`.
- Initial quote on the empty account: reward `1,000,000,000,000` planck, exact fee `1,897,254,289` planck, total `1,001,897,254,289` planck (1.001897254289 AGLS). AGLS is testnet-only and has no value.

Clarification:

- XQSA's immediate submission receipt says `is_finalized=false` because `SolverQuip` deliberately waits only for in-block inclusion before monitoring the order. The later Subscan API read reports `finalized=true`.
- The order storage still decoded status `Opened` after its effective expiry, while XQSA reported `is_final=true`. This is expected per the vendor source docs: order status is lazily updated only when an extrinsic touches it, while client finality is computed from block heights.

## 9. Final verification

Command:

- `export UV_PYTHON_INSTALL_DIR="$PWD/.python" UV_CACHE_DIR="$PWD/.uv-cache"; uv lock --check && uv run python -m py_compile solve_qubo.py verify_subscan.py test_solve_qubo.py && uv run python -m unittest -v test_solve_qubo.py && uv run python solve_qubo.py compare && uv run python verify_subscan.py && stat -f '%Sp %N' keys/aglais-keystore.json`

Result:

- Lock consistency check passed with 43 resolved packages.
- All three Python files compiled.
- All four tests passed.
- Persisted comparison remained `WORKING`: identical sample and energy, both exact global optima.
- All nine independent Subscan checks passed again; the proposal remained successful and finalized.
- Keystore permissions remained 0600.
- Wrote `RESULT.md` with component/overall status, reproducible commands, evidence, failures, and vendor feedback.
