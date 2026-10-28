import { loadHashSigs } from '@quip.network/hashsigs-wasm';
export const runtime = 'nodejs';
const unhex = (s: string) => Uint8Array.from(Buffer.from(s, 'hex'));

export async function POST(req: Request) {
  const { digest, signature, publicKeyCommitment } = await req.json();
  const { shrincs } = await loadHashSigs();
  const ok = shrincs.verify(unhex(signature), unhex(digest), unhex(publicKeyCommitment));
  return Response.json({ ok });
}
