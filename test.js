/**
 * Test: verify raffle end-to-end, including the QVRF stub fails gracefully.
 */

import { createRaffle, addEntry, pickWinner, getRaffle, listRaffles } from './raffle.js';
import { createProvider, CSPRNGProvider, QuipQVRFProvider } from './randomness.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log(`  PASS: ${msg}`); }
  else { fail++; console.error(`  FAIL: ${msg}`); }
}

// ─── Test 1: QVRF stub throws with clear message ───────────────────────────
console.log('\n=== QVRF stub ===');
try {
  new QuipQVRFProvider();
  assert(false, 'should have thrown');
} catch (e) {
  assert(e.message.includes('not yet public'), 'QVRF stub throws helpful error');
  assert(e.message.includes('developers.quip.network'), 'error includes docs URL');
}

// ─── Test 2: CSPRNG provider returns valid index ────────────────────────────
console.log('\n=== CSPRNG provider ===');
const p = new CSPRNGProvider();
const results = new Set();
for (let i = 0; i < 1000; i++) {
  const idx = await p.pickRandomIndex(10);
  assert(idx >= 0 && idx < 10, `index ${idx} in range`);
  results.add(idx);
}
assert(results.size === 10, 'all 10 values seen in 1000 draws (uniformity)');

// ─── Test 3: Raffle lifecycle ──────────────────────────────────────────────
console.log('\n=== Raffle lifecycle ===');
const raffle = createRaffle({ title: 'Dev Conference 2026', entries: [
  { name: 'Alice', address: '0xAA' },
  { name: 'Bob', address: '0xBB' },
  { name: 'Carol', address: '0xCC' },
]});
assert(raffle.entries.length === 3, '3 initial entries');
assert(raffle.randomnessProvider.includes('CSPRNG'), 'uses CSPRNG by default');

addEntry(raffle.id, { name: 'Dave', address: '0xDD' });
assert(getRaffle(raffle.id).entries.length === 4, '4 after adding Dave');

const { raffle: drawn, winnerIndex } = await pickWinner(raffle.id);
assert(winnerIndex >= 0 && winnerIndex < 4, `winner index ${winnerIndex} valid`);
assert(drawn.winner.name !== undefined, 'winner has a name');
console.log(`  Winner: ${drawn.winner.name} (index ${winnerIndex})`);

// ─── Test 4: Duplicate draw fails ──────────────────────────────────────────
console.log('\n=== Duplicate draw ===');
try {
  await pickWinner(raffle.id);
  assert(false, 'should have thrown');
} catch (e) {
  assert(e.message.includes('already picked'), 'cannot draw twice');
}

// ─── Test 5: Large raffle (uniformity check) ────────────────────────────────
console.log('\n=== Large raffle (100 entries, 10000 draws) ===');
const bigRaffle = createRaffle({ title: 'Big Raffle', entries: Array.from({ length: 100 }, (_, i) => ({ name: `User${i}` })) });
const counts = new Array(100).fill(0);
for (let i = 0; i < 10000; i++) {
  const { winnerIndex } = await pickWinner(bigRaffle.id);
  counts[winnerIndex]++;
  // Reset winner for next draw
  getRaffle(bigRaffle.id).winner = null;
}
const max = Math.max(...counts), min = Math.min(...counts);
const avg = 10000 / 100;
assert(max / avg < 1.5 && avg / min < 1.5, `uniformity OK (min=${min}, max=${max}, avg=${avg.toFixed(0)})`);

// ─── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${pass + fail} tests, ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
