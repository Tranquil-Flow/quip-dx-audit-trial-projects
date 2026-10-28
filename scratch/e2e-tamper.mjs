import { chromium } from "playwright";
const port = process.argv[2] || 3111;
const b = await chromium.launch();
const p = await b.newPage();
p.on("pageerror", e => console.log("pageerror:", e.message));
await p.route("**/api/verify", async route => {
  const body = JSON.parse(route.request().postData());
  if (process.env.TAMPER) body.message += "!";
  await route.continue({ postData: JSON.stringify(body) });
});
await p.goto(`http://localhost:${port}`);
await p.click("button");
await p.waitForFunction(() => document.querySelector("pre").innerText.split("\n").length >= 2, null, {timeout: 90000});
console.log(await p.innerText("pre"));
await b.close();
