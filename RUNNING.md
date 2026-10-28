# Running t01-a

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
npm ci
```

Quip packages pinned: `@quip.network/hashsigs-wasm@0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```
npm install && npm run demo      # Node >= 18 (tested on v22.22.2, macOS arm64); ~3 s
npm run typecheck                # optional
```
Uses `@quip.network/hashsigs-wasm` **pinned to `0.2.1-rc9`** (see below), `@noble/hashes` (keccak-256), `tsx`.
Source: `src/demo.ts`. Only public values are written to `keys/demo-public.json`; secret keys stay in memory.

npm scripts defined: `demo`, `typecheck`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Files the code expects (the format is whatever the reading script parses; open the script):

- `keys/demo-public.json`, read by `src/demo.ts`

## 5. What was removed from this branch

- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
