// Shared viem clients + constants for the settlement run.
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const BASE_SEPOLIA_RPC =
  process.env.RPC_URL || "http://127.0.0.1:8545"; // default: local fork of Base Sepolia

export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [BASE_SEPOLIA_RPC] } },
});

export function publicClient() {
  return createPublicClient({ chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });
}
export function walletFor(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({ account, chain: baseSepolia, transport: http(BASE_SEPOLIA_RPC) });
}

// Live Quip Network contracts on Base Sepolia (from @quip.network/ethereum-sdk@beta
// dist/src/v1/shrincs/addresses.js + v1/addresses.json). CREATE3-deterministic, so
// the same addresses appear on the fork.
export const QUIP = {
  chainId: 84532,
  WalletFactory: "0xA2B2F71456a799FCf4EF7A3111c4B96b3e928cc8",
  ShrincsWalletImplementation: "0xc4E4652898bB12C4f0Ba9083829689B1963135E7",
  ShrincsVerifier: "0xF2f9E6D692da41b089c3c261c41509669eEc5567",
  ShrincsPaymaster: "0xC4209cD353CF7B1dbBf6F6B4d08bC5461aC7E145",
  EntryPointV07: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
};

// Anvil/local dev chain built-in funded account, used ONLY as a gas faucet on the
// local fork. Not used as a trading party.
export const LOCAL_FAUCET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
