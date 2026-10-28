# Development log

This log records the investigation and implementation in order. No existing local keys, wallets, browser sessions, or services are used.

## Project discovery

1. Ran `pwd && git status --short --branch && git rev-parse --show-toplevel && node --version && npm --version` in the project directory.
   - `pwd` confirmed `/private/tmp/devtrials5/g2-gpt-5.6-sol`.
   - `git status` failed with `fatal: not a git repository (or any of the parent directories): .git`, so the later commands joined with `&&` did not run.
2. Enumerated project files with the workspace file-search tool. It returned no files: this is an empty, non-Git project.

## Public-source research

3. Searched the public web for `Quip Network pqhybridsign documentation @quip.network/pqhybridsign`. The search backend returned no results.
4. Searched the public web for `site:npmjs.com/package/@quip.network/pqhybridsign`. The search backend returned no results.
5. Searched the public web for `site:github.com "@quip.network/pqhybridsign" OR pqhybridsign`. Results included:
   - https://github.com/orgs/QuipNetwork/repositories
   - https://pypi.org/project/pqhybridsign/
   - https://docs.rs/pqhybridsign/latest/pqhybridsign/
   - https://libraries.io/pypi/pqhybridsign
   - https://lib.rs/cryptography/cryptocurrencies
   Only the GitHub organization and docs.rs result appeared potentially relevant to the requested JavaScript package at this point; the other URLs were search-result leads and had not been opened.
6. Ran `node --version; npm --version; npm view '@quip.network/pqhybridsign' --json`.
   - Node is `v22.22.2`; npm is `10.9.7`.
   - The npm registry reports `latest` as `0.0.0-rc1` and `next` as `0.0.0-rc9`, Node >=20, a Promise-based Node/browser WASM API, AGPL-3.0-or-later licensing, and the upstream repository at https://gitlab.com/quip.network/pqhybridsign.git.
   - The metadata's `readmeFilename` is empty, so npm metadata did not provide usage documentation.
7. Opened https://github.com/orgs/QuipNetwork/repositories. It lists a public `QuipNetwork/pqhybridsign` mirror.
8. Opened https://docs.rs/pqhybridsign/latest/pqhybridsign/. This is Rust API documentation for `0.0.0-rc9`; it says all six suites are AND-composed from classical and post-quantum halves. It does not document the JavaScript wrapper API.
9. Tried to open https://www.npmjs.com/package/@quip.network/pqhybridsign, but automated extraction failed with an empty page.
10. Searched for `QuipNetwork pqhybridsign javascript npm GitHub`. This confirmed the Quip GitHub organization and website but did not expose JavaScript usage docs.
11. Searched for `quip.network docs hybrid signature JavaScript`; the search backend returned no results.
12. Opened the upstream mirror and its README:
   - https://github.com/QuipNetwork/pqhybridsign
   - https://raw.githubusercontent.com/QuipNetwork/pqhybridsign/main/README.md
   The README is the useful official JavaScript documentation. It says to install the prerelease through `@next`, documents the async WASM API (`keygenFromSeed`, `sign`, and `verify`), recommends a stateless lattice suite for systems that restore or replicate signers, and identifies `ED-ML-44` as ed25519 + standardized ML-DSA-44. It also warns that the package/wire format is pre-release, JavaScript cannot sign with the stateful SHRINCS suites, Falcon-512 predates final FIPS 206, and the project is AGPL-3.0-or-later.
13. Tried to open https://gitlab.com/quip.network/pqhybridsign; automated extraction returned no content. The public GitHub mirror supplied the same upstream README instead.
14. Ran `npm view '@quip.network/pqhybridsign@0.0.0-rc9' --json`. It confirmed `0.0.0-rc9` is the `next` release, supports Node >=20, and publishes Node-specific CommonJS/WASM plus type declarations. Decision: pin exact `0.0.0-rc9` rather than leave this security-sensitive proof on a moving prerelease tag.
15. Searched for JavaScript API symbols (`"pqhybridsign" "generateKeypair" JavaScript`, `"pqhybridsign" "keygen" wasm npm`, and the GitLab repository plus `wasm npm README`). The search backend returned no results for all three. No additional source was obtained.

## Design decisions

16. Selected `ED-ML-44` as the default and only accepted suite for this small API-request library: it AND-composes ed25519 with FIPS 204 ML-DSA-44, is stateless, works for JavaScript signing, and avoids the upstream Falcon pre-standard and SHRINCS state-management caveats.
17. The library will sign a versioned canonical request representation containing method, path/query target, timestamp, nonce, and SHA-256 body digest. The suite's separate context input will be fixed and versioned too. This is application-level domain separation on top of Quip's suite-level domain separation.
18. Keys and signatures will use explicit versioned JSON envelopes with base64url byte encoding. Private-key files created by the CLI will use mode `0600`. The CLI will refuse overwrite unless `--force` is supplied and will never serialize the 32-byte derivation seed.
19. Verification will optionally enforce maximum signature age and future-clock skew. Nonce persistence/replay rejection is intentionally the API server's responsibility and will be documented rather than hidden behind process-local state.

## Implementation

20. Ran `npm view typescript version && npm view '@types/node' version`; the registry reported TypeScript `7.0.2` and Node types `26.6.3`.
21. Created the npm/TypeScript project metadata, local-key directory, ignore rules, library source, CLI source, test suite, and inter-process demo. The dependency is pinned to `@quip.network/pqhybridsign@0.0.0-rc9`; this project is also marked AGPL-3.0-or-later to respect the upstream license.
22. Ran `npm install`. It installed five packages, generated `package-lock.json`, audited six packages, and reported zero vulnerabilities.
23. Inspected the installed package contents and read these packaged sources because the short README does not document validation details or the complete TypeScript surface:
   - `node_modules/@quip.network/pqhybridsign/package.json`
   - `node_modules/@quip.network/pqhybridsign/README.md`
   - `node_modules/@quip.network/pqhybridsign/dist/api.d.ts`
   - `node_modules/@quip.network/pqhybridsign/dist/index.node.d.cts`
   - `node_modules/@quip.network/pqhybridsign/LICENSE`
   The declarations confirmed the `Suite` values and Promise signatures, plus exact semantics for `keygenFromSeed`, `sign`, `verify`, and the length accessors. This was source/declaration inspection beyond the official README and is recorded as such.
24. Ran `cp node_modules/@quip.network/pqhybridsign/LICENSE ./LICENSE` to include the complete upstream AGPL-3.0 license text.
25. First `npm run build` failed: TypeScript 7 did not include installed Node globals/modules automatically and emitted 16 `TS2591` errors for `node:` imports, `Buffer`, and `process`. Added `"types": ["node"]` to `tsconfig.json`; this is a TypeScript 7 configuration workaround not mentioned in Quip's usage instructions.
26. Re-ran `npm run build`; TypeScript compilation and the post-build executable-mode step passed.
27. Ran `npm test`; all five tests passed. The tests exercise raw-message context separation, valid API request verification, body/method/target/signature tampering, timestamp windows, malformed metadata, and deterministic canonicalization.
28. Ran `npm run demo`. It built the project, generated a new local key, and launched distinct signer/verifier CLI processes. The first run reported suite `ED-ML-44`, a 2,484-byte signature, signer PID `92412`, verifier PID `92413`, accepted the authentic request, and rejected a tampered body. No network or blockchain was contacted.
29. Added a direct signature-bit-flip assertion to the tests after reviewing the first passing suite, so the final suite proves malformed hybrid signatures are rejected in addition to changed request data.
30. Ran these packaging and operational checks:
   - `node dist/cli.js help` printed the expected command reference and exited 0.
   - `stat -f '%Sp %N' keys/demo-client.private.json keys/demo-client.public.json keys/demo-request.signature.json dist/cli.js` confirmed `0600` private-key permissions, `0644` public/signature permissions, and an executable CLI.
   - `npm audit --omit=dev` reported zero production vulnerabilities.
   - `npm pack --dry-run --json` reported an 11-file package containing the license, README, declarations, source maps, compiled library, and executable CLI. It did not create a tarball.
   - `npm ls --all` confirmed the pinned Quip package and tool versions. TypeScript listed expected unmet *optional* binaries for platforms other than this macOS/arm64 host; this was not an install or runtime failure.
31. Re-ran the final `npm test` after the bit-flip assertion. All five test cases passed with 0 failures.
32. Re-ran the final `npm run demo`, which always replaces its own demo files with a newly generated throwaway key. Final evidence: key ID `tqzPZU-ykTY_IiEaMMa5UdgwY3dROOO1PqM4cYzXAQY`, 2,484-byte signature, signer PID `5777`, verifier PID `5792`, authentic request accepted, tampered body rejected with `request body digest mismatch`.

## Deviations, assumptions, and non-actions

33. The project does not use a chain, wallet, faucet, browser, Docker, testnet, or mainnet. There are therefore no addresses or transaction hashes. All keys are fresh local throwaways in `./keys`; no existing machine keys were searched for or used.
34. Quip provides signature primitives, not an API-request canonicalization standard. The versioned method/target/timestamp/nonce/body-digest representation in this project is an explicitly documented application design, not a vendor wire standard.
35. No source was posted publicly and no forum, Discord, issue tracker, or social channel was used.
