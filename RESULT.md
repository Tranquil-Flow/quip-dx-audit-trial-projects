# RESULT — QuipSwap testnet swap via `@quip.network/quip-swap-sdk`

## Overall: **PARTIAL**: the code works, but a live public-testnet swap is BLOCKED by testnet ETH funding

The script creates two Quip (SHRINCS) wallets, commits both legs of a hashlocked swap through the Quip wallets, claims, and reaches `settled`. It does this against the **real deployed QuipSwap Omnibus and WalletFactory bytecode**, but only on a local Anvil **fork** of Base Sepolia. It never ran on the public Base Sepolia chain because the two new throwaway EOAs have 0 ETH. Every Base Sepolia faucet I found needs a human CAPTCHA, a login or account, or a mainnet balance. Quip has no EVM testnet faucet and no gas sponsorship that outside developers can use.

| Component | Status | Notes |
|---|---|---|
| Find QuipSwap deployment / testnet | WORKING | Only found in the SDK bundle's registry: Omnibus `0xA7955981D5759a799267063110Be0F7AeCc26F8A` on Base Sepolia (84532) and OP Sepolia (11155420). I checked that code is deployed there. |
| Throwaway keys (`src/genkeys.ts`) | WORKING | 2 fresh EOAs + 2 fresh SHRINCS mnemonics in `keys/keys.json` (mode 600) |
| Read-only live probe (`src/probe.ts`) | WORKING (live) | Reads Omnibus version/fee/factory and WalletFactory fees/impl on both testnets |
| Quip wallet creation (`@quip.network/ethereum-sdk@beta`, `ShrincsFactoryClient`) | WORKING on fork / BLOCKED live | Needs a workaround for an SDK signing bug (below) |
| Swap with `quip-swap-sdk` (`createTerms`, `generateSecret`, `planSameChainSwap`, `prepareCommit` → Quip-wallet `execute`, `claim`, `getSameChainSwapStatus`) | WORKING on fork (2 runs, both `settled`) / BLOCKED live | |
| Live Base Sepolia swap | **BLOCKED** | EOAs unfunded: `BLOCKED: alice's throwaway EOA 0x8C2D… has 0 ETH on chain 84532` (`runs/live-run1.log`) |

## How to run
```bash
npm install                     # deps: @quip.network/quip-swap-sdk@beta (0.1.0-beta.9), @quip.network/ethereum-sdk@beta (0.3.0-beta.8), viem
npm run genkeys                 # only if keys/keys.json doesn't exist (never overwrites)
npm run probe                   # read-only check of the live contracts + EOA balances
npm run typecheck

# Live Base Sepolia. First send ≥0.0003 Base Sepolia ETH to EACH EOA:
#   alice 0x8C2Da2c664ad9B6826A077413c8CBe993A1F55B0
#   bob   0x1f3E552187A6C22D087C6424C8a2603FCc3f4F02
npm run swap                    # takes ~11 min of real time (see "timing" below); resumable via runs/84532-state.json

# Reproduce the fork result (no funds needed):
anvil --fork-url https://sepolia.base.org --port 18545 --silent &
for a in 0x8C2Da2c664ad9B6826A077413c8CBe993A1F55B0 0x1f3E552187A6C22D087C6424C8a2603FCc3f4F02; do
  cast rpc --rpc-url http://127.0.0.1:18545 anvil_setBalance $a 0x16345785D8A0000; done
RPC_URL=http://127.0.0.1:18545 FORK_WARP=1 STATE_FILE=runs/fork-state.json npx tsx src/swap.ts
```
Env knobs: `RPC_URL`, `OMNIBUS`, `BUFFER_SECS` (default 300 = SDK `DEFAULT_BUFFERS.fastL2`), `ALICE_GIVES` / `BOB_GIVES` (ETH), `WALLET_TOPUP`, `MIN_EOA_BALANCE`, `FORK_WARP=1` (Anvil time warp), `STATE_FILE`.

**What the swap does:** a same-chain native-ETH swap on Base Sepolia. Alice's Quip wallet gives 0.00002 ETH and Bob's Quip wallet gives 0.00001 ETH.
1. Each party's EOA deploys a SHRINCS Quip wallet (derivation 0, ERC-1271 key at derivation 1, 64 signatures).
2. Each EOA tops up its wallet.
3. Alice is the proposer: `prepareCommit(..., {account: aliceWallet})` builds the call, and `aliceWallet.execute(call)` sends it with a SHRINCS signature.
4. The script waits for the taker window, then Bob commits the same way.
5. The script waits for the claim window, then Alice's EOA sends `claim(secret)`, which settles both legs.

## Evidence
- **Live, read-only (Base Sepolia):** Omnibus version `QUIP:Omnibus:v1.0.0-beta.3`, `commitmentFee` 0, `WALLET_FACTORY` `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8`, factory `creationFee` 0, `latestWalletImpl` `0xc4E4652898bB12C4f0Ba9083829689B1963135E7`, which matches the SDK default. On OP Sepolia the factory's latest impl is `0x6808…`, which does not match the SDK default, so I did not use OP Sepolia.
- **Fork run 2** (`runs/fork-run2.log`). These hashes exist only on the local fork, not on the public chain:
  - Quip wallets: alice `0x69dD37f07980Dc430e55475A00b88613b0692ce3`, bob `0x03080F31e0Dcced3B5779b23D5CdA226936056CF`. `Omnibus.isQuipWallet` returns true for both.
  - swapId `0xf94df8fbf78894b5faa7700c3e74ffcafebce7f1e7121d5f5fbfbebc40b9543c`, lock `0x7de34b1a…804a`
  - alice commit `0x321221a8…84ef`, bob commit `0x25445abc…04ac`, claim `0x9e73781d…6820`. Final status `settled`.
  - Wallet balances went 0.00005 → 0.00006 ETH (alice) and 0.00005 → 0.00007 ETH (bob), which is what the terms specify.
- **Fork run 3** (`runs/fork-run3.log`): reused the existing wallets and ran a second swap, which also reached `settled` (claim `0xa5526a4e…3e6d`).
- Gas measured on the fork: commit through the wallet ≈ 370–400k, claim ≈ 78k, wallet creation ≈ 0.5–0.6M. At the live 0.006 gwei gas price that is well under 0.0001 ETH per party.
- The wallet addresses are derived by CREATE3 from each wallet's key commitment and owner. So once the EOAs are funded, they should be the same addresses on live Base Sepolia.

## What did not work, and why
1. **No testnet ETH (the actual blocker).**
   - Alchemy's Base Sepolia faucet page says "no CAPTCHA", but its bundle contains `captchaRequiredError`.
   - The CDP, thirdweb and QuickNode faucets need an account, a login or a mainnet balance.
   - I did not bypass any CAPTCHA, create third-party accounts, or touch existing wallets.
   - Quip's paymaster (`ShrincsPaymasterClient.sponsorUserOp`) needs Quip's operator key plus a bundler.
   - Quip's own faucet is only for its Substrate dev chain.
2. **ethereum-sdk signing bug:** the SDK passes `account: <address string>` to viem `writeContract`. That switches viem to node-side `eth_sendTransaction` and fails with `No Signer available` whenever you use a local private key. I worked around it with a Proxy wallet client in `src/swap.ts` (`localSigning`).
3. **Docs contradict the task:** developers.quip.network/docs/getting-started/quip-sdk says "no swap SDK is published today. Use the wallet for swaps," but `@quip.network/quip-swap-sdk` is on npm.
4. **Missing docs:**
   - The swap SDK README links to `USAGE.md`, `ARCHITECTURE.md` and `QUIP_LIFECYCLE.md`. None of them ship in the tarball, there is no public repo, and `package.json` has no repository URL.
   - The README's "Deployment registry addresses" paragraph is cut off.
   - I got the addresses, the wallet-route `auth` format, the execute funding model and the timing rules by reading the bundled `dist/index.js` and `.d.ts`.
5. **Tag confusion:** the swap SDK's `latest` tag is beta.6 while `beta` is beta.9. The ethereum-sdk's `latest` tag (0.1.7) is the old WOTS+ generation, whose factory `0x4a5A…` is not the one Omnibus trusts.

## What would have made this easier
- A Quip-run faucet, or a sponsored Quip-wallet onboarding path, for Base Sepolia / OP Sepolia.
- Publishing `USAGE.md` (or the repo) with the swap SDK, plus a documented list of supported testnets and addresses.
- One end-to-end "two Quip wallets swap on testnet" example that combines ethereum-sdk wallets with `prepareCommit` → `execute`.
- Fixing the ethereum-sdk to pass the wallet client's own `account` object, so local private keys work.
- Making the SDK-overview docs page agree with npm about the swap SDK.
- Documenting sensible `maxSignatures` values and the real-time cost of a swap. The taker must wait for the proposer's deadline, so with the default 1800 s buffer a same-chain swap takes more than an hour of wall-clock time.

See `DEVLOG.md` for every source, command, error and deviation.
