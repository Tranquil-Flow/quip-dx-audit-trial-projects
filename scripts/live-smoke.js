import { createApp } from '../src/app.js';
const server = createApp({ dataDir: './data' });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  const createdResponse = await fetch(base + '/raffles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ participants: ['alice', 'bob', 'carol', 'dana'], winnerCount: 2 }) });
  const created = await createdResponse.json();
  const drawnResponse = await fetch(base + `/raffles/${created.id}/draw`, { method: 'POST' });
  const drawn = await drawnResponse.json();
  console.log(JSON.stringify({ id: created.id, commitment: created.commitment, httpStatus: drawnResponse.status, status: drawn.status, winners: drawn.result?.winners, sampleCount: drawn.evidence?.body.data.length, firstSamples: drawn.evidence?.body.data.slice(0, 4), source: drawn.evidence?.url, error: drawn.error }, null, 2));
  if (drawnResponse.status !== 200) process.exitCode = 1;
} finally { server.close(); }
