// Off-chain Quip WOTS+ signer.
// Faithful port of Quip Network's hashsigs-ts (github.com/QuipNetwork/hashsigs-ts,
// src/wotsplus.ts, AGPL-3.0) so signatures verify against Quip's hashsigs-solidity
// WOTSPlus library (keccak256, n=32, w=16 -> 67 chunks).
// Uses @noble/hashes keccak_256 (same dependency Quip uses).
const { keccak_256 } = require("@noble/hashes/sha3");

class WOTSPlusNode {
  constructor(hashFn, hashLen = 32, chainLen = 16) {
    this.hashFn = hashFn;
    this.hashLen = hashLen;
    this.messageLen = hashLen;
    this.chainLen = chainLen;
    this.lgChainLen = Math.log2(chainLen);
    this.numMessageChunks = Math.ceil((8 * hashLen) / this.lgChainLen); // 64
    this.numChecksumChunks =
      Math.floor(
        Math.log2(this.numMessageChunks * (this.chainLen - 1)) /
          Math.log2(this.chainLen)
      ) + 1; // 3
    this.numSignatureChunks = this.numMessageChunks + this.numChecksumChunks; // 67
  }

  hash(data) {
    return this.hashFn(data);
  }

  // prf: 0x03 || seed || uint16 BE index  (XMSS RFC 8391 style)
  prf(seed, index) {
    const buf = new Uint8Array(1 + seed.length + 2);
    buf[0] = 0x03;
    buf.set(seed, 1);
    buf[seed.length + 1] = (index >> 8) & 0xff;
    buf[seed.length + 2] = index & 0xff;
    return this.hash(buf);
  }

  generateRandomizationElements(publicSeed) {
    const els = [];
    for (let i = 0; i < this.numSignatureChunks; i++)
      els.push(this.prf(publicSeed, i));
    return els;
  }

  xor(a, b) {
    const r = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) r[i] = a[i] ^ b[i];
    return r;
  }

  chain(prevChainOut, randomizationElements, index, steps) {
    let chainOut = prevChainOut;
    for (let i = 1; i <= steps; i++) {
      chainOut = this.hash(
        this.xor(chainOut, randomizationElements[i + index])
      );
    }
    return chainOut;
  }

  // Keygen identical to hashsigs-ts generateKeyPair(privateSeed, publicSeed)
  generateKeyPair(privateSeed, publicSeed) {
    const combined = new Uint8Array([...privateSeed, ...publicSeed]);
    const privateKey = this.hash(combined);
    const randomizationElements = this.generateRandomizationElements(publicSeed);
    const functionKey = randomizationElements[0];
    const publicKeySegments = new Uint8Array(
      this.numSignatureChunks * this.hashLen
    );
    for (let i = 0; i < this.numSignatureChunks; i++) {
      const secretKeySegment = this.hash(
        new Uint8Array([...functionKey, ...this.prf(privateKey, i + 1)])
      );
      const segment = this.chain(
        secretKeySegment,
        randomizationElements,
        0,
        this.chainLen - 1
      );
      publicKeySegments.set(segment, i * this.hashLen);
    }
    const publicKeyHash = this.hash(publicKeySegments);
    const publicKey = new Uint8Array([...publicSeed, ...publicKeyHash]);
    return { publicKey, publicKeyHash, privateKey };
  }

  // sign(messageHash): message is the 32-byte hash that goes into base-w.
  sign(privateKey, publicSeed, messageHash) {
    if (privateKey.length !== this.hashLen)
      throw new Error("private key length must be 32 bytes");
    if (messageHash.length !== this.messageLen)
      throw new Error("message length must be 32 bytes");
    const randomizationElements =
      this.generateRandomizationElements(publicSeed);
    const functionKey = randomizationElements[0];
    const chainSegments = this.computeMessageHashChainIndexes(messageHash);
    const signature = new Array(this.numSignatureChunks);
    for (let i = 0; i < chainSegments.length; i++) {
      const chainIdx = chainSegments[i];
      const secretKeySegment = this.hash(
        new Uint8Array([...functionKey, ...this.prf(privateKey, i + 1)])
      );
      signature[i] = this.chain(
        secretKeySegment,
        randomizationElements,
        0,
        chainIdx
      );
    }
    return signature;
  }

  verify(publicKey, messageHash, signature) {
    const publicSeed = publicKey.slice(0, this.hashLen);
    const publicKeyHash = publicKey.slice(this.hashLen);
    const randomizationElements =
      this.generateRandomizationElements(publicSeed);
    const chainSegments = this.computeMessageHashChainIndexes(messageHash);
    const publicKeySegments = new Uint8Array(
      this.numSignatureChunks * this.hashLen
    );
    for (let i = 0; i < chainSegments.length; i++) {
      const chainIdx = chainSegments[i];
      const numIterations = this.chainLen - chainIdx - 1;
      const segment = this.chain(
        signature[i],
        randomizationElements,
        chainIdx,
        numIterations
      );
      publicKeySegments.set(segment, i * this.hashLen);
    }
    const computedHash = this.hash(publicKeySegments);
    return Buffer.from(computedHash).equals(Buffer.from(publicKeyHash));
  }

  toBaseW(message, numChunks, basew, offset) {
    let index = 0;
    for (let i = 0; i < numChunks; i++) {
      if (i % 2 === 0) {
        basew[offset + i] = (message[index] >> 4) & 0xf;
      } else {
        basew[offset + i] = message[index] & 0xf;
        index++;
      }
    }
  }

  checksum(chainIndexes) {
    let sum = 0;
    for (let i = 0; i < this.numMessageChunks; i++)
      sum += this.chainLen - 1 - chainIndexes[i];
    for (let i = 0; i < this.numChecksumChunks; i++) {
      chainIndexes[this.numMessageChunks + i] =
        (sum >> ((this.numChecksumChunks - 1 - i) * this.lgChainLen)) &
        (this.chainLen - 1);
    }
  }

  computeMessageHashChainIndexes(message) {
    const chainIndexes = new Array(
      this.numMessageChunks + this.numChecksumChunks
    ).fill(0);
    this.toBaseW(message, this.numMessageChunks, chainIndexes, 0);
    this.checksum(chainIndexes);
    return chainIndexes;
  }
}

const hex = (u8) => "0x" + Buffer.from(u8).toString("hex");

module.exports = { WOTSPlusNode, keccak_256, hex };
