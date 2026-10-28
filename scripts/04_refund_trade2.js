// scripts/04_refund_trade2.js
// Trade 2 — REFUNDED / EXPIRED.
//
// Both parties committed (again via PQ-signed Quip vault calls) but nobody
// revealed the secret before the deadlines. After each deadline passes, each
// party reclaims their own committed leg. Net: everything refunded.
"use strict";
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { keccak_256 } = require("@noble/hashes/sha3");
const {
  QuipWallet__factory,
  QuipWalletClient,
  QuipSigner,
} = require("@quip.network/ethereum-sdk");

const PROJ = path.resolve(__dirname, "..");
const RPC = "http://127.0.0.1:8545";
const PROVIDER = new ethers.JsonRpcProvider(RPC);
const fmt = (v) => ethers.formatEther(v);
const loadJSON = (p) => JSON.parse(fs.readFileSync(path.join(PROJ, p), "utf8"));

async function main() {
  const dep = loadJSON("artifacts/deployment.json");
  const order = loadJSON("orders/trade2.json");
  const secretRec = loadJSON("orders/trade2.secret.json");
  const alice = loadJSON("keys/alice.json");
  const bob = loadJSON("keys/bob.json");
  const alicePq = loadJSON("keys/alice-pq.json");
  const bobPq = loadJSON("keys/bob-pq.json");

  const settlementAbi = JSON.parse(
    fs.readFileSync(path.join(PROJ, "artifacts/_fc/out/Settlement.sol/Settlement.json"), "utf8")
  );
  const settlement = new ethers.Contract(dep.settlement, settlementAbi.abi, PROVIDER);

  // Trade 2 needs a FRESH settlement instance (trade 1's contract is spent).
  const deployer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    PROVIDER
  );
  const setFactory = new ethers.ContractFactory(
    settlementAbi.abi,
    settlementAbi.bytecode.object,
    deployer
  );
  const settlement2 = await setFactory.deploy({
    nonce: await PROVIDER.getTransactionCount(deployer.address, "pending"),
  });
  await settlement2.waitForDeployment();
  console.log("fresh Settlement for trade 2 at", await settlement2.getAddress());
  const SETTLE2 = await settlement2.getAddress();

  const lock = ethers.hexlify(Buffer.from(keccak_256(Buffer.from(secretRec.secret, "hex"))));
  if (Buffer.from(lock.slice(2), "hex").toString("hex") !== order.lock) {
    throw new Error("secret does not match signed order lock");
  }
  console.log("lock matches signed order:", order.lock.slice(0, 24) + "…");

  const vaultClient = (eoaKey, pq, vaultAddr) => {
    const wallet = new ethers.Wallet(eoaKey.privateKey, PROVIDER);
    const signer = new QuipSigner(Buffer.from(pq.quantumSecret, "hex"));
    return new QuipWalletClient(
      signer,
      Buffer.from(pq.vaultId, "hex"),
      QuipWallet__factory.connect(vaultAddr, wallet)
    );
  };
  const aliceVault = vaultClient(alice, alicePq, dep.aliceVault);
  const bobVault = vaultClient(bob, bobPq, dep.bobVault);

  const now = (await PROVIDER.getBlock("latest")).timestamp;
  const legA_amt = ethers.parseEther(order.maker.gives.amount); // 0.3
  const legB_amt = ethers.parseEther(order.taker.gives.amount); // 0.15
  const dlA = now + 900; // initiator: longer window
  const dlB = now + 450; // counterparty: shorter window
  const GAS = { gasLimit: 6000000n };
  const bal = async (a) => fmt(await PROVIDER.getBalance(a));

  const evidence = { trade: "trade2", network: "anvil-local", steps: [] };
  console.log("balances before:", "aliceVault", await bal(dep.aliceVault), "| bobVault", await bal(dep.bobVault));

  // ---- commits -------------------------------------------------------------
  const commitA = settlement.interface.encodeFunctionData("commit", [true, dep.bobVault, legA_amt, lock, dlA]);
  let rcpt = await aliceVault.executeWithWinternitz(SETTLE2, commitA, { ...GAS, value: legA_amt });
  evidence.steps.push({ step: "alice commit", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[1] alice commit tx:", rcpt.hash);

  const commitB = settlement.interface.encodeFunctionData("commit", [false, dep.aliceVault, legB_amt, lock, dlB]);
  rcpt = await bobVault.executeWithWinternitz(SETTLE2, commitB, { ...GAS, value: legB_amt });
  evidence.steps.push({ step: "bob commit", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[2] bob commit tx:", rcpt.hash);

  console.log("    settlement holds:", await bal(SETTLE2), "(0.3 + 0.15)");

  // ---- nobody reveals; deadlines pass --------------------------------------
  console.log("[3] nobody executes. Fast-forwarding the chain past both deadlines…");
  await PROVIDER.send("evm_increaseTime", [901]);
  await PROVIDER.send("evm_mine", []);
  const now2 = (await PROVIDER.getBlock("latest")).timestamp;
  console.log("    chain time moved to", now2, "(legA reclaim open at", dlA + ", legB at", dlB + ")");

  // ---- reclaims -------------------------------------------------------------
  const reclaimA = settlement.interface.encodeFunctionData("reclaim", [0]);
  rcpt = await aliceVault.executeWithWinternitz(SETTLE2, reclaimA, { ...GAS });
  evidence.steps.push({ step: "alice reclaim legA", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[4] alice reclaim tx:", rcpt.hash);

  const reclaimB = settlement.interface.encodeFunctionData("reclaim", [1]);
  rcpt = await bobVault.executeWithWinternitz(SETTLE2, reclaimB, { ...GAS });
  evidence.steps.push({ step: "bob reclaim legB", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[5] bob reclaim tx:", rcpt.hash);

  // ---- final state ----------------------------------------------------------
  const aliceEnd = await bal(dep.aliceVault);
  const bobEnd = await bal(dep.bobVault);
  console.log("balances after:", "aliceVault", aliceEnd, "(expected +0.3 refund)");
  console.log("                bobVault", bobEnd, "(expected +0.15 refund)");
  console.log("                settlement", await bal(SETTLE2), "(expected 0)");

  evidence.final = {
    aliceVaultBalance: aliceEnd,
    bobVaultBalance: bobEnd,
    settlementBalance: await bal(SETTLE2),
    outcome: "EXPIRED — BOTH LEGS REFUNDED",
  };
  const jsonify = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
  fs.writeFileSync(path.join(PROJ, "artifacts/evidence-trade2.json"), JSON.stringify(jsonify(evidence), null, 2));
  console.log("wrote artifacts/evidence-trade2.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
