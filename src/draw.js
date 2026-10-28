// Pure, deterministic draw logic. No I/O, so anyone can re-run it to verify a result.
import { createHash } from 'node:crypto';

const sha256 = (...parts) => {
  const h = createHash('sha256');
  for (const p of parts) h.update(p);
  return h.digest();
};

const hex = (b) => '0x' + Buffer.from(b).toString('hex');
const unhex = (s) => Buffer.from(s.replace(/^0x/, ''), 'hex');

// Entries are hashed in a canonical (sorted) order so the operator cannot
// reorder them after the fact to steer the result.
export function canonicalEntries(entries) {
  const ids = entries.map(String);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate entry ids');
  return [...ids].sort();
}

export function entriesHash(entries) {
  return hex(sha256('raffle-entries-v1\n', JSON.stringify(canonicalEntries(entries))));
}

export function commitment({ raffleId, entriesHash: eh, secret }) {
  return hex(sha256('raffle-commit-v1\n', raffleId, '\n', unhex(eh), unhex(secret)));
}

export function deriveSeed({ secret, entriesHash: eh, beaconHash }) {
  return hex(sha256('raffle-seed-v1\n', unhex(secret), unhex(eh), unhex(beaconHash)));
}

// Uniform integer in [0, n) from a SHA-256 counter stream, using rejection
// sampling so there is no modulo bias.
function* stream(seed) {
  const s = unhex(seed);
  for (let ctr = 0; ; ctr++) {
    const c = Buffer.alloc(4);
    c.writeUInt32BE(ctr);
    yield* sha256('raffle-stream-v1\n', s, c);
  }
}

function uniform(bytes, n) {
  if (n <= 1) return 0;
  const bits = Math.ceil(Math.log2(n));
  const nbytes = Math.ceil(bits / 8);
  const mask = (1 << (bits % 8 === 0 ? 8 : bits % 8)) - 1;
  for (;;) {
    let v = 0;
    for (let i = 0; i < nbytes; i++) {
      let b = bytes.next().value;
      if (i === 0) b &= mask;
      v = v * 256 + b;
    }
    if (v < n) return v;
  }
}

// Partial Fisher-Yates over the canonical entry order.
export function pickWinners({ seed, entries, count }) {
  const pool = canonicalEntries(entries);
  if (!Number.isInteger(count) || count < 1 || count > pool.length) {
    throw new Error(`winner count must be 1..${pool.length}`);
  }
  const bytes = stream(seed);
  for (let i = 0; i < count; i++) {
    const j = i + uniform(bytes, pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
