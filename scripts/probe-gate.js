// Probe the omnibus contract gating on Base Sepolia via eth_call simulations.
const { ethers } = require("ethers");
const abi = require("../omnibus_abi.json");

const RPC = "https://sepolia.base.org";
const OMNI = "0xf780Fc9C066D824bFF85758E381A3919B1817f09";
const FACTORY = "0x6de121f7cc8b310adbc957425b97e1c8dfce3be5";

const provider = new ethers.JsonRpcProvider(RPC);
const iface = new ethers.Interface(abi);

const now = Math.floor(Date.now() / 1000);
const terms = [
  84532n,
  ethers.ZeroAddress,
  ethers.ZeroAddress,
  BigInt(now + 3600),
  BigInt(now + 7200),
  BigInt(now + 10800),
  [],
];

async function sim(from, call, value = 0n) {
  try {
    const res = await provider.call({ from, to: OMNI, data: call, value });
    console.log("  OK:", res);
  } catch (e) {
    let reason = e.shortMessage || e.message;
    if (e.data) {
      try {
        const err = iface.parseError(e.data);
        reason = `custom: ${err.name}(${err.args.map(String).join(", ")})`;
      } catch (_) {}
    }
    console.log("  REVERT:", reason);
  }
}

(async () => {
  const secret = ethers.ZeroHash;
  const lock = ethers.keccak256(secret);
  const eoa = "0x1111111111111111111111111111111111111111";

  console.log("=== commit from EOA, empty sig ===");
  await sim(eoa, iface.encodeFunctionData("commit", [lock, terms, terms, ["0x" + "00".repeat(32), "0x"]]));

  console.log("=== commit from EOA, some sig ===");
  await sim(eoa, iface.encodeFunctionData("commit", [lock, terms, terms, ["0x" + "00".repeat(32), "0x" + "11".repeat(64)]]));

  console.log("=== claim from EOA ===");
  await sim(eoa, iface.encodeFunctionData("claim", [secret, terms, terms]));

  console.log("=== reclaim from EOA ===");
  await sim(eoa, iface.encodeFunctionData("reclaim", [lock, terms, terms]));

  console.log("=== commit from factory addr, empty sig ===");
  await sim(FACTORY, iface.encodeFunctionData("commit", [lock, terms, terms, ["0x" + "00".repeat(32), "0x"]]));

  console.log("=== claim from factory addr ===");
  await sim(FACTORY, iface.encodeFunctionData("claim", [secret, terms, terms]));
})();
