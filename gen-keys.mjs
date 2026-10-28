// Generates brand-new throwaway testnet EOAs (party A = maker, party B = taker). Refuses to overwrite.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
mkdirSync("keys", { recursive: true });
for (const name of ["partyA", "partyB", "relayer"]) {
  const f = `keys/${name}.eoa.json`;
  if (existsSync(f)) { console.log("exists, skipping", f); continue; }
  const pk = generatePrivateKey();
  writeFileSync(f, JSON.stringify({ role: name, address: privateKeyToAccount(pk).address, privateKey: pk }, null, 2), { mode: 0o600 });
  console.log(name, privateKeyToAccount(pk).address);
}
