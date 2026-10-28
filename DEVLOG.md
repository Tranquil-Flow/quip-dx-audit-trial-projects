# DEVLOG (screenshots in /private/tmp/qbrowse/v1-claude-sonnet/shots/)
- 0001-0002 duckduckgo.com: blank chrome error page. 0003-0011, 0015-0021 Bing "Quip Network post-quantum signing" & variants: only Salesforce Quip / toothbrush / Wikipedia results, identical each query. 0012 Brave captcha, 0013 Google /sorry.
- 0022 quip.network (guessed URL): "The worldwide quantum computer"; nothing about signing. 0023 Products menu: QuipSwap, QVRF. Docs link opened new tab (0025) developers.quip.network/docs.
- 0026-0028 Docs > Quip SDK: found `npm install @quip.network/hashsigs-wasm@rc` (plain install = 2025 build; warned). No usage example on page.
- 0029-0032 Docs > Quip Accounts: SHRINCS explained; stateful slots must be tracked; ERC-1271 check not one-time.
- 0033-0034 Quickstart: says WOTS+ libs (old). "typescript" link -> npm @quip.network/hashsigs (old pkg). 0035 npmjs -> Cloudflare "Just a moment..." 403.
- 0036-0041 github.com/QuipNetwork -> hashsigs-rs README (mentions ts/ = @quip.network/hashsigs-wasm). 0042-0046 hashsigs-rs/ts README: profiles, quick start (loadHashSigs, keygen/sign/verify), persistence.
- Terminal: npm i next react react-dom ts; npm i @quip.network/hashsigs-wasm@rc (0.2.1-rc9). Node script: sign 2784 B, verify true, wrong msg false.
- 0047-0049 built Next.js app; click Sign -> nothing. 0052 after adding try/catch: "TypeError: t is not a function". Cause found reading node_modules: package "browser" export condition maps root to loader.browser.js which lacks loadHashSigs/makeHashSigs.
- Workaround: turbopack resolveAlias to dist/api.js for makeHashSigs + loadShrincsWasm. 0055: sigBytes 2784, remaining 1023, server ok:true.
