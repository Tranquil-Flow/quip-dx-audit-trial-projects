# Quip SHRINCS demo (Next.js)
Browser signs a message with `@quip.network/hashsigs-wasm@rc` (SHRINCS, profile 256s-keccak); `/api/verify` verifies on the server.

    npm install
    npm run build && npx next start -p 3111   # or: npm run dev
    open http://localhost:3111  -> click "Sign & verify"

Notes: see next.config.ts (browser-condition alias + serverExternalPackages workarounds). Secret key is in localStorage: DEMO ONLY.
