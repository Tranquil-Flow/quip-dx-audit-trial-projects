import { readFileSync } from "fs";
import { toFunctionSelector, toEventSelector } from "viem";
import { shrincsWalletAbi } from "@quip.network/ethereum-sdk/v1/shrincs";
import * as abis from "@quip.network/ethereum-sdk/v1/abi";
const sel = (abi) => new Set(abi.filter(x => x.type === "function").map(x => toFunctionSelector(x) + " " + x.name));
const cmp = (name, sdk, built) => {
  const a = sel(sdk), b = sel(built);
  console.log(name, "sdk-only:", [...a].filter(x => !b.has(x)), "built-only:", [...b].filter(x => !a.has(x)));
};
const root = "../vendor/ethereum-sdk/out/";
cmp("ShrincsWallet", shrincsWalletAbi, JSON.parse(readFileSync(root + "ShrincsWallet.sol/ShrincsWallet.json")).abi);
console.log(Object.keys(abis));
const fa = abis.walletFactoryAbi || abis.WalletFactoryAbi || Object.values(abis).find(v=>Array.isArray(v) && v.some(x=>x.name==="deployLatestWalletProxy"));
if (fa) cmp("WalletFactory", fa, JSON.parse(readFileSync(root + "WalletFactory.sol/WalletFactory.json")).abi);
