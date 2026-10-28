// Creates (or re-opens) a Quip SHRINCS wallet for alice and bob and prints balances.
import { getQuipWallet, publicClient, j } from "./lib.mjs";
import { formatEther } from "viem";
for (const name of ["alice", "bob"]) {
  const { account, wallet } = await getQuipWallet(name);
  const st = await wallet.getWalletState();
  console.log(j({ name, eoa: account.address, eoaBalance: formatEther(await publicClient.getBalance({ address: account.address })),
    quipWallet: wallet.walletAddress, walletBalance: formatEther(await publicClient.getBalance({ address: wallet.walletAddress })),
    owner: st.owner, remainingStatefulSignatures: st.remainingStatefulSignatures, executeFee: st.executeFee }));
}
