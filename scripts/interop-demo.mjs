import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const cli = resolve("dist/cli.js");
const privateKey = "keys/demo-client.private.json";
const publicKey = "keys/demo-client.public.json";
const bodyFile = "keys/demo-request.body";
const signatureFile = "keys/demo-request.signature.json";

async function runCli(arguments_, expectedExit = 0) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cli, ...arguments_], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    const pid = child.pid;
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      try {
        assert.equal(
          code,
          expectedExit,
          `CLI exited ${code}; expected ${expectedExit}. stderr: ${stderr}`,
        );
        resolvePromise({ pid, stdout: stdout.trim(), stderr: stderr.trim() });
      } catch (error) {
        reject(error);
      }
    });
  });
}

await mkdir("keys", { recursive: true });
await writeFile(bodyFile, '{"amount":1250,"currency":"USD"}\n', "utf8");

const generated = await runCli([
  "keygen",
  "--private",
  privateKey,
  "--public",
  publicKey,
  "--force",
]);
const signer = await runCli([
  "sign",
  "--key",
  privateKey,
  "--method",
  "POST",
  "--target",
  "/v1/payments?mode=test",
  "--body-file",
  bodyFile,
  "--out",
  signatureFile,
  "--force",
]);
const verifier = await runCli([
  "verify",
  "--key",
  publicKey,
  "--signature",
  signatureFile,
  "--method",
  "POST",
  "--target",
  "/v1/payments?mode=test",
  "--body-file",
  bodyFile,
]);
const tamperVerifier = await runCli(
  [
    "verify",
    "--key",
    publicKey,
    "--signature",
    signatureFile,
    "--method",
    "POST",
    "--target",
    "/v1/payments?mode=test",
    "--body",
    '{"amount":9999,"currency":"USD"}\n',
  ],
  1,
);

const generatedResult = JSON.parse(generated.stdout);
const signedResult = JSON.parse(signer.stdout);
const verifiedResult = JSON.parse(verifier.stdout);
const tamperedResult = JSON.parse(tamperVerifier.stdout);
assert.equal(verifiedResult.valid, true);
assert.equal(tamperedResult.valid, false);
assert.notEqual(signer.pid, verifier.pid, "signer and verifier must be separate processes");

process.stdout.write(
  `${JSON.stringify(
    {
      working: true,
      suite: signedResult.suite,
      keyId: generatedResult.keyId,
      signatureBytes: signedResult.signatureBytes,
      signerPid: signer.pid,
      verifierPid: verifier.pid,
      validRequestAccepted: verifiedResult.valid,
      tamperedBodyRejected: !tamperedResult.valid,
      tamperReason: tamperedResult.reason,
      artifacts: { privateKey, publicKey, bodyFile, signatureFile },
    },
    null,
    2,
  )}\n`,
);
