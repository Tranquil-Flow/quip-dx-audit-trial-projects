// End-to-end demo against a running server (npm start). Uses the Aglais TESTNET only.
const base = process.env.BASE || 'http://localhost:3000';
const call = async (method, path, body) => {
  const r = await fetch(base + path, { method, headers: { 'content-type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const created = (await call('POST', '/raffles', { name: 'demo raffle', winners: 2 })).body;
console.log('raffle', created.id);
for (const e of ['alice', 'bob', 'carol', 'dave', 'erin', 'frank']) await call('POST', `/raffles/${created.id}/entries`, { entry: e });
const closed = await call('POST', `/raffles/${created.id}/close`);
console.log('close', closed.status, JSON.stringify(closed.body.anchor), closed.body.commitment);
let drawn;
for (let i = 0; i < 60; i++) {
  drawn = await call('POST', `/raffles/${created.id}/draw`);
  if (drawn.status === 200) break;
  console.log('draw:', drawn.status, drawn.body.error);
  await sleep(3000);
}
console.log('winners', drawn.body.winnerList, 'beaconHash', drawn.body.beaconHash);
console.log('verify', JSON.stringify((await call('GET', `/raffles/${created.id}/verify`)).body));
