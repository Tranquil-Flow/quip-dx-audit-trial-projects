const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  if (!fs.existsSync("deployment.json")) {
    throw new Error("deployment.json not found. Run deploy.js first.");
  }
  const deployment = JSON.parse(fs.readFileSync("deployment.json", "utf-8"));
  const contractAddress = deployment.contractAddress;

  console.log("Connecting to Counter at:", contractAddress);

  const Counter = await ethers.getContractFactory("Counter");
  const counter = Counter.attach(contractAddress);

  const initialCount = await counter.count();
  console.log("Initial count:", initialCount.toString());

  console.log("Calling increment()...");
  const tx = await counter.increment();
  const receipt = await tx.wait();
  console.log("Transaction hash:", receipt.hash);
  console.log("Block number:", receipt.blockNumber);

  const newCount = await counter.count();
  console.log("Count after increment:", newCount.toString());

  console.log("\nCalling increment() x2 more...");
  const tx2 = await counter.increment();
  await tx2.wait();
  console.log("Tx 2 hash:", tx2.hash);

  const tx3 = await counter.increment();
  await tx3.wait();
  console.log("Tx 3 hash:", tx3.hash);

  const finalCount = await counter.count();
  console.log("\nFinal count:", finalCount.toString());

  const results = {
    contractAddress,
    initialCount: initialCount.toString(),
    incrementTx1: receipt.hash,
    incrementTx2: tx2.hash,
    incrementTx3: tx3.hash,
    finalCount: finalCount.toString(),
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("interaction-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to interaction-results.json");
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
