# DEVLOG

## Research trail (in order)

1. DuckDuckGo homepage — https://duckduckgo.com/  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0001.png`  
   Goal: begin from a normal web search for Quip Network post-quantum browser/TypeScript signing.
2. DuckDuckGo homepage with query entered: `Quip Network post quantum signature SDK browser TypeScript`  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0002.png`  
   Goal: submit the research query.
3. Same DuckDuckGo page after clicking the visible Search button; it did not navigate.  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0003.png`
4. Same DuckDuckGo page after pressing Enter; it still did not navigate.  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0004.png`
5. DuckDuckGo result page opened with the same query in the URL after normal submit controls failed — https://duckduckgo.com/?q=Quip+Network+post+quantum+signature+SDK+browser+TypeScript  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0005.png`  
   Visible useful results: `hashsigs-ts: TypeScript WOTS+ Post-Quantum Signature Library` (hysenlabs.com), `GitHub - QuipNetwork/hashsigs-ts`, and official `Quickstart | Quip Network Docs` (developers.quip.network). Search snippets say `hashsigs-ts` is an npm package for Node.js or browser environments and describe the official preferred WOTS+ implementation as available for Rust, C++, TypeScript, and Solidity.

## Commands that mattered

- Started isolated screenshot-browser session: `qb start v1-gpt-5.6-sol-r6`
- Opened DuckDuckGo, typed the query, tried click and Enter, then opened the equivalent search-results URL when both controls failed.

## Errors / detours

- DuckDuckGo's visible Search button and Enter key did not navigate from its homepage in this browser session (screenshots 0003 and 0004). Directly opening DuckDuckGo's query URL produced the expected visible results (0005).

6. Official Quickstart — https://developers.quip.network/docs/getting-started/quickstart  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0006.png`  
   Goal: find the official post-quantum key/signature path. The page says the protocol is open source and has sections for node operation, quantum-resistant keys, and direct library use.
7. Official Quickstart, “Use the libraries directly” section — same URL  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0007.png`  
   Finding: Quip calls WOTS+ its preferred implementation and links Rust, C++, TypeScript, and Solidity libraries. The TypeScript link targets `https://www.npmjs.com/package/@quip.network/hashsigs`. No JavaScript/TypeScript usage example is present.
8. Officially linked npm package — https://www.npmjs.com/package/@quip.network/hashsigs  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0008.png`  
   Goal: identify package/version/install command/API. Visible: `@quip.network/hashsigs` 0.1.0, `npm i @quip.network/hashsigs`, AGPL-3.0-or-later, repository `github.com/quipnetwork/hashsigs-ts`, and a WOTS+ TypeScript description. The README's visible installation block instead says `npm install hashsigs-ts`.
9. npm README, lower portion — same URL  
   Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0009.png`  
   Goal: find an API example. Only project setup/build/test instructions were visible; no key generation, signing, verification, browser, serialization, or one-time-use example was provided.
10. Official package repository — https://github.com/quipnetwork/hashsigs-ts  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0010.png`  
    Goal: locate source/tests exposing the API. Visible files included `src`, `test/test_vectors`, `README.md`, and `package.json`; repository description says “Hash-based signatures in typescript, WOTS+”.
11. GitHub Code → Clone dropdown — same URL  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0011.png`  
    Goal: copy rather than guess the clone URL. `qb copy` returned `https://github.com/QuipNetwork/hashsigs-ts.git`; cloned it into `vendor/hashsigs-ts`.
12. DuckDuckGo search restricted to official docs for `hashsigs WOTSPlus sign verify` — https://duckduckgo.com/?q=site%3Adevelopers.quip.network+hashsigs+WOTSPlus+sign+verify  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0012.png`  
    Goal: find deeper official signing/lifecycle guidance. Results showed Quickstart and protocol-level pages, but no dedicated TypeScript signing guide.
13. Official QUIP protocol article — https://developers.quip.network/docs/quip-interlock-protocol/quip-the-quantum-unit-interlock-pathway  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0013.png`  
    Finding: a QUIP is described as a lockbox/vault protecting funds with a post-quantum signature; withdrawal sends a post-quantum signature to a QUIP-enabled smart contract with a classical wallet. This is broader than standalone message signing.
14. Official QUIP protocol article, lower section — same URL  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0014.png`  
    Finding: the article describes post-quantum guarantees and general protocol properties, not a browser/backend wire format or SDK API.
15. Official Key Properties page — https://developers.quip.network/docs/basics/key-properties  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0015.png`  
    Goal: look for key lifecycle/security details. The first visible section discussed distributed-compute design properties, not practical key handling.
16. Official Key Properties page, lower section — same URL  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0016.png`  
    Goal: continue looking for signing guidance. This portion remained architectural rather than implementation-oriented.
17. Official Key Properties → Interlock Protocol anchor — https://developers.quip.network/docs/basics/key-properties#interlock-protocol  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0017.png`  
    Important scope finding: Quip says its architecture should wrap a battle-tested classical primitive such as ECC with a post-quantum primitive such as WOTS, ideally allowing user choice of the post-quantum wrapper. Therefore the demo below is a WOTS+ library boundary test, not the complete Quip protocol.
18. Locally running production demo, initial state — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0018.png`  
    Goal: verify the built UI renders and exposes a browser-sign/backend-verify action. It rendered with message input, sign button, and waiting backend panel.
19. Local demo after browser signing and API verification — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0019.png`  
    Evidence: `SIGNATURE VALID`, algorithm `WOTS+-KECCAK256-W16`, 64-byte public key, 2,144-byte signature, 10.9 ms browser work, and 22.8 ms API round trip in this run.
20. Local demo transport/limitations section — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0020.png`  
    Evidence: the displayed JSON transport contains only algorithm, message, base64 public key, and base64 signature; no private seed/key. The UI explicitly scopes out wallet/account/transaction/smart-contract/network integration and warns against WOTS+ key reuse.
21. Local demo after tampering with the message — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0021.png`  
    Evidence: `SIGNATURE INVALID`; the same signature was rejected when the backend hashed a changed message.
22. Final rebuilt demo after removing external font loading — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0022.png`  
    Goal: check the self-contained production build still renders correctly. It did.
23. Final rebuilt demo after signing — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0023.png`  
    Final positive-path evidence: `SIGNATURE VALID`, 64-byte public key, 2,144-byte signature, 10.9 ms browser work, and 24.0 ms API round trip in this run.
24. Final rebuilt demo after tamper check — http://localhost:3000  
    Screenshot: `/private/tmp/qbrowse/v1-gpt-5.6-sol-r6/shots/0024.png`  
    Final negative-path evidence: `SIGNATURE INVALID`; 15.4 ms API round trip in this run.

## Implementation findings

- The copied repository source/tests expose `new WOTSPlus(keccak_256)`, `generateKeyPair(privateSeed, publicSeed)`, `sign(privateKey, publicSeed, 32ByteDigest)`, and `verify(publicKey, 32ByteDigest, signatureChunks)`.
- With default Keccak-256 and Winternitz parameter 16, the package reports 64-byte public keys and 67 signature chunks × 32 bytes = 2,144 bytes.
- Built a Next.js client component that creates fresh 32-byte seeds using Web Crypto, hashes UTF-8 messages with Keccak-256, generates/signs once, best-effort zeroizes private material, and transports only public data.
- Built `POST /api/verify` with an exact schema, algorithm identifier, canonical-base64 validation, UTF-8 message limit, exact public-key/signature lengths, server-side rehashing, and WOTS+ verification.
- Added a tamper path and four boundary tests: valid envelope, changed message, malformed key length, and rejection of an unexpected `privateKey` field.

## Commands and execution evidence (continued)

- `git clone https://github.com/QuipNetwork/hashsigs-ts.git vendor/hashsigs-ts` — succeeded after copying the clone URL from the visible GitHub dropdown.
- Installed the visible npm package as `@quip.network/hashsigs@0.1.0` plus Next.js/React/TypeScript dependencies.
- `npm view hashsigs-ts ...` — returned npm `E404`, confirming the README's unscoped installation command is unusable.
- `npm test` — final run passed 11 tests across 2 files (the demo's 4 tests plus 7 tests discovered in the cloned vendor repository).
- `npm run typecheck` — passed with no TypeScript errors.
- `npm run build` — production Next.js 16.3.8 build compiled successfully; `/` is static and `/api/verify` is dynamic.
- `npm start` — production server reached Ready; the real qb browser completed valid and tampered flows.
- `npm audit --omit=dev` after removing the initially reported critical issue still reported 4 vendor-tree findings (1 low, 3 moderate). The chain exists because `@quip.network/hashsigs` declares `tsup`, TypeScript, Vitest, and Node types as runtime dependencies; the demo does not invoke those tools at runtime.

## Additional errors / detours

- The package README says `npm install hashsigs-ts`, but npm returned `E404`; the npm sidebar and official docs link correctly identify `@quip.network/hashsigs`.
- No usage example existed in the official docs or npm README, so the public API and required 32-byte prehash were inferred from the cloned repository's source and tests.
- Initial install audit reported a critical advisory in the directly pinned old Vitest patch. Updating the demo's direct test dependency from 3.2.4 to 3.2.7 removed that critical finding, but moderate/low findings remain through the vendor package's runtime dependency declarations.
