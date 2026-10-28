# FRICTION.md — moments a real developer would be confused, misled, stuck or annoyed

## F1. Quip's marketing vs. Quip's docs disagree on what works
- **What I read first**: quip.network calls QVRF "Certified Quantum Randomness" with a working transcript format (OUTPUT, SAMPLES, MERKLROOT, etc.). Sounds ready.
- **What the docs say**: developers.quip.network/docs/compute/qvrf: "This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here." Also: "On-chain verification contracts: IN DEVELOPMENT".
- **What the docs also say (what-is-quip)**: "Future subnets: Verifiable Random Functions, Search, Factoring, Circuit Mapping."
- **What I expected**: a working QVRF request interface I can call from Solidity.
- **What actually happened**: there is none on Aglais. QuipFactory + QuipWallet are the only Solidity contracts in the public SDK and they have nothing to do with randomness. The ethereum-sdk hardhat config doesn't even list the Quip Aglais chain — it has the standard EVM L1/L2s.
- **Impact**: a game dev reading the marketing site would write a wrong mental model. They would then start coding against an interface that doesn't exist.

## F2. DuckDuckGo screenshots in the headless browser come back blank for many pages
- The first few DDG result pages (0002, 0006, 0007, 0009) came back blank in the PNG — the page rendered but the screenshot was taken before the search results populated.
- Workaround: wait 3-10 seconds after `open` before calling `vision_analyze`. Some pages (explorer.aglais.quip.network, quip.network/blog) need even longer and still render blank — in that case the JavaScript is loading after the screenshot.
- A real developer would just wait or refresh; I lost a few minutes thinking the pages were empty when content was loading.

## F3. The browser screenshot times out repeatedly on font load
- `ERROR: screenshot failed: Page.screenshot: Timeout 15000ms exceeded ... waiting for fonts to load` came up many times. The browser then auto-restarts and loses state ("NOTICE: the browser stopped responding... Reopened: <previous URL>").
- Workaround: just re-run `open` for the URL you wanted. It usually works the second time.

## F4. Headless Blockscout renders as a near-blank page
- explorer.aglais.quip.network returned 200 but the rendered page in the screenshot had no real content (Blockscout's JS-driven UI is slow / fails to bootstrap headless).
- Workaround: use the Blockscout REST API via `curl`/`urllib` instead of the visual UI. The chain is fully readable via JSON-RPC + Blockscout API.

## F5. The docs mention a faucet but the link 404s
- The Quickstart doc references a faucet under `docs/getting-started/get-quip.md`. That URL returns 404.
- The marketing site has no `/faucet` page either.
- The actual faucet is at `https://faucet.aglais.quip.network`, a separate host I only found by Googling "quip network aglais faucet" and reading the github.com/QuipNetwork/faucet README.
- **A real dev would either spam search or just ask in Discord.** The docs should just link to the faucet URL.

## F6. Aglais genesis hash on the chain != genesis hash in the docs
- Docs say genesis hash is `0x59e064bdd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286`.
- The actual on-chain block-0 hash I got from `eth_getBlockByNumber(0x0, false)` is `0x41330c6653307a2666648c9a8e217acd54e9b47ac1d5c49902efc2d017b51814`.
- This is the same chain (chainId 20033, Blockscout, faucet) so this is most likely a chain reset since the docs were last updated. The docs say "Confirm you are on the right chain by genesis hash 0x59e0… not by chain ID." That advice is now misleading.

## F7. The "Build with AI" copy-paste bootstrap is genuinely useful, but the doc page is hard to find
- The developers.quip.network landing page has a "Build with AI" section that contains a one-paragraph prompt naming the JSON-RPC, the docs index, the SDKs, and the chain hash. It's the only place that pulls all the right values together.
- It's not linked from the main docs sidebar. You only see it on the landing page.

## F8. The ethereum-sdk hardhat.config doesn't know about Aglais
- `hardhat.config.ts` lists hardhat, sepolia, sepolia_base, sepolia_optimism, mainnet, base, optimism, bsc, avalanche, polygon, mantle, celo, arbitrum, degen — no Aglais 20033.
- This means even if a dev clones the repo and follows the README, they can't deploy to Quip's own testnet. They'd have to add a custom network by hand using `API_URL_SEPOLIA` (which is misnamed — it's whatever RPC the user puts in .env).
- A 5-line "Aglais: {url: https://evm-rpc.aglais.quip.network, chainId: 20033}" block in the shipped config would have saved me (and presumably other devs) 10 minutes.

## F9. Quip's public chain vs. their public SDK do not match each other
- The ethereum-sdk README example verifies contracts on Ethereum mainnet (`0xF768b4E4A314C9119587b8Cd35a89bDC228290b5`) and Base mainnet (`0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99`).
- Those contracts do not exist on Aglais (code length 2 == empty). The on-chain `eth_chainId` for those addresses returns "0x" on Aglais.
- A dev has no pre-built factory to talk to; they would have to compile + deploy QuipFactory themselves, then import the WOTS+ library, etc. That's a multi-hour setup to do "hello world".

## F10. There is no QVRF contract in the ethereum-sdk or any of the github.com/QuipNetwork repos
- The only `.sol` files in ethereum-sdk/contracts are QuipFactory.sol and QuipWallet.sol.
- The other GitHub repos (quip-miner, cpp-sdk, nashsigs-*, xquad) have no Solidity at all.
- "QVRF" lives only in the marketing site and a concepts doc — no SDK, no contract, no test.

## F11. The Bootstrap prompt is the most useful page on the developer site but has no stable link
- The "Build with AI" text I copied (link 24 on the landing page) is a free-text prompt. It's not a doc page, it doesn't have a URL you can link to from search results, and a developer can't cite it.
- A real dev's first instinct — "open the doc, see the code" — doesn't work, because there is no code.

## F12. Aglais's `eth_estimateGas` reverts for many valid transactions
- This one burned real time. When you `cast send --create <bc>` or call any contract function, `cast` calls `eth_estimateGas` first to fill the `gas` field. Aglais's EVM shim returns `error code 3: execution reverted: , data: "0x"` for many transactions that *would* succeed if the chain were just asked to execute them.
  - A no-arg constructor: works.
  - A constructor that takes `(address, uint256)`: estimate gas reverts, but the deploy itself works if you supply a high-enough gas cap (~351M gas used) or, better, use `cast send` and let it auto-estimate against the live chain.
- The reliable workarounds are: (a) use `cast send` (not `web3.py`) and let it do the gas estimate against the live chain; (b) when ABI-encoding constructor args by hand, remember to left-pad the address to 32 bytes (`int(addr, 16).to_bytes(32, "big")`), not just the 20 raw bytes. A real developer would lose an hour on this.
- A few failed transactions (e.g. a reverted deploy) get your account `temporarily banned` by the RPC for 1-3 minutes. So one bad estimate can stall every subsequent test in the same session.
