import {
  keygenFromSeed,
  publicKeyLen,
  secretKeyLen,
  sign,
  signatureLen,
  verify,
} from "@quip.network/pqhybridsign";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const SUITE = "ED-ML-44" as const;
export type SupportedSuite = typeof SUITE;

export const PRIVATE_KEY_FORMAT = "quip-hybrid-private-key-v1" as const;
export const PUBLIC_KEY_FORMAT = "quip-hybrid-public-key-v1" as const;
export const SIGNATURE_FORMAT = "quip-hybrid-api-signature-v1" as const;
export const CANONICAL_REQUEST_VERSION = "quip-hybrid-api-request-v1" as const;

export const REQUEST_CONTEXT = new TextEncoder().encode(
  "quip-hybrid-api-request-signing-v1",
);

export interface HybridKeyPair {
  suite: SupportedSuite;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface PublicKeyMaterial {
  suite: SupportedSuite;
  keyId: string;
  publicKey: Uint8Array;
}

export interface PrivateKeyMaterial extends PublicKeyMaterial {
  secretKey: Uint8Array;
}

export interface PublicKeyFile {
  format: typeof PUBLIC_KEY_FORMAT;
  suite: SupportedSuite;
  keyId: string;
  publicKey: string;
}

export interface PrivateKeyFile {
  format: typeof PRIVATE_KEY_FORMAT;
  suite: SupportedSuite;
  keyId: string;
  publicKey: string;
  secretKey: string;
}

export interface CanonicalRequestFields {
  version: typeof CANONICAL_REQUEST_VERSION;
  method: string;
  target: string;
  timestamp: string;
  nonce: string;
  bodySha256: string;
}

export interface SignatureEnvelope {
  format: typeof SIGNATURE_FORMAT;
  suite: SupportedSuite;
  keyId: string;
  request: CanonicalRequestFields;
  signature: string;
}

export interface ApiRequestInput {
  method: string;
  target: string;
  body?: Uint8Array;
  timestamp?: string;
  nonce?: string;
}

export interface VerificationOptions {
  /** Reject signatures older than this many seconds. Omit to disable the age policy. */
  maxAgeSeconds?: number;
  /** Reject signatures this many seconds in the future. Omit to disable the future policy. */
  maxFutureSkewSeconds?: number;
  /** Injectable clock for tests. */
  now?: Date;
}

export interface VerificationResult {
  valid: boolean;
  reason: string;
  keyId: string;
  timestamp: string;
  nonce: string;
}

interface CanonicalizedRequest {
  bytes: Uint8Array;
  fields: CanonicalRequestFields;
}

const METHOD_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;

function copyBytes(value: Uint8Array): Uint8Array {
  return new Uint8Array(value);
}

function requireByteArray(value: Uint8Array, name: string): void {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`${name} must be a Uint8Array`);
  }
}

function encodeBase64Url(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string, name: string): Uint8Array {
  if (value.length === 0 || !BASE64URL_PATTERN.test(value)) {
    throw new Error(`${name} must be non-empty, unpadded base64url`);
  }

  const decoded = Buffer.from(value, "base64url");
  if (decoded.toString("base64url") !== value) {
    throw new Error(`${name} is not canonical base64url`);
  }
  return new Uint8Array(decoded);
}

function digest(value: Uint8Array): Uint8Array {
  return new Uint8Array(createHash("sha256").update(value).digest());
}

function byteArraysEqual(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

function expectObject(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${name} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function expectString(
  object: Record<string, unknown>,
  property: string,
  name: string,
): string {
  const value = object[property];
  if (typeof value !== "string") {
    throw new Error(`${name}.${property} must be a string`);
  }
  return value;
}

function parseJsonSource(source: string | unknown, name: string): unknown {
  if (typeof source !== "string") {
    return source;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`${name} is not valid JSON`, { cause: error });
  }
}

function requireSuite(value: string): SupportedSuite {
  if (value !== SUITE) {
    throw new Error(`unsupported suite ${JSON.stringify(value)}; expected ${SUITE}`);
  }
  return SUITE;
}

function requireCanonicalTimestamp(value: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("timestamp must be a valid RFC 3339 date-time");
  }

  const normalized = new Date(milliseconds).toISOString();
  if (value !== normalized) {
    throw new Error(`timestamp must use canonical UTC form ${normalized}`);
  }
  return value;
}

function normalizeTimestamp(value: string): string {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    throw new Error("timestamp must be a valid RFC 3339 date-time");
  }
  return new Date(milliseconds).toISOString();
}

function normalizeMethod(value: string): string {
  if (value.length === 0 || value.length > 32 || !METHOD_PATTERN.test(value)) {
    throw new Error("method must be a 1-32 character HTTP token");
  }
  return value.toUpperCase();
}

function validateTarget(value: string): string {
  if (!value.startsWith("/")) {
    throw new Error("target must be an origin-form path beginning with '/'");
  }
  if (value.length > 8_192 || CONTROL_PATTERN.test(value) || value.includes("#")) {
    throw new Error("target must not contain controls/fragments and must be <= 8192 characters");
  }
  return value;
}

function validateNonce(value: string): string {
  if (value.length < 16 || value.length > 256 || CONTROL_PATTERN.test(value)) {
    throw new Error("nonce must be 16-256 characters without control characters");
  }
  return value;
}

function validateNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number`);
  }
}

async function requireLength(
  value: Uint8Array,
  expected: Promise<number>,
  name: string,
): Promise<void> {
  requireByteArray(value, name);
  const length = await expected;
  if (value.byteLength !== length) {
    throw new Error(`${name} must be ${length} bytes, got ${value.byteLength}`);
  }
}

function canonicalize(input: Required<ApiRequestInput>): CanonicalizedRequest {
  requireByteArray(input.body, "body");

  const fields: CanonicalRequestFields = {
    version: CANONICAL_REQUEST_VERSION,
    method: normalizeMethod(input.method),
    target: validateTarget(input.target),
    timestamp: normalizeTimestamp(input.timestamp),
    nonce: validateNonce(input.nonce),
    bodySha256: encodeBase64Url(digest(input.body)),
  };

  return {
    fields,
    bytes: new TextEncoder().encode(JSON.stringify(fields)),
  };
}

/** Generate a fresh stateless ed25519 + ML-DSA-44 keypair. */
export async function generateKeyPair(seed?: Uint8Array): Promise<HybridKeyPair> {
  if (seed !== undefined) {
    requireByteArray(seed, "seed");
    if (seed.byteLength !== 32) {
      throw new Error(`seed must be 32 bytes, got ${seed.byteLength}`);
    }
  }

  const localSeed = seed === undefined ? randomBytes(32) : copyBytes(seed);
  try {
    const pair = await keygenFromSeed(SUITE, localSeed);
    const result: HybridKeyPair = {
      suite: SUITE,
      publicKey: copyBytes(pair.publicKey),
      secretKey: copyBytes(pair.secretKey),
    };
    await requireLength(result.publicKey, publicKeyLen(SUITE), "publicKey");
    await requireLength(result.secretKey, secretKeyLen(SUITE), "secretKey");
    return result;
  } finally {
    localSeed.fill(0);
  }
}

export function computeKeyId(publicKey: Uint8Array): string {
  requireByteArray(publicKey, "publicKey");
  return encodeBase64Url(digest(publicKey));
}

export function publicKeyToFile(key: Pick<HybridKeyPair, "suite" | "publicKey">): PublicKeyFile {
  requireSuite(key.suite);
  return {
    format: PUBLIC_KEY_FORMAT,
    suite: SUITE,
    keyId: computeKeyId(key.publicKey),
    publicKey: encodeBase64Url(key.publicKey),
  };
}

export function privateKeyToFile(key: HybridKeyPair): PrivateKeyFile {
  requireSuite(key.suite);
  return {
    format: PRIVATE_KEY_FORMAT,
    suite: SUITE,
    keyId: computeKeyId(key.publicKey),
    publicKey: encodeBase64Url(key.publicKey),
    secretKey: encodeBase64Url(key.secretKey),
  };
}

export function parsePublicKeyFile(source: string | unknown): PublicKeyMaterial {
  const object = expectObject(parseJsonSource(source, "public key file"), "public key file");
  if (expectString(object, "format", "public key file") !== PUBLIC_KEY_FORMAT) {
    throw new Error(`public key file format must be ${PUBLIC_KEY_FORMAT}`);
  }
  const suite = requireSuite(expectString(object, "suite", "public key file"));
  const publicKey = decodeBase64Url(
    expectString(object, "publicKey", "public key file"),
    "public key file.publicKey",
  );
  const keyId = expectString(object, "keyId", "public key file");
  if (!byteArraysEqual(decodeBase64Url(keyId, "public key file.keyId"), digest(publicKey))) {
    throw new Error("public key file.keyId does not match publicKey");
  }
  return { suite, keyId, publicKey };
}

export function parsePrivateKeyFile(source: string | unknown): PrivateKeyMaterial {
  const object = expectObject(parseJsonSource(source, "private key file"), "private key file");
  if (expectString(object, "format", "private key file") !== PRIVATE_KEY_FORMAT) {
    throw new Error(`private key file format must be ${PRIVATE_KEY_FORMAT}`);
  }
  const suite = requireSuite(expectString(object, "suite", "private key file"));
  const publicKey = decodeBase64Url(
    expectString(object, "publicKey", "private key file"),
    "private key file.publicKey",
  );
  const secretKey = decodeBase64Url(
    expectString(object, "secretKey", "private key file"),
    "private key file.secretKey",
  );
  const keyId = expectString(object, "keyId", "private key file");
  if (!byteArraysEqual(decodeBase64Url(keyId, "private key file.keyId"), digest(publicKey))) {
    throw new Error("private key file.keyId does not match publicKey");
  }
  return { suite, keyId, publicKey, secretKey };
}

/** Sign arbitrary bytes with an explicit domain-separation context. */
export async function signMessage(
  secretKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array,
): Promise<Uint8Array> {
  requireByteArray(message, "message");
  requireByteArray(context, "context");
  await requireLength(secretKey, secretKeyLen(SUITE), "secretKey");
  const signature = await sign(SUITE, secretKey, message, context);
  await requireLength(signature, signatureLen(SUITE), "signature");
  return copyBytes(signature);
}

/** Verify arbitrary bytes with the same domain-separation context used to sign. */
export async function verifyMessage(
  publicKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  requireByteArray(message, "message");
  requireByteArray(context, "context");
  await requireLength(publicKey, publicKeyLen(SUITE), "publicKey");
  const expectedSignatureLength = await signatureLen(SUITE);
  if (!(signature instanceof Uint8Array) || signature.byteLength !== expectedSignatureLength) {
    return false;
  }
  return verify(SUITE, publicKey, message, context, signature);
}

/** Produce the exact UTF-8 bytes signed for an API request. */
export function canonicalizeApiRequest(input: ApiRequestInput): Uint8Array {
  if (input.timestamp === undefined || input.nonce === undefined) {
    throw new Error("canonicalization requires timestamp and nonce");
  }
  return canonicalize({
    method: input.method,
    target: input.target,
    body: input.body ?? new Uint8Array(),
    timestamp: input.timestamp,
    nonce: input.nonce,
  }).bytes;
}

export async function signApiRequest(
  key: PrivateKeyMaterial,
  input: ApiRequestInput,
): Promise<SignatureEnvelope> {
  requireSuite(key.suite);
  const actualKeyId = computeKeyId(key.publicKey);
  if (key.keyId !== actualKeyId) {
    throw new Error("private key keyId does not match publicKey");
  }

  const canonical = canonicalize({
    method: input.method,
    target: input.target,
    body: input.body ?? new Uint8Array(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    nonce: input.nonce ?? encodeBase64Url(randomBytes(16)),
  });
  const signature = await signMessage(key.secretKey, canonical.bytes, REQUEST_CONTEXT);

  // Catch a malformed private-key envelope before emitting an unusable signature.
  if (!(await verifyMessage(key.publicKey, canonical.bytes, REQUEST_CONTEXT, signature))) {
    throw new Error("private key does not match its embedded public key");
  }

  return {
    format: SIGNATURE_FORMAT,
    suite: SUITE,
    keyId: actualKeyId,
    request: canonical.fields,
    signature: encodeBase64Url(signature),
  };
}

export function parseSignatureEnvelope(source: string | unknown): SignatureEnvelope {
  const object = expectObject(
    parseJsonSource(source, "signature envelope"),
    "signature envelope",
  );
  if (expectString(object, "format", "signature envelope") !== SIGNATURE_FORMAT) {
    throw new Error(`signature envelope format must be ${SIGNATURE_FORMAT}`);
  }
  const suite = requireSuite(expectString(object, "suite", "signature envelope"));
  const keyId = expectString(object, "keyId", "signature envelope");
  const decodedKeyId = decodeBase64Url(keyId, "signature envelope.keyId");
  if (decodedKeyId.byteLength !== 32) {
    throw new Error("signature envelope.keyId must decode to 32 bytes");
  }

  const request = expectObject(object.request, "signature envelope.request");
  if (expectString(request, "version", "signature envelope.request") !== CANONICAL_REQUEST_VERSION) {
    throw new Error(`signature request version must be ${CANONICAL_REQUEST_VERSION}`);
  }
  const method = expectString(request, "method", "signature envelope.request");
  if (normalizeMethod(method) !== method) {
    throw new Error("signature request method is not canonical");
  }
  const target = expectString(request, "target", "signature envelope.request");
  validateTarget(target);
  const timestamp = requireCanonicalTimestamp(
    expectString(request, "timestamp", "signature envelope.request"),
  );
  const nonce = validateNonce(expectString(request, "nonce", "signature envelope.request"));
  const bodySha256 = expectString(request, "bodySha256", "signature envelope.request");
  if (decodeBase64Url(bodySha256, "signature envelope.request.bodySha256").byteLength !== 32) {
    throw new Error("signature envelope.request.bodySha256 must decode to 32 bytes");
  }
  const signature = expectString(object, "signature", "signature envelope");
  decodeBase64Url(signature, "signature envelope.signature");

  return {
    format: SIGNATURE_FORMAT,
    suite,
    keyId,
    request: {
      version: CANONICAL_REQUEST_VERSION,
      method,
      target,
      timestamp,
      nonce,
      bodySha256,
    },
    signature,
  };
}

function verificationFailure(
  envelope: SignatureEnvelope,
  reason: string,
): VerificationResult {
  return {
    valid: false,
    reason,
    keyId: envelope.keyId,
    timestamp: envelope.request.timestamp,
    nonce: envelope.request.nonce,
  };
}

export async function verifyApiRequest(
  key: PublicKeyMaterial,
  envelopeSource: SignatureEnvelope | string | unknown,
  input: Pick<ApiRequestInput, "method" | "target" | "body">,
  options: VerificationOptions = {},
): Promise<VerificationResult> {
  requireSuite(key.suite);
  const envelope = parseSignatureEnvelope(envelopeSource);
  const actualKeyId = computeKeyId(key.publicKey);
  if (key.keyId !== actualKeyId || envelope.keyId !== actualKeyId) {
    return verificationFailure(envelope, "key ID mismatch");
  }

  const canonical = canonicalize({
    method: input.method,
    target: input.target,
    body: input.body ?? new Uint8Array(),
    timestamp: envelope.request.timestamp,
    nonce: envelope.request.nonce,
  });

  if (canonical.fields.method !== envelope.request.method) {
    return verificationFailure(envelope, "HTTP method mismatch");
  }
  if (canonical.fields.target !== envelope.request.target) {
    return verificationFailure(envelope, "request target mismatch");
  }
  if (
    !byteArraysEqual(
      decodeBase64Url(canonical.fields.bodySha256, "computed body digest"),
      decodeBase64Url(envelope.request.bodySha256, "signature body digest"),
    )
  ) {
    return verificationFailure(envelope, "request body digest mismatch");
  }

  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime())) {
    throw new Error("now must be a valid Date");
  }
  const signedAt = Date.parse(envelope.request.timestamp);

  if (options.maxFutureSkewSeconds !== undefined) {
    validateNonNegativeFinite(options.maxFutureSkewSeconds, "maxFutureSkewSeconds");
    if (signedAt - now.getTime() > options.maxFutureSkewSeconds * 1_000) {
      return verificationFailure(envelope, "signature timestamp is too far in the future");
    }
  }
  if (options.maxAgeSeconds !== undefined) {
    validateNonNegativeFinite(options.maxAgeSeconds, "maxAgeSeconds");
    if (now.getTime() - signedAt > options.maxAgeSeconds * 1_000) {
      return verificationFailure(envelope, "signature is too old");
    }
  }

  const signature = decodeBase64Url(envelope.signature, "signature envelope.signature");
  const valid = await verifyMessage(key.publicKey, canonical.bytes, REQUEST_CONTEXT, signature);
  return {
    valid,
    reason: valid ? "valid" : "invalid hybrid signature",
    keyId: envelope.keyId,
    timestamp: envelope.request.timestamp,
    nonce: envelope.request.nonce,
  };
}

export function toJson(value: PublicKeyFile | PrivateKeyFile | SignatureEnvelope): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
