const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("=== DEPLOYMENT ===");
  console.log("Deploying Counter with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const Counter = await ethers.getContractFactory("Counter");
  const counter = await Counter.deploy();
  await counter.waitForDeployment();

  const contractAddress = await counter.getAddress();
  const network = await ethers.provider.getNetwork();
  console.log("Counter deployed to:", contractAddress);
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

  // Read initial count
  const initialCount = await counter.count();
  console.log("\n=== INTERACTION ===");
  console.log("Initial count:", initialCount.toString());

  // Increment 3 times
  for (let i = 1; i <= 3; i++) {
    console.log(`\nCalling increment() #${i}...`);
    const tx = await counter.increment();
    const receipt = await tx.wait();
    console.log(`  Tx hash: ${receipt.hash}`);
    console.log(`  Block: ${receipt.blockNumber}`);
    const currentCount = await counter.count();
    console.log(`  Count now: ${currentCount.toString()}`);
  }

  const finalCount = await counter.count();
  console.log("\n=== SUMMARY ===");
  console.log("Final count:", finalCount.toString());

  const results = {
    contractAddress,
    deployerAddress: deployer.address,
    chainId: network.chainId.toString(),
    networkName: network.name,
    initialCount: initialCount.toString(),
    finalCount: finalCount.toString(),
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync("deployment.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to deployment.json");
}

main().then(() => process.exit(0)).catch((error) => { console.error(error); process.exit(1); });
