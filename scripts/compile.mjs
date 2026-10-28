import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import { ARTIFACT_PATH, writeJson } from "./config.mjs";

const sourcePath = path.resolve("contracts/Counter.sol");
const source = fs.readFileSync(sourcePath, "utf8");
const input = {
  language: "Solidity",
  sources: { "Counter.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    // Avoid PUSH0 for broad compatibility with non-Ethereum EVM backends.
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } }
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) {
  throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
}
const compiled = output.contracts["Counter.sol"].Counter;
writeJson(ARTIFACT_PATH, {
  contractName: "Counter",
  sourceName: "Counter.sol",
  compiler: solc.version(),
  evmVersion: "paris",
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  deployedBytecode: `0x${compiled.evm.deployedBytecode.object}`
});
console.log(JSON.stringify({ artifact: ARTIFACT_PATH, compiler: solc.version() }, null, 2));
