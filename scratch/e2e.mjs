import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage();
p.on("console", m => console.log("console:", m.type(), m.text()));
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.goto("http://localhost:3111");
for (let i = 0; i < 2; i++) {
  await p.click("button");
  await p.waitForFunction(n => document.querySelector("pre").innerText.split("\n").length >= n, (i+1)*2, {timeout: 60000});
}
console.log(await p.innerText("pre"));
await b.close();
