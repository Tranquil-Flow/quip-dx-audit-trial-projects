// Read-only probe of the live Quip contracts on the public testnets (no keys needed).
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia, optimismSepolia } from "viem/chains";
import { createOmnibusClient, resolveDeployment } from "@quip.network/quip-swap-sdk";
import { walletFactoryAbi } from "@quip.network/ethereum-sdk/v1/abi";
import { getNetworkAddresses } from "@quip.network/ethereum-sdk/v1/addresses";
import { getShrincsAddresses } from "@quip.network/ethereum-sdk/v1/shrincs";
import { readFileSync } from "node:fs";

const keys = JSON.parse(readFileSync("keys/keys.json", "utf8"));
for (const chain of [baseSepolia, optimismSepolia]) {
  const pc = createPublicClient({ chain, transport: http(process.env[`RPC_${chain.id}`]) });
  const dep = resolveDeployment(BigInt(chain.id));
  const omni = createOmnibusClient({ address: dep.omnibusAddress, publicClient: pc as any });
  const factory = getNetworkAddresses(chain.id).WalletFactory;
  const [ver, fee, wf, cf, ef, latest, owner] = await Promise.all([
    omni.getVersion(), omni.getCommitmentFee(), omni.getWalletFactory(),
    pc.readContract({ address: factory, abi: walletFactoryAbi, functionName: "creationFee" }),
    pc.readContract({ address: factory, abi: walletFactoryAbi, functionName: "executeFee" }),
    pc.readContract({ address: factory, abi: walletFactoryAbi, functionName: "latestWalletImpl" }),
    omni.getOwner(),
  ]);
  console.log(`== ${chain.name} (${chain.id})`);
  console.log(` Omnibus ${dep.omnibusAddress} version=${ver} commitmentFee=${formatEther(fee)} ETH WALLET_FACTORY=${wf} owner=${owner}`);
  console.log(` WalletFactory ${factory} creationFee=${formatEther(cf as bigint)} executeFee=${formatEther(ef as bigint)} latestImpl=${latest} sdkShrincsImpl=${getShrincsAddresses(chain.id).ShrincsWalletImplementation}`);
  for (const p of [keys.alice, keys.bob]) console.log(` ${p.name} EOA ${p.eoaAddress} balance=${formatEther(await pc.getBalance({ address: p.eoaAddress }))}`);
}
