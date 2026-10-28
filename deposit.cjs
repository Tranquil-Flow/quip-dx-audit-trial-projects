const fs = require('node:fs');
const { JsonRpcProvider, Wallet, Contract, parseUnits, formatEther } = require('ethers');
const RPC = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'; // Seen on ChainList screenshot 0078.
const EOA = '0x530e633464aB126DC899808F002fAB34A161C603';
const ACCOUNT = '0x4E42b8c67cBEd13215e5a17B1A13561CcAf406E2';
const TOKEN = '0x3FA171F6a54215B788F11d905261698A0F749f6a';
const ABI = ['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)'];
async function main() {
  const provider = new JsonRpcProvider(RPC);
  const chain = await provider.getNetwork();
  if (chain.chainId !== 84532n) throw new Error('Wrong chain');
  const wallet = new Wallet(fs.readFileSync('./keys/wallet.key','utf8').trim(), provider);
  if (wallet.address.toLowerCase() !== EOA.toLowerCase()) throw new Error('Wrong wallet address');
  const token = new Contract(TOKEN, ABI, wallet);
  const amount = parseUnits('15',18);
  if (await token.balanceOf(ACCOUNT) >= amount) { console.log('Already deposited at least 15 tUSD; skipping'); return; }
  if (await token.balanceOf(EOA) < amount) throw new Error('Insufficient tUSD');
  const gas = await token.transfer.estimateGas(ACCOUNT, amount);
  const fee = await provider.getFeeData();
  const ceiling = gas * (fee.maxFeePerGas || fee.gasPrice || 0n);
  if (ceiling > parseUnits('0.001',18)) throw new Error('Estimated gas exceeds 0.001 ETH');
  console.log('Transfer plan: 15 tUSD from EOA to Quip account on Base Sepolia; gas limit estimate', String(gas), 'max ETH fee',formatEther(ceiling));
  const tx = await token.transfer(ACCOUNT, amount);
  console.log('tx', tx.hash, 'https://sepolia.basescan.org/tx/'+tx.hash);
  const receipt = await tx.wait(1);
  console.log('receipt status',receipt.status,'block',receipt.blockNumber,'gas used',String(receipt.gasUsed));
  if(receipt.status !== 1) throw new Error('Transfer reverted');
  console.log('Quip token balance',String(await token.balanceOf(ACCOUNT)));
}
main().catch(e=>{console.error(e);process.exitCode=1});
