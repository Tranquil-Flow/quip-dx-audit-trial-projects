// Same trade, but through the *documented* QuipSwap path: the committing side is a Quip SHRINCS wallet
// (created by the WalletFactory) that is msg.sender of Omnibus.commit (wallet route, empty signature).
//   npx tsx src/run-wallet.ts    env: RPC_URL, GAP
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createPublicClient, createTestClient, createWalletClient, encodeFunctionData, http, keccak256, parseEther, formatEther,
  bytesToHex, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { ShrincsFactoryClient, ShrincsSigner } from "@quip.network/ethereum-sdk/v1/shrincs";
import { buildKeyedSigner, createOmnibusClient, generateSecret, planSameChainSwap, getSameChainSwapStatus, resolveDeployment, omnibusAbi } from "@quip.network/quip-swap-sdk";
import { PqSigner, pqProfile } from "./pqkeys.ts";
import { acceptOffer, checkAcceptance, signOffer, termsFromOffer, type Offer } from "./otc.ts";
import { SHRINCS_VERIFIER } from "./pq.ts";

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8547";
const GAP = BigInt(process.env.GAP ?? 20);
const SELL = 1_000_000_000n, BUY = parseEther("0.002");
const eoa = (n: string) => privateKeyToAccount(JSON.parse(readFileSync(`keys/${n}.eoa.json`, "utf8")).privateKey as Hex);
const A = eoa("partyA"), B = eoa("partyB"), RELAYER = eoa("relayer");
const pub = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const wc = (a: typeof A) => createWalletClient({ account: a, chain: baseSepolia, transport: http(RPC) });
const test = createTestClient({ chain: baseSepolia, mode: "anvil", transport: http(RPC) });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const now = async () => { await test.mine({ blocks: 1 }); return (await pub.getBlock()).timestamp; };
const waitUntil = async (ts: bigint, why: string) => { log(`waiting until ${ts} (${why})`); while ((await now()) < ts) await sleep(1500); };
const tok = [
  { type: "function", name: "mint", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "transfer", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "approve", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" }] as const;

const chainId = await pub.getChainId(); const dep = resolveDeployment(BigInt(chainId));
await test.request({ method: "anvil_autoImpersonateAccount" as any, params: [true] as any });   // fork-only workaround, see DEVLOG #33
for (const a of [A, B, RELAYER]) await test.setBalance({ address: a.address, value: parseEther("1") });
const art = JSON.parse(readFileSync("contracts-src/out/MockUSDC.sol/MockUSDC.json", "utf8"));
const token = (await pub.waitForTransactionReceipt({ hash: await wc(RELAYER).deployContract({ abi: art.abi, bytecode: art.bytecode.object, args: [] }) })).contractAddress as Address;
const ev: Record<string, any> = { route: "wallet", chainId, omnibus: dep.omnibusAddress, token, txs: {} }; const txs = ev.txs;

// ---- 1. Quip SHRINCS wallets for both parties (ethereum-sdk) ----
async function makeWallet(name: string, owner: typeof A) {
  mkdirSync("keys", { recursive: true }); const f = `keys/${name}.wallet-seed.json`;
  if (!existsSync(f)) writeFileSync(f, JSON.stringify({ masterSeedHex: bytesToHex(crypto.getRandomValues(new Uint8Array(32))) }), { mode: 0o600 });
  const seed = JSON.parse(readFileSync(f, "utf8")).masterSeedHex as Hex;
  const signer = await ShrincsSigner.create(Uint8Array.from(Buffer.from(seed.slice(2), "hex")));
  const fc = new ShrincsFactoryClient({ publicClient: pub as any, walletClient: wc(owner) as any, account: owner.address, chainId });
  const w = await fc.createShrincsWallet({ signer, maxSignatures: 16, derivationIndex: 0, erc1271: { derivationIndex: 1, maxSignatures: 4 } });
  const st = await w.getWalletState();
  log(`${name} Quip wallet ${w.walletAddress} (owner ${st.owner}, pq commitment ${st.shrincsPublicKeyCommitment}, leaves ${st.remainingStatefulSignatures})`);
  return { w, st };
}
const wa = await makeWallet("partyA", A), wb = await makeWallet("partyB", B);
ev.walletA = wa.w.walletAddress; ev.walletB = wb.w.walletAddress;
await pub.waitForTransactionReceipt({ hash: await wc(RELAYER).writeContract({ address: token, abi: tok, functionName: "mint", args: [wa.w.walletAddress, SELL] }) });
await pub.waitForTransactionReceipt({ hash: await wc(B).sendTransaction({ to: wb.w.walletAddress, value: parseEther("0.01") }) });

// ---- 2. off-chain PQ-signed order (settlement addresses are the wallets) ----
const pqA = new PqSigner("partyA"), pqB = new PqSigner("partyB");
const t0 = await now(); const { secret, lock } = generateSecret(); const s = (k: number) => t0 + 60n + GAP * BigInt(k);
const offer: Offer = { chainId: BigInt(chainId), omnibus: dep.omnibusAddress, lock, maker: { eoa: wa.w.walletAddress, pq: pqA.commitment },
  taker: { eoa: wb.w.walletAddress, pq: pqB.commitment }, sellToken: token, sellAmount: SELL, buyWei: BUY, validUntil: s(0),
  schedule: [s(0), s(1), s(2), s(3), s(4), s(5)], salt: keccak256(crypto.getRandomValues(new Uint8Array(32)) as unknown as Hex) };
const so = signOffer(pqA, offer); const acc = acceptOffer(pqB, so, t0); checkAcceptance(so, acc);
log("offer signed + accepted (PQ, off-chain)", so.hash);
const { proposer, taker } = termsFromOffer(offer); const plan = planSameChainSwap(proposer, taker, { minimumBufferSeconds: GAP });

// ---- 3. settlement: wallet.execute(...) drives Omnibus; the wallet is msg.sender ----
const cA = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pub as any, walletClient: wc(A) as any });
const cB = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pub as any, walletClient: wc(B) as any });
async function viaWallet(label: string, who: typeof wa, call: { to: Address; value: bigint; data: Hex }) {
  const r = await who.w.execute({ target: call.to, value: call.value, data: call.data });
  log(`${label}: wallet.execute tx ${r.transactionHash} status ${r.status}`); txs[label] = r.transactionHash; return r;
}
await viaWallet("A.approve", wa, { to: token, value: 0n, data: encodeFunctionData({ abi: tok, functionName: "approve", args: [dep.omnibusAddress, SELL] }) });
const auth = (st: typeof wa.st) => ({ signer: buildKeyedSigner(SHRINCS_VERIFIER, st.shrincsPublicKeyCommitment), signature: "0x" as Hex });
const callA = await cA.prepareCommit({ lock, party: proposer, counterparty: taker, auth: auth(wa.st) }, { account: wa.w.walletAddress });
await viaWallet("A.commit", wa, callA);
await waitUntil(plan.takerCommitWindow.lower, "taker window");
const callB = await cB.prepareCommit({ lock, party: taker, counterparty: proposer, auth: auth(wb.st) }, { account: wb.w.walletAddress });
await viaWallet("B.commit", wb, callB);
await waitUntil(plan.claimWindow.lower, "claim window");
const h = await cA.claim({ secret, party: proposer, counterparty: taker }); const r = await cA.waitForReceipt(h); txs.claim = h;
log(`claim (sent by A's EOA) tx ${h}, events ${r.claims.length}; status`, (await getSameChainSwapStatus(cA, lock, plan)).status);
ev.final = {
  walletA_musdc: (await pub.readContract({ address: token, abi: tok, functionName: "balanceOf", args: [wa.w.walletAddress] })).toString(),
  walletB_musdc: (await pub.readContract({ address: token, abi: tok, functionName: "balanceOf", args: [wb.w.walletAddress] })).toString(),
  walletA_eth: formatEther(await pub.getBalance({ address: wa.w.walletAddress })), walletB_eth: formatEther(await pub.getBalance({ address: wb.w.walletAddress })) };
log("final", ev.final); void omnibusAbi; void pqProfile;
writeFileSync("evidence/settled-wallet-route-anvil-fork.json", JSON.stringify(ev, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
