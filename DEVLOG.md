# DEVLOG

Chronological log of pages visited, commands run, and what I was looking for.
Screenshots are in ./screenshots/

## Entry format
- [timestamp marker]
- action: what I did (qb command or terminal)
- page/url/title (if web)
- screenshot path
- what I was looking for / what I learned / errors

---

## Phase 0: Setup

- Project dir: /private/tmp/projects/proj-b89a74
- qb tool: /Users/dev/tools/webshot/qb
- Wallet dir: ./keys/
- Screenshots dir: ./screenshots/
- Session name to use: web-0a4403

## Phase 1: Web search for QuipSwap

- Browser session started on chain 20033 (Aglais testnet) with throwaway key.
- Wallet address: 0x5187C255740F8178adb6950B3D0eFDF71cd3E782
- Note: duckduckgo.com JS page renders blank in this browser (likely font/JS hang);
  html.duckduckgo.com works.
- Search: "QuipSwap post quantum safe swap testnet" via html.duckduckgo.com (shot 0008.png)
- Top results:
  - quip.network/quipswap/ - "QuipSwap: Post-Quantum Cross-Chain Swaps"
  - quip.network/blog/quipswap-launch (2026-09-01) - first subnet, quantum
    optimization, is live on testnet
  - developers.quip.network - quickstart commands for SDKs and testnet connection
  - quantumcomputingreport.com - announcement post

## Phase 2: QuipSwap product page walkthrough

- quip.network/quipswap/ (shot 0011.png onwards):
  - "Post-quantum swaps anywhere to anywhere" / "Two parties trade directly,
    with no bridge, no oracle, and no key for a quantum computer to break."
  - Widget on right: "Create swap offer" with "I PAY" Base/ETH and "I WANT" Base/USDC.
    "Connect Quip account" button (#11) and "Post an offer" button (#15).
  - Order book section shows live offers across chains, but clicking either
    button does not trigger a wallet popup. The "Create an Account and Swap"
    CTA (#11 in hero) advances the embedded paper-trading widget only.
  - Marketing text on page: "Post-quantum swaps on [Base] LIVE. More phasing
    in: EVM, ETH, BNB, ARB, OP, ..." - so Base is the only "live" chain.
  - Critically: "The orderbook opens to trading shortly, and the browser
    extension is coming soon" (from launch blog, shot 0091.png).

## Phase 3: QuipSwap demo walkthrough (concept UI)

- quip.network/quipswap-demo/?drive (shot 0021.png, walkthrough begins)
  - Marks itself: "CONCEPT - NOT A SHIPPED FEATURE"
  - 12-scene guided tour with MAKER and TAKER windows in the QUIPSWAP EXTENSION
    UI (extension not yet released).
  - Scene 8 (shot 0111.png): "Accepting is committing" - the vault signs
    with its "quantum key" and "device key" and escrows the ETH.
  - Scene 11/12 (shot 0115.png): walkthrough loops. UI never accepts a real
    wallet.

## Phase 4: developers.quip.network docs

- Quickstart (shot 0061.png): install `@quip.network/ethereum-sdk@beta`
  (TypeScript) and `@quip.network/hashsigs-wasm@rc` (WOTS+ signer).
- Quip SDK page (shot 0052.png): "There is no public @quip.network/quip-swap
  or @quip.network/sdk package, and no swap SDK is published today. Use the
  wallet for swaps."
- QuipSwap page (shot 0031.png): explains hash-locked atomic swap lifecycle
  (init, claim, refund, punish, audit). "The settlement contract is gated:
  only Quip wallet contracts can initiate a swap. You cannot drive a swap
  from an ordinary account or from your own contract today. The gate is
  deliberate. The guided wallet flow is part of the protocol's safety
  boundary." (shot 0034.png)
- Quip Accounts page (shot 0036.png): "Quip Account is a smart contract...
  the account is the lockbox the swap protocol moves value through." Links
  to account.quip.network as the web app (shot 0037.png).
- How Quip fits together (shot 0080.png): clear architecture diagram
  showing Quip = primitive lockbox, Quip Account = user lockbox, QuipSwap
  = atomic cross-chain swap, Quantum compute = pay-per-job via swap.

## Phase 5: account.quip.network - the actual web app

- URL: account.quip.network (developer docs say "The web app is live now"
  in the launch blog, shot 0091.png).
- In this headless browser, the page never renders - blank grey with only
  a chat widget (shot 0040.png, 0044.png, 0058.png, 0074.png, 0075.png,
  0097.png, 0099.png, 0102.png, etc.). Browser daemon has restarted
  itself twice with "stopped responding" notices.
- This is a blocker for the original task (try a swap via the web app UI).
- I checked both chain 20033 and chain 84532 - same blank page on both.

## Phase 6: Aglais testnet funding

- Found agls.quip.network (shot 0128-0131.png) with chain details.
  Chain ID 20033, 18-decimal AGLS, 1 gwei gas.
  EVM RPC: https://evm-rpc.aglais.quip.network:20049
- Faucet at faucet.aglais.quip.network, POST /request with body
  `{"dest":"<address>"}` (shot 0131.png). No captcha, no sign-in.
- Called faucet twice (rate limit 1/2s, gives 1e13 Planck = 0.00001 AGLS
  per call, max 2 calls per address). The 1 ETH existential deposit leaves
  ~1.255 ETH available for gas.
- Current EVM balance (RPC eth_getBalance): 0x1158ab88a6f098000
  = 1,255,394,224,000,000,000 wei = 1.255394224 ETH.

## Phase 7: swap.quip.network - the real QuipSwap order book

- Found swap.quip.network/demo (paper trading) and swap.quip.network
  (live). The order book page required a Quip account to interact.
- The "Open orderbook" CTA on account.quip.network opens swap.quip.network
  in a new tab.
- The site has a /connect step that asks to switch to Ethereum mainnet.
  The test wallet auto-switches but only signs on Aglais or Base Sepolia.
- Paper mode (5 chains: Base, OP, ETH, ARB, BNB) and Live mode (1 chain:
  Base). Live order book was empty: "The book is quiet. No published
  swap intents are available right now. Check back soon."

## Phase 8: Account creation attempt on Base Sepolia

- Tried to get Base Sepolia ETH from several faucets:
  - QuickNode Base Sepolia Faucet (https://faucet.quicknode.com/base/sepolia):
    needs Coinbase login (OAuth)
  - Alchemy Base Sepolia Faucet: needs sign-in
  - Coinbase CDP Faucet: needs Coinbase account
  - L2 Faucet: under maintenance
  - POW Faucet: down (connection refused)
- Wrote ./NEED_FUNDS.txt with Coinbase CDP and QuickNode faucet URLs.
- Discovered that 0.005 ETH on Base Sepolia was already in my wallet
  (sent by some earlier mechanism, possibly an Alchemy drip).
- Switched wallet to --chain 84532 (Base Sepolia) and restarted session.
- account.quip.network/connect page finally loaded after 2 minutes.
  The connect flow asked to switch to "Base mainnet" first, which the
  test wallet does, but the wallet then refused to sign a SIWE message
  on a mainnet.

## Phase 9: Successful Quip Account creation on Base Sepolia

- After restarting the session with --chain 84532, the account.quip.network
  flow worked end-to-end:
  1. Visited /connect (load time ~2 minutes from blank)
  2. Clicked Connect Wallet, picked Test Wallet (INSTALLED)
  3. Wallet approved; site asked to switch to "Base mainnet"
  4. Wallet switched; site asked for a SIWE signature; wallet declined
     (mainnet safety)
  5. Restarted session with --chain 84532 (Base Sepolia)
  6. /connect now loads in <2s
  7. Connected wallet, site asked to switch to Base Sepolia (84532) - approved
  8. URL changed to /accounts/52d75755103c56bbc2d09191aa355eac0b78a3b975b45cef3828fa1f522ab816:v1.1
     (this is a deterministic placeholder, not yet the final address)
  9. 4-step wizard opened:
     - Step 1: intro "Create your Quip account" / "Trade directly with
       a counterparty"
     - Step 2: choose network (Base, Ethereum, Base Sepolia visible after
       clicking "Show 3 more networks"). Picked Base Sepolia
       (TESTNET, cost about 0.000003019 ETH)
     - Step 3: passphrase + 2 checkboxes (lose-responsibility, backed up)
     - Step 4: re-enter passphrase
  10. Set passphrase: QuipSwapSwapTest2026Demo
  11. Clicked Create account. Wallet signed a free SIWE message, then
      sent a transaction to the v1 WalletFactory at
      0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8 on Base Sepolia.
  12. **Tx hash 0xf315cb8a7dfde87aa1824f530f90b54db48be2374cdf8bc76e56801abe58c3f9**
  13. Quip account deployed at 0x4F81CD8232a55cFb016D8575979d5F05a894aF89
      (Base Sepolia), implementation at
      0xC4e4652898bb12c4f0ba9083829689b1963135e7 (EIP-1967 slot).
  14. Account ID: 0xd956d320603331effa5e9ab036a7a7f47ffe1737101fc24dcee2e4de41fe3804
  15. Re-entered passphrase to "Open" the account, which unlocked
      the QUIP SWAP section with "Create a swap" / "My swaps" /
      "Open orderbook" buttons.

## Phase 10: Trying to use the order book

- Opened swap.quip.network from the account UI's "Open orderbook" button.
- Site asked to switch to Ethereum mainnet on connect; wallet auto-approved
  (mainnet = look-only).
- "Restoring your session" scan on Ethereum mainnet never finds my Quip
  account (which is on Base Sepolia).
- Live order book on swap.quip.network still empty.
- The Quip account app on account.quip.network showed the QUIP SWAP section
  with "Create a swap" / "My swaps" / "Open orderbook" buttons, but the
  test wallet is on Aglais (chain 20033) again at this point, and the
  account app asks for signatures that the wallet declined on mainnet.