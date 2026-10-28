
## Pages 53-53: DuckDuckGo — opensea assets search
- Screenshot: 0053.png
- Query: opensea.io/assets/ethereum "quantum echoes"
- Result 2 URL read via qb url: https://opensea.io/item/ethereum/0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a/120418
- -> Quantum Echoes contract on Ethereum mainnet: 0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a

## Pages 54-56: Etherscan QuantumEchoes (mainnet, read-only)
- Screenshots: 0054.png - 0056.png
- URL: https://etherscan.io/address/0x5a5c9c3cd186d95eff4da56ce48a173c7e46455a#code
- Verified source, Minimal Proxy, implementation 0xf898834E...540b44cF4, compiler v0.8.36.
- Imports visible: IQRNBilling, IQRNDDispenser, IQRFConsumer, IWalletFactory, QuantumEchoesStorage.
- Source copy (element 41) only returns the visible viewport (10 lines) — qb copy limitation.

## Pages 57-61: GitHub/GitLab QuipNetwork org
- Screenshots: 0057.png - 0061.png
- DuckDuckGo found github.com/QuipNetwork (actually renders GitLab-style org page: gitlab.com/quip.network).
- 40 public repos: quip-miner, quip-miner-cpu/cuda/dwave, quip-solver-core, xquad, etc. All mining/solver stack.
- Search q=qvrf -> "0 repositories". No QVRF/contracts repo published.

## Pages 62-74: Etherscan QuantumEchoes — ABI + Read tab
- Screenshots: 0062.png - 0074.png
- ABI copied (element 10, 33KB) to ./quantumechoes-abi.json — FULL QVRF consumer interface recovered:
  - function requestSeed(uint256 tokenId, bytes32 challenge, bytes32[] rareProof, address wallet)
  - function fulfillRequest(uint256 requestId, bytes32[] randomWords)
  - function claimSeed(uint256 tokenId), consumerChallenge(uint256 id), seeds(uint256 id)
  - function spentSeeds(bytes32 seed), servingDispenser(uint256 tokenId), requestToToken(address,uint256)
  - events: SeedRequested(tokenId, requestId, dispenser, requester, consumerChallenge)
           SeedPulled(tokenId, requestId, claimer), SeedRequestReset(...)
  - errors: NotAwaitingMeasurement(requestId, tokenId), SeedNotClaimable(requestId, dispenserStatus),
           UnexpectedWordCount(requestId, wordCount, expectedWordCount), UnknownRequest(requestId, caller),
           AlreadyRequested(tokenId), SeedAlreadySpent(bytes32), ZeroSeed, CallbackGasLimitOutOfRange
- Read-as-Proxy tab opened (#readContract) but function rows are NOT exposed to qb element numbering
  (probed 10-48: only chrome elements addressable). Dispenser address not readable via UI; worked around via ABI.

## Terminal: testnet proof-of-work
- qb keygen ./keys/wallet.key -> 0xcf29AB2B6A5dfD3826e607FefE031248b473AfB0 (address only; key never printed)
- Faucet: POST https://faucet.aglais.quip.network/request {"dest": "0xcf29..."} ->
  {"amount":10000000000000, "extrinsic_hash":"0x838ea5338088adca1ab8b2f7b053e1b9ae9f72c4b8d47bb7bf54acceb2606a2a"}
- eth_getBalance -> 0x8ac39585e5218000 (funded), nonce 0, gasPrice 0x3b9aca00 (1 gwei)

## Pages 75-76: Explorer verification of deployed contracts
- Screenshots: 0075.png, 0076.png (Blockscout UI rendered slowly / as skeleton — API used instead)
- API /api/v2/addresses/0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a ->
  creation_status success, is_contract true, has_logs true, creator 0xcf29...AfB0
- API /api/v2/addresses/0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666 -> creation_status success

## Terminal: example built + deployed + exercised on Aglais
- forge 1.5.1-stable available locally. foundry.toml -> rpc_endpoints.aglais.
- Contracts written: example/src/IQVRF.sol (IQVRFConsumer + IQVRFDispenser interfaces,
  reverse-engineered from the QuantumEchoes ABI), MockQVRFDispenser.sol (test-only coordinator),
  LootDrop.sol (game consumer: requestLoot -> fulfillRequest -> weighted rarity roll).
- Compile: fixed `function ()` -> `receive()` for solc 0.8.24. forge build OK.
- forge create --private-key $(cat ../keys/wallet.key) (key never printed):
  - MockQVRFDispenser -> 0x3E7aF8d69B90Dd4fCaE5aef303BF67c598460666
    tx 0x0f45ff5571aa0a216a35274c67af2ae0b12d1144d9ca081fe6f79b8f398b6b96
  - LootDrop(dispenser=0x3E7a...) -> 0x6c13051F87e568A25a9a5e27a2e862bF2bE7213a
    tx 0xdcfddb930b5cc72d4d4cca134ecc584eae4e161f3915b8817cb9e41338062549
- Flow exercised (run-demo.sh):
  - requestLoot() tx 0x70532a5b7813c7239e1e904f4b6520ffd87fab730da9195b6aca0641473ae680 (status 0x1)
  - fulfillAuto(1) tx 0x630ee87e9ba59eb15b8e2237f5e48061a74548e4864cf35b4afc43a5d4d6e0b7 (status 0x1)
  - getDrop(1) = (1, 0xcf29...AfB0, rarity=1 Uncommon, seedWord=6532...e76, rolled=true, pending=false)
  - LootRolled event at block 417715
  - Second run: request tx 0x994a302febb054cc7b738916ec4c91c52f2b16e03c74ec160a168dfb47fc69f5,
    fulfill tx 0x397e3e32f561f7d7c8a99969aea2e908792b391b074d8fc57965def090778239,
    getDrop(3) = rarity 0 (Common), rolled=true
- Script bug fixed: parsing "[1, 2]" array output -> tr/tail to take last element.

## Terminal: npm/PyPI randomness packages
- npm view @quip.network/quip-randomness -> 404; @quip.network/qvrf -> 404.
- npm search quip.network: only hashsigs, arch-sdk, pqhybridsign.
- ethereum-sdk@beta v0.3.0-beta.8: grep found no requestRandomness/fulfillRandom/QVRF anywhere;
  CHAIN_IDS = {MIDL_TESTNET:777, ETHEREUM:1, SEPOLIA, BASE, BASE_SEPOLIA:84532, OPTIMISM(_SEPOLIA)} — no 20033.
