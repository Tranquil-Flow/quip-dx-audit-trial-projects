# FRICTION.md — Quip Network Developer Experience Issues

## 1. npm package page had NO README (2 min lost)
- URL: https://www.npmjs.com/package/@quip.network/hashsigs-wasm
- Quote: "This package does not have a README. Add a README to your package so that users know how to get started."
- Expected: Usage examples and API docs on the npm page
- Actual: Empty README, had to go to GitHub repo's ts/README.md to find the actual docs
- The README exists in the repo at ts/README.md but wasn't published to npm initially

## 2. SDK page recommends package without usage example (3 min lost)
- URL: https://developers.quip.network/docs/getting-started/quip-sdk
- Quote: "Use the rc tag for the current generation; latest points to the earlier generation"
- Expected: A code example showing how to import and use the package
- Actual: Only install commands and a table of packages, no working code snippet
- The Quickstart page (https://developers.quip.network/docs/getting-started/quickstart) has even less — just "generate quantum-resistant keys" with no code

## 3. Compute job path is a dead end (5 min lost)
- URL: https://developers.quip.network/docs/compute/submit-a-job
- Quote: "Connection details for the public test network have not been published yet, so this page cannot include a node address."
- Expected: A working quickstart with testnet details
- Actual: Complete tutorial that literally cannot be followed
- This is the most prominent "do something" page on the docs site but it's non-functional

## 4. Export naming mismatch between docs and code (2 min lost)
- URL: https://github.com/QuipNetwork/hashsigs-rs/blob/main/ts/README.md
- Quote (in docs): import { loadHashSigs, shrincsKeysToSecretBytes, shrincsImportSigningKey } from "@quip.network/hashsigs-wasm"
- Expected: All three are top-level exports
- Actual: Only `loadHashSigs` and `shrincsKeysToSecretBytes` are top-level. `shrincsImportSigningKey` is returned by `loadHashSigs()`
- Error message: "The requested module does not provide an export named 'shrincsImportSigningKey'"
- The README import example at the top is misleading — it shows all three as if they're all from the same import

## 5. 32-byte message requirement is undocumented in quickstart (3 min lost)
- No page mentions that messages must be exactly 32 bytes until you hit the error
- Error: "message must be exactly 32 bytes, got 34"
- The README says "Messages are exactly 32 bytes" buried in a section called "Seeds and messages"
- Expected: This constraint mentioned prominently in any code example
- Actual: Easy to miss, especially when padding strings with spaces

## 6. Confusing package landscape (3 min lost)
- There are TWO packages with similar names: `@quip.network/hashsigs` (legacy WOTS+) and `@quip.network/hashsigs-wasm` (current SHRINCS)
- The SDK page warns about `latest` vs `rc` tags but doesn't clearly say "the old package is deprecated, don't use it"
- The old package `@quip.network/hashsigs` still shows up in npm search results
- Quote from SDK page: "New integrations should use the packages in the tables above" — but the table doesn't list the old package as deprecated

## 7. No "Hello World" anywhere (total: conceptually frustrating)
- The quickstart page says "There are two things you can do today: run a node, and generate quantum-resistant keys"
- But neither path has a single copy-pasteable code block
- The closest thing is the compute job page, which doesn't work
- For a hackathon, you want a 5-minute "run this and see output" path
