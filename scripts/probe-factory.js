const { ethers } = require("ethers");
const walletAbi = require("../wallet_abi.json");
const factoryAbi = require("../factory_abi.json");

const provider = new ethers.JsonRpcProvider("https://base-sepolia-rpc.publicnode.com");

(async () => {
  const addrs = {
    omnibusFactory: "0x6de121f7cc8b310adbc957425b97e1c8dfce3be5",
    appDefaultFactory: "0xdCD90563B912f82D2f23d5c7988B3Fec2da63471",
    shrincsWalletImpl: "0x33d3949117c8Bba7A3637C96a564a817E00c5aE0",
    shrincsVerifier: "0xE6F2970bA30d59e8288b7007bA755828372457c3",
  };
  for (const [k, a] of Object.entries(addrs)) {
    const code = await provider.getCode(a);
    console.log(k, a, "codeBytes:", (code.length - 2) / 2);
  }

  const fac = new ethers.Contract(addrs.omnibusFactory, factoryAbi, provider);
  try { console.log("factory.latestWalletImpl:", await fac.latestWalletImpl()); } catch (e) { console.log("latestWalletImpl err:", e.shortMessage || e.message); }
  try { console.log("factory.creationFee:", (await fac.creationFee()).toString()); } catch (e) { console.log("creationFee err:", e.shortMessage); }
  try { console.log("factory.owner:", await fac.owner()); } catch (e) { console.log("owner err:", e.shortMessage); }
  try {
    const vc = await fac.getVettedCodeCount();
    console.log("vettedCodeCount:", vc.toString());
    for (let i = 0n; i < vc; i++) console.log("  vetted[", i, "]:", await fac.getVettedCodeAt(i));
  } catch (e) { console.log("vet err:", e.shortMessage || e.message); }
  // try a known vaultId
  try { console.log("wallets(keccak('a')):", await fac.wallets(ethers.id("a"))); } catch (e) { console.log("wallets err:", e.shortMessage || e.message); }
})();
