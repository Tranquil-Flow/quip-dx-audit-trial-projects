const { JsonRpcProvider, Contract, formatEther, formatUnits } = require('ethers');
const RPC = process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org'; // ChainList screenshot 0078
const EOA = '0x530e633464aB126DC899808F002fAB34A161C603';
const ACCOUNT = '0x4E42b8c67cBEd13215e5a17B1A13561CcAf406E2';
const TOKEN = '0x3FA171F6a54215B788F11d905261698A0F749f6a';
const ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
async function main() {
  const p = new JsonRpcProvider(RPC);
  const network = await p.getNetwork();
  if (network.chainId !== 84532n) throw new Error('Wrong chain: ' + network.chainId);
  const t = new Contract(TOKEN, ABI, p);
  const decimals = await t.decimals();
  console.log('chain', String(network.chainId), 'token code bytes', (await p.getCode(TOKEN)).length, 'symbol', await t.symbol(), 'decimals', String(decimals));
  for (const [name, addr] of [['EOA',EOA],['Quip',ACCOUNT]]) {
    console.log(name, addr, 'ETH', formatEther(await p.getBalance(addr)), 'tUSD', formatUnits(await t.balanceOf(addr), decimals));
  }
}
main().catch(e => {console.error(e);process.exitCode=1});
