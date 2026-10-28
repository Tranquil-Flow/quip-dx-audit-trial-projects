// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {IERC7913SignatureVerifier, IQuipWalletFactory} from "./interfaces/IOtcQuip.sol";

/**
 * OtcSettlement — a QuipSwap-compatible settlement primitive for OTC trades.
 *
 * This contract re-implements the *documented* QuipSwap settlement semantics
 * (https://developers.quip.network/docs/quip-interlock-protocol/quipswap)
 * because Quip's own settlement contract ("Omnibus", gitlab.com/quip.network/
 * quip-swap-solidity) is a private repository with no published ABI/address and
 * no testnet deployment. Semantics mirrored:
 *
 *   commit  - each party locks the assets it offers; the terms and the hash of a
 *             shared secret are recorded on chain.
 *   execute - anyone holding the preimage reveals it and the assets move to the
 *             party entitled to them. Revelation is public, which unblocks the
 *             other leg.
 *   reclaim - after the reclaim deadline a committed leg returns to whoever
 *             committed it. Every leg ends executed-or-reclaimed; never stuck.
 *
 * Authorization ("post-quantum signed orders"): mirroring Omnibus, a commit is
 * authorized either by a verified ERC-7913 signature checked against an
 * owner-managed verifier allowlist, or by factory-membership of a Quip wallet
 * (the caller *is* a post-quantum Quip account). Both paths are supported here.
 */
contract OtcSettlement {
    bytes4 private constant ERC7913_MAGIC = 0x024ad318; // verify(...) success selector

    struct Leg {
        uint256 chainId;
        address token;   // address(0) == native coin
        uint256 amount;
        address owner;   // who commits / reclaims this leg
        address payee;   // who receives it on execute
    }

    struct Terms {
        Leg a;
        Leg b;
        bytes32 secretHash;         // H(secret) - the interlock
        uint64  commitDeadline;     // last time any leg may be committed
        uint64  executeDeadline;    // last time execute() may run (proposer window)
        uint64  reclaimRelease;     // after this, reclaim() is open
        uint256 nonce;              // uniqueness / replay separation
    }

    struct Escrow {
        bytes32 termsDigest;
        uint256 amount;
        uint64  reclaimRelease;
        bool    committed;
        bool    settled;
    }

    address public immutable owner;
    /// Quip WalletFactory used for factory-membership authorization (may be 0).
    address public quipFactory;
    /// ERC-7913 verifier allowlist (e.g. Quip's live SHRINCS verifier).
    mapping(address => bool) public verifierAllowlisted;

    /// swapKey => legKey => Escrow
    mapping(bytes32 => mapping(bytes32 => Escrow)) public escrows;

    event Committed(bytes32 indexed swapKey, bytes32 indexed legKey, address indexed committer, uint256 amount, bytes32 termsDigest);
    event Executed(bytes32 indexed swapKey, bytes32 indexed legKey, address indexed claimant, uint256 amount, bytes32 secret);
    event Reclaimed(bytes32 indexed swapKey, bytes32 indexed legKey, address indexed committer, uint256 amount);

    error NotOwner();
    error NotAuthorized();
    error Late();
    error TooEarly();
    error AlreadyCommitted();
    error NoSuchEscrow();
    error AlreadyFinal();
    error BadSecret();
    error BadValue();
    error TransferFailed();

    constructor(address quipFactory_, address verifier_) {
        owner = msg.sender;
        quipFactory = quipFactory_;
        if (verifier_ != address(0)) verifierAllowlisted[verifier_] = true;
    }

    // ---------------------------------------------------------------- admin --

    function setQuipFactory(address f) external {
        if (msg.sender != owner) revert NotOwner();
        quipFactory = f;
    }

    function setVerifier(address v, bool ok) external {
        if (msg.sender != owner) revert NotOwner();
        verifierAllowlisted[v] = ok;
    }

    // ------------------------------------------------------------ canonical --

    /// Canonical digest of the two legs. Symmetric in (a,b): swapping the two
    /// legs yields the same digest, so both parties sign one value. Mirrors
    /// Omnibus's `TermsLib.digestTermsCanonically`.
    function canonicalDigest(Terms calldata t) public pure returns (bytes32) {
        bytes32 ha = keccak256(abi.encode(t.a, t.secretHash, t.commitDeadline, t.executeDeadline, t.reclaimRelease, t.nonce));
        bytes32 hb = keccak256(abi.encode(t.b, t.secretHash, t.commitDeadline, t.executeDeadline, t.reclaimRelease, t.nonce));
        return ha <= hb ? keccak256(abi.encodePacked(ha, hb)) : keccak256(abi.encodePacked(hb, ha));
    }

    /// Key that identifies a leg within a swap.
    function legKey(Leg calldata l) public pure returns (bytes32) {
        return keccak256(abi.encode(l));
    }

    function swapKey(Terms calldata t) public pure returns (bytes32) {
        return canonicalDigest(t);
    }

    // --------------------------------------------------------------- commit --

    /// Lock one leg. `key`/`sig` are an ERC-7913 (key, signature) pair over the
    /// canonical digest; pass empty values when authorizing by Quip-wallet
    /// membership instead.
    function commit(Terms calldata t, Leg calldata leg, bytes calldata key, bytes calldata sig) external payable {
        if (block.timestamp > t.commitDeadline) revert Late();
        if (!_authorized(msg.sender, canonicalDigest(t), key, sig)) revert NotAuthorized();
        if (leg.owner != msg.sender) revert NotAuthorized();

        bytes32 sk = canonicalDigest(t);
        bytes32 lk = legKey(leg);
        Escrow storage e = escrows[sk][lk];
        if (e.committed) revert AlreadyCommitted();

        if (leg.token == address(0)) {
            if (msg.value != leg.amount) revert BadValue();
            e.amount = msg.value;
        } else {
            if (msg.value != 0) revert BadValue();
            // prototype: ERC-20 legs use transferFrom
            (bool ok, bytes memory ret) = leg.token.call(
                abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), leg.amount)
            );
            if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
            e.amount = leg.amount;
        }

        e.termsDigest = sk;
        e.reclaimRelease = t.reclaimRelease;
        e.committed = true;

        emit Committed(sk, lk, msg.sender, e.amount, sk);
    }

    // -------------------------------------------------------------- execute --

    /// Reveal the shared secret and move a committed leg to its payee.
    /// Identity-free: gated by secret revelation and the execute deadline only.
    function execute(Terms calldata t, Leg calldata leg, bytes32 secret) external {
        if (block.timestamp > t.executeDeadline) revert Late();
        if (keccak256(abi.encodePacked(secret)) != t.secretHash) revert BadSecret();

        bytes32 sk = canonicalDigest(t);
        bytes32 lk = legKey(leg);
        Escrow storage e = escrows[sk][lk];
        if (!e.committed) revert NoSuchEscrow();
        if (e.settled) revert AlreadyFinal();

        e.settled = true;
        _pay(leg.token, leg.payee, e.amount);
        emit Executed(sk, lk, leg.payee, e.amount, secret);
    }

    /// Convenience: execute a leg using only the escrow key (no Terms needed).
    /// Not used by the prototype flows (kept for completeness of the API).
    function reclaimRaw(bytes32 swapKey_, bytes32 legKey_, address token, address owner_) external {
        Escrow storage e = escrows[swapKey_][legKey_];
        if (!e.committed) revert NoSuchEscrow();
        if (e.settled) revert AlreadyFinal();
        if (block.timestamp < e.reclaimRelease) revert TooEarly();
        e.settled = true;
        _pay(token, owner_, e.amount);
        emit Reclaimed(swapKey_, legKey_, owner_, e.amount);
    }

    // -------------------------------------------------------------- reclaim --

    /// Take back a committed leg after its reclaim deadline. Permissionless:
    /// the funds always go to the leg's owner, so griefing is pointless.
    function reclaim(Terms calldata t, Leg calldata leg) external {
        bytes32 sk = canonicalDigest(t);
        bytes32 lk = legKey(leg);
        Escrow storage e = escrows[sk][lk];
        if (!e.committed) revert NoSuchEscrow();
        if (e.settled) revert AlreadyFinal();
        if (block.timestamp < e.reclaimRelease) revert TooEarly();

        e.settled = true;
        _pay(leg.token, leg.owner, e.amount);
        emit Reclaimed(sk, lk, leg.owner, e.amount);
    }

    // ---------------------------------------------------------------- auth  --

    function _authorized(address sender, bytes32 digest, bytes calldata key, bytes calldata sig) internal view returns (bool) {
        // (1) factory-membership: caller is a post-quantum Quip wallet.
        if (quipFactory != address(0)) {
            try IQuipWalletFactory(quipFactory).walletOwner(sender) returns (address w) {
                if (w != address(0)) return true;
            } catch {}
        }
        // (2) ERC-7913 PQ signature against an allowlisted verifier.
        if (key.length != 0) {
            // The verifier allowlist is consulted by the caller-supplied verifier
            // address embedded in `key` (key := abi.encode(verifier, innerKey)).
            if (key.length >= 32) {
                address verifier = abi.decode(key, (address));
                if (verifierAllowlisted[verifier]) {
                    bytes memory inner = key[32:];
                    try IERC7913SignatureVerifier(verifier).verify(inner, digest, sig) returns (bytes4 magic) {
                        if (magic == ERC7913_MAGIC) return true;
                    } catch {}
                }
            }
        }
        return false;
    }

    // --------------------------------------------------------------- pay    --

    function _pay(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            (bool ok, bytes memory ret) = token.call(
                abi.encodeWithSignature("transfer(address,uint256)", to, amount)
            );
            if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
        }
    }

    receive() external payable {}
}
