import { createServer } from 'node:http';
import { makeChain, AGLAIS } from './chain.js';
import { RaffleService } from './raffle.js';

const PORT = Number(process.env.PORT || 3000);
const svc = new RaffleService({ chain: makeChain() });

const routes = [
  ['GET', /^\/health$/, async () => ({ ok: true, entropy: svc.entropyName, label: svc.entropy.label, quantum: svc.entropy.quantum, chain: AGLAIS.rpc })],
  ['POST', /^\/raffles$/, async (_m, body) => svc.create(body)],
  ['GET', /^\/raffles\/([\w-]+)$/, async (m) => svc.view(m[1])],
  ['POST', /^\/raffles\/([\w-]+)\/entries$/, async (m, body) => svc.enter(m[1], body.entry)],
  ['POST', /^\/raffles\/([\w-]+)\/close$/, async (m) => svc.close(m[1])],
  ['POST', /^\/raffles\/([\w-]+)\/draw$/, async (m) => svc.draw(m[1])],
  ['GET', /^\/raffles\/([\w-]+)\/verify$/, async (m) => svc.verify(m[1])],
];

const server = createServer(async (req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(obj, null, 2));
  };
  try {
    const path = new URL(req.url, 'http://x').pathname;
    for (const [method, re, fn] of routes) {
      const m = path.match(re);
      if (m && req.method === method) {
        let raw = '';
        for await (const c of req) raw += c;
        return send(200, await fn(m, raw ? JSON.parse(raw) : {}));
      }
    }
    send(404, { error: 'not found' });
  } catch (e) {
    send(e.status || (e.code === 'QVRF_NOT_AVAILABLE' ? 501 : 500), { error: e.message, code: e.code });
  }
});

server.listen(PORT, () => console.log(`raffle service on :${PORT} (entropy=${svc.entropyName}, from ${AGLAIS.rpc}, signer ${svc.chain.address})`));
