import { JsonRpcProvider, formatEther } from 'ethers';

const provider = new JsonRpcProvider('https://evm-rpc.aglais.quip.network:20049', 20033, { staticNetwork: true });
const hash = '0x5cf6d371e8f278795038723bcccf4b862c8e55f322b9413fb738ea41b5f5ef6d';
const sender = '0x9884f36a6F4C35eE3e13f79E49881a964d24F567';
const recipient = '0xdB109ac2057C84fb0d0f77fe660aF4f93fECe6f1';
const [network, tx, receipt, recipientBalance] = await Promise.all([
  provider.getNetwork(), provider.getTransaction(hash), provider.getTransactionReceipt(hash), provider.getBalance(recipient)
]);
if (network.chainId !== 20033n || !tx || !receipt || receipt.status !== 1 || tx.from !== sender || tx.to?.toLowerCase() !== recipient.toLowerCase()) {
  throw new Error('Aglais transaction verification failed');
}
console.log(JSON.stringify({ chainId: Number(network.chainId), hash, from: tx.from, to: tx.to, value: formatEther(tx.value), status: receipt.status, blockNumber: receipt.blockNumber, recipientBalance: formatEther(recipientBalance), note: 'EOA transfer, not a Quip PQ account transfer' }));
