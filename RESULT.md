# RESULT

Status: **WORKING** — deployed and minted on Quip Network Aglais testnet (chain 20033); confirmed on-chain and on the Blockscout explorer. Source code was not published/verified on the explorer.

## Built and how to run

A Foundry project with an OpenZeppelin 5 owner-mintable ERC-20 (`src/AglaisToken.sol`), three tests (`test/AglaisToken.t.sol`), npm dependency lockfile, Foundry remapping and private-key ignore rule. Run `npm ci && forge build && forge test -vv && forge lint` in this directory. `README.md` has step-by-step faucet, fresh-wallet, deploy, mint and balance-check commands. RPC: `https://evm-rpc.aglais.quip.network:20049` (returned chain ID 20033). Browser faucet instructions: `https://aglais.quip.network/#faucet`. The keys in `keys/` are test-only throwaways; do not reuse them for anything valuable.

## Evidence

- Fresh deployer: `0x6fA30D473FaA1b05Bb7951CB896993217ff16e22`; fresh second address: `0x4843cF886682bE85B9cA7e3A9F17760DC0061EBA`.
- Contract: `0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d` — [contract page](https://explorer.aglais.quip.network/address/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d), screenshot `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0091.png` (name/symbol) and `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0092.png` (both successful txs). Name `Aglais Demo Token`, symbol `AGDEMO`, 18 decimals.
- Deployment tx `0x744357e28f70dc60e40cc0d65c99789bc216c4c4b21e325f3586392ddf6067f6` — [explorer tx](https://explorer.aglais.quip.network/tx/0x744357e28f70dc60e40cc0d65c99789bc216c4c4b21e325f3586392ddf6067f6), success, block 391399, screenshot `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0089.png`. `cast receipt` status 1; `cast code` nonempty; `owner()` returned fresh deployer address.
- Mint tx `0xd98e715a51c93f32c694c708c90a47fbfae4b9aeb93deb99f1750d363fc7bffd` — [explorer tx](https://explorer.aglais.quip.network/tx/0xd98e715a51c93f32c694c708c90a47fbfae4b9aeb93deb99f1750d363fc7bffd), success, block 391409, screenshot `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0093.png` shows 100 AGDEMO minted to the second address. RPC `balanceOf(recipient)` and `totalSupply()` each returned `100000000000000000000` base units (100 tokens).
- [Token holders page](https://explorer.aglais.quip.network/token/0xe09D55a11a615b1eF625d8Ea6bcc1eacd6bD717d?tab=holders), screenshot `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0103.png`: second address owns 100 AGDEMO (100% supply). Token transfer history screenshot `/private/tmp/qbrowse/v2-gpt-6-sol/shots/0101.png`.
- `forge test -vv`: 3 passed, 0 failed; `forge lint` and `forge build` completed. No commit or public post.

## What did not work / limitations

- The faucet web form returned "Submitted but not confirmed" and initial balance remained 0. The *documented* terminal `POST https://faucet.aglais.quip.network/request` funded the wallet. Opening the faucet host root directly gave HTTP 404. Details: `DEVLOG.md` and `FRICTION.md`.
- The source has **not** been verified/published on Blockscout. The contract address, token, transaction and holder views work; the Contract tab only shows bytecode and a "Verify & publish" button (`/private/tmp/qbrowse/v2-gpt-6-sol/shots/0097.png`). This was not a requirement for the two-transaction exercise, but it limits in-explorer source/ABI inspection.
- Search-engine bot challenges/irrelevant results and absent Aglais link in the homepage/quickstart significantly delayed finding the portal. One explorer navigation had transient DNS failure, and one tx view briefly showed stale details before hydration. Evidence and exact URLs are in `FRICTION.md`.
- The working directory is not a git repository; `git status` reported `fatal: not a git repository`. No commit was made.

## Top 5 vendor changes

1. Put a conspicuous **Aglais EVM / Foundry quickstart** link on the Quip homepage and developer docs quickstart, pointing to `aglais.quip.network`; include chain ID 20033, RPC, faucet and explorer on one page.
2. Make the faucet web form report a definite on-chain/extrinsic result, with error and retry/rate-limit details instead of "Submitted but not confirmed"; show a balance check and link to the resulting explorer record.
3. Serve a useful landing page or redirect at `faucet.aglais.quip.network/` instead of HTTP 404, linking to the working portal form and documented `/request` endpoint.
4. Publish a **Foundry `forge create` / `cast send` ERC-20 example**, including a fresh test-wallet workflow, decimals, exact mint arguments, verification option, and a note on Aglais's gas-unit behavior and typical fees.
5. Improve Blockscout clarity and load states: never render another tx's details under the requested hash during hydration, explain why contract summary counts differ from token-transfer/Transactions tabs, and offer clear Foundry-compatible source verification guidance.
