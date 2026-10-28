# Running g2-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/pqhybridsign@0.0.0-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```sh
# from the project root
npm install                          # already done
npm run demo                         # run all four demos in order
# or each demo separately
npm run demo:roundtrip
npm run demo:deterministic
npm run demo:interop
npm run demo:tamper

# the CLI itself
node bin/quip-sig.mjs info
node bin/quip-sig.mjs keygen --out keys/alice.seed.json --name alice
node bin/quip-sig.mjs keygen --out keys/bob.seed.json --name bob

# write a request
cat > examples/request.json <<'JSON'
{
  "method": "POST",
  "path": "/v1/transfer",
  "body": "{\"from\":\"alice\",\"to\":\"bob\",\"amount\":42}",
  "timestamp": "2026-09-29T12:00:00.000Z",
  "nonce": "n-1"
}
JSON

# sign (process A)
node bin/quip-sig.mjs sign \
  --keys-file keys/alice.seed.json \
  --request examples/request.json \
  --ctx api.example.com \
  --out /tmp/sig.json

# verify (process B)
node bin/quip-sig.mjs verify \
  --keys-file keys/alice.seed.json \
  --request examples/request.json \
  --signature /tmp/sig.json
# -> OK    suite=ED-ML-44      ctx=api.example.com
```

Available CLI suites: `ED-ML-44`, `ED-FN-512`, `SR-ML-44`, `SR-FN-512`
(stateless lattice only; the SHRINCS suites need a LeafJournal with
synchronous durability and are out of scope for this demo).

npm scripts: `demo:roundtrip`, `demo:interop`, `demo:tamper`, `demo:deterministic`, `demo`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 5. What was removed from this branch

- 6 x added by a later rebuild run, not part of the trial
- 2 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
