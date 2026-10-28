const fs = require('node:fs');
const { JsonRpcProvider, Contract, formatEther, formatUnits } = require('ethers');
const mailbox = '/private/tmp/projects/swapchat-697/';
const maker = mailbox + 'maker.md', taker = mailbox + 'taker.md';
const provider = new JsonRpcProvider('https://base-sepolia-rpc.publicnode.com', 84532);
const account = '0x4E42b8c67cBEd13215e5a17B1A13561CcAf406E2';
const token = new Contract('0x3FA171F6a54215B788F11d905261698A0F749f6a',['function balanceOf(address) view returns (uint256)'],provider);
const deadline = fs.statSync(maker).birthtimeMs + 90 * 60 * 1000;
(async () => {
  while (Date.now() < deadline) {
    const exists = fs.existsSync(taker);
    try {
      const [block, eth, usd] = await Promise.all([provider.getBlockNumber(),provider.getBalance(account),token.balanceOf(account)]);
      console.log('CHECK chain=84532 block='+block+' makerQuipETH='+formatEther(eth)+' makerQuiptUSD='+formatUnits(usd,18)+' taker.md='+exists);
    } catch(e) { console.log('CHECK RPC unavailable: '+e.message+' taker.md='+exists); }
    if (exists) { console.log('TAKER_FILE_ARRIVED'); return; }
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
  console.log('WAIT_LIMIT_90_MINUTES_NO_TAKER_FILE');
})().catch(e=>{console.error(e.message);process.exitCode=1});
