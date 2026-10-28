# DEVLOG

Start: 2026-09-28 ~11:20 CEST. Env: macOS arm64, node v22.22.2, npm 10.9.7, docker 29.1.3. Project dir was empty.

## Sources consulted (in order)
1. WebSearch "Quip Network quantum randomness API" -> only secondary results (X, PRNewswire, KuCoin, Cryptopond, mpost, memeburn, nftplazas). No docs/API link surfaced.
2. WebSearch "Quip Network docs quantum proof of work developer SDK random number" -> more press coverage + quip.network, bitrue blog. Marketing text says SDK/APIs are "expanding" (i.e. not clearly available). Note: search results are secondary; treat claims as unverified until primary docs found.

3. WebFetch https://quip.network/ -> links to developers.quip.network, github.com/quipnetwork, /qvrf/. (WebFetch = small-model summary; I re-verified key claims with curl on raw text.)
4. WebFetch https://www.prnewswire.com/...quantum-echoes-302875201.html -> HTTP 404 (dead end; press-release URL from search was wrong/removed).
5. WebFetch https://quip.network/qvrf/ -> QVRF product page. Says LIVE: quantum execution + Merkle commit/audit pipeline; IN DEVELOPMENT: on-chain verification contracts, trustee distribution. Access via "Request Access" (contact form).
6. WebFetch https://developers.quip.network/docs -> nav. WebFetch https://github.com/quipnetwork -> repo list (summary had absurd star counts, ignored).
7. WebFetch https://developers.quip.network/docs/compute/qvrf and .../submit-a-job (summaries).
8. curl raw https://developers.quip.network/docs/compute/qvrf.md (docs serve markdown by appending .md - found via llms.txt) -> CONFIRMED verbatim: "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here." and "Integration documentation with installable packages and code examples will follow". Saved to research/qvrf.md.
9. curl https://developers.quip.network/llms.txt and /docs/llms-full.txt -> testnet (Aglais) details, faucet, EVM RPC, SDK info. Saved in research/. grep for qvrf/random in full docs: only the QVRF page + roadmap mentions. No API endpoint anywhere.
10. curl https://echoes.quip.network/ -> page says "Mint has ended". No contract addresses in HTML. Only known QVRF consumer; mint closed.
11. GitHub API orgs/quipnetwork/repos -> 47 repos; NONE named qvrf/randomness/oracle/coordinator client. (quip-miner README mentions a coordinator, for Ising mining, not QVRF - not read in depth.)

## Commands
- `ls -la; node -v; npm -v; docker --version` (env check)
- `mkdir research; curl ...` for docs above (cwd accidentally moved into research/ - harmless)

## Guesses / deviations / dead ends
(none yet)

- FINDING: QVRF has no public request interface today (docs say so explicitly, and "Request Access" is a contact form). Cannot integrate directly. Not going to guess endpoints or scrape Echoes internals. Also NOT using the docs' feedback board/Discord (rule: don't post publicly).
- Docs quirk: the docs llms.txt says `xqsa[quip]` but submit-a-job page WebFetch summary said `xquad[quip]` - inconsistency (irrelevant to randomness; not pursued).

## Second-source investigation: CURBy (NIST/CU Boulder quantum beacon) - considered as substitute
12. WebSearch "CURBy ... Bell test" -> IEEE Spectrum / NIST / HPCwire etc confirm CURBy is a Bell-test quantum beacon (June 2025).
13. curl https://random.colorado.edu/api/chains -> 7 chains. First one I grabbed (bafyriqa5k2d...) was "drand Mirror" - NOT quantum (near-mistake; caught by reading meta.name).
14. Real quantum chain is "CURBy-Q" (twine diqrng). Latest pulse index 84647 timestamp 2025-08-22, parameters.isQuantum=false, stage "request". NIST-bell-experiment latest pulse also 2025-08-22 ("queued"). Today is 2026-09-28 -> the quantum chains look STALLED for >1 year (my reading of the API; could be a different retention/endpoint quirk - unverified). CURBy-RNG chain IS live (pulse 2026-09-28T09:22Z) but it is a NIST-beacon-style chain; I can't tell from the API that fresh pulses include quantum entropy. DECISION: don't use CURBy as a "quantum" source; not claiming it.
15. Probed https://evm-rpc.aglais.quip.network: eth_chainId=0x4e41 (20033) OK, block 0x5b89d at ~11:25 CEST -> testnet is live.

## ERROR (disk full)
- ~11:45 CEST: every Bash call started failing with `ENOSPC: no space left on device` (harness could not write its own task output file under /private/tmp/claude-501/...). Happened right after writing src/*.js, test/draw.test.js and scripts/demo.js; unit tests and the testnet end-to-end run have NOT been executed yet. Cause unknown: my project is ~30 MB (node_modules) so it is likely the machine's disk being full for other reasons. I am not going to hunt around the machine or delete anything I did not create.

## Decision
Closest supported option = raffle service with pluggable entropy provider interface:
 - `qvrf` provider: stub that throws QvrfNotAvailableError citing docs (so swapping in is a one-file change once Quip ships the interface).
 - working path: commit-reveal (server secret from crypto.randomBytes committed on-chain on Quip Aglais testnet) + future Aglais block hash as public beacon. Honest label: NOT quantum.
- npm install (ethers v6)
- `npm run keygen` -> new throwaway address 0xa03aaEd841afF5FF3a77999A8BC56f5f38beDC81 (key in ./keys/testnet.json). Faucet POST /request -> 200, extrinsic 0x71bbbc9c337c52bf09499482512e0c37b1f4b4084baa8d1ed3d1c99974e3a401, amount 10000000000000 (=10 AGLS at 12 decimals, substrate units).

## Build / run log (after disk-full episode)
- ENOSPC was transient: ~2 min later Bash worked again; `df` showed /System/Volumes/Data 100% full, 2.2Gi free (something outside this project). The command that failed had not created scripts/demo.js, so I re-created it with the Write tool.
- `npm test` -> first run FAILED: `node --test test/` treats `test/` as a module path on Node 22 (MODULE_NOT_FOUND). Fixed by using `node --test test/*.test.js`. Then 7/7 pass.
- `node src/server.js` (PORT 3000) + `npm run demo` -> success. Raffle e20ed108-7a7a-4af4-adcc-876c86c7e880, commitment tx 0x210539392544fcd40900cfcd2f089dc377e19e9bef52af854b6b88089939260e (block 374970), beacon block 374973 hash 0xcc89dac5...6d2ced, winners [bob, carol], /verify all checks true.
- Independent check with raw `eth_getTransactionByHash` : input == commitment; `eth_getBlockByNumber` 374973 hash == beaconHash. (My first attempt used a hand-typed wrong hex block number -> null; my error, not the chain's. Re-done with computed hex.)
- ENTROPY=qvrf server (PORT 3001): POST /close -> HTTP 501 with the documented reason. (Intended behaviour.)
- Stray no-op command: a `sed -i '' ... /dev/null` I typed by mistake errored harmlessly.
- Guesses I made: (a) BEACON_DELAY=3 blocks, arbitrary; block time on Aglais looked ~5-10s (observed head advancing ~1 block per 3s poll... roughly). (b) Anchoring commitment as calldata of a self-transfer instead of a contract, to avoid deploying/guessing Solidity/pallet-revive toolchain. (c) gasPrice hardcoded 1 gwei per docs. (d) Treated Aglais block hash as public beacon; I did not audit how its hash is produced or who can influence it (docs: PoW-style Ising mining) - a miner could in principle grind; documented as limitation.
- Not done: no on-chain contract, no auth on the HTTP API, no rate limits, secret persisted in plaintext in data/raffles.json, no Docker used. Did not post on feedback board/Discord.
