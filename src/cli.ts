#!/usr/bin/env node

import { access, chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  canonicalizeApiRequest,
  generateKeyPair,
  parsePrivateKeyFile,
  parsePublicKeyFile,
  parseSignatureEnvelope,
  privateKeyToFile,
  publicKeyToFile,
  signApiRequest,
  toJson,
  verifyApiRequest,
  type PrivateKeyFile,
  type PublicKeyFile,
  type SignatureEnvelope,
} from "./index.js";

const DEFAULT_PRIVATE_KEY = "keys/api.private.json";
const DEFAULT_PUBLIC_KEY = "keys/api.public.json";
const BOOLEAN_OPTIONS = new Set(["force", "help", "no-time-check"]);

interface ParsedArguments {
  command: string;
  options: Map<string, string | true>;
}

function usage(): string {
  return `quip-api-sign - hybrid ed25519 + ML-DSA-44 API request signing

Usage:
  quip-api-sign keygen [--private PATH] [--public PATH] [--force]
  quip-api-sign sign --method METHOD --target PATH [--key PATH]
      [--body TEXT | --body-file PATH] [--timestamp RFC3339] [--nonce VALUE]
      [--out PATH] [--force]
  quip-api-sign verify --signature PATH --method METHOD --target PATH [--key PATH]
      [--body TEXT | --body-file PATH] [--max-age SECONDS]
      [--max-future-skew SECONDS] [--no-time-check]
  quip-api-sign canonicalize --method METHOD --target PATH --timestamp RFC3339
      --nonce VALUE [--body TEXT | --body-file PATH]

Defaults:
  private key: ${DEFAULT_PRIVATE_KEY}
  public key:  ${DEFAULT_PUBLIC_KEY}
  verify age:  300 seconds; future skew: 30 seconds

The request target is the exact origin-form path and query (for example,
/v1/orders?dryRun=true). Body bytes must be identical at both ends.
Verification exits 0 when valid, 1 when invalid, and 2 on usage/runtime errors.
`;
}

function parseArguments(argv: string[]): ParsedArguments {
  const [command = "help", ...rest] = argv;
  const options = new Map<string, string | true>();

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === undefined || !argument.startsWith("--")) {
      throw new Error(`unexpected positional argument ${JSON.stringify(argument)}`);
    }
    const name = argument.slice(2);
    if (name.length === 0 || options.has(name)) {
      throw new Error(`invalid or duplicate option ${argument}`);
    }

    if (BOOLEAN_OPTIONS.has(name)) {
      options.set(name, true);
      continue;
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }
    options.set(name, value);
    index += 1;
  }

  return { command, options };
}

function getOption(
  options: Map<string, string | true>,
  name: string,
  required = false,
): string | undefined {
  const value = options.get(name);
  if (value === true) {
    throw new Error(`--${name} requires a value`);
  }
  if (required && value === undefined) {
    throw new Error(`--${name} is required`);
  }
  return value;
}

function rejectUnknownOptions(options: Map<string, string | true>, allowed: string[]): void {
  const allowedSet = new Set(allowed);
  for (const name of options.keys()) {
    if (!allowedSet.has(name)) {
      throw new Error(`unknown option --${name}`);
    }
  }
}

function parseSeconds(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`expected a non-negative number of seconds, got ${JSON.stringify(value)}`);
  }
  return parsed;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

async function assertWritable(paths: string[], force: boolean): Promise<void> {
  if (force) {
    return;
  }
  for (const path of paths) {
    if (await pathExists(path)) {
      throw new Error(`${path} already exists; pass --force to replace it`);
    }
  }
}

async function writeJsonFile(
  path: string,
  value: PrivateKeyFile | PublicKeyFile | SignatureEnvelope,
  mode: number,
  force: boolean,
): Promise<void> {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, toJson(value), {
    encoding: "utf8",
    flag: force ? "w" : "wx",
    mode,
  });
  await chmod(path, mode);
}

async function readBody(options: Map<string, string | true>): Promise<Uint8Array> {
  const inline = getOption(options, "body");
  const bodyFile = getOption(options, "body-file");
  if (inline !== undefined && bodyFile !== undefined) {
    throw new Error("use only one of --body and --body-file");
  }
  if (inline !== undefined) {
    return new TextEncoder().encode(inline);
  }
  if (bodyFile !== undefined) {
    return new Uint8Array(await readFile(bodyFile));
  }
  return new Uint8Array();
}

async function keygenCommand(options: Map<string, string | true>): Promise<void> {
  rejectUnknownOptions(options, ["private", "public", "force"]);
  const privatePath = getOption(options, "private") ?? DEFAULT_PRIVATE_KEY;
  const publicPath = getOption(options, "public") ?? DEFAULT_PUBLIC_KEY;
  if (resolve(privatePath) === resolve(publicPath)) {
    throw new Error("private and public key paths must differ");
  }
  const force = options.get("force") === true;
  await assertWritable([privatePath, publicPath], force);

  const pair = await generateKeyPair();
  const privateFile = privateKeyToFile(pair);
  const publicFile = publicKeyToFile(pair);
  await writeJsonFile(privatePath, privateFile, 0o600, force);
  await writeJsonFile(publicPath, publicFile, 0o644, force);

  process.stdout.write(
    `${JSON.stringify({
      generated: true,
      suite: pair.suite,
      keyId: publicFile.keyId,
      privateKey: privatePath,
      publicKey: publicPath,
    })}\n`,
  );
}

async function signCommand(options: Map<string, string | true>): Promise<void> {
  rejectUnknownOptions(options, [
    "key",
    "method",
    "target",
    "body",
    "body-file",
    "timestamp",
    "nonce",
    "out",
    "force",
  ]);
  const keyPath = getOption(options, "key") ?? DEFAULT_PRIVATE_KEY;
  const method = getOption(options, "method", true) as string;
  const target = getOption(options, "target", true) as string;
  const body = await readBody(options);
  const key = parsePrivateKeyFile(await readFile(keyPath, "utf8"));
  const timestamp = getOption(options, "timestamp");
  const nonce = getOption(options, "nonce");
  const request = {
    method,
    target,
    body,
    ...(timestamp === undefined ? {} : { timestamp }),
    ...(nonce === undefined ? {} : { nonce }),
  };
  const envelope = await signApiRequest(key, request);
  const outputPath = getOption(options, "out");

  if (outputPath === undefined) {
    process.stdout.write(toJson(envelope));
    return;
  }

  const force = options.get("force") === true;
  await assertWritable([outputPath], force);
  await writeJsonFile(outputPath, envelope, 0o644, force);
  process.stdout.write(
    `${JSON.stringify({
      signed: true,
      suite: envelope.suite,
      keyId: envelope.keyId,
      timestamp: envelope.request.timestamp,
      nonce: envelope.request.nonce,
      signatureBytes: Buffer.from(envelope.signature, "base64url").byteLength,
      output: outputPath,
    })}\n`,
  );
}

async function verifyCommand(options: Map<string, string | true>): Promise<void> {
  rejectUnknownOptions(options, [
    "key",
    "signature",
    "method",
    "target",
    "body",
    "body-file",
    "max-age",
    "max-future-skew",
    "no-time-check",
  ]);
  const keyPath = getOption(options, "key") ?? DEFAULT_PUBLIC_KEY;
  const signaturePath = getOption(options, "signature", true) as string;
  const method = getOption(options, "method", true) as string;
  const target = getOption(options, "target", true) as string;
  const body = await readBody(options);
  const key = parsePublicKeyFile(await readFile(keyPath, "utf8"));
  const envelope = parseSignatureEnvelope(await readFile(signaturePath, "utf8"));
  const noTimeCheck = options.get("no-time-check") === true;
  const timeOptions = noTimeCheck
    ? {}
    : {
        maxAgeSeconds: parseSeconds(getOption(options, "max-age"), 300),
        maxFutureSkewSeconds: parseSeconds(getOption(options, "max-future-skew"), 30),
      };
  const result = await verifyApiRequest(
    key,
    envelope,
    { method, target, body },
    timeOptions,
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.valid) {
    process.exitCode = 1;
  }
}

async function canonicalizeCommand(options: Map<string, string | true>): Promise<void> {
  rejectUnknownOptions(options, [
    "method",
    "target",
    "body",
    "body-file",
    "timestamp",
    "nonce",
  ]);
  const bytes = canonicalizeApiRequest({
    method: getOption(options, "method", true) as string,
    target: getOption(options, "target", true) as string,
    body: await readBody(options),
    timestamp: getOption(options, "timestamp", true) as string,
    nonce: getOption(options, "nonce", true) as string,
  });
  process.stdout.write(`${new TextDecoder().decode(bytes)}\n`);
}

async function main(): Promise<void> {
  const { command, options } = parseArguments(process.argv.slice(2));
  if (command === "help" || options.get("help") === true) {
    process.stdout.write(usage());
    return;
  }

  switch (command) {
    case "keygen":
      await keygenCommand(options);
      break;
    case "sign":
      await signCommand(options);
      break;
    case "verify":
      await verifyCommand(options);
      break;
    case "canonicalize":
      await canonicalizeCommand(options);
      break;
    default:
      throw new Error(`unknown command ${JSON.stringify(command)}\n\n${usage()}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exitCode = 2;
});
