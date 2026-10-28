# FRICTION

Moments a real person would be confused, misled, stuck or annoyed.
Format: URL + screen quote + expectation + actual.

1) https://account.quip.network/
   Screen: blank grey page, only a small chat/help widget (a single red
   numbered box) is visible bottom-right. Title is "QUIP Account", status 200.
   Expected: a Quip account onboarding / wallet connect screen.
   Actual: the React app never renders. Repeated `open` calls with
   sleeps of 10-15s, the page is still blank and the browser daemon
   restarts itself once with a "stopped responding" notice. No
   console errors are visible in screenshots, but the page is
   functionally dead in this headless context. Cannot "Connect Quip
   account" because the page is empty.

2) https://quip.network/quipswap/
   Clicked "Connect Quip account" (#11) and "Post an offer" (#15).
   No wallet popup appears. The "Create an Account and Swap" CTA
   advances an embedded paper-trading widget, but does not lead to
   a real wallet connect. No window.ethereum detection visible.

3) https://duckduckgo.com (the JS page)
   Screen: title appears but body is white; screenshot times out
   waiting for fonts.
   Actual: had to use https://html.duckduckgo.com/ instead. This is
   a tooling issue (no fonts), not a Quip issue, but worth noting.

4) account.quip.network (the live account app) - Takes ~120s to render
   from a fresh start. The `open` command often returns a screenshot
   of a blank page. Restarting the qb session or waiting
   60-120 seconds, then navigating to /connect, /accounts, or
   /accounts/<id>:v1.1 was required. The `screenshot failed:
   fonts load` timeout appears regularly.

5) account.quip.network (auth flow) - The site asks the wallet to
   switch to "Base mainnet (chain 8453)" right after connect. Our
   test wallet only signs on Aglais (20033) or Base Sepolia (84532).
   When the user does not include --chain 84532, the wallet
   switches to mainnet, the site then asks for a SIWE signature,
   the wallet declines, the page shows "Looking a little deeper"
   forever. Fix: start the session with --chain 84532 (Base
   Sepolia). The site then auto-detects the matching chain and
   works.

6) Quip account creation. Step 1 of 4 ("Create your Quip account"
   / 4-step wizard) loads the available networks, but does not
   show a "testnet" badge — only the "Base Sepolia" card is
   visibly a testnet, and only after clicking "Show 3 more
   networks" do Base Sepolia appear. There is no way to tell from
   the network cards alone which ones are testnets. Faucet /
   gas estimates are displayed in USD on the testnet card
   ("about 0.000003019 ETH"), which makes the cost obvious.

7) Quip account passphrase. The site uses a 4-step wizard:
   (1) introduce, (2) choose network, (3) set passphrase
   + two checkboxes + "download backup" (which is just a label,
   no real file is downloaded), (4) re-enter passphrase. The
   password input is on step 3 and a separate "confirm
   passphrase" input is on step 4. Both must match for the
   "Create account" button to enable. The user has no way to see
   what they typed before they click "Create account" — the
   password is shown as dots, and there is no "show password"
   toggle. (This is a real footgun: any typo means losing the
   account.)

8) QuipSwap order book at swap.quip.network. The site asks the
   wallet to switch to "Ethereum mainnet" on connect. Even with
   a freshly-created Quip account on Base Sepolia, the
   "Restoring your session" step never finds a Quip account on
   Ethereum mainnet, so the page is stuck on STEP 1 OF 3 (WALLET)
   indefinitely. The "live" version only checks Ethereum mainnet
   (chain 1); the "paper" version also says "Only an EVM V1 Quip
   account can sign paper swaps" and looks for it on mainnet.
   The fix would be to ask the site to also scan Base Sepolia,
   but there is no UI for that. (See also #5: the wallet
   correctly refuses to sign on a mainnet.)

9) QuickNode Base Sepolia faucet
   (https://faucet.quicknode.com/base/sepolia). The "Continue"
   button on step 1 asks the wallet to switch to a network the
   site wants; when the wallet moves to Base mainnet, the
   QuickNode page opens a Coinbase sign-in OAuth tab. Without a
   Coinbase account, the "Continue" path is a dead end. The
   free drip itself is gated behind login.

10) Alchemy Base Sepolia faucet
    (https://www.alchemy.com/faucets/base-sepolia). The "Send
    0.1 ETH" button is disabled until you sign in. Same
    captcha/auth gate.

11) Coinbase CDP Faucet
    (https://portal.cdp.coinbase.com/products/faucet). Requires
    Coinbase account. Cannot be used headlessly.

12) Aglais testnet (chain 20033) is the Quip testnet
    (agls.quip.network) but QuipSwap/QuipAccount are not
    deployed there. The ethereum-sdk npm package
    (@quip.network/ethereum-sdk@beta) hard-codes its SUPPORTED
    networks to: Ethereum (1), Sepolia (11155111), Base (8453),
    Base Sepolia (84532), Optimism (10), Optimism Sepolia
    (11155420), MIDL (777). Aglais is not in the list. The
    QuipFactory at 0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99
    is not deployed on Aglais (eth_getCode returns 0x), and
    the v1 WalletFactory at 0xA2B2F71456a799FCf4EF7A3111c4B96b
    3e928cc8 also returns 0x. So you cannot make a QuipSwap
    on Aglais without first deploying the QuipFactory yourself
    (which the v0 addNetwork script makes clear is reserved for
    the operator: "If you are not Rick, you probably should not
    be running this script. Call Rick. Get permission. Don't be
    an idiot.").