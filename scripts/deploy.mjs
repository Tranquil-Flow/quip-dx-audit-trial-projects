import { ContractFactory, formatEther } from "ethers";
import { ARTIFACT_PATH, CHAIN_ID, DEPLOYMENT_PATH, EXPLORER_URL, GAS_PRICE, RPC_URL, assertChain, readJson, signer, writeJson } from "./config.mjs";

const wallet = signer();
const network = await wallet.provider.getNetwork();
assertChain(network);
const balance = await wallet.provider.getBalance(wallet.address);
if (balance === 0n) throw new Error(`Wallet ${wallet.address} has no AGLS; fund it from the official faucet first`);

const artifact = readJson(ARTIFACT_PATH);
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const contract = await factory.deploy({ gasPrice: GAS_PRICE, type: 0 });
const tx = contract.deploymentTransaction();
console.log(JSON.stringify({ stage: "submitted", hash: tx.hash, from: wallet.address }, null, 2));
const receipt = await tx.wait(1);
if (!receipt || receipt.status !== 1) throw new Error(`Deployment failed: ${tx.hash}`);
const address = await contract.getAddress();
const result = {
  network: "Aglais Testnet (Quip Network)",
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL,
  explorerUrl: EXPLORER_URL,
  deployer: wallet.address,
  deployerBalanceBefore: formatEther(balance),
  contractAddress: address,
  deploymentTransactionHash: tx.hash,
  deploymentBlockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString(),
  deployedAt: new Date().toISOString()
};
writeJson(DEPLOYMENT_PATH, result);
console.log(JSON.stringify(result, null, 2));
