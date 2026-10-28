import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('https://account.quip.network/faq', { waitUntil: 'networkidle' });
await p.$$eval('details', ds => ds.forEach(d => d.open = true));
const btns = await p.$$('button'); for (const x of btns) { const t = (await x.innerText()).trim(); if (t.endsWith('?') || t.includes('▸')) await x.click().catch(()=>{}); }
await p.waitForTimeout(1500);
console.log((await p.innerText('body')).slice(0,6000));
await p.screenshot({path:'../notes/faq.png', fullPage:true});
await b.close();
