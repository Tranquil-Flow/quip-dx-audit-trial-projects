# RESULT

## Status: PARTIAL — Quip post-quantum account works end-to-end on Base Sepolia via the official web app, but the Aglais testnet (chain 20033) that the wallet was started against is not actually exposed in the web app's "Which network should this account live on?" list. The QuipFactory contract is also not deployed on Aglais's EVM side (eth_getCode returns 0x at the published factory address), so the only way to create a Quip account on Aglais today would be through mining / node operation, not through the web app.

## What I built / learned
- Created a Quip post-quantum account using **account.quip.network** (Quip's official web app) on **Base Sepolia** (chain 84532, the only testnet the web app supports today)
- Funded the wallet on Base Sepolia with 0.02 ETH from the on-hand faucet service, then deposited 0.001 ETH to the Quip account
- Sent a 0.0001 ETH post-quantum-signed transfer from the Quip account to a fresh throwaway key

## How to run
- Wallet file: ./keys/wallet.key (owner / EOA), ./keys/wallet2.key (recipient throwaway)
- Owner: 0x050cBa620d21F77560BA99824C0c3B39Bf78AA46
- Recipient: 0x54eE40EFC8DeCB05dab56FE988dC6100E99A9657
- Quip account: 0x4d4EB36078326d714b798fE3ca68e708CbB9d13b
- Quip vault ID: 0x001b1dbdfc891fcce7c39ca2f2c1ea369af4104e147759f015e25781f458ac1f
- Quip web app URL pattern: https://account.quip.network/accounts/<vaultId>:v1.1

To reproduce:
1. `qb start web-e2a8f8 --wallet ./keys/wallet.key --chain 84532`
2. Open https://account.quip.network and click the chat bubble
3. Connect wallet, choose Base Sepolia, pick v1.1 wallet version
4. Generate or type a 64-hex-char passphrase (saved to ./.quip-passphrase)
5. Accept the two checkboxes and confirm
6. The wallet signs the account-creation transaction; the QuipFactory deploys your Quip account at the deterministic address derived from (owner, vaultId, factory, library)
7. Send 0.001+ ETH from the owner EOA to the new Quip account address to fund it
8. Use the Send button in the dashboard — the wallet signs the authorization, and the Quip account submits a userop on Base Sepolia

## Evidence
- Account creation tx (quip factory): 0x34164eca7b4e364a993456caa45f6d0ca5c7a8b12f4866aba1eec0b911682e6a
  - to 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8 (QuipFactory on Base Sepolia), value 0
- Deposit tx (owner → Quip account): 0xc46abc734410a4ed14635b24b49f9937f00519ceb593acc88d6fe53104d96c63
  - mined in block 47723162, gas 25810
- Transfer tx (Quip account → recipient, ERC-4337 userop): 0x6938b0198bc3a30f61c7c97161477f6c408f4b4968b70a3387d29fd1a2737b8b
  - mined in block 47738180 (0x2d86d44), status 0x1, gas 0x65c99 = 417177
  - `from` = 0xb46ec7ff7b69f57c1afe110f35d8c84e9395d00e (the ERC-4337 bundler/paymaster helper the web app uses)
  - `to`   = 0x0000000071727de22e5e9d8baf0edac6f37da032 (the canonical ERC-4337 EntryPoint)
  - 4 logs: log 0 from the Quip account with topic 0x7bdefd1b209c0563d77efe477b1cd3b61171d8aa528d2652f801d7233a61a092 (Quip `pqTransferEvent`); logs 1-3 from the EntryPoint (UserOperationEvent, StoredSignatureHash, Withdrawn)
  - State diff: recipient 0x54eE40EFC8DeCB05dab56FE988dC6100E99A9657 had 0 ETH at block 0x2d86d43 and 0.0001 ETH at block 0x2d86d44. Exactly 0.0001 ETH (1e14 wei) moved.
- Final balances (Base Sepolia):
  - Recipient: 0.0001 ETH (exact 1e14 wei)
  - Quip account: 0.000894446859 ETH
  - Owner: ~0.039 ETH (the gas for the userop was paid from the Quip account's gas tank, not from the owner)
- Aglais EVM side (chain 20033) was separately funded by the official Aglais faucet at https://faucet.aglais.quip.network
  - POST /request: 10 UNIT (10000000000000 plancks) → extrinsic 0x016c59f555de94cfeeff2371d063bdec7fd5bc38309aa9de5208574f89264c40
  - balance via EVM RPC at https://evm-rpc.aglais.quip.network:20049: 9.999 AGLS (= 10 - 1 AGLS existential deposit)

## Decision on whether to build on Quip
The Quip post-quantum account model itself is solid: SHRINCS / WOTS+ one-time signatures, deterministic CREATE2 addresses, key rotation in v1.1, ERC-4337 gas sponsorship, healthy key state visible in the dashboard. The transfer I sent was a real ERC-4337 userop that called the Quip account's Winternitz-signed transfer; the recipient's balance went from 0 to 0.0001 ETH in the next block. I would not, however, build on top of Quip today without at least three of the top-5 changes in the next section landing first. The current developer onboarding is one captcha-walled faucet, one hidden chat-bubble, and one wrong-labeled "Send" button away from working at all.

## What did NOT work
- **Aglais testnet is not in the web app's network list.** account.quip.network only offers Base, Ethereum, Celo, Arbitrum, and Base Sepolia (only one testnet: 84532). The "Quip Aglais migration" X posts and the Quickstart doc focus on mining and node operation, not on creating a Quip post-quantum account. So the user-requested Aglais path is not reachable from the Quip web app today; the npm ethereum-sdk also only ships factory addresses for Sepolia/Base/OP/BSC/etc. and `eth_getCode` at those addresses returns 0x on Aglais (the QuipFactory is **not** deployed to Aglais's EVM side).
- **The web app first renders a blank page** when you visit the root URL — there is no visible content for 60+ seconds. You have to click the tiny chat bubble in the bottom-right to be routed to /connect, which is where the actual app lives. Took several reloads to discover.
- **Public Base Sepolia faucets all require either a sign-in or a Cloudflare Turnstile captcha** (Superchain Dev Console, Alchemy, Chainstack). I left a NEED_FUNDS.txt for Alchemy's Base Sepolia faucet and the project got funded with 0.02 ETH within the "person on our side" SLA — that was the easiest path to testnet ETH.
- **Google Cloud Web3 Faucet's network dropdown** would not open in the qb browser (no UI change on click); only Holesky and Sepolia are supported anyway, which would not have helped with Base Sepolia directly.
- **The "Send" button on the dashboard** routes to the QuipSwap create-offer page, not to a simple native transfer. The actual transfer UI is the "Send" button in the Tokens card below the balance.
- The legacy v0.0.0 wallet option exists but I stuck with v1.1 (the recommended one with ERC-4337 and gas sponsorship).

## Top 5 changes to the vendor's docs / site that would have helped me most
1. **Add Aglais to account.quip.network's "Which network should this account live on?" list.** A user landing on the Quip web app, having seen the README say "On Aglais you can mine blocks and get free AGLS", reasonably expects to be able to create a Quip account there. It is the only Quip network that lives entirely on Quip's own infrastructure. (Cross-link to a future "QuipFactory on Aglais" release.)
2. **The account.quip.network landing page renders blank for at least 60 seconds**, with no spinner and no "Loading" text — just an empty blue screen and a chat bubble. New users will give up. Add a "Loading Quip Account…" placeholder and ideally skip the blank state entirely.
3. **Quip's own Aglais EVM front door is listed on https://aglais.quip.network (chain 20033)**, but neither the developer docs nor the README mention that this EVM exists separately from the Substrate chain, and what addresses (if any) the QuipFactory uses there. A "Quip Accounts on Aglais" section in the quickstart would be enough to point developers at it.
4. **The web app's "Send" button on the dashboard is misleading** — it jumps to QuipSwap's create-offer page, which is for atomic cross-account swaps, not for a simple transfer. Rename or move the native transfer button to the Tokens card (where it is, hidden below the fold) so it is the obvious choice.
5. **A no-auth, no-captcha Base Sepolia faucet (or an "easy faucet" link) on the same page as the Quip account-creation cost** would unblock the entire onboarding flow. The "Need Base Sepolia ETH? You can get it for free from the Alchemy Faucet" copy currently sends users to a page that requires a Cloudflare Turnstile, which fails in any agent/headless browser; the "person on our side" route I had to use should be a normal user flow.