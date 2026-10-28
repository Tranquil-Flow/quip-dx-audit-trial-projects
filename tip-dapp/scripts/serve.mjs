// Local-only demonstration UI bridge. Never put this key-holding server on a public interface.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { isAddress, parseEther } from 'ethers';
const port = Number(process.env.TIPJAR_PORT || 8000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid TIPJAR_PORT');
const origins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
let queue = Promise.resolve(); // serialize signers to prevent two requests consuming one leaf
function reply(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function tipFromLocalAccount({ creator, amount, message }) {
  if (!isAddress(creator) || typeof amount !== 'string' || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(amount) ||
    parseEther(amount) <= 0n || parseEther(amount) > parseEther('0.005') || typeof message !== 'string' || message.length > 160) {
    throw Error('Invalid tip: creator address, 0 < AGLS <= 0.005, and message <= 160 characters required');
  }
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/pq-tip.mjs', '--creator', creator, '--amount', amount, '--message', message],
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); if (stdout.length > 15000) child.kill(); });
    child.stderr.on('data', d => { stderr += d.toString(); if (stderr.length > 15000) child.kill(); });
    child.on('error', reject);
    child.on('close', code => {
      const tx = stdout.match(/PQ tip tx: (0x[0-9a-fA-F]{64})/);
      const status = stdout.match(/PQ tip receipt status: (\d+)/);
      if (code !== 0 || status?.[1] !== '1' || !tx) return reject(Error(`PQ tip failed; ${stdout.includes('burned leaf') ? 'a one-time leaf may have been burned. ' : ''}Inspect server logs/DEVLOG; do not blindly reuse a leaf.`));
      resolve({ tx: tx[1], account: stdout.match(/tipper: '(0x[0-9a-fA-F]{40})'/)?.[1], status: 1 });
    });
  });
}
const server = createServer(async (req, res) => {
  try {
    if (req.headers.host && !origins.has(`http://${req.headers.host}`)) return reply(res, 403, { error: 'Localhost only' });
    if (req.url === '/api/pq-account' && req.method === 'GET') {
      const d = JSON.parse(await readFile('keys/pq-deployment.json', 'utf8'));
      return reply(res, 200, { account: d.accountV4b, chainId: 20033, demo: true });
    }
    if (req.url === '/api/pq-tip' && req.method === 'POST') {
      if (!origins.has(req.headers.origin) || req.headers['content-type']?.split(';')[0] !== 'application/json') return reply(res, 403, { error: 'Same-origin JSON requests only' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 4096) return reply(res, 413, { error: 'Body too large' }); }
      const input = JSON.parse(body);
      const result = await (queue = queue.catch(() => {}).then(() => tipFromLocalAccount(input)));
      return reply(res, 200, result);
    }
    const paths = { '/': ['web/index.html', 'text/html; charset=utf-8'], '/index.html': ['web/index.html', 'text/html; charset=utf-8'], '/app.js': ['web/app.js', 'text/javascript; charset=utf-8'], '/deployment.json': ['web/deployment.json', 'application/json; charset=utf-8'] };
    if (req.method !== 'GET' || !paths[req.url]) return reply(res, 404, { error: 'Not found' });
    const [file, mime] = paths[req.url];
    res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(await readFile(file));
  } catch (e) { console.error('Local PQ request failed:', e.message); reply(res, 400, { error: e.message }); }
});
server.listen(port, '127.0.0.1', () => console.log(`Local TipJar UI ready on http://127.0.0.1:${port}`));
