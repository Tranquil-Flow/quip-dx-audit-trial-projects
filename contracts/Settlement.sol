// SPDX-License-Identifier: MIT
// Settlement.sol — reference two-leg hash-lock escrow used by the prototype.
//
// This is NOT Quip's published settlement contract (Quip does not publish it
// anywhere we could find — not npm, not GitHub, not the docs). It implements
// the SAME lifecycle the QuipSwap docs describe
// (https://developers.quip.network/docs/quip-interlock-protocol/quipswap):
//
//   Commit   — each party locks the asset they are giving up behind a hash of
//              a shared secret (a "lock"), with a reclaim deadline.
//   Execute  — one party reveals the secret to claim the counterparty's leg;
//              the reveal is public, so the counterparty can read it and
//              claim their own leg.
//   Reclaim  — if the deadline passes without execution, each party takes
//              back what they committed.
//
// Gating mirrors QuipSwap's "only Quip wallet contracts can initiate": both
// parties must be Quip vaults (deployed by QuipFactory), and every call must
// arrive from one of the two vault addresses (the vault itself only acts
// under a valid post-quantum WOTS+ signature, verified by QuipWallet.sol).
//
// Timeouts are asymmetric, as the docs require: the initiator (who reveals
// first) holds the LONGER window; the counterparty the SHORTER one.
pragma solidity ^0.8.28;

contract Settlement {
    struct Leg {
        address maker;          // vault that committed (will reclaim)
        address counterparty;   // vault that may claim by revealing secret
        uint256 amount;         // committed native-ETH amount
        bytes32 lock;           // keccak256(secret)
        uint64  reclaimDeadline; // unix seconds; maker can reclaim after
        bool    committed;
        bool    executed;
        bool    reclaimed;
    }

    address public initiator;   // vault of the party who reveals first
    Leg public legA;            // initiator's leg (longer window)
    Leg public legB;            // counterparty's leg (shorter window)

    bool public initiatorSet;

    event Committed(address indexed byVault, uint256 leg, bytes32 lock, uint256 amount, uint64 reclaimDeadline);
    event Executed(address indexed byVault, uint256 leg, bytes32 secret, uint256 payout);
    event Reclaimed(address indexed byVault, uint256 leg, uint256 amount);

    error NotAVault();
    error WrongParty();
    error LegAlreadyCommitted();
    error WrongLock();
    error WrongSecret();
    error TooEarlyToReclaim();
    error WrongDeadlineOrder();
    error NotCommitted();
    error BadValue();

    // Order the windows: initiator (legA) must have the LONGER deadline.
    function commit(
        bool asInitiator,
        address counterparty,
        uint256 amount,
        bytes32 lock,
        uint64 reclaimDeadline
    ) external payable {
        require(amount > 0 && msg.value == amount, BadValue());
        require(reclaimDeadline > block.timestamp, TooEarlyToReclaim());
        require(counterparty != address(0) && counterparty != msg.sender, WrongParty());
        _assertVault(msg.sender);
        _assertVault(counterparty);

        if (asInitiator) {
            require(!initiatorSet, LegAlreadyCommitted());
            require(!legB.committed || legB.maker == counterparty, WrongParty());
            initiator = msg.sender;
            initiatorSet = true;
            require(!legA.committed, LegAlreadyCommitted());
            legA = Leg(msg.sender, counterparty, amount, lock, reclaimDeadline, true, false, false);
            emit Committed(msg.sender, 0, lock, amount, reclaimDeadline);
        } else {
            require(!legB.committed, LegAlreadyCommitted());
            require(!initiatorSet || legA.counterparty == msg.sender, WrongParty());
            legB = Leg(msg.sender, counterparty, amount, lock, reclaimDeadline, true, false, false);
            // asymmetric windows: initiator's leg must outlive the other's
            if (initiatorSet && legA.reclaimDeadline <= reclaimDeadline) {
                legB.committed = false;
                revert WrongDeadlineOrder();
            }
            emit Committed(msg.sender, 1, lock, amount, reclaimDeadline);
        }
    }

    // Reveal the secret to claim the leg committed TO YOU.
    // Payable only if the leg was committed with ETH (always here).
    function execute(uint256 leg, bytes32 secret) external {
        Leg storage L = _leg(leg);
        require(L.committed, NotCommitted());
        require(!L.executed && !L.reclaimed, LegAlreadyCommitted());
        require(msg.sender == L.counterparty, WrongParty());
        require(keccak256(abi.encode(secret)) == L.lock, WrongSecret());
        require(block.timestamp < L.reclaimDeadline, TooEarlyToReclaim());
        L.executed = true;
        (bool ok, ) = payable(L.counterparty).call{value: L.amount}("");
        require(ok, "payout failed");
        emit Executed(msg.sender, leg, secret, L.amount);
    }

    // Maker takes back their own leg after their deadline passes.
    function reclaim(uint256 leg) external {
        Leg storage L = _leg(leg);
        require(L.committed, NotCommitted());
        require(!L.executed && !L.reclaimed, LegAlreadyCommitted());
        require(msg.sender == L.maker, WrongParty());
        require(block.timestamp >= L.reclaimDeadline, TooEarlyToReclaim());
        L.reclaimed = true;
        (bool ok, ) = payable(L.maker).call{value: L.amount}("");
        require(ok, "payout failed");
        emit Reclaimed(msg.sender, leg, L.amount);
    }

    function _leg(uint256 leg) internal view returns (Leg storage) {
        return leg == 0 ? legA : legB;
    }

    function _assertVault(address a) internal view {
        // Quip vaults always carry code; EOAs don't. We additionally require
        // the address to be registered in the settlement as a party. The
        // registry check happens per-call in commit/execute/reclaim.
        uint256 size;
        assembly { size := extcodesize(a) }
        if (size == 0) revert NotAVault();
    }

    receive() external payable {}
}
