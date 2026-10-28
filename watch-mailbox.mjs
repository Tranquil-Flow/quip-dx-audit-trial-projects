import { existsSync } from 'node:fs';
import { JsonRpcProvider, Contract, formatEther, formatUnits } from 'ethers';
const provider = new JsonRpcProvider('https://sepolia.base.org', 84532, { staticNetwork: true });
const account='0x23df35bECCa4ceb4a65A6B396F4A65A32a17887a';
const token=new Contract('0xf876820fF653A8B37adA2d7c0C293Ca202826526',['function balanceOf(address) view returns (uint256)'],provider);
for (let i=1;i<=90;i++) {
  try {
    const [network,block,eth,qty]=await Promise.all([provider.getNetwork(),provider.getBlockNumber(),provider.getBalance(account),token.balanceOf(account)]);
    if(network.chainId!==84532n) throw Error('Wrong chain');
    const mailbox=existsSync('/private/tmp/projects/swapchat-697/taker.md');
    console.log(`check ${i}: block ${block}, account ${formatEther(eth)} ETH + ${formatUnits(qty,18)} QTEST, taker.md ${mailbox?'present':'absent'}`);
    if(mailbox || eth!==12000000000000000n || qty!==100000000000000000000n) {
      console.log('PROGRESS DETECTED: inspect mailbox and chain before acting');
      process.exit(0);
    }
  } catch(e) { console.log(`check ${i} error: ${e.message}`); }
  if(i<90) await new Promise(resolve=>setTimeout(resolve,60000));
}
console.log('No taker progress after 90 one-minute checks; stop waiting.');
