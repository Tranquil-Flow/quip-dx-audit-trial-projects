// Minimal "Ethereum-over-Substrate" client for Quip Aglais (pallet-revive), because no public
// Ethereum JSON-RPC (eth_*) endpoint exists. Signs normal Ethereum txs with ethers and submits
// them as unsigned `Revive.ethTransact(rawTx)` extrinsics through the Substrate WS RPC.
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Transaction, Wallet, Interface, hexlify, getBytes } from 'ethers';
import { readFileSync } from 'fs';
import { u8aConcat, u8aToHex, compactToU8a } from '@polkadot/util';
import { blake2AsHex } from '@polkadot/util-crypto';

export const WS = process.env.AGLAIS_WS || 'wss://bootnode-1.aglais.quip.network:20049/rpc';
export const CHAIN_ID = 20033n; // Revive.chainId const = 0x4e41
export const FAUCET = 'https://faucet.aglais.quip.network/request';

export async function connect() {
  const provider = new WsProvider(WS);
  const api = await ApiPromise.create({ provider, noInitWarn: true });
  api.wsProvider = provider;
  return api;
}

export const loadWallet = (name) => new Wallet(JSON.parse(readFileSync(`keys/${name}.json`)).privateKey);
export const loadArtifact = () => JSON.parse(readFileSync('contracts/out/Raffle.sol/Raffle.json'));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const toBigInt = (x) => BigInt(x.toString());

/// Dry-run through the runtime API; returns the eth-gas the runtime says is needed.
export async function estimate(api, { from, to, data, value = 0n }) {
  const tx = { from, input: { input: data }, value: '0x' + value.toString(16) };
  if (to) tx.to = to;
  const res = await api.call.reviveApi.ethTransact(tx);
  if (res.isErr) throw new Error('dry-run failed: ' + res.asErr.toString());
  return toBigInt(res.asOk.ethGas);
}

/// eth_call equivalent (read-only) via the same dry-run; returns raw return data hex.
export async function ethCall(api, { from, to, data }) {
  const res = await api.call.reviveApi.ethTransact({ from, to, input: { input: data } });
  if (res.isErr) throw new Error('call failed: ' + res.asErr.toString());
  return res.asOk.data.toHex();
}

/// Sign an Ethereum tx and submit as an unsigned extrinsic. Resolves with block info + events.
export async function sendEth(api, wallet, { to, data, value = 0n, gasLimit }) {
  const from = wallet.address;
  if (!gasLimit) gasLimit = ((await estimate(api, { from, to, data, value })) * 12n) / 10n + 100000n;
  const nonce = Number(await api.call.reviveApi.nonce(from));
  const gasPrice = (toBigInt(await api.call.reviveApi.gasPrice()) * BigInt(process.env.GAS_MULT || 1));
  const tx = Transaction.from({ type: 0, chainId: CHAIN_ID, nonce, gasPrice, gasLimit, to: to ?? null, value, data });
  const raw = wallet.signingKey.sign(tx.unsignedHash);
  tx.signature = raw;
  const signed = tx.serialized;
  // polkadot-js would wrap this as a (dummy-)signed v4 extrinsic which the runtime rejects
  // ("bad signature"). Revive wants a BARE v4 extrinsic: compact(len) ++ 0x04 ++ call.
  const call = api.tx.revive.ethTransact(signed).method.toU8a();
  const body = u8aConcat(new Uint8Array([0x04]), call);
  const hex = u8aToHex(u8aConcat(compactToU8a(body.length), body));
  const extrinsicHash = blake2AsHex(hex, 256);
  await api.wsProvider.send('author_submitExtrinsic', [hex]);
  const found = await waitForExtrinsic(api, extrinsicHash);
  return { ethTxHash: tx.hash, extrinsicHash, nonce, ...found };
}

async function waitForExtrinsic(api, extrinsicHash, timeoutMs = 20 * 60 * 1000) {
  const t0 = Date.now();
  let seen = Number((await api.rpc.chain.getHeader()).number) - 1;
  while (Date.now() - t0 < timeoutMs) {
    const head = Number((await api.rpc.chain.getHeader()).number);
    for (; seen < head; seen++) {
      const n = seen + 1;
      const bh = await api.rpc.chain.getBlockHash(n);
      // polkadot-js cannot decode blocks that contain v5 "general" extrinsics -> use raw JSON-RPC.
      const raw = await api.wsProvider.send('chain_getBlock', [bh.toHex()]);
      const idx = raw.block.extrinsics.findIndex((x) => blake2AsHex(x, 256) === extrinsicHash);
      if (idx >= 0) {
        const events = (await (await api.at(bh)).query.system.events()).filter((r) => r.phase.isApplyExtrinsic && r.phase.asApplyExtrinsic.toNumber() === idx);
        const failed = events.find((r) => api.events.system.ExtrinsicFailed.is(r.event));
        if (failed) throw new Error('ExtrinsicFailed: ' + failed.event.data.toString());
        return { blockNumber: n, blockHash: bh.toHex(), events };
      }
    }
    await sleep(2000);
  }
  throw new Error('timeout waiting for extrinsic ' + extrinsicHash);
}

export async function deploy(api, wallet, art, args = [], value = 0n) {
  const iface = new Interface(art.abi);
  const data = art.bytecode.object + iface.encodeDeploy(args).slice(2);
  const res = await sendEth(api, wallet, { data, value });
  // contract address = CREATE(from, nonce)
  const { getCreateAddress } = await import('ethers');
  res.address = getCreateAddress({ from: wallet.address, nonce: res.nonce });
  return res;
}

export async function send(api, wallet, iface, address, fn, args = [], value = 0n) {
  return sendEth(api, wallet, { to: address, data: iface.encodeFunctionData(fn, args), value });
}

export async function view(api, iface, address, fn, args = []) {
  const out = await ethCall(api, { from: '0x0000000000000000000000000000000000000001', to: address, data: iface.encodeFunctionData(fn, args) });
  return iface.decodeFunctionResult(fn, out);
}

export async function faucet(addr) {
  const r = await fetch(FAUCET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dest: addr }) });
  return { status: r.status, body: await r.text() };
}

/// Decode Solidity events emitted by `address` from Revive.ContractEmitted substrate events.
export function contractLogs(events, iface, address) {
  const out = [];
  for (const { event } of events) {
    if (event.section !== 'revive' || event.method !== 'ContractEmitted') continue;
    const d = event.data.toJSON();
    const obj = Array.isArray(d) ? { contract: d[0], data: d[1], topics: d[2] } : d;
    if (address && obj.contract.toLowerCase() !== address.toLowerCase()) continue;
    try { const l = iface.parseLog({ topics: obj.topics, data: obj.data }); if (l) out.push(l); } catch { /* not ours */ }
  }
  return out;
}

export async function headNumber(api) { return Number((await api.rpc.chain.getHeader()).number); }
export async function waitForBlock(api, target) {
  while ((await headNumber(api)) < target) await sleep(3000);
}
