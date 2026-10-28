"use client";
import { useState } from "react";
import { loadHashSigs, shrincsKeysToSecretBytes } from "@quip.network/hashsigs-wasm";
import { toHex } from "@/lib/hex";

const STORE = "quip-demo-secret";

export default function Home() {
  const [message, setMessage] = useState("hello quip");
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) => setLog((l) => [...l, s]);

  async function signAndVerify() {
    const { shrincs, shrincsImportSigningKey } = await loadHashSigs();
    // DEMO ONLY: secret key in localStorage. Use a real key store in production.
    const saved = localStorage.getItem(STORE);
    let keys;
    if (saved) {
      keys = shrincsImportSigningKey(Uint8Array.from(JSON.parse(saved)));
    } else {
      keys = shrincs.keygen(crypto.getRandomValues(new Uint8Array(32)), 16);
      localStorage.setItem(STORE, JSON.stringify(Array.from(shrincsKeysToSecretBytes(keys))));
    }
    const digest = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message)),
    );
    const sig = shrincs.sign(digest, keys);
    // Persist BEFORE anything else so a leaf is never reused.
    localStorage.setItem(STORE, JSON.stringify(Array.from(shrincsKeysToSecretBytes(keys))));
    add(`signed; leaves remaining: ${keys.stateful.remaining}; sig ${sig.length} bytes`);
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        signature: toHex(sig),
        publicKeyCommitment: toHex(keys.publicKeyCommitment),
      }),
    });
    add("server says: " + JSON.stringify(await res.json()));
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace" }}>
      <h1>Quip SHRINCS sign (browser) / verify (server)</h1>
      <input value={message} onChange={(e) => setMessage(e.target.value)} />
      <button onClick={() => signAndVerify().catch((e) => add("ERROR: " + e))}>
        Sign &amp; verify
      </button>
      <pre>{log.join("\n")}</pre>
    </main>
  );
}
