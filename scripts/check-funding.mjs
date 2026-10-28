import { loadEoa, publicClient, RPC } from "./lib.mjs";
import { formatEther, parseEther } from "viem";
let ok = true;
for (const n of ["alice", "bob"]) {
  const a = loadEoa(n).address, b = await publicClient.getBalance({ address: a });
  console.log(`${n} ${a}: ${formatEther(b)} ETH on ${RPC}`);
  if (b < parseEther("0.0006")) ok = false;
}
if (!ok) { console.error("Fund both EOAs with >= 0.0006 Base Sepolia ETH (0.002 recommended), then re-run."); process.exit(2); }
