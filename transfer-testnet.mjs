// Adapted from Base's "Make a Transaction" viem example, for Base Sepolia ONLY.
import { readFileSync } from 'node:fs';
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const rpc = 'https://sepolia.base.org'; // Official docs, screenshot 0126.png
const owner = '0xBF3d1ac8C7B4c2e1E7F95E70138Dd513FbE82ddB';
const recipient = '0xC18c217F8Bb02aFC574D4AE6609c605c7B78Edf9';
const account = privateKeyToAccount(readFileSync('./keys/wallet.key', 'utf8').trim());
if (account.address.toLowerCase() !== owner.toLowerCase()) throw new Error('Unexpected signing key');
const publicClient = createPublicClient({chain: baseSepolia, transport: http(rpc)});
const client = createWalletClient({account, chain: baseSepolia, transport: http(rpc)});
const chainId = await publicClient.getChainId();
if (chainId !== 84532) throw new Error(`Wrong network: ${chainId}`);
const amount = parseEther('0.005');
const beforeOwner = await publicClient.getBalance({address: owner});
const beforeRecipient = await publicClient.getBalance({address: recipient});
console.log(JSON.stringify({chainId, ownerBalanceBefore: formatEther(beforeOwner), recipientBalanceBefore: formatEther(beforeRecipient), amount: formatEther(amount)}));
if (beforeRecipient >= amount) {
  console.log('Already funded to the target amount; no additional transfer sent.');
  process.exit(0);
}
if (beforeOwner < amount + parseEther('0.0001')) throw new Error('Insufficient test ETH plus gas reserve');
const gas = await publicClient.estimateGas({account: owner, to: recipient, value: amount});
console.log('Estimated gas units:', gas.toString());
const hash = await client.sendTransaction({to: recipient, value: amount, gas});
console.log('Transfer tx:', hash);
const receipt = await publicClient.waitForTransactionReceipt({hash, timeout: 90000});
console.log(JSON.stringify({status: receipt.status, transactionHash: receipt.transactionHash, blockNumber: receipt.blockNumber.toString(), ownerBalanceAfter: formatEther(await publicClient.getBalance({address: owner})), recipientBalanceAfter: formatEther(await publicClient.getBalance({address: recipient}))}));
if (receipt.status !== 'success') process.exitCode = 1;
