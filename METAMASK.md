# Adding Quip Network's Aglais testnet to MetaMask

Aglais is Quip Network's public testnet. Its AGLS token is a valueless, disposable test token. Do not buy it and do not send real assets to this network.

## Add the custom network

1. Open MetaMask.
2. Open the network selector at the top of the wallet.
3. Choose **Add network**, then **Add a network manually**. (In some MetaMask versions this is under **Settings → Networks → Add network**.)
4. Enter exactly:

| Field | Value |
|---|---|
| Network name | `Aglais Testnet (Quip Network)` |
| Default RPC URL | `https://evm-rpc.aglais.quip.network:20049` |
| Chain ID | `20033` |
| Currency symbol | `AGLS` |
| Block explorer URL | `https://explorer.aglais.quip.network` |

5. Save the network and switch to **Aglais Testnet (Quip Network)**.
6. Confirm MetaMask shows chain ID `20033` before signing anything.

MetaMask may warn that the network name or currency symbol does not match information from another registry. Verify the values against Quip's official testnet page before accepting: https://agls.quip.network/

## Get valueless test AGLS

Use only a test-only MetaMask account. From a terminal, replace the destination with that account's EVM address:

```sh
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'content-type: application/json' \
  -d '{"dest":"0xYOUR_TEST_ACCOUNT"}'
```

The official faucet currently documents 10 AGLS per request and rate-limits by destination. Its endpoint refuses direct browser calls. AGLS has no value and may disappear when the testnet resets.

## Deployed Counter

- Contract: [`0x9E81d0b542b759D8A23141ba92da0d71C025C13d`](https://explorer.aglais.quip.network/address/0x9E81d0b542b759D8A23141ba92da0d71C025C13d)
- Deployment transaction: [`0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618`](https://explorer.aglais.quip.network/tx/0x6cabc5376ca3aaea85ee7c818acff1130cefc727bcf45f7205f53b84435f8618)
- Increment transaction: [`0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1`](https://explorer.aglais.quip.network/tx/0x5b136fa215d2657030c4223c4a45b6c28482e3a9d0aa3dfa1c1aba4283b722c1)
- Verified read-back after increment: `count = 1`

The explorer currently marks the bytecode as a contract but the source is not explorer-verified. The complete source is in `contracts/Counter.sol`.
