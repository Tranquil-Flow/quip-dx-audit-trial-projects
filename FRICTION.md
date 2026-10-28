# FRICTION

## account.quip.network renders a blank page on first visit
- URL: https://account.quip.network/
- Screenshots: shots/0017.png, 0019.png, 0027.png, 0033.png, 0043.png, 0045.png, 0105.png, 0106.png
- Expected: the docs at developers.quip.network/docs/quip-interlock-protocol/quip-accounts promote this as the official way to create a Quip post-quantum account, so a connected-wallet button or "Create account" CTA.
- Observed: HTTP 200, title "QUIP Account", a light-blue body, and nothing else for at least 60 seconds. Only a chat-bubble icon in the bottom-right corner is clickable. No spinner, no "Loading" text.
- Discovered workaround: clicking the chat bubble (1) navigates to /connect, which renders the actual app. This is not discoverable without a hint.

## Aglais testnet is not in account.quip.network's network list
- URL: https://account.quip.network/connect (after wallet connect) → /accounts/<vaultId>:v1.1?deploy=...
- Screenshots: shots/0111.png (3 networks), 0112.png (5 networks after "Show 3 more")
- Expected: a testnet that the docs say exists (Aglais) and that the wallet was started against (--chain 20033).
- Observed: the only testnet the web app offers is **Base Sepolia** (84532). The other four are Base, Ethereum, Celo, Arbitrum (Celo and Arbitrum are "not available yet"). No Aglais option.
- This is consistent with the ethereum-sdk (gitlab.com/quip.network/ethereum-sdk) only supporting Sepolia, Base, Optimism, Mainnet, BSC, Avalanche, Polygon, Mantle, Celo, Arbitrum, Degen — and `eth_getCode` returns 0x at the QuipFactory address 0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99 on Aglais (the QuipFactory simply isn't deployed there). I had to fall back to Base Sepolia.

## "Need Base Sepolia ETH?" → only captcha-protected faucets
- URL: https://account.quip.network/accounts/...
- Screenshots: shots/0120.png (Alchemy Faucet), 0122.png (Coinbase 404), 0128.png (Superchain / Chainstack), 0133.png (Google Cloud Web3 Faucet)
- Expected: at least one of "Alchemy", "Superchain", "Google Cloud" or "Chainstack" to be open to a headless agent.
- Observed: every Base Sepolia faucet on the first page of Google requires a Cloudflare Turnstile, an email/social sign-in, or both. The Google Cloud Web3 Faucet's network dropdown also refused to open in the qb browser. The Alchemy page just stuck on "Verifying...".
- Worked around by writing NEED_FUNDS.txt for the Alchemy faucet and waiting for the "person on our side" to complete the captcha. That gave me 0.02 ETH within the documented 20-minute window.

## account.quip.network's "Send" button on the dashboard opens QuipSwap, not a simple transfer
- URL: https://account.quip.network/accounts/<vaultId>:v1.1
- Screenshot: shots/0170.png after clicking element 13 (the "Send" button on the dashboard header)
- Expected: a simple "send ETH to address X" form
- Observed: page navigates to /swap/new (QuipSwap's create-offer page)
- The real native transfer UI is the second "Send" button in the Tokens card below the balance (shots/0172.png element 12). This was confusing until I scrolled.

## "Generate passphrase" dice button (element 4) does nothing
- URL: https://account.quip.network/accounts/<vaultId>:v1.1?deploy=eip155%3A84532 (Step 3 of 4)
- Screenshot: shots/0150-0152.png
- Expected: clicking the dice button auto-fills a random 64-hex passphrase into the input.
- Observed: the input stays empty after multiple clicks in the qb browser. Same for a direct click on the input first. Worked around by typing my own 64-hex passphrase.

## Google search AI overview is unhelpful for Quip Aglais
- URL: https://www.google.com/search?q=Quip+post+quantum+account+Aglais+testnet
- Screenshot: shots/0008.png
- The AI overview snippet claims "Quip.Network / Postquant Labs Testnet" as a top result but the result row's primary link element points to an unrelated "Quantum Zeitgeist" article; the real Quip Network Docs link only appears further down the page.

## Conclusion
- The Quip web app does work end-to-end for the Base Sepolia testnet.
- For Aglais (the chain the wallet was started against), there is no web-app path today — only the mining/node-management path through the Substrate RPC and the Python xquad[quip] SDK.
- The blank-root-page issue, the missing Aglais option, and the captcha-protected faucets are the three biggest "almost blocked me" moments.