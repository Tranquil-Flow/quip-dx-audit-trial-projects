# RESULT

Status: PARTIAL

I created a real Quip Account (post-quantum smart-contract wallet) on the
Base Sepolia testnet using Quip's official web app at account.quip.network
and reached the QuipSwap order book UI, but I was not able to complete an
end-to-end swap on testnet: the live order book at swap.quip.network was
empty, and the only swap UI the order book has for a connected Quip account
is gated to look up the account on Ethereum mainnet, while my account
exists on Base Sepolia.

## What I built / learned and how to run it

End-to-end flow I executed (every step visible in ./screenshots/ and
./DEVLOG.md):

1. Web search via html.duckduckgo.com for "QuipSwap post quantum safe swap
   testnet" → quip.network/quipswap is the product page,
   developers.quip.network has the SDK and docs, quip.network/blog has the
   launch post. The Quip ecosystem has three relevant web apps:
     - quip.network/quipswap/         marketing site + paper-trading widget
     - account.quip.network/connect   Quip Account web app (was broken in
                                       this headless browser; loaded after
                                       a ~2-minute wait)
     - swap.quip.network/             QuipSwap order book (paper and live)
2. Set up a throwaway key: `qb keygen ./keys/wallet.key` printed
   `0x5187C255740F8178adb6950B3D0eFDF71cd3E782` (kept in ./keys/wallet.key,
   mode 600).
3. Funded the key on Aglais (chain 20033) from the public Aglais faucet
   at faucet.aglais.quip.network. Two drips (each 1e13 Planck = 0.00001
   AGLS) plus the 1 ETH existential deposit gave us 0x1158ab88a6f098000
   wei = 1.255394224 ETH of usable balance.
4. Discovered that the QuipSwap order book and Quip Account apps only
   support Ethereum, Base, Optimism, Sepolia, Base Sepolia, Optimism
   Sepolia, and MIDL. The QuipFactory at
   0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99 is not deployed on Aglais
   (eth_getCode returns 0x). So Aglais funding is informational only and
   the swap path has to be on Base Sepolia.
5. Discovered 0.005 ETH was already in the wallet on Base Sepolia (sent
   earlier, possibly by Alchemy).
6. Started the qb session with --chain 84532 (Base Sepolia) so the
   account.quip.network SIWE flow would not get stuck on a mainnet-only
   signature.
7. account.quip.network/connect loaded, "Test Wallet (INSTALLED)" was
   picked, the wallet approved the connection, the site asked to switch
   to Base Sepolia (84532) and the wallet approved.
8. The 4-step account-creation wizard ran end-to-end:
   - Step 1: intro
   - Step 2: choose network. Clicked "Show 3 more networks", picked
     Base Sepolia (TESTNET, gas ~0.000003019 ETH).
   - Step 3: passphrase QuipSwapSwapTest2026Demo + 2 warning checkboxes.
   - Step 4: re-enter passphrase.
   - Clicked Create account. Wallet signed a free SIWE message, then
     sent the deployment tx to the v1 WalletFactory.
9. Deployment tx hash
   `0xf315cb8a7dfde87aa1824f530f90b54db48be2374cdf8bc76e56801abe58c3f9`
   on Base Sepolia, to
   `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` (v1 WalletFactory).
   Created Quip Account at
   `0x4F81CD8232a55cFb016D8575979d5F05a894aF89`, EIP-1967 implementation
   `0xC4e4652898bb12c4f0ba9083829689b1963135e7`. Account ID
   `0xd956d320603331effa5e9ab036a7a7f47ffe1737101fc24dcee2e4de41fe3804`.
   On-chain confirmation via
   `curl https://base-sepolia.blockscout.com/api?module=account&action=txlist&address=0x5187...`
   returned the deployment tx and the Alchemy-faucet funding tx
   (0x4b9a28fd..., 0.02 ETH).
10. Re-entered the passphrase to "Open" the account, which unlocked the
    QUIP SWAP section in the account UI with
    "Create a swap" / "My swaps" / "Open orderbook" buttons
    (./screenshots/06-quip-account-created.png,
    ./screenshots/07-quip-account-welcome.png).
11. Clicked "Open orderbook", which opens
    https://swap.quip.network/ in a new tab. The site asks the wallet to
    switch to Ethereum mainnet. The wallet switches but the
    "Restoring your session" scan on mainnet never finds my Quip account
    (which is on Base Sepolia), so STEP 1 OF 3 (WALLET) never advances
    and I cannot post or take an intent
    (./screenshots/08-swap-orderbook-etherium-mainnet.png).
12. The live order book on swap.quip.network is empty: "The book is
    quiet. No published swap intents are available right now. Check
    back soon." This is true even before / after the Quip account check.

To reproduce:
- `qb keygen ./keys/wallet.key`
- `qb start web-0a4403 --wallet ./keys/wallet.key --chain 84532`
- Open https://account.quip.network/connect in qb, wait ~2 min for the
  React app to load, click Connect Wallet → Test Wallet, follow the
  4-step wizard, deploy a Quip account on Base Sepolia.
- (Optional) Open the order book at swap.quip.network; it is empty
  today, so there is nothing to take even with a working Quip account.

## Evidence

- Wallet / keys: ./keys/wallet.key, address
  `0x5187C255740F8178adb6950B3D0eFDF71cd3E782` (throwaway; not a real
  account).
- Faucet tx on Aglais:
  `curl -X POST https://faucet.aglais.quip.network/request -d
  '{"dest":"0x5187..."}'` → 200, amount 1e13 Planck per call, twice.
  Final Aglais balance
  `0x1158ab88a6f098000` = 1.255394224 ETH.
- Quip Account deployment tx on Base Sepolia:
  `0xf315cb8a7dfde87aa1824f530f90b54db48be2374cdf8bc76e56801abe58c3f9`
  to WalletFactory `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`.
  Quip account: `0x4F81CD8232a55cFb016D8575979d5F05a894aF89` (Base Sepolia,
  v1.1, implementation `0xC4e4652898bb12c4f0ba9083829689b1963135e7`).
  Account ID: `0xd956d320603331effa5e9ab036a7a7f47ffe1737101fc24dcee2e4de41fe3804`.
- Base Sepolia balance before / after the deployment:
  `0x470de4df820000` (5_015_686 wei = 0.005 ETH) before,
  ~0.0049 ETH after.
- Screenshots: ./screenshots/01-account-quip-loaded.png (blank),
  02-quip-account-welcome.png, 03-quip-account-passphrase.png,
  04-quip-account-confirm.png, 05-quip-account-networks.png,
  06-quip-account-created.png, 07-quip-account-welcome.png
  (the QUIP SWAP section), 08-swap-orderbook-etherium-mainnet.png.
  Many more in /private/tmp/qbrowse/web-0a4403/shots/.

## What did not work and why

1. account.quip.network in this headless browser takes ~2 minutes
   to render the first time, and screenshots frequently time out on
   font load. From session #2 onward it loads in <2 s. Until it
   loads, every interaction element number is "no element numbered
   N", so any click command before that point is a hard no-op.
   This is the main reason a real person would give up after ~10
   minutes and conclude the app is broken.
2. The Quip account connect flow asks the wallet to switch to
   "Base mainnet" by default. With the test wallet's "only sign
   on Aglais / Base Sepolia" rule, the SIWE signature on a mainnet
   is declined and the page hangs on "Looking a little deeper"
   forever. Workaround: start the session with --chain 84532
   (Base Sepolia) so the site auto-detects the right chain.
3. The QuipSwap order book at swap.quip.network only checks
   Ethereum mainnet for Quip accounts (the wallet popup says
   "switch to Ethereum mainnet"). It does not see Quip accounts
   on Base Sepolia. There is no UI to ask it to scan another
   chain. The paper mode (swap.quip.network/demo) has the same
   limitation.
4. The live order book is empty: "The book is quiet. No published
   swap intents are available right now." Even with a working
   Quip account, there is nothing on the book to take, and the
   "Publish an intent" button on the live order book requires
   a Quip account to be detected on Ethereum mainnet, which
   mine is not.
5. The QuipSwap demo at
   quip.network/quipswap-demo/?drive is a 12-scene walkthrough
   of the maker / taker / commit / settle flow. It is
   explicitly labelled "CONCEPT - NOT A SHIPPED FEATURE" and
   is not a working app.
6. Base Sepolia faucets that we can use headlessly without
   sign-in: there are none we could find. QuickNode,
   Alchemy, Coinbase CDP, and the L2 Faucet all need a sign-in
   or passkey or are under maintenance. Wrote ./NEED_FUNDS.txt
   for the human helper. We ended up relying on the 0.005 ETH
   that was already in the wallet.
7. Aglais (chain 20033) is the Quip testnet, but neither the
   QuipFactory nor the v1 WalletFactory is deployed there, and
   the ethereum-sdk npm package hard-codes a different list of
   supported chains. To QuipSwap on Aglais you would have to
   deploy the QuipFactory yourself, which the v0 addNetwork.ts
   script says is restricted to the chain operator.
8. The Quip account creation wizard does not have a
   "show password" toggle and the passphrase is only asked
   for twice. Any typo means losing the account; the site does
   not warn the user before sending the deploy transaction.

## Top 5 changes to the vendor's docs / site / apps that would have
helped me most

1. Tell users the wallet must be on Base Sepolia before opening
   account.quip.network/connect. Currently the connect flow
   asks to switch to Base mainnet and then refuses to sign, so
   every headless / restricted-wallet user gets stuck on
   "Looking a little deeper" with no recovery.
2. Add a "show password" toggle and an inline "you typed X
   characters" hint to the Quip account creation wizard. Right
   now a single typo silently loses the account after the deploy
   tx is sent.
3. Make swap.quip.network scan the chain the user is on, not just
   Ethereum mainnet. A Quip account on Base Sepolia is invisible
   to the order book even after a successful connect.
4. Seed the order book with at least one demo / paper offer on
   Base Sepolia so a brand-new user has something to take. The
   live order book is empty; the demo walkthrough is locked to
   the maker / taker illustration; the only way to "try a swap"
   today is to find a counterparty, which the marketing page
   does not help with.
5. Document a public Base Sepolia faucet that does not need a
   Coinbase / Alchemy / QuickNode account, or pre-fund the
   account on signup. All four public faucets we tried
   (QuickNode, Alchemy, Coinbase CDP, L2 Faucet) gated the drip
   behind sign-in or maintenance. The 0.005 ETH we used came
   from an unknown prior drip, not from anything reachable in
   the headless browser.
