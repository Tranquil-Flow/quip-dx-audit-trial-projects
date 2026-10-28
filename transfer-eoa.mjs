import { readFileSync } from 'node:fs';
import { JsonRpcProvider, Wallet, parseEther, formatEther } from 'ethers';

// A fallback Aglais EOA smoke test, NOT a Quip post-quantum-account transfer.
// The key files are local disposable testnet keys. Never print their contents.
const rpc = 'https://evm-rpc.aglais.quip.network:20049';
const provider = new JsonRpcProvider(rpc, 20033, { staticNetwork: true });
const chain = await provider.getNetwork();
if (chain.chainId !== 20033n) throw new Error('Not Aglais testnet');
const sender = new Wallet(readFileSync('./keys/wallet.key', 'utf8').trim(), provider);
const recipient = new Wallet(readFileSync('./keys/recipient.key', 'utf8').trim()).address;
if (sender.address !== '0x9884f36a6F4C35eE3e13f79E49881a964d24F567') throw new Error('Unexpected sender');
const amount = parseEther('0.001');
const before = await provider.getBalance(sender.address);
const targetBefore = await provider.getBalance(recipient);
console.log(JSON.stringify({chain: Number(chain.chainId), sender: sender.address, recipient, senderBefore: formatEther(before), recipientBefore: formatEther(targetBefore), kind: 'EOA fallback; not Quip PQ account'}));
try {
  // The Aglais pallet-revive EVM RPC estimates ~2.7M gas even for a native transfer.
  const estimatedGas = await provider.estimateGas({ from: sender.address, to: recipient, value: amount });
  const tx = await sender.sendTransaction({ type: 0, to: recipient, value: amount, gasLimit: estimatedGas + 200000n, gasPrice: 1000000000n });
  console.log('transaction hash:', tx.hash);
  const receipt = await tx.wait(1, 90000);
  if (!receipt || receipt.status !== 1) throw new Error('Transfer was not confirmed successful');
  const senderAfter = await provider.getBalance(sender.address);
  const recipientAfter = await provider.getBalance(recipient);
  console.log(JSON.stringify({transactionHash: tx.hash, blockNumber: receipt.blockNumber, status: receipt.status, senderAfter: formatEther(senderAfter), recipientAfter: formatEther(recipientAfter), transferred: formatEther(recipientAfter - targetBefore)}));
} catch (err) {
  // Do not echo signed transaction payload or key material in verbose provider errors.
  console.error('Transaction failed:', err.shortMessage ?? err.message?.split('(')[0] ?? 'unknown error', 'RPC code:', err.error?.code ?? 'none');
  process.exitCode = 1;
}
