# Running v1-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
cd demo && npm ci
```

Quip packages pinned: `@quip.network/hashsigs-wasm@^0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "Run"), verbatim:

```
cd demo && npm install && npx next build && npx next start -p 3111
# open http://localhost:3111, click "Sign & verify"
node check.mjs   # (server running) valid -> ok:true, tampered digest -> ok:false
```

npm scripts: `demo/dev`, `demo/build`, `demo/start`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

## 5. What was removed from this branch

- 3 x added by a later rebuild run, not part of the trial

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
