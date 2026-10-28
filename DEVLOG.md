# DEVLOG — Quip Network (Aglais) EVM testnet: deploy + exercise a Counter contract

Session date: 2026-09-28. Machine: macOS (Apple Silicon). Working dir: /private/tmp/devtrials2/t06-deepseek-v4-flash
Goal: deploy a trivial Solidity `Counter` (increment(), public count) to Quip Network's EVM-compatible
testnet, script an increment + read-back, and document the MetaMask network-add flow.

---

## 1. Source/reconnaissance log (in order)

1. Web search: `Quip Network EVM testnet`
   -> press releases (PRNewswire, Yahoo Finance, Quantum Insider). Learn: Postquant Labs builds
      Quip.Network; testnet launched 2026-04-02; code on GitHub/GitLab. No RPC details in press.
2. Web search: `Quip Network blockchain RPC faucet testnet chain id`
   -> HIT: `https://chainlist.org/chain/20033` "Aglais Testnet (Quip Network)".
   -> Also `https://github.com/QuipNetwork/nodes.quip.network` (node operator repo).
   -> Noise: `https://thirdweb.com/q-testnet` (chain 35443) is a DIFFERENT project called "Q",
      not Quip. Ignored. Also QuickNode's generic faucet listing, irrelevant.
3. Web extract: chainlist.org/chain/20033 -> chainId 20033 (0x4e41), currency AGLS,
   explorer explorer.aglais.quip.network. RPC rows are JS-rendered, so the page itself did not
   show the RPC URL — I had to get it from ChainList's raw JSON (step 6).
4. Web extract: https://quip.network/ -> official site. Rumoured docs at quip.gitbook.io/docs.
5. Web extract (batch): quip.gitbook.io/docs, github.com/QuipNetwork/nodes.quip.network,
   faucet.aglais.quip.network
   -> quip.gitbook.io/docs -> 404 "Content owner not found". The link on quip.network's own
      homepage is DEAD. Dead end.
   -> faucet.aglais.quip.network -> 404 on GET (it's a POST-only API — see step 11).
   -> nodes.quip.network README -> KEY INFO: the testnet was relaunched 2026-09-02 as "Aglais"
      with fresh genesis; runtime 117, tx version 7, token AGLS; genesis hash
      0x59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286;
      faucet https://faucet.aglais.quip.network. The repo is about running a NODE
      (substrate validator + miner + dashboard), not about EVM app development.
6. Terminal: fetched data.quip-style ChainList raw JSON `https://chainlist.org/rpcs.json`,
   filtered for chainId 20033 -> **RPC: https://evm-rpc.aglais.quip.network:20049**,
   nativeCurrency AGLS/18 decimals, isTestnet true, explorer Blockscout (EIP3091).
   (This is the authoritative-looking community entry; ChainList is community-maintained so I
   treated it as a lead, not as canon, and verified it directly against the chain — see step 8.)
7. Terminal: HTTP probe of candidate doc hosts. Found:
   -> https://docs.quip.network -> 200, real docs site ("Welcome to Quip Network").
   -> https://aglais.quip.network -> 200, the official testnet page with the full chain table.
   -> https://quip.network/docs -> 404; https://rpc.aglais.quip.network -> no DNS/000.
8. Terminal: JSON-RPC probe of https://evm-rpc.aglais.quip.network:20049 (curl, no wallet):
   eth_chainId -> 0x4e41 (=20033) CONFIRMED
   net_version -> 20033
   eth_blockNumber -> 0x5b818 (374808) — chain is live
   eth_gasPrice -> 0x3b9aca00 (1 gwei)
   web3_clientVersion -> eth-rpc/HEAD-f17113f/x86_64-unknown-linux-gnu/rustc1.95.0
   -> ChainList entry verified against the real chain. RPC is genuine.
9. Web extract (batch): https://docs.quip.network and https://aglais.quip.network
   -> docs.quip.network = the product docs (compute jobs, post-quantum accounts, node running).
   -> aglais.quip.network = THE authoritative network facts. Quoted directly:
        EVM public JSON-RPC : https://evm-rpc.aglais.quip.network:20049
        Chain ID            : 20033 (0x4e41)
        Token               : AGLS, 18 decimals
        Gas price           : 1 gwei
        Network name        : Aglais Testnet (Quip Network)
        Backend             : **pallet-revive**   <-- important, see §4
        Explorer            : https://explorer.aglais.quip.network (Blockscout)
        Faucet              : POST https://faucet.aglais.quip.network/request {"dest": "..."}
                              -> 10 AGLS/request, rate-limited per destination
                              -> "The endpoint refuses browser calls, so run the curl from a
                                 terminal or a server."
        Caveats stated by the vendor: HTTP transport only (no WebSocket), **no pubsub and no
        filter API**, internal txs and gas tracker unavailable, and EVM balances "read one
        existential deposit low".
      Also noted: Aglais substrate side is wss://bootnode-{1,2,3}.aglais.quip.network:20049/rpc,
      SS58 prefix 42, AGLS on that side has **12** decimals vs **18** on the EVM side.
10. Terminal: `https://developers.quip.network/docs/llms.txt` (200) -> complete list of doc pages.
    Grepped it: there is **no EVM / Solidity / smart-contract-deployment page at all**. The docs
    index covers compute jobs, post-quantum accounts, QuipSwap, nodes, tokens. So the vendor does
    NOT document deploying a contract to their own EVM testnet. This is the single biggest doc gap
    hit in this task. (See §7.)
    `https://developers.quip.network/sitemap.xml` -> 404. `llms-full.txt` also exists (200).
11. Terminal: faucet call — this is the flow the vendor documents:
      curl -X POST https://faucet.aglais.quip.network/request \
        -H 'content-type: application/json' -d '{"dest":"<address>"}'
    Response: {"amount":10000000000000,"dest":"0x422b...BA8e",
               "dest_account":"0x422b638df9ec9a6085cdfb999c049ed11af5ba8eeeeeeeeeeeeeeeeeeeeeeeee",
               "extrinsic_hash":"0x7132f1cd3af3c6c22823a4fda80289962d640ecb6a2082d1f10ba95bea332cd1"}
    -> amount 10000000000000 = 10 * 10^12 = 10 AGLS at the SUBSTRATE 12-decimal scale.
    -> Note the mapped `dest_account`: substrate AccountId = 20-byte EVM address ++ 12 zero bytes
       (0xee...ee is the substrate padded suffix). Useful detail for anyone reconciling
       EVM vs substrate views of the same address.
12. Terminal: Blockscout API recon BEFORE deploying (deliberate, to find out whether anyone else
    has deployed a contract here and with which compiler):
      /api/v2/smart-contracts?filter=verified -> {"items":[]}  (ZERO verified contracts)
      /api/v2/stats -> total_transactions: 58, total_addresses: 43, total_blocks: 374628,
                       gas_prices slow/average/fast = 0.88 gwei, block time ~6.06s
    -> The EVM side of this testnet is essentially EMPTY. 58 transactions, 43 addresses, no
       contract has ever been verified. So there is no prior art to copy, and any contract
       deployment is very likely among the first on this chain. This reframes the task: the risk
       is not "will it cost too much", it is "has the toolchain path ever been exercised".
13. Web extract: https://developers.quip.network/docs/getting-started/quickstart.md
    -> Confirms the official "what can I do today" story is: run a node, generate post-quantum
       keys. Quote: "Right now there's not much to do other than mine blocks, generate some
       quantum-resistant keys ... but we are building out the smart contract layer".
       So EVM contract deployment is, by the vendor's own admission, not yet a supported/
       documented developer flow. Recorded as an expectation-setter, not a blocker.

## 2. Local environment (what was already present vs installed)

    node    v22.22.2 (via nvm)
    npm     present
    python3 3.9.6 (system, Xcode)
    forge / cast from Foundry 1.5.1-stable (commit b0a9dd9c, built 2025-12-22) — ALREADY INSTALLED
    git     /usr/bin/git
Nothing needed to be installed to get to a deployment. Foundry was used as the primary toolchain
because it gives compile + sign + send + encode in one binary with no npm dependency tree.

## 3. Key generation (throwaway only)

Rule followed: brand-new keys, this machine's existing wallets never touched, no mainnet.

    mkdir -p keys && chmod 700 keys
    cast wallet new --json    # stdout JSON, private key written nowhere but our own file

  Deployer (throwaway, testnet-only):
    address      0x422b638Df9ec9A6085cdFb999C049ed11af5BA8e
    private key  keys/deployer.json  (chmod 600, dir chmod 700)

  DEAD END / mistake to record: the obvious-looking `cast wallet new ./keys --json` does NOT
  print a JSON key to stdout and does NOT create a populated keystore under that path — it
  created a 0-byte file `keys/counter-deployer.json`. I removed the empty file and instead ran
  `cast wallet new --json` (no path) and wrote the JSON to `keys/deployer.json` myself, then
  chmod 600. Verified the key by re-deriving the address: `cast wallet address --private-key $PK`
  -> 0x422b638Df9ec9A6085cdFb999C049ed11af5BA8e. Matches.

## 4. Expected risk: backend is `pallet-revive`

The testnet page states the EVM backend is **pallet-revive**, Polkadot's successor to
pallet-evm. `web3_clientVersion` also returns a Frontier-style `eth-rpc/HEAD-...` string.
`pallet-revive` is moving toward executing PolkaVM (PVM) bytecode rather than raw EVM bytecode,
which in the worst case means stock `solc` EVM bytecode will be rejected at deployment and the
correct compiler is Parity's `resolc` (Revive Solidity compiler). The vendor documents neither
path. Plan: try plain solc/EVM bytecode first (cheapest, most standard); if the chain rejects it,
fall back to resolc -> PVM. This guess/decision point is recorded here before the fact.

>>> OUTCOME: THIS GUESS WAS **WRONG**. See §6. The cause of the failure had nothing to do with
>>> PVM/bytecode format. Recording it here as a real, costly dead end.

## 5. First deployment attempts — all failing, and MISLEADING errors

Local toolchain: Foundry already installed, so `forge create` was the obvious first move.

    forge create src/Counter.sol:Counter --rpc-url $RPC --private-key $PK --broadcast -vvv
    -> Error: contract was not deployed

Not enough information. Re-ran with -vvvv:

    -> Error: server returned an error response: error code 1013: Transaction Already Imported

Confusing: the FIRST invocation had actually got its tx into the pool, and the retry re-signed the
same nonce so the pool rejected the duplicate. But `cast nonce` was still 0 and Blockscout showed
NO transaction from my address, and there is no `txpool_*` RPC on this node
(`txpool_status` -> "Method not found"), so I could not inspect the pool. Detection of "is my tx
mined" had to go through cast nonce + the Blockscout API.

Also worth noting: `cast wallet new ./keys --json` had already burned a turn earlier (§3), and a
`cd /tmp` for an npm install silently changed the session cwd, so a later `forge inspect` failed
with "Could not find source file for contract `Counter`". From that point on I used absolute
paths / explicit workdir. Self-inflicted, but it cost a couple of round trips.

Switching to explicit `cast send --create` (which prints the receipt instead of swallowing it):

    cast send --rpc-url $RPC --private-key $PK --legacy --gas-price 10gwei \
      --nonce 0 --gas-limit 3000000 --create "$BYTECODE"

    -> mined in block 374842, status 0 (FAILED), gasUsed 2,328,153,
       contractAddress 0x41402234f6A8dc6F400A9aDAC1062C981A654ecb

Note also: `cast send --create <CODE> --rpc-url ...` (flags AFTER the positional) is rejected with
"unexpected argument '--rpc-url'" — the flags must come first. Another small foot-gun.

Observations that misled me:
* gasUsed was 2,328,153 for a 607-byte contract — absurdly high for plain EVM.
* Retrying with a bigger gas limit (10M, then 50M) changed nothing: gasUsed stayed pinned at
  ~2,329,509 and status stayed 0. So NOT a simple out-of-gas.
* `cast run <failed tx>` executed the same transaction against a LOCAL pure-EVM implementation and
  reported SUCCESS: "[114959] -> new @0xD0B5A5... [Return] 574 bytes of code ... Gas used: 176829".
  That is the single most misleading signal in this whole task: local EVM says fine, the chain says
  failed. It is exactly what pushed me to the (wrong) "the chain must not run EVM bytecode" theory.

Evidence chain that actually cracked it (I had to go to debug tracing, not docs):
    debug_traceTransaction(callTracer) on the failed tx gave:
      "error": "StorageDepositNotEnoughFunds"
    pallet-revive charges a STORAGE DEPOSIT for the contract code, and the created contract account
    (which had 0 balance, because I sent value=0) could not cover it.

## 6. DEAD END — the resolc / PolkaVM detour (wrong hypothesis, ~15 min)

Acting on the §4 prediction I installed and ran Parity's Revive compiler:

    npm install -g @parity/resolc          # -> @parity/resolc 1.4.0, resolc 1.4.0+commit.ca3c770.llvm-22.1.5
    resolc --bin --optimize -o out-resolc src/Counter.sol
      -> error: unknown option '--optimize'
    resolc --bin --abi -o out-resolc src/Counter.sol
      -> out-resolc/src_Counter_sol_Counter.polkavm  (3525 bytes, magic bytes "PVM\0")
         out-resolc/src_Counter_sol_Counter.abi

    cast send ... --gas-limit 100000000 --create 0x<polkavm-hex>
      -> "Error: transaction was not confirmed within the timeout"

The PolkaVM blob (3.5 KB, 7052 hex chars) got into the tx pool ("Transaction Already Imported" on
re-send) but was NEVER included in a block, and it then occupied nonce 3 and blocked anything else
at that nonce. I eventually cleared it by sending a *different* transaction at the same nonce with a
much higher gas price (100 gwei), which the pool accepted as a replacement.

CONCLUSION: resolc/PolkaVM was a wrong turn. This chain DOES execute ordinary solc EVM bytecode.
The 3.5 KB blob also never landed, so its size may or may not be a factor — I did not chase it,
because by then the real cause was known. `out-resolc/` is left in the tree deliberately as
evidence of the dead end; it is not used by any shipped script.

## 7. The actual fix — a giant, deliberate gas limit, and value = 0

Diagnostics that pointed at gas:

    eth_estimateGas  {from, data: <creation bytecode>}            -> 0x2baef5ed = 732,491,757
    eth_estimateGas  {from, data: <creation bytecode>, value: 1e18} -> error "execution reverted"

So the node itself was telling me ~732 MILLION gas was needed, and that attaching value actively
breaks the call. Two experiments at that scale:

  A) gas-limit 800,000,000, value = 0      -> SUCCESS (status 0x1), gasUsed 732,883,407
  B) gas-limit 800,000,000, value = 1 AGLS -> FAILED  (status 0x0), gasUsed 2,328,754

**The working recipe: send value = 0 and a gas limit of ~750M+.** pallet-revive's eth-rpc converts
the contract's storage deposit into gas, so the deposit is paid *as gas by the sender*, not as a
balance transfer to the contract. Any `value` on the create makes the deposit logic revert.

### RESULT OF DEPLOY
    contract address : 0x51ddad71d1a185ec51e2451e7da3267ccf976bf4
    deploy tx hash   : 0x4b692fb8a5a2ff947f6f624ef625a3e9e76add8d3d837602af229befca9813ec
    block            : 374903
    gasUsed          : 732,883,407
    explorer         : https://explorer.aglais.quip.network/address/0x51ddad71d1a185ec51e2451e7da3267ccf976bf4

Failed attempts kept for the record (all status=error on the explorer):
    0x23b092df9fed003c9cbe97030d1157f4ddd8aa71839576f8394c3ad93369afaa  value 0,  gas 3M   -> StorageDepositNotEnoughFunds
    0x9347459212a9432002a11ea44bd7561ba156a51e7512f82b1304f8d6465464f4  value 0,  gas 10M  -> same
    0x0247184f4e5ae28018c7a9e1d74b2fe04c2c082d31b8d0186410475b47e05578  value 0,  gas 50M  -> same
    0x018dc3db19d85aa41472be86e1ae7a9372bde0055a8bed62bcac39a70fc8a66f  value 1e18, gas 3M -> OutOfGas
    0xa083912d94be886e14bdbade169e0b2e8623d1656bfefdcbf228389913a67fa6  value 1e18, gas 50M -> execution reverted
    0xfb53a64f5933a0537cc808aa7f653e8cb8d81dc7ba926db872783125c4b2538e  value 1e18, gas 800M -> reverted

## 8. Exercising the contract

    cast call  $C "count()(uint256)"   -> 0
    cast send  $C "increment()"        -> 0x5dc882ca1beb64ff58cac406780df48e380093b683b723e296d981712160df59
                                          status 0x1, gasUsed 4,678,170, block 374907
    cast call  $C "count()(uint256)"   -> 1
    cast send  $C "increment()"        -> 0x9b1cb68ae874822d6494b6396276028ea2ef0af22fe747363fd3b46b7a3964f6
                                          status 0x1, gasUsed 2,038,182, block 374908
    cast call  $C "count()(uint256)"   -> 2
    ./scripts/increment.sh             -> 0x0e0c317fc6ad731880344d23b8efc99f0584a034724456c9329bb06c0ee70a90
                                          status 0x1, gasUsed 2,038,182, block 374913, count 2 -> 3

Note the gas asymmetry: the FIRST increment costs ~4.68M because it allocates a fresh storage slot
(another storage deposit); subsequent increments are ~2.04M. A 30M gas ceiling in the scripts covers
both comfortably.

Independent verification (so I am not just trusting my own tooling):
    eth_call  count()                    -> 0x...03  (= 3)          [raw curl, no Foundry]
    eth_getCode                          -> 574 bytes of code
    Blockscout /api/v2/addresses/$C      -> is_contract true, creation_status "success",
                                            creator_address_hash 0x422b638D...BA8e
    Blockscout tx list for the deployer  -> deploy "ok" + 2 increments "ok" + 6 failures "error"

## 9. Cross-checking the network/account facts

    EVM balance after the 10 AGLS faucet drip : 9.999 AGLS (9,999,000,000,000,000,000 wei)
      -> matches the vendor's own warning that "balances read one existential deposit low".
    Faucet `dest_account`
      0x422b638df9ec9a6085cdfb999c049ed11af5ba8eeeeeeeeeeeeeeeeeeeeeeeee
      -> the EVM address with 12 zero-bytes... actually 0xee padding appended. Substrate-side
         AccountId for a 20-byte EVM address. Worth knowing when reconciling the two explorers.
    Total network EVM activity when I started: 58 transactions / 43 addresses, 0 verified contracts.
      After my work the deployer account alone accounts for 10 transactions on this chain, i.e. a
      meaningful fraction of ALL EVM traffic this testnet has ever had. Expected: the EVM side was
      only launched alongside the Aglais relaunch on 2026-09-02 and appears barely used.

## 10. Things I had to guess / work around (summary)

1. The RPC URL was NOT in the vendor docs I could find; I took it from ChainList's raw JSON and then
   verified it against the live chain (eth_chainId) before trusting it.
2. The vendor publishes NO "deploy a contract to our EVM" guide at all (§1.10). Every step below the
   RPC URL — gas limit, value, toolchain — was reverse-engineered from failed txs and debug traces.
3. The error strings ("contract was not deployed", status 0 with no reason) are not actionable;
   the actual cause was only visible via debug_traceTransaction with the callTracer.
4. `cast run`'s local EVM simulation disagrees with the chain. Do not trust it here.
5. I incorrectly assumed the PVM/bytecode format was the problem and spent ~15 minutes on resolc.
6. Pinning `solc_version = 0.8.24` and `evm_version = "paris"` in foundry.toml was a precaution
   against newer opcodes (e.g. PUSH0). It may not have been necessary; I did not A/B it.
7. `cast wallet new <dir> --json` did not do what its name implies (see §3).

