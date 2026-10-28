#!/usr/bin/env node
// bin/quip-sig — CLI for keygen/sign/verify over @quip.network/pqhybridsign.
//
// Subcommands:
//   keygen --suite ED-ML-44 --out keys/<name>.seed.json [--name <label>]
//   sign   --keys-file <path>  --request <path> --ctx <string> --out <path>
//   verify --keys-file <path>  --request <path> --signature <path>
//
// "keys-file" is always a SEED file (the canonical artifact). Re-deriving the
// keypair from a seed is deterministic, so the same seed file in another
// process gives the same keys back. This is the canonical demo path.
//
// Brand-new throwaway keys only — see DEVLOG.

import {
  DEFAULT_SUITE,
  buildCanonicalRequestBytes,
  buildSignedRequest,
  b64decode,
  b64encode,
  keygenFromSeed,
  lengths,
  profile,
  readSeedFile,
  sign,
  verify,
  writeSeedFile,
} from "../src/lib.mjs";

const SUITES = ["ED-ML-44", "ED-FN-512", "SR-ML-44", "SR-FN-512"];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) throw new Error(`unexpected positional arg: ${a}`);
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function usage() {
  console.error(`usage:
  quip-sig keygen --suite <SUITE> --out <seed-file.json> [--name <label>]
  quip-sig sign   --keys-file <seed-file.json> --request <request.json> --ctx <string> --out <signed-request.json>
  quip-sig verify --keys-file <seed-file.json> --request <request.json> --signature <signed-request.json>
  quip-sig info

SUITES (stateless, no leaf journal required):
  ${SUITES.join(",  ")}
  (default: ${DEFAULT_SUITE})

  quip-sig keygen --suite ED-ML-44 --out keys/alice.seed.json
  quip-sig sign   --keys-file keys/alice.seed.json --request examples/request.json --ctx api.example.com --out /tmp/sig.json
  quip-sig verify --keys-file keys/alice.seed.json --request examples/request.json --signature /tmp/sig.json`);
  process.exit(2);
}

async function cmdInfo() {
  const p = await profile();
  const l = await lengths(DEFAULT_SUITE);
  console.log(JSON.stringify({ profile: p, suite: DEFAULT_SUITE, lengths: l }, null, 2));
}

async function cmdKeygen(args) {
  const suite = args.suite || DEFAULT_SUITE;
  if (!SUITES.includes(suite)) throw new Error(`unknown suite ${suite}`);
  if (!args.out) throw new Error("--out is required");

  // Generate ONE seed and derive ONE key pair. keygenRandom is a convenience
  // that returns {publicKey, secretKey} from a fresh seed; we use it but
  // also capture the seed so we can persist it for re-derivation in another
  // process. The package's keygenFromSeed is deterministic on the seed, so
  // re-deriving later from the same seed yields the same key pair.
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  const pair = await keygenFromSeed(suite, seed);

  const fs = await import("node:fs/promises");
  await fs.mkdir(args.out.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await writeSeedFile(args.out, suite, seed);
  if (args.name) console.log(`# keypair for ${args.name}`);
  console.log(`# suite:        ${suite}`);
  console.log(`# seed file:    ${args.out}`);
  console.log(`# publicKeyLen: ${pair.publicKey.length} bytes`);
  console.log(`# secretKeyLen: ${pair.secretKey.length} bytes`);
  // Also write the public key as a convenience for inspection / distribution.
  const pubPath = args.out.replace(/\.seed\.json$/, ".pubkey.json");
  await fs.writeFile(
    pubPath,
    JSON.stringify({ suite, publicKey: b64encode(pair.publicKey) }, null, 2) + "\n",
    "utf8"
  );
  console.log(`# pubkey file:  ${pubPath}`);
}

async function loadRequest(path) {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile(path, "utf8");
  return JSON.parse(raw);
}

async function cmdSign(args) {
  if (!args["keys-file"]) throw new Error("--keys-file is required");
  if (!args.request) throw new Error("--request is required");
  if (!args.ctx) throw new Error("--ctx is required (e.g. api.example.com)");
  if (!args.out) throw new Error("--out is required");

  const { suite, seed } = await readSeedFile(args["keys-file"]);
  const pair = await keygenFromSeed(suite, seed);
  const req = await loadRequest(args.request);

  const canonicalBytes = buildCanonicalRequestBytes(req);
  const sig = await sign(suite, pair.secretKey, canonicalBytes, args.ctx);
  const envelope = buildSignedRequest({
    suite,
    ctx: args.ctx,
    canonicalBytes,
    signature: sig,
    publicKey: pair.publicKey,
  });

  const fs = await import("node:fs/promises");
  await fs.writeFile(args.out, JSON.stringify(envelope, null, 2) + "\n", "utf8");

  console.log(`# signed ${req.method} ${req.path}`);
  console.log(`# suite:       ${suite}`);
  console.log(`# ctx:         ${args.ctx}`);
  console.log(`# canonical:   ${canonicalBytes.length} bytes`);
  console.log(`# signature:   ${sig.length} bytes`);
  console.log(`# out:         ${args.out}`);
}

async function cmdVerify(args) {
  if (!args["keys-file"]) throw new Error("--keys-file is required");
  if (!args.request) throw new Error("--request is required");
  if (!args.signature) throw new Error("--signature is required");

  const { suite: seedSuite, seed } = await readSeedFile(args["keys-file"]);
  const pair = await keygenFromSeed(seedSuite, seed);

  const req = await loadRequest(args.request);
  const fs = await import("node:fs/promises");
  const envRaw = await fs.readFile(args.signature, "utf8");
  const env = JSON.parse(envRaw);

  if (env.suite !== seedSuite) {
    throw new Error(`suite mismatch: signature says ${env.suite}, seed says ${seedSuite}`);
  }
  const canonicalBytes = buildCanonicalRequestBytes(req);
  const canonicalFromSig = b64decode(env.canonicalBytes);
  if (canonicalFromSig.length !== canonicalBytes.length ||
      b64encode(canonicalFromSig) !== b64encode(canonicalBytes)) {
    console.error("FAIL: canonical bytes in the signature envelope do not match the rebuilt canonical bytes for the current request");
    process.exit(1);
  }
  const sig = b64decode(env.signature);
  const pubKey = b64decode(env.publicKey);
  if (b64encode(pubKey) !== b64encode(pair.publicKey)) {
    console.error("FAIL: public key in signature envelope does not match the seed-derived public key");
    process.exit(1);
  }
  const ok = await verify(env.suite, pubKey, canonicalBytes, env.ctx, sig);
  if (!ok) {
    console.error("FAIL: signature did not verify");
    process.exit(1);
  }
  console.log(`OK    suite=${env.suite}      ctx=${env.ctx}`);
  console.log(`      method=${req.method}   path=${req.path}  bytes=${canonicalBytes.length}`);
  console.log(`      sig=${sig.length}B  pub=${pair.publicKey.length}B`);
}

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
if (!cmd) usage();

try {
  switch (cmd) {
    case "keygen": await cmdKeygen(parseArgs(rest)); break;
    case "sign":   await cmdSign(parseArgs(rest)); break;
    case "verify": await cmdVerify(parseArgs(rest)); break;
    case "info":   await cmdInfo(); break;
    default: usage();
  }
} catch (err) {
  console.error(`error: ${err && err.message ? err.message : err}`);
  process.exit(1);
}