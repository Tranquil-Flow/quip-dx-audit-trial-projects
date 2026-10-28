# FRICTION

1. URL: https://duckduckgo.com/  
   Screen: query field visibly contained “Quip Network post quantum signature SDK browser TypeScript”; the magnifying-glass Search control was visible.  
   Expected: clicking Search or pressing Enter would navigate to search results.  
   Happened: neither action navigated (screenshots `0003.png` and `0004.png`). Opening the equivalent DuckDuckGo query URL was required.

2. URL: https://developers.quip.network/docs/getting-started/quickstart  
   Screen: “Quip’s implementation … especially the preferred Winternitz One-Time Signature (WOTS+), is available as a library for rust, c++, typescript, and solidity.”  
   Expected: the TypeScript option would lead to an install-and-use example showing browser key generation, message hashing, signing, verification, and encoding.  
   Happened: it was only a link to npm. There was no API call, browser/backend boundary, serialization format, or runnable sample.

3. URL: https://www.npmjs.com/package/@quip.network/hashsigs  
   Screen: npm's install panel says `npm i @quip.network/hashsigs`, while the package README's Installation block says `npm install hashsigs-ts`.  
   Expected: one canonical package name.  
   Happened: `npm view hashsigs-ts` returned `E404`; only the scoped name works. This is an unusually costly copy/paste trap for the first command in the README.

4. URL: https://www.npmjs.com/package/@quip.network/hashsigs  
   Screen: README sections cover license, installation, development, building, testing, and coverage.  
   Expected: README usage showing `WOTSPlus`, the hash function import, input lengths, `generateKeyPair`, `sign`, and `verify`.  
   Happened: there is no usage/API section. I had to follow the repository link, copy the clone URL, clone it, and infer the API from source/tests.

5. URL: https://github.com/quipnetwork/hashsigs-ts  
   Screen: repository/package description says WOTS+, but neither the visible README nor npm page warns that signing twice with one WOTS+ key is unsafe.  
   Expected: a prominent one-time-key warning immediately before the first signing API, plus a safe lifecycle pattern.  
   Happened: the demo author must already understand this property or risk building catastrophic key reuse into an otherwise successful integration.

6. URL: https://developers.quip.network/docs/basics/key-properties#interlock-protocol  
   Screen: “the Quip architecture should wrap a battle-tested cryptographic primitive such as ECC with a post-quantum primitive such as WOTS”.  
   Expected: the Quickstart/package docs would distinguish a standalone WOTS+ library demo from a complete Quip signing/authentication architecture and point to hybrid integration details.  
   Happened: that crucial scope distinction appears on a conceptual page, while the library path has no end-to-end architecture guidance.

7. URL: https://www.npmjs.com/package/@quip.network/hashsigs  
   Screen: package is version 0.1.0 and AGPL-3.0-or-later. The cloned repository also has 0.2.0 release-candidate tags, while the visible main package metadata remains 0.1.0.  
   Expected: release notes/API stability statement and a conspicuous integration/licensing note from the official Quickstart.  
   Happened: maturity, compatibility, and proprietary-app implications are left for adopters to investigate.

8. URL: npm package/install path reached from the official TypeScript link  
   Screen/terminal result: `@quip.network/hashsigs@0.1.0` declares `tsup`, TypeScript, Vitest, and Node types under runtime `dependencies`. `npm audit --omit=dev` still reports 4 findings (1 low, 3 moderate) through that production dependency tree after the demo's directly fixable critical patch-level issue was removed.  
   Expected: the published runtime package would depend only on runtime cryptographic code (or bundle it) and keep build/test tooling in `devDependencies`.  
   Happened: consumers inherit avoidable package weight and vulnerability noise from tooling that the WOTS+ runtime does not call.

9. URL: official Quickstart, npm README, and repository README  
   Screen: none defines a JSON/wire format or message-domain convention.  
   Expected: canonical byte encoding, prehash ownership, algorithm/version identifier, public-key/signature encoding, maximum sizes, and cross-runtime test vectors.  
   Happened: I had to design a local envelope (`algorithm`, UTF-8 `message`, base64 `publicKey`, base64 flattened `signature`) and validation rules. It interoperates inside this demo but is not a vendor standard.

10. URL: official Quickstart and protocol pages  
    Screen: high-level keys/wallets/QUIP transaction prose, but no answer for identity binding or replay.  
    Expected: guidance on how a backend learns that a WOTS+ public key belongs to a user, how it records one-time use, and how signed data includes origin/audience/purpose/expiry/nonce.  
    Happened: raw signing is technically easy, but the application protocol needed for secure authentication remains unspecified.
