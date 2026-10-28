import fs from "node:fs";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
const RPC = "https://evm-rpc.aglais.quip.network:20049/";
const owner = privateKeyToAccount(JSON.parse(fs.readFileSync("keys/owner.json")).privateKey);
const pc = createPublicClient({ transport: http(RPC) });
const id = await pc.getChainId();
const chain = { id, name: "aglais", nativeCurrency: { name: "QUIP", symbol: "QUIP", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } };
const wc = createWalletClient({ account: owner, chain, transport: http(RPC) });
console.log("chain", id, "balance", formatEther(await pc.getBalance({ address: owner.address })));
// initcode returning runtime 0x602a60005260206000f3 (returns 42)
const hash = await wc.deployContract({ abi: [], bytecode: "0x600a600c600039600a6000f3602a60005260206000f3" });
console.log("deploy tx", hash);
const r = await pc.waitForTransactionReceipt({ hash, timeout: 120000 });
console.log(r.status, r.contractAddress, await pc.getCode({ address: r.contractAddress }));
