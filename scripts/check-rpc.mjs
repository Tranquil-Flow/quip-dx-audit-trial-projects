import { formatUnits } from "ethers";
import { CHAIN_ID, RPC_URL, provider } from "./config.mjs";

const rpc = provider();
const [network, blockNumber, feeData] = await Promise.all([
  rpc.getNetwork(),
  rpc.getBlockNumber(),
  rpc.getFeeData()
]);
if (Number(network.chainId) !== CHAIN_ID) throw new Error(`Expected chain ${CHAIN_ID}, got ${network.chainId}`);
console.log(JSON.stringify({
  rpcUrl: RPC_URL,
  chainId: Number(network.chainId),
  blockNumber,
  gasPriceGwei: feeData.gasPrice == null ? null : formatUnits(feeData.gasPrice, "gwei")
}, null, 2));
