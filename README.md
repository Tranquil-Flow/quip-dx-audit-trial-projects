# Quantum raffle prototype (ANU, NOT Quip QVRF)

Quip's QVRF service is live for its own project, but its public developer documentation explicitly says the request interface and fees are not finalized; there are no public function names, parameters, installable packages or examples. This project therefore uses ANU's documented quantum number API as a substitute, not a Quip integration. ANU's current API requires a free account/API key; never commit the key. No keys or blockchain transactions are needed here.

## Run

Node.js 20+. No npm dependencies or install required. Obtain a key via https://quantumnumbers.anu.edu.au/ and:

```sh
ANU_API_KEY='your-key' npm start
```

For a limited, deprecated, one-request-per-minute legacy API smoke test only: `ANU_LEGACY=1 npm start`. This may stop working; do not rely on it for production. By default the service listens on `127.0.0.1:3000` (override `PORT`), stores files in `./data` (override `DATA_DIR`). Do not expose it publicly: there is no authentication.

```sh
curl -sS -X POST http://127.0.0.1:3000/raffles \
  -H 'content-type: application/json' \
  -d '{"participants":["alice","bob","carol"],"winnerCount":1}'
# Save the returned id; the commitment is SHA-256 of JSON.stringify({participants,winnerCount}).
curl -sS -X POST http://127.0.0.1:3000/raffles/ID/draw
curl -sS http://127.0.0.1:3000/raffles/ID
npm test
```

The draw makes exactly one HTTPS request for 1024 `uint16` samples. It validates the response, uses rejection sampling plus partial Fisher-Yates for unbiased distinct winners, and persists the full source response, URL, timestamps, selection trace, and pre-draw participant commitment. A completed or failed raffle cannot be drawn again, including after restart; an interrupted `drawing` status needs manual investigation. No pseudorandom fallback, no automatic resampling after an error. Inspect a record in `data/ID.json` or via GET. API credentials are never stored in evidence.

## Trust and operational caveats

ANU says its quantum vacuum-fluctuation QRNG serves live random numbers, but its API response has no public cryptographic provenance certificate. Trust ANU, HTTPS, this host and operator. The SHA-256 participant commitment only binds an *unchanged record*: local files can be altered/deleted by the operator and the creation time/draw time can be strategically chosen. Participants should see the commitment before draw and independently archive the full record afterward. This is not a publicly verifiable or certified QVRF lottery. For a high-stakes raffle, use authenticated, externally timestamped immutable commitments, fixed preannounced draw time, multi-operator controls and independent audit.

Legacy ANU API is being phased out and is limited to one request per minute; the current API key is the supported production path. No automatic replay/retry on request failure: create a new raffle and publish the failure if necessary. Limit is 1024 entrants, 1024 winners, one batch/draw. Extremely unlikely sample exhaustion fails closed.

Sources: https://developers.quip.network/docs/compute/qvrf ; https://quip.network/qvrf/ ; https://developers.quip.network/docs/getting-started/quip-sdk ; https://qrng.anu.edu.au/contact/api-documentation/ ; https://quantumnumbers.anu.edu.au/documentation ; https://qrng.anu.edu.au/contact/faq/ .
