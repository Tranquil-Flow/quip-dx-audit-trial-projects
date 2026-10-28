// (a) Happy path: Alice (initiator/proposer) sells native ETH, Bob (counterparty/taker) pays tUSD.
// Both commit into the QuipSwap Omnibus on Base Sepolia; Alice claims Bob's leg (revealing the
// secret on-chain); Bob reads the secret from Alice's Claim event and claims Alice's leg.
import fs from "node:fs"; import path from "node:path";
import { formatEther, encodeFunctionData, erc20Abi } from "viem";
import { getQuipWallet, newSecret, now, schedule, waitUntil, exec, commitCall, claimData, read, LOCK_STATE, ASSET,
  CHAIN_ID, OMNIBUS, KEYS, publicClient, decodeOmnibusEvents, tokenBalance, record, j } from "./lib.mjs";

const ETH_LEG = BigInt(process.env.ETH_LEG_WEI ?? 100_000_000_000_000n);     // 0.0001 ETH
const TOKEN_LEG = BigInt(process.env.TOKEN_LEG ?? 250n * 10n ** 6n);          // 250 tUSD
const token = JSON.parse(fs.readFileSync(path.join(KEYS, `token${process.env.WALLET_TAG ?? ""}.json`), "utf8")).token;

const alice = await getQuipWallet("alice");
const bob = await getQuipWallet("bob");
const A = alice.wallet.walletAddress, B = bob.wallet.walletAddress;
const bal = async () => ({
  aliceWalletETH: formatEther(await publicClient.getBalance({ address: A })), aliceWalletTUSD: String(await tokenBalance(token, A)),
  bobWalletETH: formatEther(await publicClient.getBalance({ address: B })), bobWalletTUSD: String(await tokenBalance(token, B)),
});
const before = await bal();
console.log("Balances before:", j(before));

// --- 1. Off-chain: Alice creates the secret + terms and sends {lock, terms} to Bob (never the secret).
const { secret, lock } = newSecret();
const t0 = await now();
const s = schedule(t0);
const aliceLeg = { chainId: BigInt(CHAIN_ID), reclaimRecipient: A, recipient: A, /* recipient = where THIS party receives the other leg */ ...s.proposer,
  assets: [{ assetType: ASSET.Native, target: "0x0000000000000000000000000000000000000000", id: 0n, amount: ETH_LEG }] };
const bobLeg = { chainId: BigInt(CHAIN_ID), reclaimRecipient: B, recipient: B, ...s.taker,
  assets: [{ assetType: ASSET.ERC20, target: token, id: 0n, amount: TOKEN_LEG }] };
const swapId = await read("swapId", [lock, aliceLeg, bobLeg]);
console.log(`lock ${lock}\nswapId ${swapId}`);
const txs = {};

// --- 2. Alice commits her leg (proposer window [0, aliceLeg.commitmentDeadline)).
txs.aliceCommit = (await exec(alice, commitCall(lock, aliceLeg, bobLeg, A, alice.wallet.commitment), "Alice commit (0.0001 ETH)")).transactionHash;
console.log(`  lockState(swapId) = ${LOCK_STATE[await read("lockState", [swapId])]}`);

// --- 3. Bob independently verifies Alice's commitment on-chain before locking his leg.
//     swapId is derived from (lock, both legs), so a Free lock at this swapId proves Alice locked exactly these terms.
const st = LOCK_STATE[await read("lockState", [swapId])];
console.log(`  Bob check: lockState(swapId)=${st}, termsHash=${await read("termsHash", [swapId])}`);
if (st !== "Free") throw new Error("Bob: Alice's commitment not found on-chain — refusing to commit");
await waitUntil(aliceLeg.commitmentDeadline, "taker commit window opens at proposer.commitmentDeadline");
txs.bobApprove = (await exec(bob, { target: token, value: 0n, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [OMNIBUS, TOKEN_LEG] }) }, "Bob approve tUSD")).transactionHash;
txs.bobCommit = (await exec(bob, commitCall(lock, bobLeg, aliceLeg, B, bob.wallet.commitment), "Bob commit (250 tUSD)")).transactionHash;
console.log(`  lockState(swapId) = ${LOCK_STATE[await read("lockState", [swapId])]}`);

// --- 4. Claim window [taker.commitmentDeadline, proposer.claimDeadline). Alice claims Bob's leg -> reveals secret.
await waitUntil(bobLeg.commitmentDeadline, "claim window opens at taker.commitmentDeadline");
const rA = await exec(alice, { target: OMNIBUS, value: 0n, data: claimData(secret, bobLeg, aliceLeg) }, "Alice claim Bob's leg (reveals secret)");
txs.aliceClaim = rA.transactionHash;

// --- 5. Same-chain swap: that single claim settled BOTH legs atomically (two Claim events, one per leg).
//        Bob does not need to act; he verifies on-chain that the lock is Spent and his ETH arrived.
//        (Cross-chain, Bob would instead read `secret` from the Claim event and call claim on the other chain.)
const claims = decodeOmnibusEvents(rA).filter(e => e.event === "Claim");
console.log(`  ${claims.length} Claim events: recipients ${claims.map(c => c.args.recipient).join(", ")}; revealed secret ${claims[0].args.secret}`);
console.log(`  lockState(swapId) = ${LOCK_STATE[await read("lockState", [swapId])]}`);
const after = await bal();
console.log("Balances after:", j(after));
record(`happy${process.env.WALLET_TAG ?? ""}.json`, { rpc: process.env.RPC_URL ?? "https://sepolia.base.org", omnibus: OMNIBUS, token, aliceWallet: A, bobWallet: B,
  aliceEOA: alice.account.address, bobEOA: bob.account.address, lock, secret, swapId, aliceLeg, bobLeg, txs, before, after });
