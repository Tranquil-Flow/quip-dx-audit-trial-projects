// Mirrors web/app.js loadTips() with a JsonRpcProvider, to check the read path against Aglais.
import { JsonRpcProvider, Contract, formatEther } from "ethers";
const provider = new JsonRpcProvider("https://evm-rpc.aglais.quip.network:20049", 20033, { staticNetwork: true });
const jar = new Contract("0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b",
  ["event Tipped(address indexed tipper, address indexed creator, uint256 ethAmount, address token, uint256 tokenAmount, string message)"], provider);
const latest = await provider.getBlockNumber();
const events = await jar.queryFilter(jar.filters.Tipped(), Math.max(0, latest - 5000), latest);
for (const e of events) console.log(e.args.tipper, "->", e.args.creator, formatEther(e.args.ethAmount), JSON.stringify(e.args.message), e.transactionHash);
console.log("events:", events.length, "range", latest - 5000, latest);
