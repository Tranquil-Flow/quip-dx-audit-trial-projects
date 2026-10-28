# RESULT: DAO treasury on Quip post-quantum custody (prototype)

**Overall: PARTIAL.** Every piece works with the real Quip contracts and libraries, and the full
treasury → PQ approval → QuipSwap → recipient flow runs end to end. However, the full flow ran only
on an **anvil fork of Base Sepolia** (the deployed Quip bytecode and state, with fork-only ETH). It
has **not** run on a live testnet: Quip's accounts and swaps live on Base Sepolia, and I couldn't
get Base Sepolia gas without creating third-party faucet accounts. Quip's own testnet (Aglais) has a
working faucet but no account or swap contracts. On live networks I verified only the PQ-approval
piece, on Base Sepolia, OP Sepolia and Aglais.

## Status per component

| # | Component | Status | Where it ran |
|---|---|---|---|
| 1 | Treasury as a Quip post-quantum account (SHRINCS `ShrincsWallet` from the canonical `WalletFactory`) | **WORKING on fork** / BLOCKED live (no Base Sepolia gas) | Base Sepolia fork |
| 2 | Payout approval signed with Quip's PQ library (`@quip.network/hashsigs-wasm` SHRINCS via `ethereum-sdk`), verified off-chain and by the deployed ERC-7913 SHRINCS verifier | **WORKING, live** | live Base Sepolia + OP Sepolia (eth_call), live Aglais (tx-deployed clone of the verifier), fork |
| 3 | Treasury spends approved funds through its PQ-signed `execute`, from its own balance | **WORKING on fork**, but needed an SDK workaround (see W3) | Base Sepolia fork |
| 4 | Swap via QuipSwap (Omnibus HTLC, `@quip.network/quip-swap-sdk`): treasury commits ETH, maker commits tUSD, one claim settles both legs, and the counter-asset goes straight to the payout recipient | **WORKING on fork** / BLOCKED live (gas) | Base Sepolia fork |
| 5 | Any of 1, 3 or 4 on Quip's own testnet (Aglais, chainId 20033) | **BLOCKED**: no factory, wallet impl, EntryPoint or Omnibus is deployed there, and the Omnibus source isn't public | n/a |

## What the flow does (`flow.mjs`)

1. `setup`: checks the Quip contracts exist on the target chain and funds the gas EOAs (fork only).
2. `create-wallet`: creates the treasury Quip account with `ShrincsFactoryClient.createShrincsWallet` (maxSignatures 16). Its owner is a throwaway operator EOA that pays gas but can't move funds without a SHRINCS signature.
3. `fund`: deposits 0.005 ETH into the treasury account.
4. `deploy-token`: the market maker deploys a throwaway ERC-20 (`tUSD`) as the counter-asset.
5. `approve`: a separate DAO approver SHRINCS key signs the payout intent (treasury, recipient, amounts, token, nonce, deadline, chainId). It uses a local slot ledger that is updated before signing. The script checks the signature off-chain (wasm) and on-chain (`SHRINCSVerifier.verify` → `0x024ad318`) and runs a tampered-hash negative control. It **refuses to continue** if either check fails.
6. `commit-treasury`: the treasury is the swap proposer. `omnibus.prepareCommit(..., {account: treasury})` builds a Call, which runs through the treasury's **PQ-signed** `ShrincsWallet.execute`. The ETH comes out of the treasury's own balance, and the treasury leg's `recipient` is the payout recipient.
7. `commit-maker`: the maker, a plain EOA, commits tUSD through Omnibus's keyed route, authorised by a SHRINCS signature over the commit digest.
8. `claim`: the secret is revealed and one claim settles both legs. The recipient receives tUSD and the maker receives ETH.
9. `report`: prints balances, slot usage and the swap status (`settled`).

## How to run

```bash
npm install                      # installs @quip.network/ethereum-sdk@beta, hashsigs-wasm@rc, quip-swap-sdk@beta, viem
npm run build-token              # forge build contracts/TestUSD.sol
npm run fork                     # terminal 1: anvil fork of Base Sepolia on :8547
LABEL=my-run node flow.mjs all   # terminal 2: full flow (≈40 s; SHRINCS keygen ≈10 s/bundle)
node flow.mjs approve            # individual steps are also runnable; state lives in state/<LABEL>.json
npm run verify-live              # re-verify all saved approvals against LIVE Base Sepolia (no gas needed)
RPC_URL=https://sepolia.optimism.io node verify-live.mjs
RPC_URL=https://evm-rpc.aglais.quip.network VERIFIER=0x79d1b0969640d8a79e912f8a1593862ed28ce55b node verify-live.mjs
```

To run live on Base Sepolia, fund `keys/eoa-operator.json` and `keys/eoa-maker.json` with Base
Sepolia ETH, then run `RPC_URL=<base sepolia rpc> IS_FORK=0 LABEL=live SWAP_BUFFER=300 node flow.mjs all`.
Real time passes between windows (about 10 min with a 300 s buffer). This is **untested live**.

Keys are in `./keys` (throwaway and testnet-only): EOAs, three SHRINCS mnemonics (treasury,
approver, maker), slot ledgers and swap secrets.

## Evidence

### Fork of Base Sepolia (forked at block ≈47415410, then again at ≈47415806 for the clean run). These are fork txs, not on the public chain.
- Treasury Quip account: `0xbd5b07fC46ce5b7DdF2826Bd44d2a24c2C9246EB` (owner `0x1eEE5e6C6bce95D80D691e43EA777BC81E25742e`, identity commitment `0xbceb46d5…9593`). The address is CREATE3-deterministic, so it's the same counterfactual address on live Base Sepolia.
- Swap #1 (SDK default `execute`, **operator EOA fronted the ETH**; see W3): lock `0x498cc019…53fc`; treasury commit `0x3b1f8d67…8d57`, maker commit `0xb61dbb05…f8f2`, claim `0xab9787b8…99f5`.
- Swap #2 (paid from the treasury's own balance, 0.005 → 0.003 ETH): lock `0x08d66d26…4f66`; treasury commit `0x998faeb8…55ea` (370,487 gas), maker commit `0xc915f81d…1c02` (311,110 gas), claim `0xbd029ec4…8e80` (73,725 gas). Final status `settled`; recipient `0xAE207CE0db3e58bfFeCF44c2e56c26A67726EC1F` holds 10 tUSD; treasury used 2 of 16 SHRINCS slots.
- Clean from-scratch rerun (`logs/fork-clean-run.log`): fund `0xc354dd54…210c`, treasury commit `0xcca62f36…1f5c`, maker commit `0xcc95e84a…c827`, claim `0x8793b285…bc85`, status `settled`.

### Live networks
- **Base Sepolia (84532)** and **OP Sepolia (11155420)**: `eth_call SHRINCSVerifier(0xF2f9E6D692da41b089c3c261c41509669eEc5567).verify(approverCommitment, payoutHash, envelope)` returned `0x024ad318` (valid) for all 3 DAO approvals; a tampered hash returned `0xffffffff`. See `logs/verify-live-*.log`.
- **Aglais (Quip testnet, 20033)**:
  - Faucet extrinsic `0x0db08de22d8e0cb5ec7daf30f71e5ed6b8bfb849d97c6b16b2a725968f18a7db` (10 AGLS to the operator).
  - TestUSD `0x7bec9e6072ee626d1A1B136Bd490cfD925Cb8B64`.
  - AGLS transfer `0xc01bc3dc7e2afa847eb0e80cf87835669e94af13415903bcea7d785a004eddd1`.
  - Byte-identical clone of the SHRINCS verifier (runtime codehash `0xe9319929…8426`) deployed at `0x79d1b0969640d8a79e912f8a1593862ed28ce55b`, tx `0x38e4f75595f7680d58910fb922189c76a3e66ad59093b5be7bcf0e8e8cecce1a` (338,578,862 gas).
  - Both approvals verify there; the tampered hash is rejected.

## What did not connect, and why

- **D1: two networks, two product halves.** Quip's developer docs present the "Testnet" as Aglais (chainId 20033, AGLS, faucet), but Quip Accounts and QuipSwap exist only on Base Sepolia, OP Sepolia and Base mainnet. Aglais has none of the account, swap or ERC-4337 contracts. The SDK rejects 20033 (`UnsupportedNetworkError`), and the docs never say which testnet the accounts and swaps use.
- **D2: no gas path for the chain the products actually use.** Quip's faucet only serves Aglais. Base Sepolia faucets need a login, captcha or mainnet balance. `ShrincsPaymaster` sponsorship needs the paymaster owner's verifier key.
- **D3: the QuipSwap docs are wrong or outdated.**
  - The docs say "no swap SDK is published". In fact `@quip.network/quip-swap-sdk` is on npm, and the developer llms.txt even links it.
  - The docs say "only Quip wallet contracts can initiate a swap". The live Omnibus accepts a keyed ERC-7913 commit from a plain EOA, which I did.
  - The docs describe "slashable" timeouts in one place and "no slashing" in another.
  - The contract is called "Omnibus" in code and "QuipSwap/settlement contract" in the docs.
- **D4: source for the deployed contracts isn't where the docs point.** `hashsigs-solidity` main has only WOTS+; the deployed SHRINCS verifier is on unmerged branches. The Omnibus (QuipSwap) contract source isn't public at all, so it can't be deployed to Aglais.
- **D5: account SDK and swap SDK glue is manual.** `prepareCommit` returns a `Call`, and you have to feed it to `ShrincsWallet.execute` yourself. It works, but it isn't documented outside the npm README.

### Workarounds I had to make
- **W1:** `ethereum-sdk` only works with injected or JSON-RPC wallets. It passes `account: <address>`, and a viem LocalAccount fails with "No Signer available". I added a custom transport that signs locally (`localSignerTransport` in `flow.mjs`). A DAO backend or bot needs this.
- **W2:** SHRINCS leaves are 1-indexed; leaf 0 throws `leafIndex must be in 1..=16`. The d.ts doesn't say so.
- **W3 (custody-critical):** `ShrincsWalletClient.execute()` sends `msg.value = value + maxFee` from the **owner EOA**, so the Quip account's own balance is never spent. Swap #1 was actually paid by the hot EOA. I called the (TS-private) `buildExecuteCall` and sent it with `msg.value = maxFee` so the treasury pays for itself.
- **W4:** the subpath is `@quip.network/ethereum-sdk/v1/shrincs`, not `/shrincs`, and it isn't documented. npm `latest` tags are stale for all three packages.
- **W5:** I cloned the verifier's runtime bytecode onto Aglais instead of building it from the unmerged branch. Only the stateful path works there; the stateless or break-glass path needs a pinned sibling contract that doesn't exist on Aglais.
- **W6:** on Aglais, `forge create` reported "contract was not deployed" and `eth_getTransactionCount` lagged for minutes, although the txs were mined.

### Not done
- A live run of steps 1, 3 and 4 (needs Base Sepolia ETH).
- A cross-chain swap.
- The ERC-4337 or paymaster path.
- A multi-approver (M-of-N) policy enforced on-chain. Today the approval gate is enforced by the script. The Quip account itself only enforces "one PQ key signs". Making the approval binding on-chain would need a policy contract or module that calls the SHRINCS verifier.

## What would have made this easier (vendor docs/tools)
1. A single "which network is what" table: Aglais is for compute/consensus; Base Sepolia and OP Sepolia hold accounts and swaps, with addresses. Better still, deploy the factory, verifier, EntryPoint and Omnibus on Aglais so the one faucet you do run is enough.
2. A Base Sepolia faucet or developer gas sponsorship (the ShrincsPaymaster already exists).
3. Fix the SDK page: the swap SDK exists, the keyed route exists, and ship `USAGE.md` / `SDK_README.md` / `DEPLOYMENTS.md` in the npm tarballs (the READMEs link to them, but they aren't shipped).
4. Support viem LocalAccounts in `ethereum-sdk` and add an option for `execute` to spend from the account's own balance, the obvious custody/treasury use.
5. Merge the SHRINCS verifier into `hashsigs-solidity` main and publish the Omnibus source, so the stack can be deployed on other chains, including Quip's own.
6. A documented server-side example of "account `execute` → Omnibus commit", plus the SHRINCS leaf range and envelope format for ERC-7913 verification.
7. Set npm `latest` dist-tags to the current generation.
