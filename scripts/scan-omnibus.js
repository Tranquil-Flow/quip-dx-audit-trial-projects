const { ethers } = require("ethers");
const abi = require("../omnibus_abi.json");

// Fetch omnibus txs from blockscout and decode selectors
(async () => {
  const iface = new ethers.Interface(abi);
  let url = "https://base-sepolia.blockscout.com/api/v2/addresses/0xf780Fc9C066D824bFF85758E381A3919B1817f09/transactions";
  let all = [];
  for (let i = 0; i < 3; i++) {
    const res = await fetch(url);
    const d = await res.json();
    all = all.concat(d.items || []);
    const next = d.next_page_params;
    if (!next) break;
    const q = new URLSearchParams(next).toString();
    url = `https://base-sepolia.blockscout.com/api/v2/addresses/0xf780Fc9C066D824bFF85758E381A3919B1817f09/transactions?${q}`;
  }
  console.log("txs:", all.length);
  const counts = {};
  for (const t of all) {
    const sel = t.raw_input.slice(0, 10);
    counts[sel] = (counts[sel] || 0) + 1;
  }
  console.log("selector counts:", counts);
  for (const t of all.slice(0, 15)) {
    let name = "?";
    try {
      const parsed = iface.parseTransaction({ data: t.raw_input });
      name = parsed.name;
    } catch {}
    const val = t.value ? parseInt(t.value, 16) / 1e18 : 0;
    console.log(t.hash, "blk", t.block, "|", name, "| from", (t.from || {}).hash ? t.from.hash.slice(0, 10) : "?", "| value", val, "| result", t.result);
  }
})();
