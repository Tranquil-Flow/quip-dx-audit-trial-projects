// Bob (the OTC counterparty) deploys a throwaway ERC-20 and mints it to his Quip wallet.
import fs from "node:fs"; import path from "node:path";
import { getQuipWallet, publicClient, localSigningWalletClient, ROOT, KEYS, j } from "./lib.mjs";
const art = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "OtcToken.json"), "utf8"));
const bob = await getQuipWallet("bob");
const wc = localSigningWalletClient(bob.account);
const hash = await wc.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [bob.wallet.walletAddress, 1_000_000n * 10n ** 6n], account: bob.account });
const rc = await publicClient.waitForTransactionReceipt({ hash });
const out = { token: rc.contractAddress, deployTx: hash, mintedTo: bob.wallet.walletAddress };
fs.writeFileSync(path.join(KEYS, `token${process.env.WALLET_TAG ?? ""}.json`), j(out));
console.log(j(out));
