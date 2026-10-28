// End-to-end OTC prototype:
//   Phase 1  two parties PQ-sign a trade off-chain (Quip SHRINCS)
//   Phase 2  settlement contract deployed; both legs committed from real Quip
//            post-quantum wallets; secret revealed; both legs settled
//   Phase 3  a second trade left to expire; committer reclaims (refunded)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, createHash } from "node:crypto";
import { createWalletClient, http, parseEther, formatEther, getContract, encodeFunctionData, decodeEventLog, keccak256, encodeAbiParameters, toHex } from "viem";
import { ShrincsSigner, ShrincsFactoryClient, ShrincsWalletClient } from "@quip.network/ethereum-sdk/v1/shrincs";

import { loadOrCreateKey, eoaFor, hexToBytes, bytesToHex } from "./lib/keys.mjs";
import { canonicalDigest, buildOrder } from "./lib/order.mjs";
import { makePqSigner, verifyWithCommitment } from "./lib/pq.mjs";
import { publicClient, walletFor, baseSepolia, QUIP, LOCAL_FAUCET_KEY, BASE_SEPOLIA_RPC } from "./lib/chain.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE = { rpc: BASE_SEPOLIA_RPC, chainId: 84532, quip: QUIP, phases: {} };
const log = (...a) => console.log(...a);

const pc = publicClient();
const J = (o) => JSON.stringify(o, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
/** Current chain time. Deadlines must be relative to the chain, not the wall
 *  clock: a forked/test chain's clock drifts away from the host's. */
async function chainNow() {
  const b = await pc.getBlock({ blockTag: "latest" });
  return Number(b.timestamp);
}
const artifact = JSON.parse(readFileSync(join(ROOT, "out", "OtcSettlement.sol", "OtcSettlement.json"), "utf8"));
const settlementAbi = artifact.abi;

function sha256hex(s) {
  return "0x" + createHash("sha256").update(s).digest("hex");
}

// ---------------------------------------------------------------------------
// Phase 1: off-chain, post-quantum signed orders
// ---------------------------------------------------------------------------
async function phase1(wallets) {
  log("\n=== PHASE 1: off-chain post-quantum order signing (Quip SHRINCS) ===");
  const kA = loadOrCreateKey("partyA-maker");
  const kB = loadOrCreateKey("partyB-taker");
  const eoaA = eoaFor(kA);
  const eoaB = eoaFor(kB);

  const pqA = await makePqSigner(kA.pqMasterSeed, { maxSignatures: 16 });
  const pqB = await makePqSigner(kB.pqMasterSeed, { maxSignatures: 16 });
  log("maker  EOA:", eoaA.address, " PQ commitment:", pqA.commitment);
  log("taker  EOA:", eoaB.address, " PQ commitment:", pqB.commitment);

  // The secret that interlocks both legs. Only the maker knows it up front.
  const secret = "0x" + randomBytes(32).toString("hex");
  const secretHash = keccak256(secret);

  const now = await chainNow();
  const terms = {
    a: { chainId: 84532, token: "0x0000000000000000000000000000000000000000", amount: parseEther("1"), owner: wallets.A.walletAddress, payee: wallets.B.walletAddress },
    b: { chainId: 84532, token: "0x0000000000000000000000000000000000000000", amount: parseEther("0.5"), owner: wallets.B.walletAddress, payee: wallets.A.walletAddress },
    secretHash,
    commitDeadline: now + 3600,
    executeDeadline: now + 7200,
    reclaimRelease: now + 10800,
    nonce: BigInt("0x" + randomBytes(8).toString("hex")),
  };

  const digest = canonicalDigest(terms);
  log("canonical digest (both parties sign this):", digest);

  // Symmetry check, mirroring TermsLib.digestTermsCanonically
  const swapped = canonicalDigest({ ...terms, a: terms.b, b: terms.a });
  log("digest symmetric under leg swap:", swapped === digest);

  // Both parties PQ-sign the same digest off-chain.
  const sigA = pqA.sign(digest);
  const sigB = pqB.sign(digest);
  log("maker PQ signature bytes:", (sigA.length - 2) / 2, " taker:", (sigB.length - 2) / 2);

  const orderA = { ...buildOrder({ terms, side: "maker", signer: pqA }), pqSignature: sigA };
  const orderB = { ...buildOrder({ terms, side: "taker", signer: pqB }), pqSignature: sigB };

  // Counterparty verification (off-chain, before anything touches a chain).
  const vA = await verifyWithCommitment(digest, sigA, pqA.commitment);
  const vB = await verifyWithCommitment(digest, sigB, pqB.commitment);
  log("maker signature verifies:", vA, " taker signature verifies:", vB);

  // Tamper checks
  const tampered = canonicalDigest({ ...terms, b: { ...terms.b, amount: parseEther("5") } });
  log("tampered-terms signature rejected:", !(await verifyWithCommitment(tampered, sigA, pqA.commitment)));
  log("wrong-key signature rejected:", !(await verifyWithCommitment(digest, sigA, pqB.commitment)));

  const bundle = { secret, terms: { ...terms, nonce: terms.nonce.toString() }, digest, orders: [orderA, orderB], checks: { vA, vB, symmetric: swapped === digest } };
  writeFileSync(join(ROOT, "orders.json"), J(bundle));
  log("wrote orders.json");

  EVIDENCE.phases.orders = {
    scheme: pqA.scheme,
    maker: { eoa: eoaA.address, pqCommitment: pqA.commitment },
    taker: { eoa: eoaB.address, pqCommitment: pqB.commitment },
    digest, signatureBytes: (sigA.length - 2) / 2,
    checks: { makerVerified: vA, takerVerified: vB, symmetricDigest: swapped === digest },
  };
  return { kA, kB, eoaA, eoaB, terms, digest, secret, secretHash };
}

// ---------------------------------------------------------------------------
// Deploy our settlement contract
// ---------------------------------------------------------------------------
async function deploy() {
  log("\n=== DEPLOY: OtcSettlement on Base Sepolia (fork of the live testnet) ===");
  const faucet = walletFor(LOCAL_FAUCET_KEY);
  const hash = await faucet.deployContract({
    abi: settlementAbi,
    bytecode: artifact.bytecode.object,
    args: [QUIP.WalletFactory, "0x0000000000000000000000000000000000000000"],
  });
  const rc = await pc.waitForTransactionReceipt({ hash });
  log("OtcSettlement deployed:", rc.contractAddress, "tx:", hash);
  EVIDENCE.phases.deploy = { address: rc.contractAddress, tx: hash, quipFactory: QUIP.WalletFactory };
  return rc.contractAddress;
}

// ---------------------------------------------------------------------------
// Create real Quip post-quantum wallets for both parties
// ---------------------------------------------------------------------------
async function makeQuipWallet(name, k, eoa, walletClient) {
  const signer = await ShrincsSigner.create(hexToBytes(k.pqMasterSeed));
  const factory = new ShrincsFactoryClient({
    publicClient: pc,
    walletClient,
    account: eoa.address,
    chainId: 84532,
    factoryAddress: QUIP.WalletFactory,
    walletImplementation: QUIP.ShrincsWalletImplementation,
  });
  // Idempotent: if the wallet already exists on chain, open it instead.
  const mainKey = signer.recoverKeyPair(1, { maxSignatures: 16 });
  const erc1271Key = signer.recoverKeyPair(500, { maxSignatures: 8 });
  const existing = await factory.getShrincsWalletAddress(
    mainKey.publicKeyCommitment, erc1271Key.publicKeyCommitment, eoa.address
  );
  if (existing && existing !== "0x0000000000000000000000000000000000000000") {
    const code = await pc.getCode({ address: existing });
    if (code && code !== "0x") {
      const commitment = keccak256(encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }, { type: "bytes32" }, { type: "address" }],
        [keccak256(toHex("QUIP_SHRINCS_IDENTITY_V1")), mainKey.publicKeyCommitment, erc1271Key.publicKeyCommitment, eoa.address]
      ));
      const opened = new ShrincsWalletClient({
        walletAddress: existing, publicClient: pc, walletClient, signer, keypair: mainKey,
        commitment, derivationIndex: 1, chainId: 84532, account: eoa.address,
      });
      log(`${name} Quip SHRINCS wallet (existing):`, existing);
      EVIDENCE.phases[name + "Wallet"] = { wallet: existing, owner: eoa.address, commitment };
      return opened;
    }
  }
  let wc;
  try {
    wc = await factory.createShrincsWallet(
      { signer, maxSignatures: 16, derivationIndex: 1, erc1271: { derivationIndex: 500, maxSignatures: 8 } },
      { gas: 6_000_000n, maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n }
    );
  } catch (e) {
    // fall back: build & send the factory call ourselves
    const built = await factory.buildCreateCall({
      signer, maxSignatures: 16, derivationIndex: 1, erc1271: { derivationIndex: 500, maxSignatures: 8 },
    });
    log("  sdk create failed (" + e.shortMessage + "); sending factory call directly");
    const h = await walletClient.sendTransaction({
      to: built.contractCall.address ?? QUIP.WalletFactory,
      data: built.contractCall.data ?? built.contractCall.args ? encodeFunctionData({ abi: built.contractCall.abi, functionName: built.contractCall.functionName, args: built.contractCall.args }) : built.contractCall.data,
      value: built.creationFee,
      gas: 6_000_000n,
      maxFeePerGas: 2_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    });
    const rc = await pc.waitForTransactionReceipt({ hash: h });
    const ev = rc.logs.map((l) => { try { return decodeEventLog({ abi: built.contractCall.abi ?? [], data: l.data, topics: l.topics }); } catch { return null; } }).filter(Boolean).find((x) => x.eventName === "WalletDeployed");
    const addr = ev.args.quip;
    log(`${name} Quip SHRINCS wallet (direct):`, addr, "tx:", h);
    EVIDENCE.phases[name + "Wallet"] = { wallet: addr, owner: eoa.address, commitment: built.commitment, tx: h };
    return { walletAddress: addr, commitment: built.commitment, execute: async () => { throw new Error("direct path not wired"); } };
  }
  log(`${name} Quip SHRINCS wallet:`, wc.walletAddress);
  EVIDENCE.phases[name + "Wallet"] = { wallet: wc.walletAddress, owner: eoa.address, commitment: wc.commitment };
  return wc;
}

async function fund(to, eth) {
  const faucet = walletFor(LOCAL_FAUCET_KEY);
  const h = await faucet.sendTransaction({ to, value: parseEther(eth) });
  await pc.waitForTransactionReceipt({ hash: h });
}

// ---------------------------------------------------------------------------
// Phase 2: settled trade
// ---------------------------------------------------------------------------
async function phase2(ctx, settlement, wallets) {
  log("\n=== PHASE 2: commit both legs, reveal secret, settle ===");
  const terms = ctx.terms;
  // legs: maker gives 1 ETH (leg A), taker gives 0.5 ETH (leg B)
  const mA = { ...terms.a, owner: wallets.A.walletAddress, payee: wallets.B.walletAddress };
  const mB = { ...terms.b, owner: wallets.B.walletAddress, payee: wallets.A.walletAddress };
  const T = { ...terms, a: mA, b: mB, nonce: BigInt(terms.nonce) };
  const digest = canonicalDigest(T);
  log("on-chain digest (owners bound):", digest);

  // fund the wallets so they hold the traded assets
  await fund(wallets.A.walletAddress, "1.2");
  await fund(wallets.B.walletAddress, "0.7");
  log("funded wallets:", formatEther(await pc.getBalance({ address: wallets.A.walletAddress })), "/", formatEther(await pc.getBalance({ address: wallets.B.walletAddress })));

  const commitData = (leg) => encodeFunctionData({ abi: settlementAbi, functionName: "commit", args: [T, leg, "0x", "0x"] });
  const legKey = (leg) => null;

  log("maker commits leg A (1 ETH)...");
  const tx1 = await wallets.A.execute({ target: settlement, value: parseEther("1"), data: commitData(mA) });
  log("  tx:", tx1.transactionHash, "status:", tx1.status);

  log("taker commits leg B (0.5 ETH)...");
  const tx2 = await wallets.B.execute({ target: settlement, value: parseEther("0.5"), data: commitData(mB) });
  log("  tx:", tx2.transactionHash, "status:", tx2.status);

  // maker reveals the secret -> claims taker's leg (0.5 ETH)
  log("maker reveals secret and executes leg B (claims 0.5 ETH)...");
  const exData = (leg) => encodeFunctionData({ abi: settlementAbi, functionName: "execute", args: [T, leg, ctx.secret] });
  const tx3 = await wallets.A.execute({ target: settlement, value: 0n, data: exData(mB) });
  log("  tx:", tx3.transactionHash, "status:", tx3.status);

  // taker reads the now-public secret and claims maker's leg (1 ETH)
  log("taker executes leg A (claims 1 ETH)...");
  const tx4 = await wallets.B.execute({ target: settlement, value: 0n, data: exData(mA) });
  log("  tx:", tx4.transactionHash, "status:", tx4.status);

  EVIDENCE.phases.trade1_settled = {
    digest, secret: ctx.secret, secretHash: ctx.secretHash,
    commits: [tx1.transactionHash, tx2.transactionHash],
    executes: [tx3.transactionHash, tx4.transactionHash],
  };
  return T;
}

// ---------------------------------------------------------------------------
// Phase 3: expired trade -> refund
// ---------------------------------------------------------------------------
async function phase3(ctx, settlement, wallets) {
  log("\n=== PHASE 3: second trade left to expire, then reclaimed ===");
  const now = await chainNow();
  const secret2 = "0x" + randomBytes(32).toString("hex");
  const terms = {
    a: { chainId: 84532, token: "0x0000000000000000000000000000000000000000", amount: parseEther("0.3"), owner: wallets.A.walletAddress, payee: wallets.B.walletAddress },
    b: { chainId: 84532, token: "0x0000000000000000000000000000000000000000", amount: parseEther("0.2"), owner: wallets.B.walletAddress, payee: wallets.A.walletAddress },
    secretHash: keccak256(secret2),
    commitDeadline: now + 600,
    executeDeadline: now + 900,
    reclaimRelease: now + 1200,
    nonce: BigInt("0x" + randomBytes(8).toString("hex")),
  };
  log("maker commits leg A (0.3 ETH); taker never commits");
  const tx1 = await wallets.A.execute({ target: settlement, value: parseEther("0.3"), data: encodeFunctionData({ abi: settlementAbi, functionName: "commit", args: [terms, terms.a, "0x", "0x"] }) });
  log("  tx:", tx1.transactionHash, "status:", tx1.status);

  const balBefore = await pc.getBalance({ address: wallets.A.walletAddress });
  log("maker wallet balance after commit:", formatEther(balBefore));

  // advance chain time past reclaimRelease and mine
  await pc.request({ method: "evm_increaseTime", params: [1300] });
  await pc.request({ method: "evm_mine", params: [] });
  log("chain time advanced past the reclaim deadline");

  log("maker reclaims its own escrowed 0.3 ETH (refund)...");
  const tx2 = await wallets.A.execute({ target: settlement, value: 0n, data: encodeFunctionData({ abi: settlementAbi, functionName: "reclaim", args: [terms, terms.a] }) });
  log("  tx:", tx2.transactionHash, "status:", tx2.status);
  const balAfter = await pc.getBalance({ address: wallets.A.walletAddress });

  EVIDENCE.phases.trade2_expired = {
    secretHash: terms.secretHash,
    commit: tx1.transactionHash,
    reclaim: tx2.transactionHash,
    walletBalanceBeforeReclaim: formatEther(balBefore),
    walletBalanceAfterReclaim: formatEther(balAfter),
  };
}

// ---------------------------------------------------------------------------
async function main() {
  log("RPC:", BASE_SEPOLIA_RPC, "chainId:", (await pc.getChainId()));
  const kA = loadOrCreateKey("partyA-maker");
  const kB = loadOrCreateKey("partyB-taker");
  const eoaA = eoaFor(kA);
  const eoaB = eoaFor(kB);
  await fund(eoaA.address, "5");
  await fund(eoaB.address, "5");

  log("\n=== Creating real Quip post-quantum wallets (SHRINCS) ===");
  const wA = walletFor(kA.eoaPrivateKey);
  const wB = walletFor(kB.eoaPrivateKey);
  let wallets;
  try {
    const qA = await makeQuipWallet("partyA-maker", kA, eoaA, wA);
    const qB = await makeQuipWallet("partyB-taker", kB, eoaB, wB);
    wallets = { A: qA, B: qB };
  } catch (e) {
    log("!! Quip wallet creation failed:", e.message);
    EVIDENCE.phases.walletError = String(e.message);
    writeFileSync(join(ROOT, "evidence.json"), J(EVIDENCE));
    throw e;
  }

  const ctx = { ...(await phase1(wallets)), kA, kB, eoaA, eoaB };
  const settlement = await deploy();
  wallets = { A: wallets.A, B: wallets.B };

  await phase2(ctx, settlement, wallets);
  await phase3(ctx, settlement, wallets);

  EVIDENCE.settlementContract = settlement;
  writeFileSync(join(ROOT, "evidence.json"), J(EVIDENCE));
  log("\nDONE. evidence.json written.");
}

main().catch((e) => { console.error("FAILED:", e); writeFileSync(join(ROOT, "evidence.json"), J(EVIDENCE)); process.exit(1); });
