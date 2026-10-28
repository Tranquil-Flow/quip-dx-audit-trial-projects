// QuipSwap same-chain swap between two Quip (SHRINCS) wallets, driven by
// @quip.network/quip-swap-sdk (Omnibus) + @quip.network/ethereum-sdk@beta (wallets).
//
//   Alice's Quip wallet  gives  ALICE_GIVES wei  → Bob's Quip wallet
//   Bob's   Quip wallet  gives  BOB_GIVES   wei  → Alice's Quip wallet
//
// Alice is the proposer (holds the secret, commits first). Bob is the taker.
// Any EOA may send the final `claim`, which settles both legs at once.
//
// Env:
//   RPC_URL       default https://sepolia.base.org   (chain id is read from the RPC)
//   OMNIBUS       optional override (e.g. for a fork); default = SDK registry
//   BUFFER_SECS   gap between schedule timestamps, default 300 (SDK DEFAULT_BUFFERS.fastL2)
//   FORK_WARP=1   on Anvil only: evm_increaseTime instead of waiting in real time
//   STATE_FILE    default runs/<chainId>-state.json (resumable)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  createPublicClient, createWalletClient, http, formatEther, parseEther, defineChain,
  type Address, type Hex, type PublicClient, type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createOmnibusClient, resolveDeployment, createTerms, nativeAsset, generateSecret,
  planSameChainSwap, getSameChainSwapStatus, swapId, type Terms, type OmnibusClient,
} from "@quip.network/quip-swap-sdk";
import { ShrincsSigner, ShrincsFactoryClient, type ShrincsWalletClient } from "@quip.network/ethereum-sdk/v1/shrincs";

const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const BUFFER = BigInt(process.env.BUFFER_SECS ?? "300");
const ALICE_GIVES = parseEther(process.env.ALICE_GIVES ?? "0.00002");
const BOB_GIVES = parseEther(process.env.BOB_GIVES ?? "0.00001");
const MAX_SIGNATURES = 64; // SHRINCS stateful leaves per wallet (hashsigs-wasm default is 1024)
const WALLET_TOPUP = parseEther(process.env.WALLET_TOPUP ?? "0.00005");
const MIN_EOA_BALANCE = parseEther(process.env.MIN_EOA_BALANCE ?? "0.0003"); // gas for create+fund+commit(+claim) on Base Sepolia + legs

const keys = JSON.parse(readFileSync("keys/keys.json", "utf8"));
const bigjson = (o: unknown) => JSON.stringify(o, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const probe = createPublicClient({ transport: http(RPC_URL) });
const chainId = await probe.getChainId();
const chain = defineChain({
  id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});
const publicClient = createPublicClient({ chain, transport: http(RPC_URL) }) as PublicClient;
const omnibusAddress = (process.env.OMNIBUS as Address | undefined) ?? resolveDeployment(BigInt(chainId)).omnibusAddress;

mkdirSync("runs", { recursive: true });
const STATE_FILE = process.env.STATE_FILE ?? `runs/${chainId}-state.json`;
type State = {
  chainId: number; omnibus: Address; wallets: Record<string, Address>; txs: Record<string, Hex>;
  secret?: Hex; lock?: Hex; alice?: Terms; bob?: Terms; swapId?: Hex; stage: string;
};
const revive = (_: string, v: unknown) => (typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v);
const state: State = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE, "utf8"), revive)
  : { chainId, omnibus: omnibusAddress, wallets: {}, txs: {}, stage: "init" };
const save = () =>
  writeFileSync(STATE_FILE, JSON.stringify(state, (_, v) => (typeof v === "bigint" ? `${v}n` : v), 2), { mode: 0o600 });

async function chainNow(): Promise<bigint> {
  return (await publicClient.getBlock()).timestamp;
}
async function waitUntil(ts: bigint, why: string) {
  for (;;) {
    const now = await chainNow();
    if (now >= ts) return;
    if (process.env.FORK_WARP === "1") {
      await publicClient.request({ method: "evm_increaseTime" as any, params: [Number(ts - now) + 1] as any });
      await publicClient.request({ method: "evm_mine" as any, params: [] as any });
      continue;
    }
    log(`waiting ${ts - now}s for ${why} (chain time ${now} → ${ts})`);
    await new Promise((r) => setTimeout(r, Math.min(30, Number(ts - now) + 3) * 1000));
  }
}

// WORKAROUND: @quip.network/ethereum-sdk passes `account: <address string>` to viem's
// writeContract, which makes viem use node-side signing (eth_sendTransaction → "No Signer
// available" on public RPCs). Re-inject the local private-key account so viem signs locally.
function localSigning(wc: WalletClient, acct: ReturnType<typeof privateKeyToAccount>): WalletClient {
  return new Proxy(wc, {
    get(target, prop, recv) {
      if (prop === "writeContract" || prop === "sendTransaction")
        return (args: any) => (target as any)[prop]({ ...args, account: acct });
      return Reflect.get(target, prop, recv);
    },
  });
}

type Party = { name: string; eoa: ReturnType<typeof privateKeyToAccount>; walletClient: WalletClient; quip: ShrincsWalletClient };

async function setupParty(name: "alice" | "bob"): Promise<Party> {
  const k = keys[name];
  const eoa = privateKeyToAccount(k.eoaPrivateKey);
  const walletClient = localSigning(createWalletClient({ account: eoa, chain, transport: http(RPC_URL) }), eoa);
  const bal = await publicClient.getBalance({ address: eoa.address });
  log(`${name} EOA ${eoa.address} balance ${formatEther(bal)} ETH`);
  if (bal < MIN_EOA_BALANCE) {
    console.error(
      `\nBLOCKED: ${name}'s throwaway EOA ${eoa.address} has ${formatEther(bal)} ETH on chain ${chainId}; ` +
        `needs >= ${formatEther(MIN_EOA_BALANCE)} ETH for gas + wallet top-up + swap leg.\n` +
        `Fund both EOAs from a faucet (e.g. https://www.alchemy.com/faucets/base-sepolia — CAPTCHA, human needed) and re-run.\n` +
        `Needed: alice ${keys.alice.eoaAddress}, bob ${keys.bob.eoaAddress}`,
    );
    process.exit(2);
  }
  const signer = await ShrincsSigner.fromMnemonic(k.shrincsMnemonic);
  const factory = new ShrincsFactoryClient({ publicClient, walletClient, account: eoa.address, chainId });
  const params = { signer, maxSignatures: MAX_SIGNATURES, derivationIndex: 0, erc1271: { derivationIndex: 1 } };
  let quip: ShrincsWalletClient;
  try {
    quip = await factory.getShrincsWallet({ ...params, owner: eoa.address });
    log(`${name} Quip wallet already deployed at ${quip.walletAddress}`);
  } catch (e: any) {
    if (e?.name !== "NoVaultFoundError" && !/NoVaultFound/.test(String(e))) throw e;
    const est = await factory.estimateCreationCost(params);
    log(`${name}: creating SHRINCS Quip wallet (est. cost ${formatEther(est.gasUnits * est.gasPrice + est.creationFee)} ETH)…`);
    quip = await factory.createShrincsWallet(params);
    log(`${name} Quip wallet created at ${quip.walletAddress}`);
  }
  state.wallets[name] = quip.walletAddress;
  save();
  return { name, eoa, walletClient, quip };
}

async function topUp(p: Party, min: bigint) {
  const bal = await publicClient.getBalance({ address: p.quip.walletAddress });
  if (bal >= min) return;
  const hash = await p.walletClient.sendTransaction({ account: p.eoa, chain, to: p.quip.walletAddress, value: min - bal });
  await publicClient.waitForTransactionReceipt({ hash });
  state.txs[`${p.name}_fund_wallet`] = hash;
  save();
  log(`${p.name}: funded Quip wallet with ${formatEther(min - bal)} ETH tx ${hash}`);
}

// Commit this side's leg: the Omnibus wallet route requires msg.sender to be a Quip wallet,
// so the swap SDK prepares the Call and the Quip wallet executes it (SHRINCS-signed; EOA pays gas).
async function commitFrom(p: Party, omnibus: OmnibusClient, party: Terms, counterparty: Terms) {
  const call = await omnibus.prepareCommit(
    {
      lock: state.lock!, party, counterparty,
      // wallet route: empty signature; `signer` is attribution only (must be > 20 bytes)
      auth: { signer: `${p.quip.walletAddress}${p.quip.commitment.slice(2)}` as Hex, signature: "0x" },
    },
    { account: p.quip.walletAddress },
  );
  log(`${p.name}: prepared commit Call to=${call.to} value=${call.value}`);
  // ShrincsWalletClient.execute attaches `value + maxFee` from the EOA as msg.value; the wallet
  // forwards `value` to Omnibus.commit. (The wallet top-up exists only so prepareCommit's
  // balance preflight / simulation from the wallet address passes.)
  const receipt = await p.quip.execute({ target: call.to, value: call.value, data: call.data });
  const decoded = await omnibus.waitForReceipt(receipt.transactionHash);
  state.txs[`${p.name}_commit`] = receipt.transactionHash;
  save();
  log(`${p.name}: commit tx ${receipt.transactionHash} status=${receipt.status} events=${bigjson(decoded.commitments ?? decoded)}`.slice(0, 600));
}

async function balances(label: string, parties: Party[]) {
  for (const p of parties) {
    const w = await publicClient.getBalance({ address: p.quip.walletAddress });
    log(`[${label}] ${p.name} Quip wallet ${p.quip.walletAddress} = ${formatEther(w)} ETH`);
  }
}

// ---------------------------------------------------------------------------
log(`chain ${chainId} via ${RPC_URL}; Omnibus ${omnibusAddress}; state ${STATE_FILE}`);
const alice = await setupParty("alice");
const bob = await setupParty("bob");
await topUp(alice, WALLET_TOPUP);
await topUp(bob, WALLET_TOPUP);
await balances("before", [alice, bob]);

const omnibusRead = createOmnibusClient({ address: omnibusAddress, publicClient });
if (!(await omnibusRead.isQuipWallet(alice.quip.walletAddress)) || !(await omnibusRead.isQuipWallet(bob.quip.walletAddress)))
  throw new Error("Omnibus does not recognise the wallets as Quip wallets");
log("Omnibus.isQuipWallet: both wallets ✔");

if (!state.alice) {
  const { secret, lock } = generateSecret();
  const t0 = (await chainNow()) + 90n; // time for Alice to commit
  const aliceTerms = createTerms({
    chainId: BigInt(chainId), reclaimRecipient: alice.quip.walletAddress, recipient: alice.quip.walletAddress,
    commitmentDeadline: t0, claimDeadline: t0 + 2n * BUFFER, reclaimRelease: t0 + 4n * BUFFER,
    assets: [nativeAsset(ALICE_GIVES)],
  });
  const bobTerms = createTerms({
    chainId: BigInt(chainId), reclaimRecipient: bob.quip.walletAddress, recipient: bob.quip.walletAddress,
    commitmentDeadline: t0 + BUFFER, claimDeadline: t0 + 3n * BUFFER, reclaimRelease: t0 + 5n * BUFFER,
    assets: [nativeAsset(BOB_GIVES)],
  });
  Object.assign(state, { secret, lock, alice: aliceTerms, bob: bobTerms, swapId: swapId(lock, aliceTerms, bobTerms), stage: "planned" });
  save();
}
const plan = planSameChainSwap(state.alice!, state.bob!, { minimumBufferSeconds: BUFFER });
log(`plan: proposer=alice swapId=${state.swapId} lock=${state.lock}`);
log(`windows: aliceCommit<${plan.proposerCommitWindow.upper} bobCommit=[${plan.takerCommitWindow.lower},${plan.takerCommitWindow.upper}) claim=[${plan.claimWindow.lower},${plan.claimWindow.upper})`);

const status = async () => (await getSameChainSwapStatus(omnibusRead, state.lock!, plan)).status;
let s = await status();
log("status:", s);

if (s === "awaiting-proposer-commit") {
  await commitFrom(alice, omnibusRead, plan.proposerTerms, plan.takerTerms);
  s = await status();
  log("status:", s);
}
if (s === "awaiting-taker-window") {
  await waitUntil(plan.takerCommitWindow.lower, "Bob's (taker) commit window to open");
  s = await status();
}
if (s === "awaiting-taker-commit") {
  await commitFrom(bob, omnibusRead, plan.takerTerms, plan.proposerTerms);
  s = await status();
  log("status:", s);
}
if (s === "awaiting-claim-window") {
  await waitUntil(plan.claimWindow.lower, "claim window to open");
  s = await status();
}
if (s === "claimable") {
  // Claim is permissionless; Alice's EOA reveals the secret and settles both legs.
  const omnibusAlice = createOmnibusClient({ address: omnibusAddress, publicClient, walletClient: alice.walletClient });
  const hash = await omnibusAlice.claim({ secret: state.secret!, party: plan.proposerTerms, counterparty: plan.takerTerms });
  const r = await omnibusAlice.waitForReceipt(hash);
  state.txs.claim = hash;
  save();
  log(`claim tx ${hash} status=${r.receipt?.status ?? "?"}`);
  s = await status();
}
state.stage = s;
save();
log("final status:", s);
await balances("after", [alice, bob]);
console.log(bigjson({ chainId, omnibus: omnibusAddress, wallets: state.wallets, swapId: state.swapId, lock: state.lock, txs: state.txs, status: s }));
