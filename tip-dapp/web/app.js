import { BrowserProvider, Contract, parseEther, parseUnits, formatEther, formatUnits } from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

// Fill in after deploying the contract (see ../README.md).
const TIPJAR_ADDRESS = "0x6DA047CfA020C04de82cF4aFBa8cDD52b537E60b"; // Aglais deployment
const CHAIN_ID = 20033; // Aglais, the Quip Network testnet
// Wallets do not ship Aglais, so wallet_switchEthereumChain needs this to add it first (error 4902).
const CHAIN_PARAMS = {
  chainId: "0x" + CHAIN_ID.toString(16),
  chainName: "Aglais Testnet (Quip Network)",
  nativeCurrency: { name: "AGLS", symbol: "AGLS", decimals: 18 },
  rpcUrls: ["https://evm-rpc.aglais.quip.network:20049"],
  blockExplorerUrls: ["https://explorer.aglais.quip.network"],
};

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
let provider, signer;

async function connect() {
  if (!window.ethereum) return ($("status").textContent = "No injected wallet found");
  provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== CHAIN_ID) {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: CHAIN_PARAMS.chainId }]);
    } catch (e) {
      if ((e.error?.code ?? e.code) !== 4902) throw e;
      await provider.send("wallet_addEthereumChain", [CHAIN_PARAMS]);
    }
    provider = new BrowserProvider(window.ethereum);
  }
  signer = await provider.getSigner();
  $("account").textContent = await signer.getAddress();
  loadTips();
}

async function sendTip() {
  const jar = new Contract(TIPJAR_ADDRESS, ABI, signer);
  const token = $("token").value.trim() || "0x0000000000000000000000000000000000000000";
  let tokenAmount = 0n;
  if ($("tokenAmount").value && token !== "0x0000000000000000000000000000000000000000") {
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
  loadTips();
}

async function loadTips() {
  const jar = new Contract(TIPJAR_ADDRESS, ABI, provider);
  const latest = await provider.getBlockNumber();
  const events = await jar.queryFilter(jar.filters.Tipped(), Math.max(0, latest - 5000), latest);
  $("tips").innerHTML = "";
  for (const e of events.reverse().slice(0, 20)) {
    const { tipper, creator, ethAmount, token, tokenAmount, message } = e.args;
    const li = document.createElement("li");
    li.textContent = `${tipper} -> ${creator}: ${formatEther(ethAmount)} AGLS` +
      (tokenAmount > 0n ? ` + ${formatUnits(tokenAmount, 18)} of ${token}` : "") + (message ? ` "${message}"` : "");
    $("tips").appendChild(li);
  }
}

$("connect").onclick = () => connect().catch((e) => ($("status").textContent = e.message));
$("tip").onclick = () => sendTip().catch((e) => ($("status").textContent = e.shortMessage || e.message));
