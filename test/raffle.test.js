import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { selectWinners, fetchQuantum, sha256, canonical } from '../src/raffle.js';
import { createApp } from '../src/app.js';

test('rejection sampling discards biased tail; no replacement', () => {
  const result = selectWinners(['a', 'b', 'c'], 2, [65535, 1, 0]);
  assert.deepEqual(result.winners, ['b', 'a']);
  assert.equal(result.consumed, 3);
  assert.deepEqual(result.trace.map(x => x.accepted), [false, true, true]);
});

test('reject malformed provider responses and missing credentials', async () => {
  await assert.rejects(fetchQuantum({ key: '', legacy: false }), /ANU_API_KEY/);
  await assert.rejects(fetchQuantum({ key: 'test', fetchImpl: async () => ({ ok: true, json: async () => ({ success: true, type: 'uint16', length: 1024, data: [1] }) }) }), /Unexpected ANU/);
  let request;
  const result = await fetchQuantum({ key: 'test', legacy: false, fetchImpl: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ success: true, type: 'uint16', length: 1024, data: Array(1024).fill(7) }) };
  } });
  assert.equal(request.url, 'https://api.quantumnumbers.anu.edu.au?length=1024&type=uint16');
  assert.equal(request.options.headers['x-api-key'], 'test');
  assert.equal(result.body.data.length, 1024);
});

test('commit, draw, replay, restart, failure without fallback', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'raffle-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  let calls = 0;
  const quantum = async () => { calls++; return { url: 'mock://test', fetchedAt: '2026-01-01T00:00:00.000Z', body: { success: true, type: 'uint16', length: 1024, data: [2, 0, ...Array(1022).fill(1)] } }; };
  const server = createApp({ dataDir: dir, quantum });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('/raffles', { participants: ['a', 'a'], winnerCount: 1 })).status, 400);
  const created = await (await post('/raffles', { participants: ['a', 'b', 'c'], winnerCount: 2 })).json();
  assert.equal(created.status, 'committed');
  assert.equal(created.commitment, sha256(canonical({ participants: ['a', 'b', 'c'], winnerCount: 2 })));
  const drawn = await (await post(`/raffles/${created.id}/draw`)).json();
  assert.deepEqual(drawn.result.winners, ['c', 'b']);
  assert.equal((await post(`/raffles/${created.id}/draw`)).status, 409);
  assert.equal(calls, 1);
  const restarted = createApp({ dataDir: dir });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  t.after(() => restarted.close());
  const recovered = await (await fetch(`http://127.0.0.1:${restarted.address().port}/raffles/${created.id}`)).json();
  assert.deepEqual(recovered.result, drawn.result);
  const bad = createApp({ dataDir: join(dir, 'bad'), quantum: async () => { throw new Error('ANU HTTP 500'); } });
  await new Promise(resolve => bad.listen(0, '127.0.0.1', resolve));
  t.after(() => bad.close());
  const url = `http://127.0.0.1:${bad.address().port}`;
  const failedCreate = await (await fetch(url + '/raffles', { method: 'POST', body: JSON.stringify({ participants: ['a'], winnerCount: 1 }) })).json();
  const failed = await fetch(url + `/raffles/${failedCreate.id}/draw`, { method: 'POST' });
  assert.equal(failed.status, 502);
  assert.equal((await (await fetch(url + `/raffles/${failedCreate.id}`)).json()).status, 'failed');
  assert.equal((await fetch(url + `/raffles/${failedCreate.id}/draw`, { method: 'POST' })).status, 409);
});
