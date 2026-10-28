# FRICTION — Quip Network testnet onboarding

Every moment a real developer would be confused, misled, stuck, or annoyed.
Each entry: URL, what the screen showed (quoted), what was expected, what
actually happened.
### F1. Aglais EVM JSON-RPC URL mentions port 20049 in docs
- URL: https://agls.quip.network/ (0017.png)
- What screen showed: "EVM PUBLIC JSON-RPC: https://evm-rpc.aglais.quip.network:20049" and chain ID 20033
- Expected: 20033 (the chain id) = port number on the RPC URL
- What happened: It's actually 20049, not 20033. A naive developer wiring up Foundry with chain id 20033 would assume the RPC URL ends in :20033. The docs don't explicitly call out that the chain id (20033) and the RPC port (20049) are intentionally different — or maybe 20049 is the substrate RPC and the EVM one is different. Need to verify with an actual eth_chainId call.

### F2. qbrowse README says chain 20033 maps to evm-rpc.aglais.quip.network
- The browser wallet daemon enforces only two chains (20033 Aglais, 84532 Base Sepolia).
- The Aglais landing page advertises the EVM RPC URL as :20049.
- These can both be true if the RPC server accepts both, or if the daemon just hardcodes the hostname without the port. Worth probing to see which port actually serves JSON-RPC.

### F3. Faucet response uses a different address format ("dest_account" has an EVM-suffix)
- URL: faucet.aglais.quip.network/request
- What screen showed: returned JSON with both "dest":"0x951E..." and "dest_account":"0x951e...eeeeeeeeeeeeeeeeeeeeeeee"
- Expected: Either single address or two interchangeable forms
- What happened: The "dest_account" is a substrate-format EVM-mapped address (the 0x... value, lowercased, followed by "eeeeeeeeeeeeeeeeeeeeeeee" — i.e. 24 'e's appended as the substrate-mapping convention). The wallet address itself doesn't change on the EVM side, but the substrate balance is held in the mapped account.
- A naive developer who reads "dest_account" might assume it has a different ETH address and look for funds at the wrong place. The docs should call out the dual representation up front.

### F4. RPC port mismatch in docs
- The Aglais landing page says "EVM PUBLIC JSON-RPC: https://evm-rpc.aglais.quip.network:20049".
- The chain id is 20033.
- Probing the bare host (:443 implied), :20033, :20049 — all return eth_chainId=0x4e41. So the EVM RPC is reachable on multiple ports (likely a TLS load balancer / reverse proxy). A Foundry developer who copy-pastes ":20049" will work; a developer who assumes :20033 (= the chain id) will also work; a developer who assumes :8545 will time out.

### F5. Explorer subdomain doesn't match (agls vs aglais)
- URL in docs: https://explorer.agls.quip.network/ (0030.png on agls.quip.network)
- Actual working URL: https://explorer.aglais.quip.network/ (DNS lookup: the first doesn't resolve)
- A developer copying the docs URL gets DNS NXDOMAIN and gives up. The docs and landing page both use the abbreviation "agls" but the live subdomain uses the long form "aglais".

### F6. Blockscout's tab URL param format is ?tab=txs not ?tab=transactions
- I tried both `?tab=transactions` and `?tab=txs` on the address page. `?tab=txs` switches to Transactions; `?tab=transactions` lands on Details.
- This is a Blockscout quirk, not a Quip issue. Worth noting for the protocol docs (they chose Blockscout) but mostly a developer-workaround thing.

### F7. Token-page "Holders" / "Transfers" header counts are stale
- Right after the third transfer, the token page header still said "Holders: 1 / Transfers: 1" even though the Holders tab correctly showed 2 holders and the Transfers tab listed 3 transfers.
- The data IS correct, the header numbers lag. A developer might believe their tx didn't land if they only glance at the header. The "scanning new token transfers..." indicator was visible just above the table on the Token transfers tab, which hints at indexer delay.

### F8. Quip docs have no Foundry/forge/cast page
- developers.quip.network covers Quip SDK (post-quantum), Ethereum SDK, run-a-node, swap, hashsig.
- None of those pages document `forge create --rpc-url ...` or `cast send` against Aglais.
- A Solidity developer has to reverse-engineer from the "EVM PUBLIC JSON-RPC" + chain id table on agls.quip.network. Works fine for someone familiar with EVM tooling, but the official docs have no "Deploy a Solidity contract" page.

### F9. Browser-wallet subdomain mismatch in qb
- qbrowse README says: "eth_sendTransaction fills in nonce/gas/fees via RPC, signs locally with eth_account, submits via eth_sendRawTransaction".
- We didn't end up needing the browser wallet for deployment because we ran cast/forge against the RPC directly. We DID use the browser wallet's chain 20033 context, but only passively. (Not strictly a friction point — the daemon works as designed — just noting that the easier path was to skip the wallet entirely.)

### F10. The explorer's Contract tab shows no Write Contract UI
- Even though the source is deployed, Blockscout only enables the "Write Contract / Read Contract" tabs after a contract is verified. This makes it impossible to send a contract write from the explorer itself; you must use cast/forge directly or write a dApp. Combined with F8, the only working path is `cast send`.

### F11. Faucet returns a "dest_account" with extra "eeeeeeeeeeeeeeeeeeeeeeee"
- The JSON response includes both a hex "dest" and a substrate-mapped "dest_account" with 24 'e' suffix. This is normal pallet-revive mapping, but it's not explained in any docs page I found. A first-time user might misread the suffix as a real account ID.
