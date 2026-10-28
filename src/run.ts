// End-to-end demo: off-chain PQ-signed OTC order  ->  QuipSwap (Omnibus) settlement or refund.
//   npx tsx src/run.ts settled|refunded|both     env: RPC_URL (default local anvil fork), GAP seconds (default 20)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createPublicClient, createTestClient, createWalletClient, http, keccak256, parseEther, formatEther,
  type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { buildKeyedSigner, computeCommitDigest, createOmnibusClient, generateSecret, planSameChainSwap,
  getSameChainSwapStatus, resolveDeployment, swapId, QuipSwapError } from "@quip.network/quip-swap-sdk";
import { PqSigner, verifyPq, pqProfile } from "./pqkeys.ts";
import { acceptOffer, checkAcceptance, signOffer, termsFromOffer, type Offer } from "./otc.ts";
import { SHRINCS_VERIFIER, verifierAbi, ERC7913_MAGIC } from "./pq.ts";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8547";
const GAP = BigInt(process.env.GAP ?? 20);
const SELL_MUSDC = 1_000_000_000n;            // 1,000 mUSDC (6 dp)
const BUY_WEI = parseEther("0.002");
const eoa = (n: string) => privateKeyToAccount(JSON.parse(readFileSync(`keys/${n}.eoa.json`, "utf8")).privateKey as Hex);
const A = eoa("partyA"), B = eoa("partyB"), RELAYER = eoa("relayer");
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wallet = (account: typeof A) => createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
const test = createTestClient({ chain: baseSepolia, mode: "anvil", transport: http(RPC) });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
let isFork = false;

async function now(): Promise<bigint> {
  if (isFork) await test.mine({ blocks: 1 });        // anvil only advances block.timestamp when it mines
  return (await pub.getBlock()).timestamp;
}
async function waitUntil(ts: bigint, why: string) {
  log(`waiting for chain time >= ${ts} (${why})`);
  for (;;) { const n = await now(); if (n >= ts) return n; await sleep(1500); }
}
async function expectRevert(label: string, f: () => Promise<unknown>) {
  try { await f(); log(`!! ${label}: unexpectedly succeeded`); return { label, reverted: false }; }
  catch (e) { const code = e instanceof QuipSwapError ? e.code : "ERR"; log(`ok ${label}: rejected (${code})`); return { label, reverted: true, code }; }
}

const abiTok = [
  { type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const;

async function setup() {
  try { await test.getAutomine(); isFork = true; } catch { isFork = false; }
  const chainId = await pub.getChainId();
  log(`RPC ${RPC} chainId ${chainId} fork/anvil=${isFork} PQ profile ${pqProfile}`);
  if (chainId !== 84532) throw new Error("expected Base Sepolia (84532) or a fork of it");
  for (const a of [A, B, RELAYER]) {
    if (isFork) await test.setBalance({ address: a.address, value: parseEther("1") });
    const bal = await pub.getBalance({ address: a.address });
    log(`  ${a.address} ${formatEther(bal)} ETH`);
    if (bal < parseEther("0.005")) throw new Error(`fund ${a.address} with Base Sepolia ETH first (>=0.005)`);
  }
  const dep = resolveDeployment(BigInt(chainId));
  if ((await pub.getCode({ address: dep.omnibusAddress }))!.length < 10) throw new Error("no Omnibus at " + dep.omnibusAddress);
  const art = JSON.parse(readFileSync("contracts-src/out/MockUSDC.sol/MockUSDC.json", "utf8"));
  const hash = await wallet(RELAYER).deployContract({ abi: art.abi, bytecode: art.bytecode.object, args: [] });
  const token = (await pub.waitForTransactionReceipt({ hash })).contractAddress as Address;
  log(`MockUSDC deployed ${token} (tx ${hash})`);
  return { dep, token, tokenDeployTx: hash };
}

async function scenario(kind: "settled" | "refunded", ctx: Awaited<ReturnType<typeof setup>>) {
  const { dep, token } = ctx;
  const ev: Record<string, unknown> = { scenario: kind, chainId: 84532, rpc: RPC.startsWith("http://127") ? "local anvil fork of Base Sepolia" : RPC,
    omnibus: dep.omnibusAddress, token, tokenDeployTx: ctx.tokenDeployTx, partyA_maker: A.address, partyB_taker: B.address, txs: {} as Record<string, string> };
  const txs = ev.txs as Record<string, string>;
  const pqA = new PqSigner("partyA"), pqB = new PqSigner("partyB");
  ev.pqKeys = { partyA: pqA.commitment, partyB: pqB.commitment, verifier: SHRINCS_VERIFIER, profile: pqProfile };

  // fund maker's ERC-20 leg + approve Omnibus
  await pub.waitForTransactionReceipt({ hash: await wallet(RELAYER).writeContract({ address: token, abi: abiTok, functionName: "mint", args: [A.address, SELL_MUSDC] }) });
  await pub.waitForTransactionReceipt({ hash: txs.approve = await wallet(A).writeContract({ address: token, abi: abiTok, functionName: "approve", args: [dep.omnibusAddress, SELL_MUSDC] }) });
  const bal = async () => ({
    A_musdc: (await pub.readContract({ address: token, abi: abiTok, functionName: "balanceOf", args: [A.address] })).toString(),
    B_musdc: (await pub.readContract({ address: token, abi: abiTok, functionName: "balanceOf", args: [B.address] })).toString(),
    A_eth: formatEther(await pub.getBalance({ address: A.address })), B_eth: formatEther(await pub.getBalance({ address: B.address })),
    omnibus_eth: formatEther(await pub.getBalance({ address: dep.omnibusAddress })) });
  ev.balancesBefore = await bal(); log("before", ev.balancesBefore);

  // ---- 1. off-chain: PQ-signed offer and acceptance ----
  const t0 = await now();
  const { secret, lock } = generateSecret();
  const s = (k: number) => t0 + 40n + GAP * BigInt(k);     // 40s head-room for off-chain steps + first commit
  const offer: Offer = { chainId: 84532n, omnibus: dep.omnibusAddress, lock,
    maker: { eoa: A.address, pq: pqA.commitment }, taker: { eoa: B.address, pq: pqB.commitment },
    sellToken: token, sellAmount: SELL_MUSDC, buyWei: BUY_WEI, validUntil: s(0),
    schedule: [s(0), s(1), s(2), s(3), s(4), s(5)], salt: keccak256(crypto.getRandomValues(new Uint8Array(32)) as unknown as Hex) };
  const signedOffer = signOffer(pqA, offer);
  log(`maker signed offer ${signedOffer.hash} (PQ sig ${(signedOffer.makerSig.length - 2) / 2} bytes)`);
  const acc = acceptOffer(pqB, signedOffer, t0);
  checkAcceptance(signedOffer, acc);
  log(`taker accepted ${acc.hash}; both PQ signatures verified off-chain (hashsigs-wasm)`);
  // belt and braces: same signatures checked by the deployed on-chain verifier (eth_call)
  for (const [n, sig, h, k] of [["offer", signedOffer.makerSig, signedOffer.hash, pqA.commitment], ["acceptance", acc.takerSig, acc.hash, pqB.commitment]] as const) {
    const r = await pub.readContract({ address: SHRINCS_VERIFIER, abi: verifierAbi, functionName: "verify", args: [k, h, sig] });
    if (r !== ERC7913_MAGIC) throw new Error(`on-chain verifier rejected ${n}`);
  }
  ev.offer = { hash: signedOffer.hash, lock, makerSigBytes: (signedOffer.makerSig.length - 2) / 2, acceptanceHash: acc.hash, schedule: offer.schedule.map(String),
    onchainVerifierAcceptedBothSignatures: true };

  // ---- 2. QuipSwap terms + plan ----
  const { proposer, taker } = termsFromOffer(offer);
  const plan = planSameChainSwap(proposer, taker, { minimumBufferSeconds: GAP });   // NB: tiny buffers = demo only
  const cA = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pub, walletClient: wallet(A) });
  const cB = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pub, walletClient: wallet(B) });
  ev.swapId = swapId(lock, proposer, taker); ev.canonicalDigest = plan.canonicalDigest;

  const commit = async (who: "A" | "B") => {
    const [c, pq, party, cp] = who === "A" ? [cA, pqA, proposer, taker] as const : [cB, pqB, taker, proposer] as const;
    const signer = buildKeyedSigner(SHRINCS_VERIFIER, pq.commitment);
    const digest = computeCommitDigest({ lock, party, counterparty: cp, signer, omnibusAddress: dep.omnibusAddress });
    const onchainDigest = await c.getCommitDigest(lock, party, cp, keccak256(signer));
    if (onchainDigest !== digest) throw new Error("SDK commit digest != on-chain commitDigest()");
    const signature = pq.sign(digest);                         // PQ signature authorises/attributes the commit
    const ok = await pub.readContract({ address: SHRINCS_VERIFIER, abi: verifierAbi, functionName: "verify", args: [pq.commitment, digest, signature] });
    if (ok !== ERC7913_MAGIC) throw new Error("commit signature rejected by verifier");
    const h = await c.commit({ lock, party, counterparty: cp, auth: { signer, signature } });
    const r = await c.waitForReceipt(h);
    log(`${who} committed tx ${h} gas ${r.receipt.gasUsed} (PQ keyed route, ${pq.remaining} leaves left)`);
    txs[`commit${who}`] = h; return h;
  };

  // ---- 3. on-chain settlement ----
  await commit("A");
  await waitUntil(plan.takerCommitWindow.lower, "proposer commit deadline; taker window opens");
  const st1 = await getSameChainSwapStatus(cB, lock, plan); log("status (taker view):", st1.status);
  if (st1.status !== "awaiting-taker-commit") throw new Error("unexpected status " + st1.status);
  await commit("B");
  await waitUntil(plan.claimWindow.lower, "taker commit deadline; claim window opens");
  log("status:", (await getSameChainSwapStatus(cA, lock, plan)).status);
  const negative: unknown[] = [];

  if (kind === "settled") {
    const h = await cA.claim({ secret, party: proposer, counterparty: taker });
    const r = await cA.waitForReceipt(h); txs.claim = h;
    log(`A claimed (revealed secret) tx ${h}; claim events: ${r.claims.length}`);
    ev.claimEvents = r.claims.map(c => ({ ...c, chainId: String((c as any).chainId ?? "") }));
    log("status:", (await getSameChainSwapStatus(cA, lock, plan)).status);
  } else {
    // maker "walks away": never reveals. Prove claim closes, early reclaim is refused, then refund both legs.
    negative.push(await expectRevert("B tries reclaim before release", () => cB.reclaim({ lock, party: taker, counterparty: proposer })));
    await waitUntil(plan.claimWindow.upper, "claim window closed (proposer claimDeadline)");
    negative.push(await expectRevert("A claims after claim window", () => cA.claim({ secret, party: proposer, counterparty: taker })));
    await waitUntil(plan.proposerReclaimWindow.lower, "proposer reclaimRelease");
    const hA = await cA.reclaim({ lock, party: proposer, counterparty: taker }); await cA.waitForReceipt(hA); txs.reclaimA = hA;
    log(`A reclaimed tx ${hA}`);
    await waitUntil(plan.takerReclaimWindow.lower, "taker reclaimRelease");
    const hB = await cB.reclaim({ lock, party: taker, counterparty: proposer }); await cB.waitForReceipt(hB); txs.reclaimB = hB;
    log(`B reclaimed tx ${hB}`);
    log("status:", (await getSameChainSwapStatus(cA, lock, plan)).status);
  }
  ev.negativeTests = negative;
  ev.finalStatus = (await getSameChainSwapStatus(cA, lock, plan)).status;
  ev.balancesAfter = await bal(); log("after", ev.balancesAfter);
  mkdirSync("evidence", { recursive: true });
  writeFileSync(`evidence/${kind}-${isFork ? "anvil-fork" : "base-sepolia"}.json`, JSON.stringify(ev, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
  return ev;
}

const which = process.argv[2] ?? "both";
const ctx = await setup();
if (which === "settled" || which === "both") await scenario("settled", ctx);
if (which === "refunded" || which === "both") await scenario("refunded", ctx);
log("done");
