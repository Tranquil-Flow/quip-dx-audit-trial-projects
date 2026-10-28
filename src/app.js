import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { canonical, sha256, validateRequest, selectWinners, fetchQuantum } from './raffle.js';

export function createApp({ dataDir = './data', quantum = fetchQuantum } = {}) {
  const send = (res, code, data) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const file = id => join(dataDir, `${id}.json`);
  async function save(record) {
    await mkdir(dataDir, { recursive: true });
    const tmp = join(dataDir, `${record.id}.${randomUUID()}.tmp`);
    await writeFile(tmp, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    await rename(tmp, file(record.id));
  }
  async function load(id) {
    try { return JSON.parse(await readFile(file(id), 'utf8')); }
    catch (err) { if (err.code === 'ENOENT') return null; throw err; }
  }
  const drawing = new Set();
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, source: 'ANU QRNG; not Quip QVRF' });
      if (req.method === 'POST' && path === '/raffles') {
        let text = '';
        for await (const chunk of req) {
          text += chunk;
          if (text.length > 200000) return send(res, 413, { error: 'Request too large' });
        }
        let input;
        try { input = JSON.parse(text); validateRequest(input); }
        catch (err) { return send(res, 400, { error: err.message }); }
        const id = randomUUID();
        const commitment = sha256(canonical({ participants: input.participants, winnerCount: input.winnerCount }));
        const record = { id, status: 'committed', createdAt: new Date().toISOString(), participants: input.participants, winnerCount: input.winnerCount, commitment };
        await save(record);
        return send(res, 201, record);
      }
      const match = path.match(/^\/raffles\/([0-9a-f-]{36})(\/draw)?$/);
      if (!match) return send(res, 404, { error: 'Not found' });
      const [ , id, action ] = match;
      if (req.method === 'GET' && !action) {
        const record = await load(id);
        return send(res, record ? 200 : 404, record || { error: 'Not found' });
      }
      if (req.method === 'POST' && action) {
        if (drawing.has(id)) return send(res, 409, { error: 'Draw already underway' });
        drawing.add(id);
        try {
          const record = await load(id);
          if (!record) return send(res, 404, { error: 'Not found' });
          if (record.status !== 'committed') return send(res, 409, { error: `Draw already ${record.status}; no redraw permitted` });
          record.status = 'drawing';
          record.startedAt = new Date().toISOString();
          await save(record);
          try {
            const evidence = await quantum();
            const result = selectWinners(record.participants, record.winnerCount, evidence.body.data);
            record.status = 'drawn';
            record.finishedAt = new Date().toISOString();
            record.evidence = evidence;
            record.result = result;
            await save(record);
            return send(res, 200, record);
          } catch (err) {
            record.status = 'failed';
            record.error = err.message;
            await save(record);
            return send(res, 502, { id, status: 'failed', error: err.message, note: 'No automatic retry or fallback; inspect record' });
          }
        } finally { drawing.delete(id); }
      }
      return send(res, 405, { error: 'Method not allowed' });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'Internal server error' });
    }
  });
}
