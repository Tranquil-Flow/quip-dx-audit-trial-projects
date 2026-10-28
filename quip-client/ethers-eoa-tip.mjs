// Mirrors web/app.js sendTip() (ethers v6) with a Wallet signer instead of an injected wallet.
import { readFileSync } from "fs";
import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
const provider = new JsonRpcProvider("https://evm-rpc.aglais.quip.network:20049", 20033, { staticNetwork: true });
const signer = new Wallet(readFileSync(new URL("../keys/deployer.key", import.meta.url), "utf8").trim(), provider);
const jar = new Contract("0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b",
  ["function tip(address creator, address token, uint256 tokenAmount, string message) payable"], signer);
const creator = readFileSync(new URL("../keys/creator.addr", import.meta.url), "utf8").trim();
const tx = await jar.tip(creator, "0x0000000000000000000000000000000000000000", 0n, "classical EOA tip via ethers", { value: parseEther("0.001") });
console.log("sent", tx.hash, "gasLimit", tx.gasLimit.toString(), "type", tx.type);
const r = await tx.wait();
console.log("status", r.status, "block", r.blockNumber, "gasUsed", r.gasUsed.toString());
