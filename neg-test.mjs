// Negative test on the fork: sign a transfer of 0.001 ETH, then tamper the value to 0.005 before sending.
import { readFileSync } from "node:fs";
import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ShrincsSigner, ShrincsFactoryClient } from "@quip.network/ethereum-sdk/v1/shrincs";
const RPC = process.env.QUIP_RPC; const eoa = privateKeyToAccount(JSON.parse(readFileSync("keys/eoa.json")).privateKey);
const signer = await ShrincsSigner.fromMnemonic(JSON.parse(readFileSync("keys/quip-shrincs.json")).mnemonic);
const pc = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const f = new ShrincsFactoryClient({ publicClient: pc, walletClient: null, account: eoa.address, chainId: 84532 });
const w = await f.getShrincsWallet({ signer, owner: eoa.address, maxSignatures: 64, derivationIndex: 0, erc1271: { derivationIndex: 1 } });
const { contractCall } = await w.buildExecuteCall({ target: "0x2222222222222222222222222222222222222222", value: parseEther("0.001") }, {});
contractCall.args[3] = parseEther("0.005"); contractCall.value = 0n;
try { await pc.simulateContract({ ...contractCall, account: eoa.address }); console.log("UNEXPECTED: tampered call accepted"); }
catch (e) { console.log("tampered call rejected:", e.shortMessage, "|", e.cause?.data?.errorName ?? e.cause?.reason ?? ""); }
