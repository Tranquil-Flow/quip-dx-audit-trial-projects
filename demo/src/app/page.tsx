"use client";

import { useState } from "react";
import { loadHashSigs } from "@quip.network/hashsigs-wasm";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function digestMessage(message: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(message);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

type DemoResult = {
  valid: boolean;
  profile: string;
  digestHex: string;
  signatureBytes: number;
  commitmentHex: string;
};

export default function Home() {
  const [message, setMessage] = useState("Hello from a Next.js browser");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [status, setStatus] = useState("Ready. The private key never leaves this tab.");
  const [busy, setBusy] = useState(false);

  async function signAndVerify() {
    setBusy(true);
    setResult(null);

    try {
      setStatus("Loading Quip's SHRINCS WebAssembly module…");
      const { shrincs } = await loadHashSigs();

      setStatus("Generating a fresh throwaway post-quantum key in the browser…");
      const seed = crypto.getRandomValues(new Uint8Array(32));
      // Four one-time leaves keeps this demo fast. This key is used once and discarded.
      const keys = shrincs.keygen(seed, 4);
      const digest = await digestMessage(message);

      setStatus("Signing the SHA-256 digest in the browser…");
      const signature = shrincs.sign(digest, keys);

      setStatus("Sending only message, signature, and public commitment to the backend…");
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          signature: bytesToBase64(signature),
          publicKeyCommitment: bytesToBase64(keys.publicKeyCommitment),
        }),
      });
      const body = (await response.json()) as DemoResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);

      setResult(body);
      setStatus(body.valid ? "Backend verification succeeded." : "Backend verification failed.");
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="card">
        <p className="eyebrow">Quip Network feasibility spike</p>
        <h1>Browser sign → backend verify</h1>
        <p className="lede">
          This demo uses Quip&apos;s current SHRINCS WASM package. The browser creates a
          throwaway key and signs a 32-byte SHA-256 digest; a Next.js route independently
          hashes the message and verifies the signature.
        </p>

        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={4096}
          rows={4}
        />
        <button onClick={signAndVerify} disabled={busy || message.length === 0}>
          {busy ? "Working…" : "Generate key, sign, and verify"}
        </button>

        <div className="status" aria-live="polite">{status}</div>

        {result && (
          <dl className={result.valid ? "result valid" : "result invalid"}>
            <div><dt>Backend verdict</dt><dd>{result.valid ? "VALID" : "INVALID"}</dd></div>
            <div><dt>Profile</dt><dd>{result.profile}</dd></div>
            <div><dt>Signature</dt><dd>{result.signatureBytes.toLocaleString()} bytes</dd></div>
            <div><dt>SHA-256 digest</dt><dd><code>{result.digestHex}</code></dd></div>
            <div><dt>Public commitment</dt><dd><code>{result.commitmentHex}</code></dd></div>
          </dl>
        )}

        <aside>
          <strong>Important:</strong> SHRINCS&apos;s normal path is stateful. Each call consumes
          a one-time leaf. A production app must persist the updated 264-byte secret after
          every signature and must never restore an older copy. This spike deliberately
          generates and discards a new key on every click.
        </aside>
      </section>
    </main>
  );
}
