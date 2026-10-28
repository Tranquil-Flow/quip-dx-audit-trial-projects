import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 60000 }); await p.waitForTimeout(2500);
console.log(await p.innerText('body')); await b.close();
