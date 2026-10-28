# DEVLOG

## Initial setup
- Created throwaway key at ./keys/wallet.key
- Address: 0x050cBa620d21F77560BA99824C0c3B39Bf78AA46
- Started browser session `web-e2a8f8` on Quip Aglais testnet (chain 20033)

## Web research
- shots/0008.png: Google search "Quip post quantum account Aglais testnet"
  - AI overview mentions "Quip.Network / Postquant Labs Testnet" but no organic result link
- shots/0011.png: Google search "Quip blockchain post-quantum web app app.quip.network"
  - Top hits: Quickstart - Quip Network (GitBook), Quip Network Docs (https://developers.quip.network/docs/basics/key-properties)
  - Also: X/Twitter posts from @quipnetwork — QuipSwap is Live!
- shots/0012.png: developers.quip.network/docs/basics/key-properties (Key Properties page)
- shots/0016.png: developers.quip.network/docs/quip-interlock-protocol/quip-accounts
  - **Web app URL: account.quip.network** (element 19)
  - "Quip Network provides two clients for the same account: a browser extension and the web application at account.quip.network. They are two doors into one account, not two wallets. The account itself is the contract on chain."
  - Quip Accounts sign with hash-based one-time signatures, packaged in a construction called SHRINCS
- shots/0041.png: developers.quip.network/docs/getting-started/what-is-quip
  - **Two orthogonal layers**:
    1. Compute-Consensus Layer (Quip Network) - Nakamoto-style chain, proof-of-work
    2. Asset Layer (QUIP Account & Interlock) - post-quantum wrapper on any existing chain

## account.quip.network - web app not rendering
- shots/0017.png to 0045.png: account.quip.network renders a blank page consistently (just a chat bubble bottom-right)
- HTTP 200, title "QUIP Account" set, but JS-init content does not appear after waiting 60+ seconds
- shots/0107.png: After clicking the chat bubble (1) on the blank root, the app navigates to /connect and the UI finally appears. So the loader state is a 404-style blank page with a chat bubble that opens the actual app.
- shots/0108.png: After clicking "Connect Wallet" (3) on /connect, the wallet popup fires and a wallet list appears
- shots/0109.png: After clicking "Test Wallet" (10), the page navigates to /accounts/88c0b22fad92f592886fbf988808d007652384a992f053eec7328bff8a6f4ebc:v1.1 — Step 1 of 4: choose wallet version

## Found the official Quip Aglais faucet
- shots/0079.png: faucet README on gitlab.com/quip.network/faucet/-/raw/main/README.md
  - The faucet at `faucet.aglais.quip.network` exposes POST /request (returns 200+hash, mints & broadcasts), POST /sign (returns a signed extrinsic), GET /health
  - The README says the docker-compose file mounts `/api/faucet/*` to quip-faucet:8087 but the public URL serves the same at root `/request`, `/sign`, `/health`
- shots/0075.png: docker-compose.yml has the faucet at registry.gitlab.com/quip.network/faucet, listening on port 8087
- shots/0073.png: config.example.toml mentions faucet_url = "https://faucet.aglais.quip.network"

## Aglais faucet call succeeded
- Sent POST https://faucet.aglais.quip.network/request with my wallet address as dest
- Response: 200 OK
- Result: {"amount":10000000000000,"dest":"0x050cBa620d21F77560BA99824C0c3B39Bf78AA46","dest_account":"0x050cba620d21f77560ba99824c0c3b39bf78aa46eeeeeeeeeeeeeeeeeeeeeeee","extrinsic_hash":"0x016c59f555de94cfeeff2371d063bdec7fd5bc38309aa9de5208574f89264c40"}
- 10 UNIT (substrate plancks, 12 decimals)

## Aglais chain details
- shots/0083.png: aglais.quip.network
  - **Substrate RPC**: ws://127.0.0.1:9944
  - Network: quip-testnet (id: quip_testnet)
  - Token: AGLS, 12 decimals, SS58 prefix 42
  - Public RPC: wss://bootnode-{1-3}.aglais.quip.network:20049/rpc
  - Polkadot-JS: https://portal.aglais.quip.network/
  - **EVM JSON-RPC**: https://evm-rpc.aglais.quip.network:20049
  - **EVM chain ID**: 20033 (0x4e41)
  - EVM token: AGLS, 18 decimals
  - Backend: pallet-revive
  - Explorer: https://explorer.aglais.quip.network
  - Subscan: https://subscan.aglais.quip.network

## Aglais EVM balance
- curl https://evm-rpc.aglais.quip.network:20049/  → eth_getBalance 0x050c...46 = 0x8ac39585e5218000
- 9.999 AGLS (one existential deposit less than the 10 AGLS faucet gave me; the page warned "balances read one existential deposit low")

## Quip SDK source
- shots/0091.png: src/index.ts - QuipClient, QuipSigner, QuipWalletClient classes
  - QuipSigner manages Winternitz keypair from a quantum secret + vaultId
  - createWallet(vaultId, quipSigner) deploys via factory.depositToWinternitz
  - transferWithWinternitz for PQ transfers
- shots/0097.png: src/addresses.json
  - QuipFactory: 0x4a5A444F3B12342Dc50E34f562DfFBf0152cBb99
  - WOTSPlus: 0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991
  - Deployer: 0xF768b4E4A314C9119587b8Cd35a89bDC228290b5
  - BUT: eth_getCode returns 0x at all three addresses on Aglais EVM chain
  - **The QuipFactory is NOT deployed on Aglais** — only on Sepolia/Base/OP/BSC/etc
  - The ethereum-sdk's SUPPORTED_NETWORKS includes only Sepolia, Base, Optimism, Mainnet
- The ethereum-sdk README docs only describe Sepolia / Base Sepolia / Optimism Sepolia / Mainnet / Base / Optimism
- **No Aglais support in the npm-published ethereum-sdk**

## Switched web app to Base Sepolia
- shots/0109.png: After wallet connect, app is on Base mainnet (8453) by default
- shots/0110.png: Step 2 of 4 - "Which network should this account live on?" shows Base ($1.09) and Ethereum ($2.71) by default
- shots/0111.png: After "Show 3 more networks", 5 options: Base, Ethereum, Celo, Arbitrum, Base Sepolia
- **No Aglais option in the web app**
- shots/0113.png: Clicked Base Sepolia, wallet popup switched chain to 84532

## Base Sepolia funding
- shots/0120-0121.png: Alchemy Base Sepolia faucet requires Cloudflare Turnstile captcha
- shots/0123-0128.png: Searched for "no auth" faucets - Superchain Faucet needs sign-in, Google Cloud Web3 Faucet dropdown won't open
- shots/0129-0131.png: stablc.xyz is a payment API, not a faucet
- shots/0133-0142.png: Google Cloud Web3 Faucet page loads but the network dropdown won't open in the qb browser
- Wrote NEED_FUNDS.txt for Alchemy Base Sepolia faucet → got 0.02 ETH in wallet (the "person on our side" was fast)
- curl https://sepolia.base.org/ eth_getBalance = 0.02 ETH

## Created the Quip post-quantum account
- shots/0145.png: Step 1 - choose wallet version v1.1.0
- shots/0146.png: Click "Choose a network" (3)
- shots/0147-0148.png: Step 2 - pick Base Sepolia
- shots/0150-0153.png: Step 3 - generate a 64-hex passphrase
  - Dice button (4) didn't auto-fill, so I typed a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
  - Passphrase strength: Strong
  - Saved to ./.quip-passphrase
  - Click checkboxes (6, 7) - "I understand..." and "I have backed up..."
- shots/0156-0158.png: Step 4 - confirm passphrase
- shots/0159-0161.png: Create account
  - Wallet popup: send tx to 0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8 (QuipFactory on Base Sepolia), value 0
  - Tx hash: 0x34164eca7b4e364a993456caa45f6d0ca5c7a8b12f4866aba1eec0b911682e6a
  - URL changed to /accounts/001b1dbdfc891fcce7c39ca2f2c1ea369af4104e147759f015e25781f458ac1f:v1.1
  - Modal: "Your Quip Account is ready"
  - Account address: 0x4d4EB36078326d714b798fE3ca68e708CbB9d13b
  - Same address as the deposit / receive address

## Funded the Quip account
- scripts/deposit.py: signed an ETH transfer from owner to 0x4d4EB36078326d714b798fE3ca68e708CbB9d13b
  - tx hash 0xc46abc734410a4ed14635b24b49f9937f00519ceb593acc88d6fe53104d96c63
  - mined in block 47723162, gas 25810
  - Quip account balance after: 0.001 ETH

## Made a post-quantum transfer
- shots/0171-0172.png: Refresh balances (12) → 0.001 ETH
- shots/0173.png: Click "Send" (12) on the Ether row, opens "Send Ether" dialog
- shots/0174-0179.png: Cleared pre-filled recipient, typed new throwaway 0x54eE40EFC8DeCB05dab56FE988dC6100E99A9657
- shots/0230-0232.png: Amount 0.0001 ETH
- shots/0233.png: Fee estimate ≈ 0.000005574602 ETH
- shots/0234-0235.png: Clicked Send → wallet signed authorization message
- shots/0236.png: Transfer complete (modal closed, balance 0.0009 ETH)
- Verified on-chain:
  - eth_getBalance(0x54eE40EFC8DeCB05dab56FE988dC6100E99A9657) = 0x5af3107a4000 = 0.0001 ETH ✓
  - eth_getBalance(0x4d4EB36078326d714b798fE3ca68e708CbB9d13b) = 0x32d7ea34d18c0 = 0.000894446859 ETH
  - eth_getLogs: log in block 47738116 (0x2d86d44), tx 0x6938b0198bc3a30f61c7c97161477f6c408f4b4968b70a3387d29fd1a2737b8b, topic 0x7bdefd1b209c0563d77efe477b1cd3b61171d8aa528d2652f801d7233a61a092 (the Quip pqTransferEvent index 0)