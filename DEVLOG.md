# DEVLOG — QuipSwap OTC prototype (testnet)

Started 2026-09-28 10:59 CEST. Env: macOS arm64, node 22, foundry (cast/forge) present, python3.

## Sources consulted (in order)
1. WebSearch "Quip Network swap protocol testnet" → press releases, quip.gitbook.io/docs (search result)
2. WebSearch "Quip Network docs developers"
3. https://quip.gitbook.io/docs → **404** (dead; GitBook docs linked from search results and from repos are gone)
4. GitHub API: https://api.github.com/orgs/QuipNetwork/repos — no repo named swap/quipswap.
5. Cloned (depth 1) into research/: QuipNetwork/ethereum-sdk, quip-validator, learn.quip.network, faucet, links.quip.network
   - grep for swap/htlc/escrow: nothing swap-related. quip-validator is a Substrate chain (pallet_revive EVM, multisig, proxy) — no swap pallet.
   - links.quip.network/src/data/siteData.ts → https://www.quip.network/quipswap/
6. https://www.quip.network/quipswap/ → "QuipSwap ... Currently operational on Base only"; app https://account.quip.network, demo https://swap.quip.network/demo, docs https://developers.quip.network/docs
7. https://docs.quip.network → 301 → https://developers.quip.network/docs
8. https://developers.quip.network/docs/llms.txt and .md mirrors: quipswap.md, quip-sdk.md, quickstart.md, quip-accounts.md, use-with-ai.md, quip-lifecycle.md
   KEY FACTS from docs:
   - QuipSwap = hash-lock + per-side deadlines; commit / execute / reclaim.
   - "The settlement contract is gated: only Quip wallet contracts can initiate a swap. You cannot drive a swap from an ordinary account or from your own contract today."
   - "There is no public @quip.network/quip-swap ... no swap SDK is published today. Use the wallet for swaps."
   - No contract addresses, no ABI, no testnet mention in QuipSwap docs.
9. npm: @quip.network/ethereum-sdk@beta (0.3.0-beta.8) packed into research/pkg — contains wallet/paymaster ABIs + addresses only, NO swap ABI/addresses.
10. GitLab API group quip.network projects list — no swap repo public.
11. Downloaded JS bundles of https://account.quip.network and https://swap.quip.network (research/web/) — they embed a QuipSwap client (QuipSwapError, Terms tuple, deadline validation). Reading minified source from here on (deviation: no docs for the contract interface).

## Commands / notes
12. Found in swap.js bundle: deployments table `h$` → QuipSwap "Omnibus" 0xA7955981D5759a799267063110Be0F7AeCc26F8A (version QUIP:Omnibus:v1.0.0-beta.3) on Base (8453), Base Sepolia (84532), OP Sepolia (11155420); walletFactory 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8. Extracted ABI → research/web/QuipSwap.abi.json (python bracket-matching on the minified literal).
    Verified on Base Sepolia with cast: VERSION()=QUIP:Omnibus:v1.0.0-beta.3, WALLET_FACTORY()=0xA2B2…8cc8, commitmentFee()=0, owner 0xc68B…6A26. Factory creationFee()=0.
    commit auth = {signer: concat(walletAddress, vaultId), signature: "0x"} (from bundle fn tAe/eAe). Contract requires signer >20 bytes (MalformedSigner).
13. GUESS: app's chain config says "Need Base Sepolia Eth? ... Alchemy Faucet". Alchemy/QuickNode/etc. faucets all require login or captcha. Did NOT solve captchas. → gas funding for fresh keys needs a human.

## Commands
- `cast wallet new --json > keys/{alice,bob}.json` → alice 0x1D9326571DcAb9C8076CF79087eC64728B4DD6Aa, bob 0x4197ff18cA3B3691F4475bbd0644E49FcFcdfcE8
- `npm install @quip.network/ethereum-sdk@beta @quip.network/hashsigs-wasm@rc viem` (docs warn plain `latest` is stale 2025 build)
- ~11:10 ENVIRONMENT PROBLEM: disk full (ENOSPC) — volume 926Gi, only ~123Mi free, not caused by this project (project total ~160MB). Bash tool itself failed to write output. Freed space by truncating research/web/acct.js and deleting my own research clones (links/learn/faucet/quip-validator/pkg). Keeping disk usage minimal from here.
- Started anvil fork: `anvil --fork-url https://sepolia.base.org --port 18545 --chain-id 84532 --no-storage-caching` (first try on :8545 without --chain-id reported 31337 → moved to own port + explicit chain id; that first process was killed).
- `anvil_setBalance` 0.1 ETH on both EOAs (fork only).
- scripts/setup-wallets.mjs (ShrincsFactoryClient.createShrincsWallet, maxSignatures 32, derivationIndex 0, erc1271 derivationIndex 1 — GUESS: parameter values not documented anywhere; picked small values).
  ERROR 1: `ContractFunctionExecutionError ... Details: No Signer available` — SDK 0.3.0-beta.8 passes `account: <address string>` to viem writeContract → viem uses eth_sendTransaction (node-side signing). WORKAROUND: Proxy around walletClient forcing the local viem account on writeContract/sendTransaction (lib.mjs localSigningWalletClient).
  → Fork wallets: alice 0x42F319e10Ae4595a380c2f3a00BCecC39fF67075, bob 0x30dA92AD0371BBc207b5e7410e75A35d2e29A9b0.
- Deployed throwaway ERC-20 contracts/OtcToken.sol (forge build) for Bob's leg.
- Window rules read from minified client validator in swap.js (functions u$/d$/g$): proposer commit [0,P.commit), taker commit [P.commit,T.commit), same-chain claim [T.commit,P.claim), reclaim [reclaimRelease,∞). Deadline interleave: P.commit<T.commit<P.claim<T.claim<P.reclaim<T.reclaim.
  NOTE/DEVIATION vs docs: docs say "initiator takes the longer window"; the contract's ordering gives the FIRST committer (proposer) the shorter windows. I made Alice (secret holder) the proposer so she commits first.
- happy run 1 (fork): commits OK; Alice claim OK; Bob's claim reverted 0x04194c2c = InvalidLockState() (decoded by `cast sig` over all error names in the bundle; `cast 4byte` had no entry).
  FINDING: on a same-chain swap ONE claim settles BOTH legs (two Claim events in one tx, lock → Spent). Bob's separate claim is only needed cross-chain.
  ERROR 2 (my guess was wrong): I set Terms.recipient = counterparty. Result: each party got its OWN asset back. Terms.recipient actually = the address where THIS party receives the OTHER leg. Fixed (recipient = own wallet).
- happy run 2 (fork): SUCCESS. Alice −0.0001 ETH +250 tUSD; Bob +0.0001 ETH −250 tUSD; lockState Spent. evidence/happy.fork.json
- refund run (fork): SUCCESS. Early reclaim reverts 0x32e5164b = WindowViolated(); after time-travel to reclaimRelease, reclaim emits Reclaimed(recipient=Alice wallet); Omnibus escrow balance returns to pre-commit value. evidence/refund.fork.json
- Real Base Sepolia: `node scripts/check-funding.mjs` → both EOAs 0 ETH. BLOCKED on funding: every Base Sepolia faucet found (Alchemy — the one the Quip app itself links, QuickNode, zalalena, GetBlock) needs login and/or captcha; I did not bypass captchas. Need a human to send ~0.002 ETH to each EOA, then `./run-testnet.sh`.
- Gas: fork used 1 gwei (anvil default) → ~4M gas per party for the whole flow; real Base Sepolia gas price is 0.006 gwei → ~0.00003 ETH gas + 0.0002 ETH of legs per party.
- Changed seed files to be per-environment (keys/<name>.fork.shrincs-seed.hex vs keys/<name>.shrincs-seed.hex) so one-time SHRINCS slots signed on the fork are never reused on testnet; deleted the earlier seeds.
- `./run-fork.sh` from scratch (fresh fork, fresh wallets): exit 0, both flows pass. Log: evidence/run-fork.full.log. Fork wallets alice 0x2d6ecfb4ACc8fc53f934cdF6c7E46c9cDA1379F8, bob 0x820bFc8541a811Ff5F3147F874d6B035240a401c.
- Stopped my own anvil processes. Did not touch any other containers/processes.
