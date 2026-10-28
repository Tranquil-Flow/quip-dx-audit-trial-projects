# t02-a

- **Round:** Round 1
- **Model:** Claude Opus 5.5
- **Task:** Create, fund and withdraw from a Quip PQ account
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Create, fund and withdraw from a Quip PQ account | Claude Opus 5.5 | ethereum-sdk (Quip Accounts), on copies of Quip's contracts it deployed on Aglais | Works on Aglais, but only on Account contracts it redeployed itself | ~29 min | No Account deployment on Aglais and no Base Sepolia gas route in the docs [C-ACC-01, C-ACC-03, C-ACC-04, C-ACC-06]. Rebuilds differ: one ran the whole flow with fresh keys; the other's own account-create transaction stalled. |

## Trial card

- **Model:** Claude Opus 5.5.
- **What it does:** A CLI that creates a SHRINCS Quip Account, funds it, and withdraws part of the balance with a SHRINCS-signed `execute()` call, on Aglais.
- **Quip products and integration:** `@quip.network/ethereum-sdk` (Quip Accounts) — SELF_DEPLOYED. Because Quip has not deployed the Account contract stack on Aglais, the project first redeployed Quip's own Base Sepolia bytecode onto Aglais under a throwaway key it controlled.
- **Evidence:** Aglais EVM tx [0xbdd047f924e59426dbc47cec539fa878d85754c660bdd39bbe043c3117ec8341](https://explorer.aglais.quip.network/tx/0xbdd047f924e59426dbc47cec539fa878d85754c660bdd39bbe043c3117ec8341) (create call to the self-deployed factory), Quip Account address [0xa4eb42332378Dca2032F906e8E455Dc59424AffE](https://explorer.aglais.quip.network/address/0xa4eb42332378Dca2032F906e8E455Dc59424AffE), and the SHRINCS-signed withdraw tx [0xb9d259ba4843035275ee0f5729596933be80492694002e146de248085d2585e6](https://explorer.aglais.quip.network/tx/0xb9d259ba4843035275ee0f5729596933be80492694002e146de248085d2585e6), all from the builder's report. One rebuild confirmed the create tx and the account on the live RPC; its own from-scratch redeploy of the stack (four contracts plus a `vetImplementation` call) also succeeded, though its `create()` attempt then stalled (see below). The other rebuild did not re-check these two items but ran the whole deploy, create, fund and withdraw flow on Aglais with fresh keys.
- **Key Quip call** (`quip-pq.mjs:198-213`, excerpt):
```js
async function withdraw(amountEth, to) {
  const c = await ctx();
  const target = to ?? readJson("recipient.json").address;
  const wallet = await openWallet(c);
  // ... (balance reads and comments, lines 202-209)
  const write = c.walletClient.writeContract;
  c.walletClient.writeContract = (args) =>
    write(args.functionName === "execute" ? { ...args, value: args.args.at(-1) } : args);
  const receipt = await wallet.execute({ target, value: parseEther(amountEth) });
```
- **What got in the way:** Quip has not deployed its Account contracts on Aglais [[C-ACC-01](https://developers.quip.network/llms.txt#:~:text=chain%20ID%2020033%20%280x4e41%29)], so the builder deployed its own copy there; one rebuild's own `createShrincsWallet` call on its redeploy then stalled: the tx never appeared after about 6 minutes, and a same-nonce retry was rejected as 'nonce too low' although `eth_getTransactionCount` still returned the old nonce. Nonce errors like this did not reproduce in our low-load check (five sequential transfers each mined in 5–7 s), and their cause is not established: about 30 of our agents were using the testnet at the time, and a pool snapshot showed mostly miner-proof extrinsics from other accounts (see section 9 of the main report).

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
