# Running g2-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/pqhybridsign@0.0.0-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

Requirements: Node.js 20 or later.

```sh
npm ci
npm test
npm run demo
```

The demo is the shortest end-to-end proof. Each run creates a new throwaway key under `./keys`, starts one CLI process to sign and another to verify, then attempts verification with a tampered body.

Manual CLI flow:

```sh
npm run build

node dist/cli.js keygen \
  --private keys/client.private.json \
  --public keys/client.public.json

printf '%s' '{"amount":1250,"currency":"USD"}' > keys/request.body

node dist/cli.js sign \
  --key keys/client.private.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body \
  --out keys/request.signature.json

node dist/cli.js verify \
  --key keys/client.public.json \
  --signature keys/request.signature.json \
  --method POST \
  --target '/v1/payments?mode=test' \
  --body-file keys/request.body
```

Valid verification exits 0; invalid authentication exits 1; usage/format/runtime errors exit 2. Full API examples and deployment guidance are in `README.md`.

npm scripts: `build`, `postbuild`, `test`, `demo`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/api.private.json`, read by `src/cli.ts`
- `keys/api.public.json`, read by `src/cli.ts`
- `keys/demo-client.private.json`, read by `scripts/interop-demo.mjs`
- `keys/demo-client.public.json`, read by `scripts/interop-demo.mjs`
- `keys/demo-request.body`, read by `scripts/interop-demo.mjs`
- `keys/demo-request.signature.json`, read by `scripts/interop-demo.mjs`

## 5. What was removed from this branch

- 10 x added by a later rebuild run, not part of the trial
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
