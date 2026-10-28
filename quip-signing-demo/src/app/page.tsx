"use client";

import { useState, useEffect } from "react";

// Helper function to convert Uint8Array to hex string
const toHex = (arr: Uint8Array) =>
  Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// Helper function to convert hex string to Uint8Array
const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

export default function Home() {
  const [message, setMessage] = useState("Hello, Quip Network!");
  const [signature, setSignature] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmModule, setWasmModule] = useState<any>(null);

  // Load the WASM module on component mount
  useEffect(() => {
    const loadWasm = async () => {
      try {
        // Dynamic import to avoid SSR issues
        // Import loadShrincsWasm from the package
        const { loadShrincsWasm } = await import(
          "@quip.network/hashsigs-wasm"
        );
        
        const wasm = await loadShrincsWasm();
        setWasmModule(wasm);
        setWasmLoaded(true);
        console.log("WASM loaded successfully");
        console.log("Available functions:", Object.keys(wasm));
      } catch (err) {
        console.error("Failed to load WASM:", err);
        setError("Failed to load post-quantum cryptography module");
      }
    };
    loadWasm();
  }, []);

  const handleSign = async () => {
    if (!wasmModule) {
      setError("WASM module not loaded yet");
      return;
    }

    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      // Generate a random seed (32 bytes)
      const seed = crypto.getRandomValues(new Uint8Array(32));

      // Generate key pair using the WASM module directly
      const keys = wasmModule.sphincsPlusCKeygen(seed);

      // Convert message to Uint8Array (padded to 32 bytes)
      const messageBytes = new TextEncoder().encode(message);
      const paddedMessage = new Uint8Array(32);
      paddedMessage.set(messageBytes.slice(0, 32));

      // Sign the message
      const sig = wasmModule.sphincsPlusCSign(paddedMessage, keys.secretKey);

      // Convert to hex for display
      const sigHex = toHex(sig);

      // Convert public key to hex (extract from secretKey)
      // The public key is the last 64 bytes of the secret key
      const pkSeed = keys.secretKey.slice(64, 96);
      const root = keys.secretKey.slice(96, 128);
      const pkHex = toHex(pkSeed) + toHex(root);

      setSignature(sigHex);
      setPublicKey(pkHex);

      // Verify locally first
      const pkBytes = new Uint8Array(64);
      pkBytes.set(pkSeed);
      pkBytes.set(root, 32);
      const ok = wasmModule.sphincsPlusCVerify(sig, paddedMessage, pkBytes);
      setVerificationResult(`Local verification: ${ok ? "PASSED" : "FAILED"}`);
    } catch (err) {
      console.error("Signing error:", err);
      setError(`Signing failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOnServer = async () => {
    if (!signature || !publicKey) {
      setError("No signature to verify");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          signature,
          publicKey,
        }),
      });

      const result = await response.json();
      setVerificationResult(`Server verification: ${result.valid ? "PASSED" : "FAILED"}`);
    } catch (err) {
      console.error("Verification error:", err);
      setError(`Server verification failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Quip Network Post-Quantum Signing Demo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            1. Sign a Message (Browser)
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to sign:
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter message to sign"
            />
          </div>

          <button
            onClick={handleSign}
            disabled={loading || !wasmLoaded}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Signing..." : !wasmLoaded ? "Loading WASM..." : "Sign Message"}
          </button>

          {wasmLoaded && (
            <p className="mt-2 text-sm text-green-600">
              ✓ Post-quantum cryptography module loaded
            </p>
          )}
        </div>

        {signature && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              2. Signature Results
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Signature (hex):
              </label>
              <textarea
                readOnly
                value={signature || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Public Key (hex):
              </label>
              <textarea
                readOnly
                value={publicKey || ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-xs"
                rows={2}
              />
            </div>

            <button
              onClick={handleVerifyOnServer}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Verify on Server (API Route)"}
            </button>
          </div>
        )}

        {verificationResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              3. Verification Result
            </h2>
            <p className={`text-lg font-medium ${verificationResult.includes("PASSED") ? "text-green-600" : "text-red-600"}`}>
              {verificationResult}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            How It Works
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>
              <strong>Browser Signing:</strong> Uses <code>@quip.network/hashsigs-wasm</code> to generate
              a SPHINCS+C key pair and sign a message with post-quantum security.
            </li>
            <li>
              <strong>Server Verification:</strong> Sends the signature and public key to a Next.js API route
              that verifies the signature using the same WASM library.
            </li>
            <li>
              <strong>Post-Quantum Security:</strong> Uses hash-based signatures (SPHINCS+) that are
              resistant to quantum computer attacks.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
