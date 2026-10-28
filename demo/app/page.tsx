'use client';
import { useRef, useState } from 'react';

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

export default function Page() {
  const [text, setText] = useState('hello post-quantum world');
  const [log, setLog] = useState('');
  const keys = useRef<any>(null);

  async function sign() {
    try { await run(); } catch (e: any) { setLog('ERROR: ' + (e?.stack || e)); }
  }
  async function run() {
    const { loadShrincsWasm } = await import('@quip.network/hashsigs-wasm') as any;
    const { makeHashSigs } = await import('hashsigs-api');
    const { shrincs } = makeHashSigs(await loadShrincsWasm());
    if (!keys.current) keys.current = shrincs.keygen(crypto.getRandomValues(new Uint8Array(32)));
    // messages must be exactly 32 bytes: hash first
    const msg = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
    const sig = shrincs.sign(msg, keys.current);
    const body = { message: text, digest: hex(msg), signature: hex(sig), publicKeyCommitment: hex(keys.current.publicKeyCommitment) };
    const r = await fetch('/api/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    setLog(JSON.stringify({ sigBytes: sig.length, remaining: keys.current.stateful.remaining, server: await r.json() }, null, 2));
  }
  return (<main style={{ fontFamily: 'sans-serif', padding: 24 }}>
    <h1>SHRINCS sign in browser, verify on server</h1>
    <input value={text} onChange={e => setText(e.target.value)} size={40} />
    <button id="go" onClick={sign}>Sign &amp; verify</button>
    <pre id="out">{log}</pre></main>);
}
