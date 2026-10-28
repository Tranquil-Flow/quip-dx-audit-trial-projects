import test from 'node:test';
import assert from 'node:assert/strict';
import { entriesHash, commitment, deriveSeed, pickWinners } from '../src/draw.js';
import { getProvider, QvrfNotAvailableError } from '../src/entropy.js';

const entries = ['alice', 'bob', 'carol', 'dave', 'erin', 'frank'];
const secret = '0x' + '11'.repeat(32);
const beacon = '0x' + '22'.repeat(32);

test('entry order does not change hash or winners', () => {
  const a = entriesHash(entries);
  const b = entriesHash([...entries].reverse());
  assert.equal(a, b);
  const seed = deriveSeed({ secret, entriesHash: a, beaconHash: beacon });
  assert.deepEqual(pickWinners({ seed, entries, count: 3 }), pickWinners({ seed, entries: [...entries].reverse(), count: 3 }));
});

test('winners are distinct members of the pool and deterministic', () => {
  const seed = deriveSeed({ secret, entriesHash: entriesHash(entries), beaconHash: beacon });
  const w = pickWinners({ seed, entries, count: 4 });
  assert.equal(new Set(w).size, 4);
  w.forEach((x) => assert.ok(entries.includes(x)));
  assert.deepEqual(w, pickWinners({ seed, entries, count: 4 }));
});

test('different beacon -> different seed', () => {
  const eh = entriesHash(entries);
  assert.notEqual(deriveSeed({ secret, entriesHash: eh, beaconHash: beacon }), deriveSeed({ secret, entriesHash: eh, beaconHash: '0x' + '33'.repeat(32) }));
});

test('commitment binds raffle id, entries and secret', () => {
  const eh = entriesHash(entries);
  const c = commitment({ raffleId: 'r1', entriesHash: eh, secret });
  assert.notEqual(c, commitment({ raffleId: 'r2', entriesHash: eh, secret }));
  assert.notEqual(c, commitment({ raffleId: 'r1', entriesHash: entriesHash([...entries, 'x']), secret }));
  assert.notEqual(c, commitment({ raffleId: 'r1', entriesHash: eh, secret: '0x' + '12'.repeat(32) }));
});

test('selection is roughly uniform (no gross bias)', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];
  const counts = Object.fromEntries(pool.map((p) => [p, 0]));
  const N = 10000;
  for (let i = 0; i < N; i++) counts[pickWinners({ seed: '0x' + i.toString(16).padStart(64, '0'), entries: pool, count: 1 })[0]]++;
  for (const p of pool) assert.ok(Math.abs(counts[p] - N / 5) < N * 0.03, `${p}: ${counts[p]}`);
});

test('rejects bad winner counts and duplicate entries', () => {
  assert.throws(() => pickWinners({ seed: beacon, entries, count: 0 }));
  assert.throws(() => pickWinners({ seed: beacon, entries, count: 7 }));
  assert.throws(() => entriesHash(['a', 'a']));
});

test('qvrf provider fails loudly with the documented reason', async () => {
  await assert.rejects(() => getProvider('qvrf').secret(), (e) => e instanceof QvrfNotAvailableError && /not yet final/.test(e.message));
});
