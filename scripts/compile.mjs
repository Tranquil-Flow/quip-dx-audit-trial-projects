#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "artifacts", "resolc");
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// Build native PolkaVM code as an interoperability artifact.
execFileSync("resolc", [
  "--bin", "--abi",
  "--output-dir", outDir,
  path.join(root, "contracts", "PortfolioResult.sol"),
], { stdio: "inherit", cwd: root });
const files = fs.readdirSync(outDir);
const pvmName = files.find((name) => name.endsWith("PortfolioResult.polkavm"));
if (!pvmName) throw new Error(`resolc output missing: ${files.join(", ")}`);
const pvmBytecode = `0x${fs.readFileSync(path.join(outDir, pvmName)).toString("hex")}`;

// Aglais enables EVM bytecode in pallet-revive. Its Ethereum RPC accepts a
// normal CREATE transaction, so this EVM artifact is what ethers deploys.
execFileSync("forge", ["build"], { stdio: "inherit", cwd: root });
const forgeArtifact = JSON.parse(fs.readFileSync(
  path.join(root, "artifacts", "forge", "PortfolioResult.sol", "PortfolioResult.json"),
  "utf8",
));
const bytecode = forgeArtifact.bytecode.object;
const artifact = {
  contractName: "PortfolioResult",
  abi: forgeArtifact.abi,
  bytecode,
  pvmBytecode,
  deploymentCompiler: "solc/forge (EVM bytecode allowed by Aglais pallet-revive)",
  pvmCompiler: "resolc",
};
fs.writeFileSync(path.join(root, "artifacts", "PortfolioResult.json"), JSON.stringify(artifact, null, 2) + "\n");
console.log(`compiled PortfolioResult (EVM ${bytecode.length / 2 - 1} bytes; PolkaVM ${(pvmBytecode.length - 2) / 2} bytes)`);
