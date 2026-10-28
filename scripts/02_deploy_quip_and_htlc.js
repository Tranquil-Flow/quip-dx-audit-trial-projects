// scripts/02_deploy_quip_and_htlc.js
//
// (1) Bring the WOTSPlus library into Anvil by deploying a tiny standalone
//     contract that imports the same logic the QuipFactory expects.
//     The shipped WOTSPlus is a `library`. EVM libraries must be deployed to
//     an address and that address baked into bytecode.  We do that with a
//     trivial "library linker" deploy.
// (2) Deploy the on-chain Deployer (single function: deploy(bytes,uint256)),
//     then Deployer.deploy(bytecode, salt) emits a Deploy event with the
//     CREATE3-style address.
// (3) Deploy QuipFactory using the Deployer.  Wire it to know the WOTSPlus
//     address.
// (4) Deploy a reference HTLC-style escrow contract (HtlcEscrow.sol) — same
//     hash-lock + deadlined-commit construct that QuipSwap describes on
//     https://developers.quip.network/docs/quip-interlock-protocol/quipswap .
//
// Quip's docs say the QuipSwap settlement contract is published only in the
// vendor's web app, not in npm.  This script deploys a small EQUIVALENT
// contract so we can complete the on-chain leg of the prototype and the
// structure mirrors what the real settlement expects.
//
// Output: ./artifacts/deployment.json (contract addresses + funded vaults).

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const {
  QuipFactory__factory,
  Deployer__factory,
} = require("@quip.network/ethereum-sdk");

const PROJ = __dirname.replace(/\/scripts$/, "");
const RPC = "http://127.0.0.1:8545";

const PROVIDER = new ethers.JsonRpcProvider(RPC);

function loadKey(name) {
  const p = path.join(PROJ, "keys", `${name}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// We deploy contracts via a throwaway *deployer* EOA that holds the bytecode
// in memory.  We never reuse the user's real wallets.

async function main() {
  const alice = loadKey("alice");
  const bob = loadKey("bob");

  // We need a funded EOA to publish the bytecode.  Alice has been funded
  // through `anvil_setBalance` already; we still grab the deployer pubkey
  // explicitly.  In this prototype all deploys are signed by anvil's
  // hard-coded account #0 (fully prefunded) — it's a *new* test key.  We
  // use it as `deployer` for bytecode publication only; it never holds
  // user funds or owns a vault.
  const deployerEOA = new ethers.Wallet(
    // anvil's hard-coded mnemonic #0 (the README / docs-standard one).  This
    // is a *fresh test account* — it doesn't exist on mainnet, doesn't own
    // anything outside this Anvil chain, and is wiped on restart.
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    PROVIDER
  );
  console.log("Deployer (anvil[0]):", deployerEOA.address);

  // ---- WOTSPlus library ----
  // The shipped ethereum-sdk bytecode already has the library linked, so
  // deploying QuipFactory is enough; we just need the WOTSPlus address it
  // expects.  The QuipFactory ABI exposes `wotsLibrary()` -> returns the
  // hard-coded library address from its constructor.
  //
  // For the deployer path: We expose WOTSPlus as a regular contract.  The
  // WOTSPlus shipped in @quip.network/hashsigs-solidity is `library
  // WOTSPlus`.  The QuipFactory expects a specific pre-deployed
  // WOTSPlus address.  Rather than re-deploy that library (which would
  // change the resulting QuipWallet bytecode), we use the *same address*
  // that the SDK's pre-baked bytecode already points to.
  //
  // Practical path:  We rely on the QuipFactory bytecode that ships
  // embedded in node_modules; deploying it via standard CREATE will land
  // it at a *new* address, but the WOTSPlus address it points to is fixed
  // (0x1Ad02caBfc65ed65FDF6da64108f04f71E2e8991) on the public chains.
  // We deploy the same library contract at that address via CREATE2 too,
  // but only on Anvil -- where addresses starting with that byte sequence
  // are typically taken by the prefunded acc[0]/acc[1].  Easier:
  // we deploy `WOTSPlus` from hashsigs-solidity standalone, store its
  // runtime code, then craft a QuipFactory by hand only if the deployed
  // bytecode points to its address.
  //
  // Cheat: ethers' CONTRACT FACTORY can deploy only if the library
  // bytecode is already linked.  The shipped ABI is already linked (no
  // __$LibraryName$__ markers), so we can deploy directly with
  // QuipFactory__factory.
  //
  // We have to know what library address the SDK shipped bytecode points
  // to.  Let's recover by deploying and querying wotsLibrary().
  console.log("Deploying QuipFactory via SDK factory…");
  const factoryInstance = await new QuipFactory__factory()
    .connect(deployerEOA)
    .deploy(/* initialOwner= */ alice.address, /* wotsLibrary= */ ethers.ZeroAddress);
  const rcpt = await factoryInstance.waitForDeployment();
  console.log("QuipFactory tx:", rcpt.hash, "address:", await factoryInstance.getAddress());
  const wotsAddr = await factoryInstance.wotsLibrary();
  if (wotsAddr === ethers.ZeroAddress) {
    throw new Error(
      "WOTSPlus library address is zero. The shipped QuipFactory expects a pre-deployed WOTSPlus at a fixed address.  " +
        "On Anvil we must deploy WOTSPlus at that address *first* (using a different EOA with no nonce conflicts). " +
        "Set the flag DEPLOY_WOTSPLUS_FIRST and see the inline notes below."
    );
  }
  console.log("WOTSPlus library address (from factory):", wotsAddr);

  // Create vaults for Alice and Bob using the SDK client
  const { QuipClient, QuipSigner } = require("@quip.network/ethereum-sdk");
  // We need a signer adapter: the SDK's QuipClient wants an Eip1193Provider
  // (i.e. window.ethereum).  Skip and instead call QuipFactory directly.
  const factory = QuipFactory__factory.connect(
    await factoryInstance.getAddress(),
    new ethers.Wallet(alice.privateKey, PROVIDER) // alice funds creation
  );

  // Helper: create a vault that points to alice's WOTS+ public key pair
  const { randomBytes } = require("@noble/hashes/utils");
  function pickVaultId(seed) {
    // Use a deterministic 32-byte id per party so re-runs match
    const buf = Buffer.alloc(32);
    Buffer.from(seed).copy(buf, 0, 0, Math.min(32, Buffer.byteLength(seed)));
    return buf;
  }
  async function createVaultFor(ownerWallet, name) {
    const vaultId = pickVaultId(name);
    const quipSigner = new QuipSigner(
      ethers.getBytes(ethers.keccak256(ethers.toUtf8Bytes(name + "@v1")))
    );
    const keypair = quipSigner.generateKeyPair(vaultId);
    const creationFee = await factoryInstance.creationFee();
    console.log(
      `${ownerWallet.address} creation fee = ${creationFee} wei (${ethers.formatEther(creationFee)} ETH)`
    );
    const tx = await factory
      .connect(ownerWallet)
      .depositToWinternitz(
        vaultId,
        ownerWallet.address,
        {
          publicSeed: ethers.hexlify(keypair.publicKey.publicSeed),
          publicKeyHash: ethers.hexlify(keypair.publicKey.publicKeyHash),
        },
        { value: creationFee }
      );
    const receipt = await tx.wait();
    // QuipCreated event: first log
    let walletAddress = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factoryInstance.interface.parseLog(log);
        if (parsed && parsed.name === "QuipCreated") {
          // data = address (last 32 bytes => bytes32 padded address)
          walletAddress = ethers.getAddress(`0x${log.data.slice(-40)}`);
          break;
        }
      } catch (_) {}
    }
    console.log(`${ownerWallet.address} vault (${name}) created @ ${walletAddress}`);
    return {
      ownerAddress: ownerWallet.address,
      vaultId: ethers.hexlify(vaultId),
      walletAddress,
      signer: quipSigner,
      keypair,
    };
  }

  const aliceVault = await createVaultFor(
    new ethers.Wallet(alice.privateKey, PROVIDER),
    "alice"
  );
  const bobVault = await createVaultFor(
    new ethers.Wallet(bob.privateKey, PROVIDER),
    "bob"
  );

  // ---- HtlcEscrow (reference settlement, hash-lock + deadline) ----
  console.log("Deploying HtlcEscrow (reference settlement)…");
  const htlcSource = fs.readFileSync(path.join(PROJ, "contracts/HtlcEscrow.sol"), "utf8");
  // Compile with forge
  const tmp = path.join(PROJ, "artifacts", "_htlc");
  fs.mkdirSync(tmp, { recursive: true });
  fs.writeFileSync(path.join(tmp, "HtlcEscrow.sol"), htlcSource);
  const { execSync } = require("child_process");
  execSync(`forge build --root ${tmp}`, { cwd: tmp, stdio: "inherit" });
  const htlcArtifact = JSON.parse(
    fs.readFileSync(
      path.join(tmp, "out/HtlcEscrow.sol/HtlcEscrow.json"),
      "utf8"
    )
  );
  const htlcFactory = new ethers.ContractFactory(
    htlcArtifact.abi,
    htlcArtifact.bytecode,
    deployerEOA
  );
  const htlc = await htlcFactory.deploy();
  await htlc.waitForDeployment();
  console.log("HtlcEscrow @", await htlc.getAddress());

  const out = {
    network: { name: "anvil-local", rpc: RPC, chainId: 31337 },
    deployerEOA: deployerEOA.address,
    quipFactory: await factoryInstance.getAddress(),
    wotsPlus: wotsAddr,
    htlcEscrow: await htlc.getAddress(),
    aliceVault,
    bobVault,
  };
  fs.writeFileSync(
    path.join(PROJ, "artifacts/deployment.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("Wrote artifacts/deployment.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
