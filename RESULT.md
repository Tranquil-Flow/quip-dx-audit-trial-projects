# QuipSwap Base Sepolia swap result

Status: PARTIAL — account and small testnet balances are live; no swap offer or settlement. Investigation has reached a product/UI blocker. Waiting for the other developer's account address and any workaround.

Maker owner wallet (Base Sepolia 84532 only): `0xa3ba936060Bf501cC1081e15FF6B37D2CCA659D6`.
Maker Quip Account v1.1.0: `0x23df35bECCa4ceb4a65A6B396F4A65A32a17887a`.
Maker balance: 0.012 Base Sepolia test ETH + 100 QTEST in Quip Account; owner EOA has ~0.00899 test ETH remaining. Both are disposable testnet-only credentials kept in `./keys`.
Optional test ERC-20 QTEST: `0xf876820fF653A8B37adA2d7c0C293Ca202826526`.
Offer ID: NONE. Offer terms: not finalized or published; conditional proposal to taker is maker gives 1 QTEST, receives 0.001 Base Sepolia test ETH. Taker was instructed not to act until a live link/id and final terms are sent.
Settlement: NONE — no maker offer exists, so there is nothing to confirm for both sides.

Evidence:
- Quip Account deployment tx, explorer Success block 47751453: https://base-sepolia.blockscout.com/tx/0xb706f77d7e5fff09abf5c352caee61e2c9c923d71b4d2ebc74d078ceaa63cc46 ; explorer `/private/tmp/qbrowse/web-836798/shots/0334.png`, account-ready UI `/private/tmp/qbrowse/web-836798/shots/0189.png`.
- 0.012 test ETH deposit tx, explorer Success block 47751507: https://base-sepolia.blockscout.com/tx/0x2fa05361d7f4b0d68cee17df93b33c653561dea76d68336568e4bcb0dc1243df ; explorer `/private/tmp/qbrowse/web-836798/shots/0225.png`.
- Disposable QTEST deployment tx: https://base-sepolia.blockscout.com/tx/0xf9f08af6e472fa84d757007167e3b0a6883bf5bea8fb8b9a32be8c402876aeab . Transfer of 100 QTEST to maker Quip Account, explorer Success block 47752381: https://base-sepolia.blockscout.com/tx/0xf9f8105f664ff4d10292ac5cf9c4df6392f4f052a5103cd7177950e804564a35 ; `/private/tmp/qbrowse/web-836798/shots/0330.png`.
- Dashboard shows funded ETH and token: `/private/tmp/qbrowse/web-836798/shots/0292.png`; account-specific swap form shows `No asset on this network`: `/private/tmp/qbrowse/web-836798/shots/0294.png`; global form remains `Loading assets...`: `/private/tmp/qbrowse/web-836798/shots/0319.png`.
- Coordination mailbox: `/private/tmp/projects/swapchat-697/maker.md`. No taker response yet at last check.

What did not work: The swap form's Send Asset picker remains empty even with ETH and ERC-20 visible and sendable from the same Quip Account on Base Sepolia. The global offer route never selects the account. The public LIVE orderbook requires a Base mainnet Quip account, so is unsuitable for a real testnet trade. A legacy-account workaround failed in the browser wallet: the site's transaction to `0x4a5a444f3b12342dc50e34f562dffbf0152cbb99` was rejected with `Transaction had invalid fields: {'to': ...}` before broadcast. The independent taker address has not arrived. BaseScan was unavailable; Blockscout worked. A third-party September tutorial describes swap creation using account v1.0.0, while the current account wizard offers v1.1.0 and v0.0.0 (legacy), with no clear migration/support guidance.

Top five vendor changes that would help:
1. Fix and end-to-end test the Base Sepolia offer Send Asset picker for v1.1.0 Quip Accounts, including funded native ETH and ERC-20s; display actionable load errors rather than `No asset on this network`.
2. State precisely which account versions/chains the swap app and orderbook support; keep version selection and swap flows compatible, and provide a v1.0.0-to-v1.1.0 migration path or clear warning before users deposit.
3. Publish a current two-person Base Sepolia swap walkthrough (account setup, funding, partner Quip Account address, maker/taker confirmations and delays, exact contract/explorer links), rather than the generic node/key quickstart.
4. Fix network switching and transaction construction: don't silently request mainnet during testnet onboarding; synchronize state across tabs; checksum/normalize factory `to` addresses and show concise transaction errors.
5. Offer an integrated wallet-to-Quip-Account deposit flow and a real Base Sepolia test orderbook/offer sandbox, so users can fund, test and publish without external scripts or mainnet prompts.
