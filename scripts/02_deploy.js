// scripts/02_deploy.js
// Deploys REAL Quip contracts to local Anvil:
//   1. WOTSPlus library (from Quip's hashsigs-solidity, compiled locally)
//   2. QuipFactory (from @quip.network/ethereum-sdk artifacts) with the
//      library placeholder linked to the deployed WOTSPlus address
//   3. Quip vaults for Alice and Bob (created via QuipFactory, using the
//      SDK's QuipSigner — Quip's signing library)
//   4. Settlement.sol — our reference QuipSwap-style escrow
// Saves artifacts/deployment.json.
"use strict";
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { keccak_256 } = require("@noble/hashes/sha3");
const {
  QuipFactory__factory,
  QuipWallet__factory,
  QuipSigner,
} = require("@quip.network/ethereum-sdk");

const PROJ = path.resolve(__dirname, "..");
const RPC = "http://127.0.0.1:8545";
const PROVIDER = new ethers.JsonRpcProvider(RPC);

const deployer = new ethers.Wallet(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // anvil[0]
  PROVIDER
);

function linkLibrary(bytecode, libraryName, address) {
  // hardhat placeholder: "__$" + keccak256(libraryName).slice(0,34) + "$__"
  const hash = Buffer.from(keccak_256(Buffer.from(libraryName, "utf8")))
    .toString("hex")
    .slice(0, 34);
  const placeholder = `__$${hash}$__`;
  const count = bytecode.split(placeholder).length - 1;
  if (count === 0) throw new Error(`placeholder not found for ${libraryName}`);
  const linked = bytecode.split(placeholder).join(address.slice(2).toLowerCase());
  console.log(`linked ${count} refs of ${libraryName} -> ${address}`);
  return linked;
}

async function main() {
  const alice = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "alice.json")));
  const bob = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "bob.json")));
  const alicePq = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "alice-pq.json")));
  const bobPq = JSON.parse(fs.readFileSync(path.join(PROJ, "keys", "bob-pq.json")));

  // ---- 1. WOTSPlus library (Quip's hashsigs-solidity) ---------------------
  const wotsArtifact = JSON.parse(
    fs.readFileSync(path.join(PROJ, "artifacts/_fc/out/WOTSPlus.sol/WOTSPlus.json"), "utf8")
  );
  async function pendingNonce() {
    return PROVIDER.getTransactionCount(deployer.address, "pending");
  }
  const wotsFactory = new ethers.ContractFactory(
    wotsArtifact.abi,
    wotsArtifact.bytecode.object,
    deployer
  );
  const wots = await wotsFactory.deploy({ nonce: await pendingNonce() });
  await wots.waitForDeployment();
  const wotsAddr = await wots.getAddress();
  console.log("WOTSPlus library deployed at", wotsAddr);

  // ---- 2. QuipFactory, with the library linked ----------------------------
  const qfArtifact = JSON.parse(
    fs.readFileSync(
      path.join(PROJ, "node_modules/@quip.network/ethereum-sdk/artifacts/contracts/QuipFactory.sol/QuipFactory.json"),
      "utf8"
    )
  );
  const LIB = "@quip.network/hashsigs-solidity/contracts/WOTSPlus.sol:WOTSPlus";
  const linkedFactoryBytecode = linkLibrary(qfArtifact.bytecode, LIB, wotsAddr);

  const qfFactory = new ethers.ContractFactory(qfArtifact.abi, linkedFactoryBytecode, deployer);
  const factory = await qfFactory.deploy(alice.address, wotsAddr, { nonce: await pendingNonce() });
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("QuipFactory deployed at", factoryAddr);
  console.log("  creationFee:", (await factory.creationFee()).toString());

  // ---- 3. Quip vaults for Alice & Bob ------------------------------------
  async function createVault(ownerWallet, name, pq) {
    const vaultId = Buffer.from(pq.vaultId, "hex");
    const quipSigner = new QuipSigner(Buffer.from(pq.quantumSecret, "hex"));
    const keypair = quipSigner.generateKeyPair(vaultId);
    const tx = await factory
      .connect(ownerWallet)
      .depositToWinternitz(
        vaultId,
        ownerWallet.address,
        {
          publicSeed: ethers.hexlify(keypair.publicKey.publicSeed),
          publicKeyHash: ethers.hexlify(keypair.publicKey.publicKeyHash),
        },
        { value: await factory.creationFee() }
      );
    const receipt = await tx.wait();
    let vaultAddr = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === "QuipCreated") {
          vaultAddr = ethers.getAddress(`0x${log.data.slice(-40)}`);
        }
      } catch (_) {}
    }
    if (!vaultAddr) throw new Error("no QuipCreated event");
    console.log(`Quip vault for ${name} (${ownerWallet.address}) -> ${vaultAddr}`);
    return vaultAddr;
  }

  const aliceVault = await createVault(
    new ethers.Wallet(alice.privateKey, PROVIDER),
    "alice",
    alicePq
  );
  const bobVault = await createVault(
    new ethers.Wallet(bob.privateKey, PROVIDER),
    "bob",
    bobPq
  );

  // sanity: pqOwner of alice vault is set
  const aliceVaultC = QuipWallet__factory.connect(aliceVault, PROVIDER);
  console.log("alice vault pqOwner.publicSeed:", (await aliceVaultC.pqOwner()).publicSeed.slice(0, 18) + "…");

  // ---- 4. Settlement (reference QuipSwap-style escrow) --------------------
  const setArtifact = JSON.parse(
    fs.readFileSync(path.join(PROJ, "artifacts/_fc/out/Settlement.sol/Settlement.json"), "utf8")
  );
  const setFactory = new ethers.ContractFactory(setArtifact.abi, setArtifact.bytecode.object, deployer);
  const settlement = await setFactory.deploy({ nonce: await pendingNonce() });
  await settlement.waitForDeployment();
  const settlementAddr = await settlement.getAddress();
  console.log("Settlement deployed at", settlementAddr);

  fs.writeFileSync(
    path.join(PROJ, "artifacts/deployment.json"),
    JSON.stringify(
      {
        network: { name: "anvil-local", rpc: RPC, chainId: 31337 },
        wotsPlus: wotsAddr,
        quipFactory: factoryAddr,
        settlement: settlementAddr,
        aliceVault,
        bobVault,
        parties: {
          alice: { eoa: alice.address, vault: aliceVault, vaultId: alicePq.vaultId },
          bob: { eoa: bob.address, vault: bobVault, vaultId: bobPq.vaultId },
        },
      },
      null,
      2
    )
  );
  console.log("wrote artifacts/deployment.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
