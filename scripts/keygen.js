// Creates a brand-new throwaway TESTNET key in ./keys/testnet.json and requests faucet funds.
import { Wallet } from 'ethers';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const file = './keys/testnet.json';
mkdirSync('./keys', { recursive: true });
if (existsSync(file)) {
  console.log('keys/testnet.json already exists; refusing to overwrite');
  process.exit(0);
}
const w = Wallet.createRandom();
writeFileSync(file, JSON.stringify({ address: w.address, privateKey: w.privateKey, note: 'throwaway Aglais testnet key' }, null, 2), { mode: 0o600 });
console.log('new throwaway address', w.address);

const r = await fetch('https://faucet.aglais.quip.network/request', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ dest: w.address }),
});
console.log('faucet', r.status, await r.text());
