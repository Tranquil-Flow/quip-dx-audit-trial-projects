// Tip TipJar on Quip's Aglais testnet FROM a Quip post-quantum (SHRINCS) account.
//
// The classical owner EOA (keys/deployer.key) only submits and pays gas; the call into TipJar is
// authorized by a one-time SHRINCS signature and made by the Quip account contract, so
// TipJar sees msg.sender == the Quip account.
//
// usage: node tip.mjs <creator> <amountAGLS> [message]
// state: ../keys/quip-mnemonic.txt (created on first run, never printed), ./quip-stack.json
import { readFileSync, writeFileSync, existsSync } from "fs";
import { createPublicClient, createWalletClient, http, custom, defineChain, encodeFunctionData, getAddress, parseEther, formatEther, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ShrincsSigner, ShrincsFactoryClient, generateMnemonic } from "@quip.network/ethereum-sdk/v1/shrincs";

const KEYS = new URL("../keys/", import.meta.url);
const stack = JSON.parse(readFileSync(new URL("./quip-stack.json", import.meta.url)));
const TIPJAR = process.env.TIPJAR ?? "0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b";
const RPC = process.env.RPC ?? "https://evm-rpc.aglais.quip.network:20049";
const MAX_SIGNATURES = 16; // tiny one-time-signature budget: keygen is fast and this is a throwaway testnet account
const DERIVATION_INDEX = 0;

const aglais = defineChain({
  id: 20033,
  name: "Aglais Testnet (Quip Network)",
  nativeCurrency: { name: "AGLS", symbol: "AGLS", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://explorer.aglais.quip.network" } },
});

const [creatorArg, amount = "0.01", message = "gm from a post-quantum account"] = process.argv.slice(2);
if (!creatorArg) throw new Error("usage: node tip.mjs <creator> <amountAGLS> [message]");
const creator = getAddress(creatorArg.toLowerCase());

const owner = privateKeyToAccount(readFileSync(new URL("deployer.key", KEYS), "utf8").trim());
const transport = http(RPC, { timeout: 300_000 });
const publicClient = createPublicClient({ chain: aglais, transport });
// The SDK passes `account` as a bare address to writeContract, so viem emits eth_sendTransaction
// (what an injected browser wallet handles). Aglais' public RPC has no node-managed accounts, so this
// EIP-1193 shim plays the injected wallet: it signs locally with the owner key and relays raw txs.
const rpcClient = createPublicClient({ chain: aglais, transport });
const injectedLike = custom({
  async request({ method, params }) {
    if (method === "eth_accounts" || method === "eth_requestAccounts") return [owner.address];
    if (method === "eth_sendTransaction") {
      const tx = params[0];
      const nonce = await rpcClient.getTransactionCount({ address: owner.address, blockTag: "pending" });
      const fees = await rpcClient.estimateFeesPerGas();
      const serialized = await owner.signTransaction({
        chainId: aglais.id, type: "eip1559", to: tx.to, data: tx.data, nonce,
        value: BigInt(tx.value ?? 0), gas: BigInt(tx.gas), ...fees,
      });
      return rpcClient.request({ method: "eth_sendRawTransaction", params: [serialized] });
    }
    return rpcClient.request({ method, params });
  },
});
const walletClient = createWalletClient({ chain: aglais, transport: injectedLike, account: owner });

const mnemonicFile = new URL("quip-mnemonic.txt", KEYS);
if (!existsSync(mnemonicFile)) writeFileSync(mnemonicFile, generateMnemonic(), { mode: 0o600 });
const signer = await ShrincsSigner.fromMnemonic(readFileSync(mnemonicFile, "utf8").trim());

const factory = new ShrincsFactoryClient({
  publicClient, walletClient, account: owner.address, chainId: aglais.id,
  factoryAddress: stack.walletFactory, walletImplementation: stack.shrincsWalletImpl,
});
const walletParams = {
  signer, maxSignatures: MAX_SIGNATURES, derivationIndex: DERIVATION_INDEX,
  erc1271: { derivationIndex: DERIVATION_INDEX + 1, maxSignatures: MAX_SIGNATURES },
};

let wallet;
try {
  wallet = await factory.getShrincsWallet({ ...walletParams, owner: owner.address });
  await wallet.getWalletState();
  console.log("Using existing Quip account", wallet.walletAddress);
} catch (e) {
  console.log("No Quip account yet (" + (e.shortMessage ?? e.message).split("\n")[0] + "); creating one...");
  wallet = await factory.createShrincsWallet(walletParams);
  console.log("Created Quip account", wallet.walletAddress);
}
const state = await wallet.getWalletState();
console.log(`owner ${state.owner}  leaves used ${state.statefulLeavesUsed}/${state.maxSignatures}  executeFee ${state.executeFee}`);

const data = encodeFunctionData({
  abi: parseAbi(["function tip(address creator, address token, uint256 tokenAmount, string message) payable"]),
  functionName: "tip",
  args: [creator, "0x0000000000000000000000000000000000000000", 0n, message],
});
const value = parseEther(amount);
const prepared = await wallet.prepareExecute({ target: TIPJAR, value, data });
console.log(`Signing with SHRINCS leaf ${prepared.leaf}; sending ${formatEther(prepared.totalValue)} AGLS...`);
const receipt = await prepared.send();
console.log("status", receipt.status, "tx", receipt.transactionHash, "block", receipt.blockNumber, "gasUsed", receipt.gasUsed);

const jarAbi = parseAbi(["function ethBalance(address) view returns (uint256)"]);
console.log("TipJar.ethBalance(creator) =", formatEther(await publicClient.readContract({ address: TIPJAR, abi: jarAbi, functionName: "ethBalance", args: [creator] })), "AGLS");
writeFileSync(new URL("./last-tip.json", import.meta.url), JSON.stringify({
  quipAccount: wallet.walletAddress, owner: owner.address, tipJar: TIPJAR, creator, amount, message,
  leaf: prepared.leaf, tx: receipt.transactionHash, block: receipt.blockNumber.toString(), status: receipt.status,
}, null, 2));
