import { BrowserProvider, JsonRpcProvider, Contract, parseEther, parseUnits, formatEther, formatUnits } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

const CHAIN_ID = 20033;
const config = await (await fetch('./deployment.json', { cache: 'no-store' })).json();
if (config.chainId !== CHAIN_ID) throw Error('Deployment config chain mismatch');
const TIPJAR_ADDRESS = config.tipJar;
const RPC = "https://evm-rpc.aglais.quip.network";
const reader = new JsonRpcProvider(RPC, CHAIN_ID, { staticNetwork: true });
const ZERO = "0x0000000000000000000000000000000000000000";
const ABI = [
  "function tip(address creator, address token, uint256 tokenAmount, string message) payable",
  "function withdrawEth()",
  "function withdrawToken(address token)",
  "event Tipped(address indexed tipper, address indexed creator, uint256 ethAmount, address token, uint256 tokenAmount, string message)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];
const $ = (id) => document.getElementById(id);
let signer, pqMode = false;

async function connect() {
  if (!window.ethereum) throw Error("No injected EVM wallet found; use the local Quip PQ account instead");
  let provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  if (Number((await provider.getNetwork()).chainId) !== CHAIN_ID) {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: "0x4e41" }]);
    } catch (e) {
      if (e.code !== 4902) throw e;
      await provider.send("wallet_addEthereumChain", [{ chainId: "0x4e41", chainName: "Quip Aglais Testnet",
        rpcUrls: [RPC], nativeCurrency: { name: "Aglais", symbol: "AGLS", decimals: 18 } }]);
    }
    provider = new BrowserProvider(window.ethereum);
  }
  if (Number((await provider.getNetwork()).chainId) !== CHAIN_ID) throw Error("Wallet is not on Aglais testnet");
  signer = await provider.getSigner();
  pqMode = false;
  $("account").textContent = "EVM wallet: " + await signer.getAddress();
  await loadTips();
}

async function connectPq() {
  const r = await fetch("/api/pq-account");
  if (!r.ok) throw Error("Local Quip PQ signer unavailable; start `node scripts/serve.mjs` in the project");
  const d = await r.json();
  if (d.chainId !== CHAIN_ID) throw Error("PQ service chain mismatch");
  pqMode = true;
  signer = undefined;
  $("account").textContent = "Local Quip-SHRINCS demo account: " + d.account;
  $("status").textContent = "Testnet only. Native AGLS tips (max 0.005); a local gas relayer submits PQ-authorized calls.";
  await loadTips();
}

async function sendTip() {
  if (pqMode) {
    if ($("token").value.trim() || $("tokenAmount").value.trim()) throw Error("PQ demo mode supports native AGLS tips only; clear token fields");
    $("status").textContent = "Quip signer authorizing tip and relayer broadcasting...";
    const r = await fetch("/api/pq-tip", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creator: $("creator").value.trim(), amount: $("eth").value.trim(), message: $("message").value }) });
    const result = await r.json();
    if (!r.ok) throw Error(result.error || "PQ tip failed");
    $("status").textContent = "PQ tip confirmed! tx " + result.tx;
    return loadTips();
  }
  if (!signer) throw Error("Connect an injected EVM wallet or the local Quip PQ account first");
  const jar = new Contract(TIPJAR_ADDRESS, ABI, signer);
  const token = $("token").value.trim() || ZERO;
  let tokenAmount = 0n;
  if ($("tokenAmount").value && token !== ZERO) {
    const erc20 = new Contract(token, ERC20_ABI, signer);
    tokenAmount = parseUnits($("tokenAmount").value, await erc20.decimals());
    $("status").textContent = "Approving token...";
    await (await erc20.approve(TIPJAR_ADDRESS, tokenAmount)).wait();
  }
  const value = $("eth").value ? parseEther($("eth").value) : 0n;
  $("status").textContent = "Sending tip...";
  const tx = await jar.tip($("creator").value.trim(), token, tokenAmount, $("message").value, { value });
  await tx.wait();
  $("status").textContent = "Tipped! tx " + tx.hash;
  await loadTips();
}

async function loadTips() {
  const jar = new Contract(TIPJAR_ADDRESS, ABI, reader);
  const latest = await reader.getBlockNumber();
  const events = await jar.queryFilter(jar.filters.Tipped(), Math.max(0, latest - 5000), latest);
  $("tips").replaceChildren();
  for (const e of events.reverse().slice(0, 20)) {
    const { tipper, creator, ethAmount, token, tokenAmount, message } = e.args;
    const li = document.createElement("li");
    let tokenText = "";
    if (tokenAmount > 0n) {
      let decimals = 18;
      try { decimals = await new Contract(token, ERC20_ABI, reader).decimals(); } catch { /* unknown token */ }
      tokenText = ` + ${formatUnits(tokenAmount, decimals)} of ${token}`;
    }
    li.textContent = `${tipper} -> ${creator}: ${formatEther(ethAmount)} AGLS` + tokenText + (message ? ` "${message}"` : "");
    $("tips").appendChild(li);
  }
}

$("connect").onclick = () => connect().catch((e) => ($("status").textContent = e.shortMessage || e.message));
$("connect-pq").onclick = () => connectPq().catch((e) => ($("status").textContent = e.message));
$("tip").onclick = () => sendTip().catch((e) => ($("status").textContent = e.shortMessage || e.message));
loadTips().catch((e) => ($("status").textContent = "Tip history unavailable: " + e.message));
