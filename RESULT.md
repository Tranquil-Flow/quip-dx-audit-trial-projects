# RESULT

Status: PARTIAL — working Node.js raffle using live ANU quantum-number data, but NOT Quip QVRF. Quip QVRF cannot be integrated from its public developer interface today.

## Run

Node.js 20+; no dependencies. From this directory:

```sh
# Recommended supported ANU API: obtain your own free key at https://quantumnumbers.anu.edu.au/
ANU_API_KEY='YOUR_KEY' npm start
# Deprecated, rate-limited demo mode (worked once here): ANU_LEGACY=1 npm start
```

POST `http://127.0.0.1:3000/raffles` with JSON `{"participants":["alice","bob","carol"],"winnerCount":1}`. Save the returned `id`/`commitment`. POST `/raffles/{id}/draw`; GET `/raffles/{id}` to inspect the complete recorded result. `npm test` runs offline tests. See `README.md` for curl commands, limits and trust caveats. No credentials should be placed in source or committed to version control.

## Evidence

- `npm test`: 3/3 pass (selection/rejection sampling, provider validation/current API request, HTTP commit/draw/no-redraw/restart/failure).
- `npm start` local health endpoint responded `{"ok":true,"source":"ANU QRNG; not Quip QVRF"}`.
- Live legacy ANU HTTP draw returned 200: raffle `5d1bd4d4-ce56-4e5e-aaf0-53f4708e8df2`; commitment `6422b12722098e1bf19d9efb191493867d089e3ad35bf3446f9ebf9ae5f96560`; winners `alice`, `dana`; response contained 1024 uint16 values, first four `[62104,24854,41196,60678]`. Full response and trace are in `data/5d1bd4d4-ce56-4e5e-aaf0-53f4708e8df2.json`. Independent replay of persisted response matched commitment, winners and trace (2 samples consumed). Redraw gave HTTP 409.
- Two earlier legacy draws failed closed with provider HTTP 500; recorded under IDs `9758882f-c141-40e3-bd52-eba4a8c3a137` and `bbb3c20f-526f-491d-9947-55a41eebde2f`. No silent pseudorandom fallback or repeat draw.
- No Quip tx hashes, chain addresses or job IDs: none submitted. No wallets/keys generated, testnet/mainnet funds used, or external posts. ANU API key mode was tested with a fake injected response only; no real key available. Live verification used deprecated ANU endpoint, which the provider says it is scaling back.

## Why not Quip; what would help

Quip's [QVRF developer page](https://developers.quip.network/docs/compute/qvrf) says QVRF supplies callback-based quantum randomness, but *"the request interface is not yet final, so no function names or parameters appear here"* and its note says integration docs with installable packages and code examples will follow. Its [QVRF product page](https://quip.network/qvrf/) says request access and confirms on-chain verification and trustee distribution are still in development. Its [SDK page](https://developers.quip.network/docs/getting-started/quip-sdk) lists wallet/signature and optimization packages, not a public QVRF client. The [optimization-job guide](https://developers.quip.network/docs/compute/submit-a-job) handles Ising problems, not entropy. We cannot honestly invent a QVRF API, ABI, fees, or transcript verifier. Quip could publish a stable request/callback ABI or HTTPS endpoint, supported networks/contracts, auth/fees and sandbox credentials, Node SDK, example transcript and offline verifier, and testnet faucet/example with a pinned trust model.

The substitute is [ANU's documented current API](https://quantumnumbers.anu.edu.au/documentation) (`x-api-key`, free signup), with an explicit [legacy fallback](https://qrng.anu.edu.au/contact/api-documentation/) used for the live test. Its [FAQ](https://qrng.anu.edu.au/contact/faq/) describes quantum vacuum fluctuation measurements. Unlike Quip's intended certification, ANU's API gives no per-draw cryptographic quantum provenance or independently verifiable transcript. This prototype also lacks authentication, external timestamping and immutable commitments; do not use it as a high-stakes production lottery. The ANU source, operator and host must be trusted. Quip itself documents V0 operator-trusted delivery and asynchronous verification even when its integration becomes available.
