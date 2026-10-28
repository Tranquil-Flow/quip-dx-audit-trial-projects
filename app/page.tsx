"use client";

import { FormEvent, useState } from "react";
import { keccak_256 } from "@noble/hashes/sha3";
import { WOTSPlus } from "@quip.network/hashsigs";
import {
  ALGORITHM,
  SignatureEnvelope,
  VerificationResult,
  bytesToBase64,
  flattenSignature,
} from "../lib/protocol";

type UiResult = VerificationResult & {
  browserMs: number;
  roundTripMs: number;
  mode: "original" | "tampered";
};

const encoder = new TextEncoder();

function short(value: string) {
  return `${value.slice(0, 18)}…${value.slice(-12)}`;
}

export default function Home() {
  const [message, setMessage] = useState("Hello from Next.js + Quip WOTS+");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UiResult | null>(null);
  const [envelope, setEnvelope] = useState<SignatureEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendForVerification(payload: SignatureEnvelope, mode: UiResult["mode"], browserMs = 0) {
    const started = performance.now();
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as VerificationResult & { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Backend rejected the request");
    setResult({ ...data, mode, browserMs, roundTripMs: performance.now() - started });
  }

  async function signAndVerify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const signingStarted = performance.now();
      const privateSeed = crypto.getRandomValues(new Uint8Array(32));
      const publicSeed = crypto.getRandomValues(new Uint8Array(32));
      const wots = new WOTSPlus(keccak_256);
      const { publicKey, privateKey } = wots.generateKeyPair(privateSeed, publicSeed);
      const messageHash = keccak_256(encoder.encode(message));
      const signature = flattenSignature(wots.sign(privateKey, publicSeed, messageHash));

      // Best-effort zeroization before any network request; only public material is serialized.
      privateSeed.fill(0);
      privateKey.fill(0);

      const payload: SignatureEnvelope = {
        algorithm: ALGORITHM,
        message,
        publicKey: bytesToBase64(publicKey),
        signature: bytesToBase64(signature),
      };
      const browserMs = performance.now() - signingStarted;

      // Seeds and the derived private key remain local variables and are never serialized.
      setEnvelope(payload);
      await sendForVerification(payload, "original", browserMs);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signing failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyTampered() {
    if (!envelope) return;
    setBusy(true);
    setError(null);
    try {
      await sendForVerification(
        { ...envelope, message: `${envelope.message} [tampered]` },
        "tampered",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <div className="eyebrow">FEASIBILITY SPIKE · NO WALLET OR CHAIN REQUIRED</div>
        <h1>Browser signing.<br /><span>Backend proof.</span></h1>
        <p className="lede">
          A minimal Next.js boundary test using Quip Network&apos;s TypeScript WOTS+ package.
          Fresh one-time keys and signing stay in this tab; verification runs in a Node.js route.
        </p>
      </section>

      <section className="demo-grid">
        <form className="card signer" onSubmit={signAndVerify}>
          <div className="step"><b>01</b><span>Browser</span></div>
          <label htmlFor="message">Message to sign</label>
          <textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={4096}
            rows={5}
            required
          />
          <button className="primary" disabled={busy || !message} type="submit">
            {busy ? "Working…" : "Generate one-time key → Sign → Verify"}
          </button>
          <div className="privacy-row">
            <span className="pulse" />
            <span>Private seed and key are never sent or stored</span>
          </div>
        </form>

        <div className="card verifier">
          <div className="step"><b>02</b><span>POST /api/verify</span></div>
          {!result && !error && (
            <div className="empty">
              <div className="scanline" />
              <p>Waiting for a signed envelope</p>
              <small>message + publicKey + signature</small>
            </div>
          )}
          {error && <div className="error"><strong>Request failed</strong><span>{error}</span></div>}
          {result && (
            <div className={`result ${result.valid ? "valid" : "invalid"}`}>
              <div className="verdict-icon">{result.valid ? "✓" : "×"}</div>
              <div>
                <div className="verdict">{result.valid ? "SIGNATURE VALID" : "SIGNATURE INVALID"}</div>
                <p>
                  {result.mode === "tampered"
                    ? "The same signature was rejected after the message changed."
                    : "The backend recreated the message hash and verified all WOTS+ chains."}
                </p>
              </div>
            </div>
          )}

          {result && (
            <dl className="metrics">
              <div><dt>Algorithm</dt><dd>{result.algorithm}</dd></div>
              <div><dt>Public key</dt><dd>{result.publicKeyBytes} bytes</dd></div>
              <div><dt>Signature</dt><dd>{result.signatureBytes.toLocaleString()} bytes</dd></div>
              <div><dt>Browser work</dt><dd>{result.browserMs.toFixed(1)} ms</dd></div>
              <div><dt>API round trip</dt><dd>{result.roundTripMs.toFixed(1)} ms</dd></div>
            </dl>
          )}

          {envelope && (
            <button className="secondary" disabled={busy} onClick={verifyTampered} type="button">
              Tamper with message and verify again
            </button>
          )}
        </div>
      </section>

      {envelope && (
        <section className="payload card">
          <div className="step"><b>03</b><span>JSON transport (safe fields only)</span></div>
          <div className="payload-grid">
            <div><span>algorithm</span><code>{envelope.algorithm}</code></div>
            <div><span>message</span><code>{JSON.stringify(envelope.message)}</code></div>
            <div><span>publicKey · base64</span><code>{short(envelope.publicKey)}</code></div>
            <div><span>signature · base64</span><code>{short(envelope.signature)}</code></div>
          </div>
        </section>
      )}

      <section className="notes">
        <div>
          <h2>What this proves</h2>
          <p>The published package bundles into a client component and produces data the same package verifies in a server route.</p>
        </div>
        <div>
          <h2>What it does not prove</h2>
          <p>This is not a Quip wallet, account, transaction, smart-contract, or network integration—and WOTS+ keys must never be reused.</p>
        </div>
      </section>
    </main>
  );
}
