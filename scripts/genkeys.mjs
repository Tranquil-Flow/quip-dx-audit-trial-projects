// Generates brand-new throwaway testnet keys into ./keys (never reuses any existing wallet).
import { Wallet } from 'ethers';
import { writeFileSync, existsSync } from 'fs';
const names = ['organizer', 'alice', 'bob', 'carol', 'dave'];
for (const n of names) {
  const f = `keys/${n}.json`;
  if (existsSync(f)) continue;
  const w = Wallet.createRandom();
  writeFileSync(f, JSON.stringify({ name: n, address: w.address, privateKey: w.privateKey, note: 'THROWAWAY Aglais testnet key' }, null, 2), { mode: 0o600 });
  console.log(n, w.address);
}
