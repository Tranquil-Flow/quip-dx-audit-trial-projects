// Independent check: re-read every tx hash / address in evidence/*.json straight from the RPC.
//   RPC_URL=http://127.0.0.1:8547 npx tsx src/verify-evidence.ts
import { readdirSync, readFileSync } from "node:fs";
import { createPublicClient, http } from "viem";
const pub = createPublicClient({ transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8547") });
let bad = 0;
for (const f of readdirSync("evidence").filter(f => f.endsWith(".json"))) {
  const ev = JSON.parse(readFileSync(`evidence/${f}`, "utf8"));
  console.log("==", f);
  for (const [k, h] of Object.entries<string>({ ...(ev.txs ?? {}), ...(ev.tokenDeployTx ? { tokenDeploy: ev.tokenDeployTx } : {}) })) {
    const r = await pub.getTransactionReceipt({ hash: h as `0x${string}` }).catch(() => null);
    const ok = r?.status === "success"; if (!ok) bad++;
    console.log(ok ? "ok  " : "FAIL", k.padEnd(10), h, r ? `block ${r.blockNumber} gas ${r.gasUsed}` : "not found");
  }
  for (const [k, a] of Object.entries<string>({ omnibus: ev.omnibus, token: ev.token, walletA: ev.walletA, walletB: ev.walletB }).filter(([, a]) => a)) {
    const c = await pub.getCode({ address: a as `0x${string}` }); const ok = !!c && c.length > 2; if (!ok) bad++;
    console.log(ok ? "ok  " : "FAIL", `code(${k})`.padEnd(12), a, `${((c?.length ?? 2) - 2) / 2} bytes`);
  }
}
console.log(bad ? `${bad} FAILURES` : "all evidence verified on-chain"); process.exit(bad ? 1 : 0);
