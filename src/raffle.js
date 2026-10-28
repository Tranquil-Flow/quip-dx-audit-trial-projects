import { createHash } from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const canonical = value => JSON.stringify(value);

export function validateRequest({ participants, winnerCount }) {
  if (!Array.isArray(participants) || participants.length < 1 || participants.length > 1024 ||
      !participants.every(p => typeof p === 'string' && p.length > 0 && p.length <= 128 && p.trim() === p) ||
      new Set(participants).size !== participants.length) {
    throw new Error('participants must be 1..1024 distinct, nonempty, trimmed strings (max 128 characters each)');
  }
  if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > participants.length) {
    throw new Error('winnerCount must be an integer between 1 and participants.length');
  }
}

// Fisher-Yates partial shuffle. 2^16 rejection limits avoid modulo bias.
export function selectWinners(participants, winnerCount, samples) {
  const pool = [...participants];
  const trace = [];
  let cursor = 0;
  for (let i = 0; i < winnerCount; i++) {
    const range = pool.length - i;
    const limit = Math.floor(65536 / range) * range;
    let sample;
    do {
      if (cursor >= samples.length) throw new Error('Quantum sample exhausted; draw must be reviewed, not silently re-randomized');
      sample = samples[cursor++];
      if (!Number.isInteger(sample) || sample < 0 || sample > 65535) throw new Error('Invalid uint16 quantum sample');
      trace.push({ sample, accepted: sample < limit, range, limit });
    } while (sample >= limit);
    const j = i + sample % range;
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { winners: pool.slice(0, winnerCount), trace, consumed: cursor };
}

export async function fetchQuantum({ key = process.env.ANU_API_KEY, legacy = process.env.ANU_LEGACY === '1', fetchImpl = fetch } = {}) {
  if (!legacy && !key) throw new Error('ANU_API_KEY required for current ANU API (or explicitly set ANU_LEGACY=1 for deprecated demo endpoint)');
  const url = legacy
    ? 'https://qrng.anu.edu.au/API/jsonI.php?length=1024&type=uint16'
    : 'https://api.quantumnumbers.anu.edu.au?length=1024&type=uint16';
  const response = await fetchImpl(url, {
    headers: key && !legacy ? { 'x-api-key': key } : {},
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`ANU HTTP ${response.status} (no fallback; check API key / rate limit)`);
  const body = await response.json();
  if (body?.success !== true || body.type !== 'uint16' || body.length !== 1024 ||
      !Array.isArray(body.data) || body.data.length !== 1024 ||
      !body.data.every(v => Number.isInteger(v) && v >= 0 && v <= 65535)) {
    throw new Error('Unexpected ANU response; refusing draw');
  }
  return { url, fetchedAt: new Date().toISOString(), body };
}
