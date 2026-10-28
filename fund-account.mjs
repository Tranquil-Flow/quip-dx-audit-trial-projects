import { readFileSync } from 'node:fs';
import { JsonRpcProvider, Wallet, parseEther, formatEther, getAddress } from 'ethers';

const raw = readFileSync('./keys/wallet.key', 'utf8').trim();
let secret = raw;
if (raw.startsWith('{')) {
  const parsed = JSON.parse(raw);
  secret = parsed.privateKey ?? parsed.key;
}
if (!secret) throw Error('Wallet key format unsupported');
if (!secret.startsWith('0x')) secret = '0x' + secret;
const provider = new JsonRpcProvider('https://sepolia.base.org', 84532, { staticNetwork: true });
const wallet = new Wallet(secret, provider);
const account = getAddress('0x23df35bECCa4ceb4a65A6B396F4A65A32a17887a');
if (wallet.address.toLowerCase() !== '0xa3ba936060bf501cc1081e15ff6b37d2cca659d6') throw Error('Unexpected wallet address');
const before = await Promise.all([provider.getBalance(wallet.address), provider.getBalance(account)]);
console.log('chain:', (await provider.getNetwork()).chainId.toString());
console.log('owner:', wallet.address, formatEther(before[0]), 'ETH');
console.log('quip account:', account, formatEther(before[1]), 'ETH');
if (process.argv.includes('--send')) {
  const amount = parseEther('0.012');
  if (before[0] < parseEther('0.02')) throw Error('Insufficient owner balance');
  if (before[1] !== 0n) throw Error('Account already funded; refusing double funding');
  const tx = await wallet.sendTransaction({ to: account, value: amount });
  console.log('funding tx:', tx.hash);
  const receipt = await tx.wait();
  console.log('receipt status:', receipt.status, 'block:', receipt.blockNumber);
  console.log('balances after:', formatEther(await provider.getBalance(wallet.address)), formatEther(await provider.getBalance(account)));
}
