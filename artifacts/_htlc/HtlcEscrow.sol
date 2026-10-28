// SPDX-License-Identifier: MIT
// Reference HTLC-style escrow contract.
//
// This is the same hash-lock + asymmetric-deadline construct that QuipSwap's
// settlement contract implements, per the official docs:
//   "A swap moves through three actions.  Commit. Each party locks the assets
//    they are offering into the settlement contract on their own chain. The
//    contract records the agreed terms of the trade and the hash of the
//    shared secret, and holds the assets in escrow.
//    Execute.  One party reveals the secret to claim the assets committed to
//    them. Revealing the secret is what unblocks the other side.
//    Reclaim.  If the deadline on a commitment passes without execution, the
//    party who committed takes their own assets back."
//
// See https://developers.quip.network/docs/quip-interlock-protocol/quipswap
//
// Two contracts per swap (one on each side).  Each side is parameterised by:
//   maker         EOA (commit sender)
//   counterparty  EOA (recipient on this chain)
//   asset         address(0) for native ETH, or ERC-20 address
//   amount        the trade leg size
//   hashlock      keccak256(secret) — published by the maker at deploy time
//   claimDeadline seconds since epoch (initiator gets the longer window)
//   reclaimDeadline seconds since epoch (when the maker can reclaim)
//
// The "initiator" = maker on this chain (the side that will reveal).  In a
// cross-chain swap, the two commitments are on different contracts and have
// DIFFERENT deadlines.  Here, both commitments live in the same contract
// for demo purposes, so we just take the single deadline param.
//
// The contract holds ETH or ERC-20 until claim() or reclaim().

pragma solidity ^0.8.28;

interface IERC20Minimal {
    function transfer(address to, uint256 v) external returns (bool);
    function balanceOf(address a) external view returns (uint256);
    function transferFrom(address from, address to, uint256 v) external returns (bool);
}

contract HtlcEscrow {
    address public maker;            // who funded and can reclaim
    address public counterparty;     // who can claim by revealing secret
    address public asset;            // address(0) == native ETH
    uint256 public amount;           // amount locked
    bytes32 public hashlock;         // keccak256(secret)
    uint64  public reclaimDeadline;  // unix seconds; after this, maker can reclaim

    enum State { Active, Claimed, Reclaimed }
    State public state;

    event Committed(address indexed maker, address indexed counterparty, address asset, uint256 amount, bytes32 hashlock, uint64 reclaimDeadline);
    event Claimed(address indexed to, bytes32 secret);
    event Reclaimed(address indexed to, uint256 amount);

    error NotMaker();
    error NotCounterparty();
    error WrongSecret();
    error NotActive();
    error TooEarly();
    error AlreadyDone();

    constructor(
        address _maker,
        address _counterparty,
        address _asset,
        uint256 _amount,
        bytes32 _hashlock,
        uint64  _reclaimDeadline
    ) payable {
        if (_amount == 0) revert("zero amount");
        if (_reclaimDeadline <= block.timestamp) revert("deadline must be future");
        maker = _maker;
        counterparty = _counterparty;
        asset = _asset;
        amount = _amount;
        hashlock = _hashlock;
        reclaimDeadline = _reclaimDeadline;

        if (_asset == address(0)) {
            if (msg.value != _amount) revert("bad ETH value");
        } else {
            // pull tokens
            (bool ok, bytes memory ret) = _asset.call(
                abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, _maker, address(this), _amount)
            );
            require(ok && (ret.length == 0 || abi.decode(ret, (bool))), "pull failed");
        }
        state = State.Active;
        emit Committed(_maker, _counterparty, _asset, _amount, _hashlock, _reclaimDeadline);
    }

    // Counterparty reveals preimage of `hashlock` to claim.
    function claim(bytes32 secret) external {
        if (state != State.Active) revert NotActive();
        if (msg.sender != counterparty) revert NotCounterparty();
        if (keccak256(abi.encode(secret)) != hashlock) revert WrongSecret();
        state = State.Claimed;
        _payout(counterparty, amount);
        emit Claimed(counterparty, secret);
    }

    // Maker reclaims after the reclaim deadline.
    function reclaim() external {
        if (state != State.Active) revert NotActive();
        if (msg.sender != maker) revert NotMaker();
        if (block.timestamp < reclaimDeadline) revert TooEarly();
        state = State.Reclaimed;
        _payout(maker, amount);
        emit Reclaimed(maker, amount);
    }

    function _payout(address to, uint256 v) internal {
        if (asset == address(0)) {
            (bool ok,) = payable(to).call{value: v}("");
            require(ok, "ETH send failed");
        } else {
            require(IERC20Minimal(asset).transfer(to, v), "token send failed");
        }
    }

    // Allow receiving ETH if asset==0 with value==amount (sent in constructor).
    receive() external payable {}
}
