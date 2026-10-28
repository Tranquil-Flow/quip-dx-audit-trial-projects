import assert from "node:assert/strict";
import { before, test } from "node:test";
import {
  REQUEST_CONTEXT,
  canonicalizeApiRequest,
  generateKeyPair,
  parsePrivateKeyFile,
  parsePublicKeyFile,
  parseSignatureEnvelope,
  privateKeyToFile,
  publicKeyToFile,
  signApiRequest,
  signMessage,
  verifyApiRequest,
  verifyMessage,
} from "../dist/index.js";

let pair;
let privateMaterial;
let publicMaterial;

before(async () => {
  pair = await generateKeyPair();
  privateMaterial = parsePrivateKeyFile(privateKeyToFile(pair));
  publicMaterial = parsePublicKeyFile(publicKeyToFile(pair));
});

test("raw message signatures require matching message and context", async () => {
  const message = new TextEncoder().encode("message");
  const signature = await signMessage(pair.secretKey, message, REQUEST_CONTEXT);
  assert.equal(
    await verifyMessage(pair.publicKey, message, REQUEST_CONTEXT, signature),
    true,
  );
  assert.equal(
    await verifyMessage(
      pair.publicKey,
      new TextEncoder().encode("tampered"),
      REQUEST_CONTEXT,
      signature,
    ),
    false,
  );
  assert.equal(
    await verifyMessage(
      pair.publicKey,
      message,
      new TextEncoder().encode("other-context"),
      signature,
    ),
    false,
  );
});

test("API request signatures bind method, target, timestamp, nonce, and body", async () => {
  const timestamp = "2026-09-29T12:00:00.000Z";
  const nonce = "test-nonce-0000000000000001";
  const body = new TextEncoder().encode('{"ok":true}');
  const envelope = await signApiRequest(privateMaterial, {
    method: "post",
    target: "/v1/example?a=1",
    timestamp,
    nonce,
    body,
  });

  const valid = await verifyApiRequest(
    publicMaterial,
    envelope,
    { method: "POST", target: "/v1/example?a=1", body },
    {
      now: new Date("2026-09-29T12:01:00.000Z"),
      maxAgeSeconds: 300,
      maxFutureSkewSeconds: 30,
    },
  );
  assert.equal(valid.valid, true);

  const tamperedBody = await verifyApiRequest(publicMaterial, envelope, {
    method: "POST",
    target: "/v1/example?a=1",
    body: new TextEncoder().encode('{"ok":false}'),
  });
  assert.deepEqual(
    { valid: tamperedBody.valid, reason: tamperedBody.reason },
    { valid: false, reason: "request body digest mismatch" },
  );

  const wrongMethod = await verifyApiRequest(publicMaterial, envelope, {
    method: "GET",
    target: "/v1/example?a=1",
    body,
  });
  assert.equal(wrongMethod.valid, false);
  assert.equal(wrongMethod.reason, "HTTP method mismatch");

  const wrongTarget = await verifyApiRequest(publicMaterial, envelope, {
    method: "POST",
    target: "/v1/example?a=2",
    body,
  });
  assert.equal(wrongTarget.valid, false);
  assert.equal(wrongTarget.reason, "request target mismatch");

  const changedSignature = Buffer.from(envelope.signature, "base64url");
  changedSignature[changedSignature.length - 1] ^= 1;
  const badSignature = await verifyApiRequest(
    publicMaterial,
    { ...envelope, signature: changedSignature.toString("base64url") },
    { method: "POST", target: "/v1/example?a=1", body },
  );
  assert.equal(badSignature.valid, false);
  assert.equal(badSignature.reason, "invalid hybrid signature");
});

test("verification enforces caller-selected replay window", async () => {
  const envelope = await signApiRequest(privateMaterial, {
    method: "GET",
    target: "/v1/old",
    timestamp: "2026-09-29T12:00:00.000Z",
    nonce: "test-nonce-0000000000000002",
  });
  const stale = await verifyApiRequest(
    publicMaterial,
    envelope,
    { method: "GET", target: "/v1/old" },
    { now: new Date("2026-09-29T12:10:00.001Z"), maxAgeSeconds: 600 },
  );
  assert.equal(stale.valid, false);
  assert.equal(stale.reason, "signature is too old");

  const future = await verifyApiRequest(
    publicMaterial,
    envelope,
    { method: "GET", target: "/v1/old" },
    {
      now: new Date("2026-09-29T11:59:00.000Z"),
      maxFutureSkewSeconds: 30,
    },
  );
  assert.equal(future.valid, false);
  assert.equal(future.reason, "signature timestamp is too far in the future");
});

test("key and signature envelopes reject malformed metadata", async () => {
  const publicFile = publicKeyToFile(pair);
  assert.throws(
    () => parsePublicKeyFile({ ...publicFile, keyId: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }),
    /keyId does not match/,
  );

  const envelope = await signApiRequest(privateMaterial, {
    method: "GET",
    target: "/v1/example",
    timestamp: "2026-09-29T12:00:00.000Z",
    nonce: "test-nonce-0000000000000003",
  });
  assert.throws(
    () => parseSignatureEnvelope({ ...envelope, suite: "ED-FN-512" }),
    /unsupported suite/,
  );
});

test("canonicalization is deterministic and rejects ambiguous targets", () => {
  const request = {
    method: "POST",
    target: "/v1/example?b=2&a=1",
    timestamp: "2026-09-29T12:00:00.000Z",
    nonce: "test-nonce-0000000000000004",
    body: new TextEncoder().encode("abc"),
  };
  assert.deepEqual(canonicalizeApiRequest(request), canonicalizeApiRequest(request));
  assert.throws(
    () => canonicalizeApiRequest({ ...request, target: "https://api.example/v1/example" }),
    /origin-form/,
  );
  assert.throws(
    () => canonicalizeApiRequest({ ...request, target: "/v1/example#fragment" }),
    /controls\/fragments/,
  );
});
