# DEVLOG

Task: TS demo — Quip post-quantum keypair, sign, verify, tamper-fail. `npm install && npm run demo`.
Start: 2026-09-28 ~10:59 CEST. Node v22.22.2, npm 10.9.7, macOS arm64.

## Sources consulted (in order)
1. WebSearch "Quip Network post-quantum signatures SDK TypeScript hash-based" -> found github.com/quipnetwork, hashsigs-rs, hashsigs-solidity, cpp-sdk, quip.gitbook.io quickstart.
2. WebSearch "Quip Network quip.network docs developers post-quantum EVM" -> news/PR pages; mentions ethereum-sdk, cpp-sdk.
3. WebFetch https://github.com/quipnetwork (org page) — summary lists ethereum-sdk, hashsigs-ts, hashsigs-rs etc. NOTE: WebFetch summarizer reported "11.3k stars" for repos; implausible, treated as unreliable summary.
4. WebFetch https://quip.gitbook.io/docs/getting-started/quickstart -> HTTP 404 (dead end; search result URL is stale).
5. WebFetch https://github.com/QuipNetwork/hashsigs-rs (README) -> says ts/ dir has `@quip.network/hashsigs-wasm`, `loadHashSigs()`, `shrincs.keygen/sign/verify`, 32-byte messages. (Via summarizer; to be verified against npm + real source.)
6. `npm view @quip.network/hashsigs-wasm --json` -> dist-tag `latest` = 0.1.0-rc1, dist-tag `rc` = 0.2.1-rc9 (newest, 2026-08-27). License AGPL-3.0-or-later.
7. `npm pack` both versions into ./.scratch and read package contents (README.md, .d.ts). FINDINGS:
   - 0.1.0-rc1 (what a plain `npm install @quip.network/hashsigs-wasm` gets!) has NO README and a completely different low-level API (`loadShrincsWasm`, ActionContext, RotationContext...). It does NOT have `loadHashSigs`/`shrincs.keygen`.
   - 0.2.1-rc9 README documents `loadHashSigs()` -> `{sphincsPlusC, shrincs, shrincsImportSigningKey, profileName}`; this matches the GitHub README the summarizer showed. => DEVIATION: must pin `0.2.1-rc9` explicitly (a bare `npm install` per the README would give the wrong API).
   - README links source at gitlab.com/quip.network/hashsigs-rs; npm metadata points at github.com/quipnetwork/hashsigs-rs (mirror).
   - Messages must be exactly 32 bytes (pre-hash). Seed is caller-supplied (no RNG). Default profile 256s-keccak (~0.1s keygen/sign); 128s profiles take ~53s keygen through wasm -> avoid in demo.
   - Guessing: user said "Quip post-quantum keypair"; chose SPHINCS+C (stateless, simplest, no one-time-leaf state footgun) as the primary demo, plus SHRINCS (Quip's account scheme; stateful) as a second section.
8. Commands that mattered:
   - `npm init`-equivalent: hand-wrote package.json (type=module, scripts.demo = `tsx src/demo.ts`), tsconfig.json (NodeNext, strict).
   - `npm install` (pins @quip.network/hashsigs-wasm@0.2.1-rc9 exactly; no caret, since rc versions + `latest` tag = older/different API).
   - `npm install @noble/hashes@^1.8.0` — GUESS/DECISION: needed for keccak-256 to pre-hash messages to the 32 bytes the library requires (Node crypto has SHA3-256, NOT Ethereum keccak-256). Docs say "pre-hash arbitrary data" but do not say which hash; keccak-256 chosen because the README says the on-chain verifier treats its hash argument as the signed message and the target is EVM.
   - `npm run typecheck` -> clean (the package ships its own .d.ts; no errors).
   - `npm run demo` -> all 9 checks pass; ~2.6 s wall.
   - Clean-room repro: `rm -rf node_modules .scratch && npm install && npm run demo` -> exit 0, same output.
9. Errors / dead ends:
   - quip.gitbook.io/docs/getting-started/quickstart -> 404 (found via search result). Did not retry other gitbook paths; I did not need them because the npm README was sufficient.
   - Did not consult quip.network docs site or gitlab source directly; everything below is from the published npm tarball (README + .d.ts), i.e. I read package type declarations rather than docs for the API shape and error semantics (README says `ts/src/index.ts` is source of truth; not fetched).
   - The WebFetch tool's summary of github.com/quipnetwork showed implausible star counts (11k); ignored, irrelevant.
   - No runtime errors were hit.
10. Observations / honesty notes:
   - SPHINCS+C signature = 91,200 bytes in the default 256s-keccak profile (vs 2,784 bytes for a SHRINCS stateful signature with maxSignatures=16). Expect this to matter for EVM calldata costs. Not measured on-chain.
   - I did NOT test on-chain (Solidity) verification: task asked only for off-chain demo; hashsigs-solidity repo was seen in search results but not read or deployed. The README's claim "same signatures verify on-chain against the Solidity and Solana verifiers" is unverified by me.
   - No testnet, no keys other than in-memory throwaway seeds. `keys/demo-public.json` holds only public values; secrets are never written.
   - Package is `-rc` (release candidate), AGPL-3.0-or-later license — relevant for a commercial dApp; flag to the team.
   - I did not verify the "audited" claim in the package description.
   - Did not check the ethereum-sdk repo.
