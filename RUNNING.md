# Running h1-b

> Auto-generated starting point from what is in this branch. It is not a tested recipe; where it disagrees with the code, trust the code. The builder's own notes (`RESULT.md`, `DEVLOG.md`) are the primary source.

## 1. Stack and install

Detected: Node.js.

```sh
cd demo && npm ci
```

Quip packages pinned: `@quip.network/hashsigs-wasm@0.2.1-rc9`. Several Quip packages publish their current API only under the `rc` dist-tag; check the pinned version before assuming `latest`.

## 2. How the builder ran it

From `RESULT.md` (section "How to run"), verbatim:

```sh
cd demo
npm install
npm run dev
```

Open `http://localhost:3000` and click **Generate key, sign, and verify**.

Validation commands:

```sh
npm run lint
npm run build
```

The project intentionally runs Next.js with Webpack. Turbopack currently exposes the vendor package's broken browser export and fails the build.

npm scripts defined: `demo/dev`, `demo/build`, `demo/start`, `demo/lint`

## 3. What you must supply

Key files, `.env` files and local secrets were **not** published (see `EXCLUDED.md`). Supply your own throwaway test accounts. Never use a mainnet account or real funds.

Nothing detected beyond a normal install. It may still need a funded account if it talks to a chain.

## 5. What was removed from this branch

- 2 x dependency/build/cache dir
- 1 x key material dir

Full list: `EXCLUDED.md`. If the project used a clone of a Quip repo (for example `nodes.quip.network`), clone it fresh from Quip.

## 6. If you use an AI agent to repair it

See `docs/AGENT_PROMPT.md` on the `main` branch. Give the agent this file, `TRIAL.md`, `RESULT.md` and `DEVLOG.md`.
