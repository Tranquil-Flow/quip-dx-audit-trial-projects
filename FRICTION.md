# FRICTION.md — moments a real dev would be confused / misled / stuck

1. **Dead official docs link (homepage AND blog)**
   - URL: https://quip.network/ (and https://quip.network/blog/testnet-is-live)
   - Element: "Read the Docs" button → `https://quip.gitbook.io/docs/`
   - Expected: the documentation.
   - Happened: GitBook 404 "page not found" — both with and without trailing slash.
   - Cost: ~8 min of searching before finding developers.quip.network via a third search. The correct host appears nowhere on quip.network; I only found it through a search-engine result. (agls.quip.network does link it, but you have to find agls.quip.network first.)

2. **Near-name-collision with another chain**
   - URL: https://docs.qu.ai/build/networks (from search result for "Quip Network docs")
   - Element: search title "Chain ID - Introduction - Quai Network Docs"
   - Expected: Quip docs. "Quai" ≈ "Quip" in snippets. 
   - Happened: it's a totally different chain. Easy to waste time here if you're skimming.
   - Cost: ~1 min (caught it), but a real trap for the inattentive.

3. **Docs have no EVM/Solidity deployment content at all**
   - URL: https://developers.quip.network/docs/getting-started/quickstart
   - Sentence: "Right now there's not much to do other than mine blocks, generate some quantum-resistant keys … but we are building out the smart contract layer so you can take advantage of the quantum computers too."
   - Expected: since the testnet exposes an EVM JSON-RPC with a Blockscout explorer, some page about deploying contracts.
   - Happened: grepped the entire 113KB llms-full.txt — zero mentions of foundry/hardhat/deploy for their own chain; the only "solidity" hits are the WOTS+ hashsigs library. I had to invent the workflow (standard Foundry + their RPC) and hope pallet-revive accepts solc 0.8.21 output. It did, but nothing told me it would, or which EVM revisions are unsupported.
   - Cost: ~10 min of doc archaeology + uncertainty through the whole deploy.

4. **RPC port contradiction between two official pages**
   - URL A: https://agls.quip.network/ — "Public JSON-RPC https://evm-rpc.aglais.quip.network:20049"
   - URL B: https://developers.quip.network/llms.txt — "EVM JSON-RPC: https://evm-rpc.aglais.quip.network over HTTPS on port 443"
   - Expected: one canonical URL.
   - Happened: both actually work (I verified eth_chainId on each), but a careful dev burns time proving that to themselves.
   - Cost: ~2 min.

5. **"Chain ID 20033 is reused by the retired network" warning is buried in llms.txt**
   - URL: https://developers.quip.network/llms.txt
   - Sentence: "Identify the chain by THIS [genesis hash]. Not by the EVM chain ID, which is 20033 on both this network and the retired one that preceded it"
   - Expected: that caveat on the testnet page where the chain ID is given.
   - Happened: it's only in the machine-readable index. Wallet devs adding the network have no way to know they might be pointed at a dead chain.
   - Cost: 0 for me (both worked), but a support-ticket generator for them.

6. **Faucet page says the endpoint "refuses browser calls" with no error shown**
   - URL: https://agls.quip.network/
   - Sentence: "The endpoint refuses browser calls, so run the curl from a terminal or a server."
   - Expected: — actually this was well documented, including the exact curl. Genuinely fine.
   - Happened: worked first try, 10 AGLS, EVM address accepted, instant.
   - Cost: 0. (Listed to show what good looks like.)

7. **Balance reads "one existential deposit low"**
   - URL: https://agls.quip.network/
   - Sentence: "Balances read one existential deposit low, so confirm exact amounts on the substrate side."
   - Expected: 10 AGLS after the faucet; `cast balance` shows 9.999.
   - Happened: exactly as documented, but it's still unnerving when your fresh faucet money looks short. One line explaining WHY (ED withheld on the substrate side) would prevent double-tapping the faucet.
   - Cost: ~1 min.

8. **forge create silently dry-ran**
   - URL: n/a (local tooling), triggered because docs never show a deploy command.
   - Element: "Warning: Dry run enabled, not broadcasting transaction"
   - Expected: deploy.
   - Happened: forge 1.5.1 needs --broadcast on forge create. First run printed a giant tx object that *looks* like success.
   - Cost: ~2 min.

9. **Node gas numbers are nonsense-looking**
   - URL: https://evm-rpc.aglais.quip.network (eth_estimateGas)
   - Element: deploy gas estimate 0x2f25b1fc ≈ 791,000,000; explorer later reports gas_used 790,996,446 for a 3.9KB ERC-20, while `cumulativeGasUsed: 0`.
   - Expected: ~1.2M gas for this contract on any normal EVM chain.
   - Happened: transaction succeeded, contract works, but every gas figure on this chain (estimates, receipts, the 0.88 gwei "gas prices" array) is inconsistent. No docs explain pallet-revive's gas metering differences. Also total_gas_used on the whole network shows 0 while my tx alone used "790M".
   - Cost: ~5 min of "is this broken?" checking + lingering distrust of anything gas-related here.

10. **Blockscout SPA not usable via simple fetch; v2 contracts endpoint misdocuments itself**
    - URL: https://explorer.aglais.quip.network/api/v2/contracts
    - Element: `{"message":"Params 'module' and 'action' are required parameters"}`
    - Expected: the documented Blockscout v2 list.
    - Happened: that path behaves like the legacy ?module= API. Worked around with `?module=contract&action=listcontracts`. Explorer pages themselves are client-rendered (fine in a real browser; my headless one was broken — local issue).
    - Cost: ~3 min.

11. **Search engine gaps around the brand**
    - URL: n/a (DDG via web_search)
    - Element: "No results found" for "quip.gitbook.io docs Quip Network" and "Quip Network EVM smart contract Solidity deploy" — both real queries.
    - Happened: transient engine failure; rephrasing fixed it. Not vendor's fault, but combined with the dead GitBook link it made minute 10-15 feel like the network might not have public docs at all.
    - Cost: ~3 min.

12. **Homepage claims EVM support, docs never say what "EVM" means here**
    - URL: https://quip.network/ FAQ — "The Asset Layer sits on top of existing chains, including Ethereum (EVM)…"; agls.quip.network — "Backend: pallet-revive".
    - Expected: a compatibility table (which EVM opcodes/precompiles, which solc versions, London/Berlin gas semantics, contract size limit).
    - Happened: nothing published. If my contract had failed, I'd have had zero official guidance to debug against (polkadot-sdk's revive docs would be the only reference, unlinked).
    - Cost: 0 in the happy path, unbounded in the unhappy path.
