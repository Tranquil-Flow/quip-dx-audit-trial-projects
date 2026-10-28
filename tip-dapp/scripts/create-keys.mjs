// New disposable Aglais-testnet-only credentials. NEVER log private material.
import { randomBytes } from 'node:crypto';
import { mkdir, open } from 'node:fs/promises';
import { Wallet } from 'ethers';
await mkdir('keys', { mode: 0o700, recursive: true });
for (const name of ['deployer', 'creator']) {
  const w = Wallet.createRandom();
  const file = await open(`keys/${name}.json`, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify({ privateKey: w.privateKey }) + '\n'); }
  finally { await file.close(); }
  console.log(`${name} address: ${w.address}`);
}
const seed = await open('keys/quip-seed.json', 'wx', 0o600);
try { await seed.writeFile(JSON.stringify({ seed: `0x${randomBytes(64).toString('hex')}` }) + '\n'); }
finally { await seed.close(); }
console.log('New Quip signer seed saved in keys/quip-seed.json (not printed)');
