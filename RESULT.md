# RESULT

Overall: WORKING — a real same-chain Base Sepolia swap completed through QuipSwap's published SDK. Both new Quip smart wallets initiated their own commitments; one permissionless claim paid both wallets. Independently verified `settled` / lock state 3 on two public RPCs.

## Component status

- Project / SDK integration: WORKING. `@quip.network/quip-swap-sdk@0.1.0-beta.9`, `@quip.network/ethereum-sdk@0.3.0-beta.8`; `npm run typecheck` and `npm test` pass (2/2).
- Brand-new throwaway owner keys and Quip SHRINCS wallets: WORKING. Private keys, PQ mnemonics and swap preimage reside only in `./keys` (directory mode 0700; files mode 0600; gitignored). Never use them for mainnet.
- Free testnet gas: WORKING via third-party OpenFaucet. No existing key, mainnet wallet, or real money used.
- Quip wallet deployment/registration/funding: WORKING for both wallets.
- QuipSwap same-chain native-ETH commitments: WORKING. Both wallet-initiated Commitment events confirmed, one from each Quip smart wallet.
- Settlement/claim: WORKING. Claim receipt succeeded, emitted two Claim events to the two Quip wallet addresses, and chain state became `settled`.

## Reproduce / resume

Run from this directory on Node 22+:

```
npm install
npm run typecheck
npm test
npm run wallets   # ONLY on a new checkout with no ./keys/wallets.json
npm run probe
npm run faucet    # ONLY if the two brand-new gas-payer addresses need free Base Sepolia ETH
BASE_SEPOLIA_RPC_URL=https://base-sepolia-rpc.publicnode.com npm run swap
```

This run already has `./keys/wallets.json`, `./keys/swap-secret.json`, and `run-state.json`; do NOT regenerate wallet keys or erase swap state before resuming. `swap` resumes recorded transaction hashes and is idempotent once settled (verified by rerunning). Base Sepolia chain ID 84532 is checked before broadcasting; no mainnet code path. Same-chain swap uses tiny native ETH amounts 1000 wei versus 2000 wei, committed via `wallet.execute` by the corresponding Quip wallets; the owners' local EOA accounts pay network fees and provide the transaction value. The six deadlines use 600-second adjacent windows (below SDK's 1800-second default); leave the script running through the on-chain windows on a fresh run. `./keys` and `run-state.json` are gitignored. A new swap needs a new throwaway project/keys or deliberate state/secret rotation, not blind reuse of this settled swap.

## On-chain evidence, Base Sepolia

- Owner EOAs (new): `0xC34f5FD697Bf841A50cDD89437c6aBCA388aA9D0` and `0x9D7F187809161fB3E6F73780A3b4d1BA3Dbb111a`.
- Their Quip smart wallets: `0x12Fff5E0B59eDE35c1c594aB5e371389D9Dc72c2` and `0x3F2Cc4E990a2f09D73C26B7A947D33aeec27930f`.
- Omnibus `0xA7955981D5759a799267063110Be0F7AeCc26F8A`; wallet factory `0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8` (SDK registry and on-chain reads agree).
- Free test ETH claim: `0x2a7f7a53065eca0b841ffe9314b04aa9dae2faa6ab6ea1bdf45c507f29ac55e8`; new-owner to new-owner transfer `0xc356f0b2e943e0c9b7efc921a703db391a74244b061205fd1b1aae963d649a09`.
- Wallet deployment transactions: `0x9c5a483ee52ced26dfdd31012c618ef03b2fe4721c8316acd76d3c1e2e55242b` and `0x3a397ebb52b91a53be29a32a7a7a4a85b860ed5036714526992b33a5737b56ed`.
- Wallet funding transactions: `0xa5f7088a3f30f5217eca227afe085a9a3697e625730c5cd3b1a2991046c05a6e` and `0xec65aa522adb13ee9bdab43eebacdec5ccd9014db66dd53c5ddeb6e13eb66252`.
- Current QuipSwap lock: `0x5c945e3bb1c2e62b9ecfff96a9827772ca223b8105ee5dd4d4bcbbdbc1e10a5c`. Current swap ID after replanning expired unused terms: `0x507f153f5f4afff486b13f63ce17d7902032040ab8b29e250dfdd8c481e2483d`.
- Confirmed proposer wallet-initiated Omnibus commit: `0xce35cf5af51ddb55422bc55448ecfd336fea5076a1826643713f76ae44014ecd` (SDK decoded one Commitment event, sender `0x12Fff5E0B59eDE35c1c594aB5e371389D9Dc72c2`).
- Confirmed taker wallet-initiated Omnibus commit: `0x35f44f494e3de8cdef87f00031bfad07ceb7a877ed9d5990e7f77082dc905447` (one Commitment event, sender `0x3F2Cc4E990a2f09D73C26B7A947D33aeec27930f`).
- Confirmed claim: `0xfa676cf13de28fd1fbd2283678fa1c09ec02d686b47eca8f11bd4da9684ad0ce` in Base Sepolia block `47455072`; receipt `success`, two Claim events with the shared lock, recipients `0x12Fff5E0B59eDE35c1c594aB5e371389D9Dc72c2` and `0x3F2Cc4E990a2f09D73C26B7A947D33aeec27930f`. Both https://base-sepolia-rpc.publicnode.com and https://sepolia.base.org independently returned SDK status `settled`, lock state `3`, proposerPosted and takerPosted `true` and both reclaimed `false`. Wallet balances after claim: `100000000002000` wei and `100000000001000` wei respectively; they were initially funded with `100000000000000` wei each. This confirms receipt of the *other* party's 2000 / 1000 wei leg, while EOA-paid wallet execution funded deposits.

## What did not work / vendor improvements

- Official developer docs currently say there is no published swap SDK despite published beta npm package. No complete same-chain swap recipe, testnet faucet instructions, working wallet-to-swap example, or included package USAGE.md / wallet SDK_README.md / DEPLOYMENTS.md. Public package types/source, registry and live chain reads were necessary.
- Wallet SDK passes a bare address to viem `writeContract`, invoking `eth_sendTransaction` instead of local signing against public RPC; `src/swap.ts` uses a local-account adapter (without patching vendor files). A wallet SDK overload accepting a viem local account would avoid this.
- Factory SDK does not return deployment tx hash; event log lookup supplies it. RPC read lag after receipt caused a false negative for immediate wallet registration; code polls the factory before continuing.
- The original 120-second experimental windows proved too short for PQ signing and public RPC; on-chain old swap ID `0x04ffe0a13a3def5350722b7632b274d1c34cecb724af3035580e8fc2347cf95e` stayed Unused (0). New 600-second adjacent deadlines were planned only after checking it remained unused. Better docs on realistic PQ signing times and safe testnet deadline defaults would help.

Chronological commands, source URLs, errors, guesses and workarounds: `DEVLOG.md`.
