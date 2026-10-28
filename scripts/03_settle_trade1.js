// scripts/03_settle_trade1.js
// Trade 1 — SETTLED (the happy path).
//
// Alice and Bob already exchanged post-quantum-signed orders off-chain
// (orders/trade1.json, verified in step 01). Now both legs settle on-chain
// through the Settlement escrow, driven exclusively by their Quip vaults —
// every vault action requires a fresh WOTS+ signature verified on-chain by
// QuipWallet.sol (via the deployed Quip WOTSPlus library).
//
//   commit (Alice, initiator, 0.5 ETH, longer window)
//   commit (Bob, counterparty, 0.25 ETH, shorter window)
//   execute (Alice reveals secret, claims Bob's leg)
//   execute (Bob reads revealed secret, claims Alice's leg)
//   -> BOTH SETTLED
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

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(path.join(PROJ, p), "utf8"));
}

async function main() {
  const dep = loadJSON("artifacts/deployment.json");
  const order = loadJSON("orders/trade1.json");
  const secretRec = loadJSON("orders/trade1.secret.json");
  const alice = loadJSON("keys/alice.json");
  const bob = loadJSON("keys/bob.json");
  const alicePq = loadJSON("keys/alice-pq.json");
  const bobPq = loadJSON("keys/bob-pq.json");

  const settlementAbi = JSON.parse(
    fs.readFileSync(path.join(PROJ, "artifacts/_fc/out/Settlement.sol/Settlement.json"), "utf8")
  );

  // Fresh settlement instance for this trade (idempotent re-runs).
  const deployer = new ethers.Wallet(
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    PROVIDER
  );
  const setFactory = new ethers.ContractFactory(
    settlementAbi.abi,
    settlementAbi.bytecode.object,
    deployer
  );
  const settlementC = await setFactory.deploy({
    nonce: await PROVIDER.getTransactionCount(deployer.address, "pending"),
  });
  await settlementC.waitForDeployment();
  const SETTLE = await settlementC.getAddress();
  console.log("fresh Settlement for trade 1 at", SETTLE);
  const settlement = settlementC;

  const secret = Buffer.from(secretRec.secret, "hex");
  const lock = ethers.hexlify(Buffer.from(keccak_256(secret)));

  // sanity: the on-chain lock must equal the one both parties signed off-chain
  if (Buffer.from(lock.slice(2), "hex").toString("hex") !== order.lock) {
    throw new Error("secret does not match the signed order's lock — refusing");
  }
  console.log("lock matches signed order:", order.lock.slice(0, 24) + "…");

  function vaultClient(eoaKey, pq, vaultAddr) {
    const wallet = new ethers.Wallet(eoaKey.privateKey, PROVIDER);
    const signer = new QuipSigner(Buffer.from(pq.quantumSecret, "hex"));
    const contract = QuipWallet__factory.connect(vaultAddr, wallet);
    return new QuipWalletClient(signer, Buffer.from(pq.vaultId, "hex"), contract);
  }
  const aliceVault = vaultClient(alice, alicePq, dep.aliceVault);
  const bobVault = vaultClient(bob, bobPq, dep.bobVault);

  const now = (await PROVIDER.getBlock("latest")).timestamp;
  const legA_amt = ethers.parseEther(order.maker.gives.amount); // 0.5 ETH
  const legB_amt = ethers.parseEther(order.taker.gives.amount); // 0.25 ETH
  const dlA = now + 3600; // initiator: longer window
  const dlB = now + 1800; // counterparty: shorter window
  const GAS = { gasLimit: 6000000n };

  const evidence = { trade: "trade1", network: "anvil-local", steps: [] };
  const bal = async (addr) => fmt(await PROVIDER.getBalance(addr));

  console.log("balances before:", "aliceVault", await bal(dep.aliceVault), "| bobVault", await bal(dep.bobVault));

  // ---- 1. Alice commits (initiator) via her Quip vault ---------------------
  const commitDataA = settlement.interface.encodeFunctionData("commit", [
    true, dep.bobVault, legA_amt, lock, dlA,
  ]);
  let rcpt = await aliceVault.executeWithWinternitz(SETTLE, commitDataA, {
    ...GAS, value: legA_amt,
  });
  evidence.steps.push({ step: "alice commit (PQ-signed vault call)", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[1] alice vault commit tx:", rcpt.hash);
  console.log("    legA:", await settlement.legA());

  // ---- 2. Bob commits (counterparty) via his Quip vault --------------------
  const commitDataB = settlement.interface.encodeFunctionData("commit", [
    false, dep.aliceVault, legB_amt, lock, dlB,
  ]);
  rcpt = await bobVault.executeWithWinternitz(SETTLE, commitDataB, {
    ...GAS, value: legB_amt,
  });
  evidence.steps.push({ step: "bob commit (PQ-signed vault call)", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[2] bob vault commit tx:", rcpt.hash);
  console.log("    legB:", await settlement.legB());

  // ---- 3. Alice reveals secret, claims Bob's leg ---------------------------
  const execDataA = settlement.interface.encodeFunctionData("execute", [1, secret]);
  rcpt = await aliceVault.executeWithWinternitz(SETTLE, execDataA, { ...GAS });
  evidence.steps.push({ step: "alice executes (reveals secret)", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[3] alice executes on bob leg (secret revealed on-chain):", rcpt.hash);

  // Bob reads the revealed secret straight off the chain (QuipSwap's "read
  // the published secret" step) and claims Alice's leg.
  const evs = await settlement.queryFilter(settlement.filters.Executed(), rcpt.blockNumber, rcpt.blockNumber);
  console.log("    Executed event secret:", evs[0].args.secret);
  const eventLock = Buffer.from(keccak_256(Buffer.from(evs[0].args.secret.slice(2), "hex"))).toString("hex");
  console.log("    keccak(revealed secret) == signed order lock:", eventLock === order.lock);

  // ---- 4. Bob claims Alice's leg with the secret from the event ------------
  const execDataB = settlement.interface.encodeFunctionData("execute", [0, evs[0].args.secret]);
  rcpt = await bobVault.executeWithWinternitz(SETTLE, execDataB, { ...GAS });
  evidence.steps.push({ step: "bob executes with revealed secret", tx: rcpt.hash, block: rcpt.blockNumber });
  console.log("[4] bob executes on alice leg:", rcpt.hash);

  // ---- final state ---------------------------------------------------------
  console.log("balances after:", "aliceVault", await bal(dep.aliceVault), "(started 0.5, gave 0.5, got 0.25)");
  console.log("                bobVault", await bal(dep.bobVault), "(started 0.25, gave 0.25, got 0.5)");
  console.log("                settlement", await bal(SETTLE));

  evidence.final = {
    aliceVaultBalance: await bal(dep.aliceVault),
    bobVaultBalance: await bal(dep.bobVault),
    settlementBalance: await bal(SETTLE),
    outcome: "BOTH LEGS SETTLED",
  };
  const jsonify = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
  fs.writeFileSync(path.join(PROJ, "artifacts/evidence-trade1.json"), JSON.stringify(jsonify(evidence), null, 2));
  console.log("wrote artifacts/evidence-trade1.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
