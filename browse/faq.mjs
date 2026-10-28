import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('https://account.quip.network/faq', { waitUntil: 'networkidle' });
for (const el of await p.$$('text=▸')) { await el.click().catch(()=>{}); }
for (const q of ['What is a firewall contract?','Is there an extra cost','Can I withdraw','Can I use other apps','How will the QUIP token']) await p.click(`text=${q}`).catch(()=>{});
await p.waitForTimeout(1500);
const t = await p.innerText('main').catch(()=>p.innerText('body')); console.log(t.slice(0,5000));
await p.goto('https://account.quip.network/changelog', { waitUntil: 'networkidle' }); await p.waitForTimeout(8000);
console.log('---- CHANGELOG ----\n', (await p.innerText('body')).slice(0,5000));
await p.screenshot({path:'../notes/changelog.png'});
await b.close();
