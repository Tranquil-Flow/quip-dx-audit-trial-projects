#!/usr/bin/env node
// ============================================================
// Quip Network Post-Quantum Account PoC CLI
// ============================================================
// Creates a SHRINCS post-quantum wallet on Base Sepolia,
// funds it with testnet ETH, then withdraws part back.
//
// Network: Base Sepolia (chain 84532)
// Contracts: Quip SHRINCS WalletFactory + ShrincsWallet (ERC-4337 AA)
//
// Usage:
//   node quip-pq-cli.mjs                    # Full flow (keys, create PQ, fund, withdraw)
//   node quip-pq-cli.mjs --wallet <file>    # Resume from saved wallet
//   node quip-pq-cli.mjs --status           # Check balances only
//
// Requires: npm install @quip.network/ethereum-sdk@beta @quip.network/hashsigs-wasm@rc viem

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_DIR = join(__dirname, "keys");

// ── Config ──────────────────────────────────────────────────
const CHAIN_ID = 84532; // Base Sepolia
const EXPLORER = "https://sepolia.basescan.org";
const RPC_URL = "https://sepolia.base.org";

// ── Helpers ─────────────────────────────────────────────────
const log = (msg) => console.log(`[quip-pq] ${msg}`);
const err = (msg) => console.error(`[quip-pq] ERROR: ${msg}`);

function saveKey(name, data) {
  if (!existsSync(KEYS_DIR)) mkdirSync(KEYS_DIR, { recursive: true });
  const p = join(KEYS_DIR, `${name}.json`);
  writeFileSync(p, JSON.stringify(data, null, 2));
  log(`  -> saved ${p}`);
  return p;
}
function loadKey(name) {
  const p = join(KEYS_DIR, `${name}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : null;
}
function bytesToHex(b) {
  return "0x" + Buffer.from(b).toString("hex");
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const statusOnly = args.includes("--status");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Quip Network Post-Quantum Account — PoC CLI    ║");
  console.log("║  Network: Base Sepolia (chain 84532)             ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  // ── viem imports ──
  const viem = await import("viem");
  const { baseSepolia } = await import("viem/chains");
  const { privateKeyToAccount } = await import("viem/accounts");

  // ── Step 1: EOA key ──
  log("Step 1: EOA key management");
  let eoaKey = loadKey("eoa");
  if (!eoaKey) {
    const privBytes = crypto.randomBytes(32);
    const privHex = bytesToHex(privBytes);
    const acct = privateKeyToAccount(privHex);
    eoaKey = { privateKey: privHex, address: acct.address };
    saveKey("eoa", eoaKey);
    log(`  Generated fresh EOA: ${eoaKey.address}`);
  } else {
    log(`  Loaded existing EOA: ${eoaKey.address}`);
  }

  // ── Step 2: viem clients ──
  log("");
  log("Step 2: Connecting to Base Sepolia");
  const account = privateKeyToAccount(eoaKey.privateKey);
  const publicClient = viem.createPublicClient({
    chain: baseSepolia,
    transport: viem.http(RPC_URL),
  });
  const walletClient = viem.createWalletClient({
    account,
    chain: baseSepolia,
    transport: viem.http(RPC_URL),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  log(`  EOA: ${account.address}`);
  log(`  Balance: ${viem.formatEther(balance)} ETH`);

  if (statusOnly) {
    const pqInfo = loadKey("pq-wallet");
    if (pqInfo) {
      const pqBal = await publicClient.getBalance({ address: pqInfo.address });
      log(`  PQ wallet: ${pqInfo.address}`);
      log(`  PQ balance: ${viem.formatEther(pqBal)} ETH`);
    } else {
      log("  No PQ wallet deployed yet.");
    }
    return;
  }

  // ── Step 3: Funding gate ──
  if (balance < viem.parseEther("0.005")) {
    log("");
    log("Step 3: EOA needs Base Sepolia testnet ETH");
    log("");
    log("  ┌─────────────────────────────────────────────────────┐");
    log("  │  Fund this address from ANY Base Sepolia faucet:    │");
    log("  │                                                     │");
    log(`  │  Address: ${eoaKey.address}  │`);
    log("  │                                                     │");
    log("  │  Faucets (pick one):                                 │");
    log("  │  1. Coinbase CDP:                                    │");
    log("  │     https://portal.cdp.coinbase.com/products/faucet  │");
    log("  │  2. thirdweb:                                        │");
    log("  │     https://thirdweb.com/base-sepolia-testnet        │");
    log("  │  3. Alchemy:                                         │");
    log("  │     https://www.alchemy.com/faucets/base-sepolia     │");
    log("  │  4. Google Cloud:                                    │");
    log("  │     https://cloud.google.com/application/web3/faucet │");
    log("  │                                                     │");
    log("  │  Select Base Sepolia and paste the address above.    │");
    log("  │  Need ~0.005 ETH. Then re-run this script.          │");
    log("  └─────────────────────────────────────────────────────┘");
    log("");
    log("  Waiting for funding... (Ctrl+C to exit, re-run later)");
    log("  Polling balance every 15 seconds...");

    // Poll for funding
    let attempts = 0;
    while (true) {
      await new Promise((r) => setTimeout(r, 15000));
      const newBal = await publicClient.getBalance({ address: account.address });
      attempts++;
      if (newBal >= viem.parseEther("0.005")) {
        log(`  ✓ Funded! Balance: ${viem.formatEther(newBal)} ETH (after ${attempts} checks)`);
        break;
      }
      if (attempts % 4 === 0) {
        log(`  Still waiting... (${attempts} checks, ${viem.formatEther(newBal)} ETH)`);
      }
    }
  }

  // ── Step 4: SHRINCS signer ──
  log("");
  log("Step 4: Creating post-quantum SHRINCS signer");
  const { ShrincsSigner, ShrincsFactoryClient } = await import(
    "@quip.network/ethereum-sdk/v1/shrincs"
  );

  const masterSeed = new Uint8Array(
    Buffer.from(eoaKey.privateKey.replace("0x", ""), "hex")
  );
  const signer = await ShrincsSigner.create(masterSeed);
  const keypair = signer.recoverKeyPair(0, { maxSignatures: 1024 });
  log(`  SHRINCS signer ready (profile: 256s-keccak)`);
  log(`  Public key commitment: ${keypair.publicKeyCommitment}`);

  // ── Step 5: Deploy SHRINCS wallet ──
  log("");
  log("Step 5: Deploying SHRINCS post-quantum wallet");
  const factoryClient = new ShrincsFactoryClient({
    publicClient,
    walletClient,
    account: account.address,
    chainId: CHAIN_ID,
  });

  let pqWallet;
  let walletAlreadyExisted = false;

  try {
    pqWallet = await factoryClient.getShrincsWallet({
      derivationIndex: 0,
      erc1271: { publicKey: keypair.publicKey },
      owner: account.address,
      signer,
      maxSignatures: 1024,
    });
    walletAlreadyExisted = true;
    log("  Wallet already exists on-chain, retrieved it.");
  } catch (e) {
    // Deploy new wallet
    log("  Wallet not found — deploying new SHRINCS wallet...");
    log("  (This sends a tx from your EOA to the WalletFactory)");

    const receipt = await factoryClient.createShrincsWallet({
      signer,
      maxSignatures: 1024,
      derivationIndex: 0,
      erc1271: { publicKey: keypair.publicKey },
    });

    pqWallet = receipt;

    const addr = await receipt.getAddress();
    const state = await receipt.getWalletState();
    log(`  ✓ Wallet deployed at: ${addr}`);
    log(`  PQ key commitment: ${state.shrincsPublicKeyCommitment}`);

    saveKey("pq-wallet", {
      address: addr,
      publicKeyCommitment: state.shrincsPublicKeyCommitment,
      derivationIndex: 0,
      maxSignatures: 1024,
    });
  }

  const pqAddr = await pqWallet.getAddress();
  const pqState = await pqWallet.getWalletState();
  log(`  PQ wallet address: ${pqAddr}`);
  log(`  PQ key commitment: ${pqState.shrincsPublicKeyCommitment}`);

  const pqBalance = await publicClient.getBalance({ address: pqAddr });
  log(`  PQ wallet balance: ${viem.formatEther(pqBalance)} ETH`);

  // ── Step 6: Fund the PQ wallet ──
  log("");
  log("Step 6: Funding PQ wallet from EOA");
  let fundTxHash = null;

  if (pqBalance < viem.parseEther("0.001")) {
    const fundAmount = viem.parseEther("0.002");
    log(`  Sending ${viem.formatEther(fundAmount)} ETH to PQ wallet...`);

    fundTxHash = await walletClient.sendTransaction({
      to: pqAddr,
      value: fundAmount,
    });
    log(`  Fund TX: ${fundTxHash}`);
    log(`  Explorer: ${EXPLORER}/tx/${fundTxHash}`);

    const fundReceipt = await publicClient.waitForTransactionReceipt({
      hash: fundTxHash,
    });
    log(`  ✓ Fund confirmed in block ${fundReceipt.blockNumber}`);

    const newPqBal = await publicClient.getBalance({ address: pqAddr });
    log(`  PQ wallet balance: ${viem.formatEther(newPqBal)} ETH`);
  } else {
    log("  PQ wallet already funded.");
  }

  // ── Step 7: Withdraw from PQ wallet ──
  log("");
  log("Step 7: Withdrawing from PQ wallet (post-quantum signed)");

  const pqBal = await publicClient.getBalance({ address: pqAddr });
  if (pqBal === 0n) {
    log("  PQ wallet has zero balance — skipping withdrawal.");
    return;
  }

  const withdrawAmount = pqBal / 3n; // withdraw 1/3
  if (withdrawAmount === 0n) {
    log("  Balance too small to withdraw a 1/3 share. Skipping.");
    return;
  }

  log(`  Withdrawing ${viem.formatEther(withdrawAmount)} ETH to EOA ${account.address}`);

  const withdrawReceipt = await pqWallet.execute(
    { to: account.address, value: withdrawAmount },
    {}
  );

  const withdrawTxHash = withdrawReceipt.transactionHash;
  log(`  Withdraw TX: ${withdrawTxHash}`);
  log(`  Explorer: ${EXPLORER}/tx/${withdrawTxHash}`);

  const wReceipt = await publicClient.waitForTransactionReceipt({
    hash: withdrawTxHash,
  });
  log(`  ✓ Withdraw confirmed in block ${wReceipt.blockNumber}`);

  // ── Summary ──
  console.log();
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║              EXECUTION SUMMARY                  ║");
  console.log("╠══════════════════════════════════════════════════╣");

  const finalPqBal = await publicClient.getBalance({ address: pqAddr });
  const finalEoaBal = await publicClient.getBalance({ address: account.address });

  console.log(`║  Network: Base Sepolia (chain ${CHAIN_ID})`);
  console.log(`║`);
  console.log(`║  EOA address:  ${account.address}`);
  console.log(`║  PQ wallet:    ${pqAddr}`);
  console.log(`║  PQ commitment: ${pqState.shrincsPublicKeyCommitment}`);
  console.log(`║`);
  console.log(`║  Final EOA balance:  ${viem.formatEther(finalEoaBal)} ETH`);
  console.log(`║  Final PQ balance:   ${viem.formatEther(finalPqBal)} ETH`);
  console.log(`║`);
  console.log("║  Transaction hashes:");
  if (fundTxHash)
    console.log(`║    Fund:     ${EXPLORER}/tx/${fundTxHash}`);
  console.log(`║    Withdraw: ${EXPLORER}/tx/${withdrawTxHash}`);
  console.log("║");
  console.log("║  Key files in ./keys/:");
  console.log("║    eoa.json      — EOA private key (throwaway)");
  console.log("║    pq-wallet.json — PQ wallet metadata");
  console.log("╚══════════════════════════════════════════════════╝");
}

main().catch((e) => {
  err(e.message);
  if (e.cause) err(`Cause: ${e.cause.message}`);
  process.exit(1);
});
