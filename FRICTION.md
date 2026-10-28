# FRICTION

## 1. JavaScript package was not discoverable from search

- URL: `https://www.npmjs.com/` (searched via the web for `site:npmjs.com Quip Network post quantum`)
- Exact element: search result: `No results found.`
- Expected: an official npm package or SDK page for browser signing.
- Actual: no results, so there was no obvious package name to install.
- Time cost: about 2 minutes.

## 2. The quickstart initially steered toward the legacy scheme

- URL: `https://developers.quip.network/docs/getting-started/quickstart`
- Exact sentence: “Quip’s implementation of various hash algorithms, especially the preferred Winternitz One-Time Signature (WOTS+), is available as a library for rust, c++, typescript, and solidity.”
- Expected: the getting-started page to point to the current recommended signature package.
- Actual: its TypeScript link goes to the older `@quip.network/hashsigs` package, while the SDK page says WOTS+ is previous-generation and new integrations should use SHRINCS.
- Time cost: about 5 minutes.

## 3. Current npm package has no README

- URL: `https://www.npmjs.com/package/@quip.network/hashsigs-wasm`
- Exact element: “This package does not have a README. Add a README so that users know how to get started.”
- Expected: install and minimal browser/Node sign/verify examples on npm.
- Actual: had to follow the repository link and locate the `ts/` README.
- Time cost: about 4 minutes.

## 4. Legacy npm package gives the wrong package name

- URL: `https://www.npmjs.com/package/@quip.network/hashsigs`
- Exact sentence: `npm install hashsigs-ts`
- Expected: the scoped package’s own install command, or a clear deprecation banner.
- Actual: it names a different package and does not document the consumer API.
- Time cost: about 3 minutes.

## 5. SDK install guidance and package page disagree

- URL: `https://developers.quip.network/docs/getting-started/quip-sdk`
- Exact sentence: “Use the `rc` tag; `latest` points to an earlier release candidate.”
- Expected: npm’s displayed install command to preserve the required tag.
- Actual: npm displays `npm i @quip.network/hashsigs-wasm`, which the docs warn can resolve the wrong release.
- Time cost: about 2 minutes.

## 6. Browser navigation timed out on ordinary docs links

- URL: `https://developers.quip.network/docs/getting-started/quickstart` and `https://github.com/QuipNetwork/hashsigs-ts`
- Exact error: `Runtime.evaluate timed out after 5s waiting for the daemon`.
- Expected: click the “Quip SDK” link and read the GitHub README normally.
- Actual: browser automation stalled; page extraction was used as the equivalent reading path.
- Time cost: about 3 minutes.

## 7. The docs-recommended release is broken for browser bundlers

- URL: `https://developers.quip.network/docs/getting-started/quip-sdk` and `https://github.com/QuipNetwork/hashsigs-rs/blob/main/ts/README.md`
- Exact sentences/elements: docs say “Works in Node.js and the browser” and show `import { loadHashSigs } from "@quip.network/hashsigs-wasm";`; Next.js reported `Export loadHashSigs doesn't exist in target module ... loader.browser.js`.
- Expected: the documented import to build unchanged in a standard Next.js client component.
- Actual: `@rc` resolved to `0.2.1-rc9`, whose root `browser` export points directly to a low-level loader that exports `loadShrincsWasm`, not the documented facade. Turbopack failed; Webpack warned. A Webpack-only package-root alias to the published high-level `dist/index.js` was required. This was inferred from published package metadata, not reverse-engineered from bundles.
- Time cost: about 14 minutes.

## 8. The npm page shows the wrong release for the required tag

- URL: `https://www.npmjs.com/package/@quip.network/hashsigs-wasm`
- Exact element: `0.1.0-rc1 • Public • Published 2 months ago` and `npm i @quip.network/hashsigs-wasm`.
- Expected: the page to make the docs-recommended `rc` release/version visible.
- Actual: npm's page showed `latest` (`0.1.0-rc1`), while `npm view` showed `rc` is `0.2.1-rc9`. Trying the displayed version failed because it predates `loadHashSigs`.
- Time cost: about 5 minutes.

## 9. “Audited” claim did not lead to an audit report

- URL: `https://github.com/QuipNetwork/hashsigs-rs/tree/main/ts` and `https://quip.network/blog/quantum-resistant-wallets-now-on-bitcoin`
- Exact sentences: package README: “compiled from the audited `hashsigs-rs` Rust crate”; blog: “A third-party audit is in progress.”
- Expected: a linked report identifying auditor, scope, commit, findings, and remediation status for the current SHRINCS implementation.
- Actual: searches did not surface a report. The blog statement concerns the earlier WOTS+ wallet, so it does not directly resolve SHRINCS's status.
- Time cost: about 4 minutes.

## 10. The minimal sample omits protocol-level security requirements

- URL: `https://github.com/QuipNetwork/hashsigs-rs/blob/main/ts/README.md` and `https://github.com/QuipNetwork/hashsigs-rs/blob/main/SECURITY.md`
- Exact sentence: security doc: “low-level signature validity is not the same thing as replay protection or production-safe authorization.”
- Expected: the quick-start message-signing sample to include or immediately call out nonce, domain separation, expiry, commitment registration, replay storage, atomic state persistence, and rollback prevention.
- Actual: these critical integration rules appear later/in a separate long security document. A developer can get `true` from `verify` while still building an unsafe authentication system.
- Time cost: about 5 minutes.
