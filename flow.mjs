// DAO treasury payout prototype on Quip Network components.
//
//   1. Treasury = Quip post-quantum account (ShrincsWallet via the canonical WalletFactory)
//   2. Payout approval = SHRINCS hash-based signature by a separate DAO approver key,
//      verified off-chain (hashsigs-wasm) AND on-chain by the deployed SHRINCS ERC-7913 verifier
//   3. Approved funds swapped through QuipSwap (Omnibus HTLC) against a market maker's tUSD,
//      with the treasury leg's `recipient` set to the payout recipient
//
// Usage: RPC_URL=... node flow.mjs <step|all>
//   steps: setup, create-wallet, fund, approve, deploy-token, commit-treasury, commit-maker, claim, report
// State is persisted in state/<label>.json so steps can be re-run / resumed.

import fs from "node:fs";
import {
  createPublicClient, createWalletClient, http, parseEther, formatEther, keccak256,
  encodeAbiParameters, formatUnits, getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  ShrincsSigner, ShrincsFactoryClient, ShrincsWalletClient, generateMnemonic, getShrincsAddresses,
  ShrincsCodec,
} from "@quip.network/ethereum-sdk/v1/shrincs";
import {
  createOmnibusClient, resolveDeployment, createTerms, nativeAsset, erc20Asset, planSameChainSwap,
  generateSecret, buildKeyedSigner, computeCommitDigest, getSameChainSwapStatus,
} from "@quip.network/quip-swap-sdk";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8547";
const LABEL = process.env.LABEL ?? "fork-base-sepolia";
const IS_FORK = process.env.IS_FORK !== "0";
const SWAP_BUFFER = BigInt(process.env.SWAP_BUFFER ?? "300"); // fastL2 default in quip-swap-sdk
const MAX_SIGS = 16;
const PAYOUT_ETH = parseEther(process.env.PAYOUT_ETH ?? "0.002");
const PAYOUT_TUSD = 5_000_000n; // 5.00 tUSD (6 decimals)
const ERC7913_VERIFY_SELECTOR = "0x024ad318";

const statePath = `state/${LABEL}.json`;
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : {};
const save = () => fs.writeFileSync(statePath, JSON.stringify(state, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);

const eoa = (name) => privateKeyToAccount(JSON.parse(fs.readFileSync(`keys/eoa-${name}.json`, "utf8"))[0].private_key);
function mnemonic(name) {
  const p = `keys/shrincs-${name}.mnemonic`;
  if (!fs.existsSync(p)) fs.writeFileSync(p, generateMnemonic(), { mode: 0o600 });
  return fs.readFileSync(p, "utf8").trim();
}

const operator = eoa("operator"); // owner EOA of the treasury account: submits txs + pays gas, cannot move funds alone
const maker = eoa("maker");       // market-maker counterparty for the swap
const recipient = eoa("recipient").address;

const publicClient = createPublicClient({ transport: http(RPC_URL) });
const chainId = await publicClient.getChainId();
const chain = { id: chainId, name: LABEL, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } };
// WORKAROUND: @quip.network/ethereum-sdk passes `account: <address string>` to writeContract, so viem
// routes it to eth_sendTransaction (browser/JSON-RPC wallet). A viem LocalAccount fails with
// "No Signer available". This transport emulates an injected wallet by signing locally.
function localSignerTransport(account) {
  const base = http(RPC_URL);
  return (opts) => {
    const t = base(opts);
    const rpc = createPublicClient({ transport: http(RPC_URL) });
    return {
      ...t,
      async request(args) {
        if (args.method === "eth_accounts" || args.method === "eth_requestAccounts") return [account.address];
        if (args.method === "eth_sendTransaction") {
          const tx = args.params[0];
          const n = (h) => (h === undefined ? undefined : BigInt(h));
          const nonce = tx.nonce !== undefined ? Number(tx.nonce) : await rpc.getTransactionCount({ address: account.address, blockTag: "pending" });
          const fees = tx.maxFeePerGas ? { maxFeePerGas: n(tx.maxFeePerGas), maxPriorityFeePerGas: n(tx.maxPriorityFeePerGas) } : await rpc.estimateFeesPerGas();
          const gas = n(tx.gas) ?? await rpc.estimateGas({ account: account.address, to: tx.to, data: tx.data, value: n(tx.value) });
          const raw = await account.signTransaction({ type: "eip1559", chainId, to: tx.to ?? null, data: tx.data, value: n(tx.value) ?? 0n, gas, nonce, ...fees });
          return t.request({ method: "eth_sendRawTransaction", params: [raw] });
        }
        return t.request(args);
      },
    };
  };
}
const wc = (account) => createWalletClient({ account: account.address, chain, transport: localSignerTransport(account) });
const opWallet = wc(operator);
const makerWallet = wc(maker);
const shrincs = getShrincsAddresses(chainId);
const omnibus = resolveDeployment(BigInt(chainId));

const signers = {};
async function signer(name) {
  signers[name] ??= await ShrincsSigner.fromMnemonic(mnemonic(name));
  return signers[name];
}
const keypairs = {};
async function keypair(name, idx = 0) {
  const k = `${name}/${idx}`;
  keypairs[k] ??= (await signer(name)).recoverKeyPair(idx, { maxSignatures: MAX_SIGS });
  return keypairs[k];
}

// Local leaf ledger for keys that sign OUTSIDE a wallet (approver, maker). The docs require the
// integrator to persist slot usage BEFORE broadcasting a signature.
function takeLeaf(name) {
  const p = `keys/shrincs-${name}.leaves.json`;
  const used = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
  const leaf = used.length ? Math.max(...used) + 1 : 1; // SHRINCS leaves are 1-indexed (1..=maxSignatures)
  if (leaf > MAX_SIGS) throw new Error(`${name}: SHRINCS slot budget exhausted`);
  fs.writeFileSync(p, JSON.stringify([...used, leaf]), { mode: 0o600 });
  return leaf;
}

async function fork_fund(addr, eth) {
  if (!IS_FORK) return;
  await publicClient.request({ method: "anvil_setBalance", params: [addr, `0x${parseEther(eth).toString(16)}`] });
}
async function warpTo(ts) {
  const now = (await publicClient.getBlock()).timestamp;
  if (now >= ts) return;
  if (IS_FORK) {
    await publicClient.request({ method: "evm_setNextBlockTimestamp", params: [`0x${ts.toString(16)}`] });
    await publicClient.request({ method: "evm_mine", params: [] });
    log(`(fork) warped chain time ${now} -> ${ts}`);
  } else {
    const wait = Number(ts - now) + 5;
    log(`waiting ${wait}s of real time for window to open...`);
    await new Promise((r) => setTimeout(r, wait * 1000));
  }
}
const receiptInfo = (r) => ({ tx: r.transactionHash, block: r.blockNumber.toString(), status: r.status, gasUsed: r.gasUsed.toString() });

async function treasuryClient() {
  return new ShrincsWalletClient({
    walletAddress: state.treasury.address, publicClient, walletClient: opWallet,
    keypair: await keypair("treasury", 0), commitment: state.treasury.commitment,
    chainId, account: operator.address,
  });
}


// WORKAROUND: ShrincsWalletClient.execute() sets msg.value = value + maxFee, i.e. the OWNER EOA fronts the
// call value and the treasury's own balance is never touched. For custody we want the Quip account to pay
// from its own balance, so we build the same PQ-signed call and send it with msg.value = maxFee only.
async function executeFromTreasury(tre, { target, value = 0n, data = "0x" }) {
  const built = await tre.buildExecuteCall({ target, value, data }, {});
  const cc = { ...built.contractCall, value: built.maxFee };
  const hash = await opWallet.writeContract(cc);
  const r = await publicClient.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`execute reverted: ${hash}`);
  return r;
}

// ─── steps ───────────────────────────────────────────────────────────────────
const steps = {
  async setup() {
    log("chainId", chainId, "rpc", RPC_URL, "fork?", IS_FORK);
    log("operator", operator.address, "maker", maker.address, "recipient", recipient);
    log("Quip SHRINCS addresses", shrincs);
    log("Omnibus (QuipSwap) deployment", omnibus);
    for (const [n, a] of Object.entries({ ...shrincs, Omnibus: omnibus.omnibusAddress, WalletFactory: omnibus.walletFactory })) {
      const code = await publicClient.getCode({ address: a });
      log(`  code@${n} ${a}: ${code ? (code.length - 2) / 2 : 0} bytes`);
    }
    await fork_fund(operator.address, "1");
    await fork_fund(maker.address, "1");
    for (const [n, a] of [["operator", operator.address], ["maker", maker.address]])
      log(`  balance ${n}: ${formatEther(await publicClient.getBalance({ address: a }))} ETH`);
    state.chainId = chainId; save();
  },

  async "create-wallet"() {
    if (state.treasury?.address) return log("treasury exists", state.treasury.address);
    const factory = new ShrincsFactoryClient({ publicClient, walletClient: opWallet, account: operator.address, chainId });
    const s = await signer("treasury");
    const params = { signer: s, maxSignatures: MAX_SIGS, derivationIndex: 0, erc1271: { derivationIndex: 1 } };
    log("estimating creation cost...");
    const est = await factory.estimateCreationCost(params);
    log("creation estimate", est);
    const t = Date.now();
    const wallet = await factory.createShrincsWallet(params);
    log(`created treasury Quip account ${wallet.walletAddress} in ${Date.now() - t}ms; commitment ${wallet.commitment}`);
    const st = await wallet.getWalletState();
    state.treasury = { address: wallet.walletAddress, commitment: wallet.commitment, owner: st.owner, maxSignatures: st.maxSignatures };
    save();
    log("wallet state", st);
  },

  async fund() {
    const hash = await opWallet.sendTransaction({ to: state.treasury.address, value: parseEther("0.005") });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    state.fundTx = receiptInfo(r); save();
    log("funded treasury with 0.005 ETH", state.fundTx, "balance now",
      formatEther(await publicClient.getBalance({ address: state.treasury.address })));
  },

  // DAO approval: a separate approver key signs the payout intent with SHRINCS (hash-based, PQ).
  async approve() {
    const tUSD = state.token?.address ?? "0x0000000000000000000000000000000000000000";
    const approver = await keypair("approver", 0);
    const payout = {
      treasury: state.treasury.address, recipient, sellAsset: "native", sellAmount: PAYOUT_ETH,
      buyToken: tUSD, minBuyAmount: PAYOUT_TUSD, nonce: BigInt(state.payoutNonce ?? 1),
      deadline: (await publicClient.getBlock()).timestamp + 86400n, chainId: BigInt(chainId),
    };
    const payoutHash = keccak256(encodeAbiParameters(
      [{ type: "string" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      ["QUIP-DAO-PAYOUT-V1", payout.treasury, payout.recipient, payout.sellAmount, payout.buyToken, payout.minBuyAmount, payout.nonce, payout.deadline, payout.chainId],
    ));
    const leaf = takeLeaf("approver"); // persisted BEFORE signing
    // Deployed SHRINCS verifier (V4 adapter) binds statefulRawMessageHash(commitment, hash) over the caller hash.
    const bound = ShrincsCodec.statefulRawMessageHash(approver.publicKeyCommitment, payoutHash);
    const t = Date.now();
    const sig = approver.signStatefulRawAt(bound, leaf);
    const envelope = ShrincsCodec.encodeStatefulEnvelope
      ? ShrincsCodec.encodeStatefulEnvelope(approver.publicKey, sig)
      : encodeAbiParameters([ShrincsCodec.abiTuples.publicKey, ShrincsCodec.abiTuples.statefulSignature], [approver.publicKey, sig]);
    log(`approver signed payout ${payoutHash} at leaf ${leaf} in ${Date.now() - t}ms; envelope ${(envelope.length - 2) / 2} bytes`);
    const offchain = approver.verifyStatefulRaw(bound, sig);
    log("off-chain wasm verify:", offchain);
    const onchain = await publicClient.readContract({
      address: shrincs.ShrincsVerifier,
      abi: [{ type: "function", name: "verify", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "bytes4" }] }],
      functionName: "verify", args: [approver.publicKeyCommitment, payoutHash, envelope],
    });
    log(`on-chain SHRINCSVerifier.verify(${shrincs.ShrincsVerifier}) ->`, onchain, onchain === ERC7913_VERIFY_SELECTOR ? "VALID" : "INVALID");
    // Negative control: tampered amount must not verify.
    const tampered = keccak256(payoutHash);
    const neg = await publicClient.readContract({
      address: shrincs.ShrincsVerifier,
      abi: [{ type: "function", name: "verify", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "bytes4" }] }],
      functionName: "verify", args: [approver.publicKeyCommitment, tampered, envelope],
    });
    log("negative control (tampered hash) ->", neg);
    fs.mkdirSync("approvals", { recursive: true });
    fs.writeFileSync(`approvals/${payoutHash}.json`, JSON.stringify({ payout, payoutHash, approverCommitment: approver.publicKeyCommitment, leaf, envelope },
      (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
    state.approval = { payoutHash, leaf, approverCommitment: approver.publicKeyCommitment, offchain, onchain, negative: neg, payout };
    save();
    if (onchain !== ERC7913_VERIFY_SELECTOR || !offchain) throw new Error("approval did not verify — refusing to pay out");
  },

  async "deploy-token"() {
    if (state.token?.address) return log("token exists", state.token.address);
    const art = JSON.parse(fs.readFileSync("out/TestUSD.sol/TestUSD.json", "utf8"));
    const hash = await makerWallet.deployContract({ abi: art.abi, bytecode: art.bytecode.object, args: [maker.address, 1_000_000_000n] });
    const r = await publicClient.waitForTransactionReceipt({ hash });
    state.token = { address: r.contractAddress, deployTx: r.transactionHash }; save();
    log("maker deployed tUSD at", r.contractAddress, "tx", r.transactionHash);
  },

  // Build the swap. Treasury is proposer (commits first, holds the secret); maker is taker.
  async "commit-treasury"() {
    const approval = state.approval;
    if (!approval || approval.onchain !== ERC7913_VERIFY_SELECTOR) throw new Error("no verified approval");
    if (approval.payout.buyToken.toLowerCase() !== state.token.address.toLowerCase()) throw new Error("approval names a different token");
    const now = (await publicClient.getBlock()).timestamp;
    const B = SWAP_BUFFER;
    const treasuryTerms = createTerms({
      chainId: BigInt(chainId), reclaimRecipient: state.treasury.address, recipient, // counter-asset goes straight to payout recipient
      commitmentDeadline: now + B, claimDeadline: now + 3n * B, reclaimRelease: now + 5n * B,
      assets: [nativeAsset(BigInt(approval.payout.sellAmount))],
    });
    const makerTerms = createTerms({
      chainId: BigInt(chainId), reclaimRecipient: maker.address, recipient: maker.address,
      commitmentDeadline: now + 2n * B, claimDeadline: now + 4n * B, reclaimRelease: now + 6n * B,
      assets: [erc20Asset(state.token.address, BigInt(approval.payout.minBuyAmount))],
    });
    const plan = planSameChainSwap(treasuryTerms, makerTerms, { minimumBufferSeconds: B });
    const { secret, lock } = generateSecret();
    fs.writeFileSync(`keys/swap-secret-${lock}.txt`, secret, { mode: 0o600 });
    log("swap plan ok; lock", lock, "canonical digest", plan.canonicalDigest);

    const client = createOmnibusClient({ address: omnibus.omnibusAddress, publicClient, walletClient: opWallet });
    const tre = await treasuryClient();
    const auth = { signer: buildKeyedSigner(shrincs.ShrincsVerifier, state.treasury.commitment), signature: "0x" }; // wallet route
    const call = await client.prepareCommit({ lock, party: treasuryTerms, counterparty: makerTerms, auth }, { account: state.treasury.address });
    log("prepared commit Call", { to: call.to, value: call.value.toString(), dataLen: (call.data.length - 2) / 2 });
    const t = Date.now();
    const tBal0 = await publicClient.getBalance({ address: state.treasury.address });
    const r = await executeFromTreasury(tre, { target: call.to, value: call.value, data: call.data });
    log(`treasury ETH ${formatEther(tBal0)} -> ${formatEther(await publicClient.getBalance({ address: state.treasury.address }))} (paid from the Quip account itself)`);
    log(`treasury commit executed via PQ-signed ShrincsWallet.execute in ${Date.now() - t}ms`, receiptInfo(r));
    state.history = [...(state.history ?? []), ...(state.swap ? [state.swap] : [])];
    state.swap = { lock, treasuryTerms, makerTerms, commitTreasury: receiptInfo(r), canonicalDigest: plan.canonicalDigest };
    save();
  },

  async "commit-maker"() {
    const { lock } = state.swap;
    const T = revive(state.swap.treasuryTerms), M = revive(state.swap.makerTerms);
    await warpTo(T.commitmentDeadline); // taker window [proposer.commitmentDeadline, taker.commitmentDeadline)
    const client = createOmnibusClient({ address: omnibus.omnibusAddress, publicClient, walletClient: makerWallet });
    const erc20 = getContract({ address: state.token.address, abi: JSON.parse(fs.readFileSync("out/TestUSD.sol/TestUSD.json", "utf8")).abi, client: makerWallet });
    const ah = await erc20.write.approve([omnibus.omnibusAddress, M.assets[0].amount]);
    await publicClient.waitForTransactionReceipt({ hash: ah });
    // Keyed route: maker is a plain EOA sender, authorised by a SHRINCS signature over the commit digest.
    const mk = await keypair("maker", 0);
    const signerBlob = buildKeyedSigner(shrincs.ShrincsVerifier, mk.publicKeyCommitment);
    const digest = computeCommitDigest({ omnibusAddress: omnibus.omnibusAddress, lock, party: M, counterparty: T, signer: signerBlob });
    const leaf = takeLeaf("maker");
    const sig = mk.signStatefulRawAt(ShrincsCodec.statefulRawMessageHash(mk.publicKeyCommitment, digest), leaf);
    const envelope = encodeAbiParameters([ShrincsCodec.abiTuples.publicKey, ShrincsCodec.abiTuples.statefulSignature], [mk.publicKey, sig]);
    const r = await client.commit({ lock, party: M, counterparty: T, auth: { signer: signerBlob, signature: envelope } });
    const rec = await publicClient.waitForTransactionReceipt({ hash: r });
    log("maker commit (keyed SHRINCS route)", receiptInfo(rec));
    state.swap.commitMaker = receiptInfo(rec); state.swap.approveTx = ah; save();
  },

  async claim() {
    const T = revive(state.swap.treasuryTerms), M = revive(state.swap.makerTerms);
    await warpTo(M.commitmentDeadline); // claim window [taker.commitmentDeadline, proposer.claimDeadline)
    const secret = fs.readFileSync(`keys/swap-secret-${state.swap.lock}.txt`, "utf8").trim();
    const client = createOmnibusClient({ address: omnibus.omnibusAddress, publicClient, walletClient: opWallet });
    const before = await tusdBalance(recipient);
    const r = await client.claim({ secret, party: T, counterparty: M });
    const rec = await publicClient.waitForTransactionReceipt({ hash: r });
    log("claim (secret revealed by treasury operator EOA)", receiptInfo(rec));
    state.swap.claim = receiptInfo(rec); save();
    log(`recipient tUSD ${formatUnits(before, 6)} -> ${formatUnits(await tusdBalance(recipient), 6)}`);
  },

  async report() {
    const T = revive(state.swap.treasuryTerms), M = revive(state.swap.makerTerms);
    const status = await getSameChainSwapStatus(createOmnibusClient({ address: omnibus.omnibusAddress, publicClient }), state.swap.lock, planSameChainSwap(T, M, { minimumBufferSeconds: SWAP_BUFFER })).catch((e) => ({ error: e.message }));
    const tre = await treasuryClient();
    const st = await tre.getWalletState();
    const rep = {
      treasury: state.treasury.address, treasuryETH: formatEther(await publicClient.getBalance({ address: state.treasury.address })),
      treasurySlotsUsed: st.statefulLeavesUsed, treasurySlotsRemaining: st.remainingStatefulSignatures,
      recipient, recipientTUSD: formatUnits(await tusdBalance(recipient), 6),
      makerTUSD: formatUnits(await tusdBalance(maker.address), 6), makerETH: formatEther(await publicClient.getBalance({ address: maker.address })),
      swapStatus: status.status ?? status,
    };
    state.report = rep; save();
    log("REPORT", rep);
  },
};

function revive(t) {
  return { ...t, chainId: BigInt(t.chainId), commitmentDeadline: BigInt(t.commitmentDeadline), claimDeadline: BigInt(t.claimDeadline), reclaimRelease: BigInt(t.reclaimRelease),
    assets: t.assets.map((a) => ({ ...a, id: BigInt(a.id), amount: BigInt(a.amount) })) };
}
async function tusdBalance(a) {
  return publicClient.readContract({ address: state.token.address, abi: [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "balanceOf", args: [a] });
}

const which = process.argv[2] ?? "all";
const order = ["setup", "create-wallet", "fund", "deploy-token", "approve", "commit-treasury", "commit-maker", "claim", "report"];
for (const s of which === "all" ? order : which.split(",")) {
  log(`=== step: ${s} ===`);
  await steps[s]();
}
process.exit(0);
