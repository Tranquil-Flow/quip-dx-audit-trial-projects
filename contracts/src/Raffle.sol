// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Raffle — single-round, publicly verifiable raffle (commit-reveal + future blockhash)
/// @notice FALLBACK randomness. Quip's QVRF has no published on-chain interface (see RESULT.md),
///         so this contract does NOT use quantum randomness. Fairness rests on:
///           1. the organizer commits keccak256(secret) and posts a bond BEFORE entries open;
///           2. entries close at `entryEndBlock`; the drawing block is fixed to a FUTURE block
///              (`closeEntries()` sets it), so nobody knows its hash when entries close;
///           3. seed = keccak256(secret, blockhash(drawBlock), numEntries, address(this));
///           4. anyone can recompute the winner from public data via `computeWinner`.
///         Trust assumptions: the organizer may ABORT after seeing the outcome (by not revealing),
///         which is disincentivised by forfeiting the bond to entrants; block producers could in
///         principle grind the blockhash. Fine for a testnet demo, not for real money.
contract Raffle {
    enum State { Open, Closed, Drawn, Aborted }

    address public immutable organizer;
    bytes32 public immutable organizerCommit;
    uint256 public immutable ticketPrice;
    uint256 public immutable entryEndBlock;
    uint256 public immutable revealWindow; // blocks after drawBlock in which the organizer may reveal (< 256)
    uint256 public immutable bond;

    State public state;
    uint256 public drawBlock;
    address[] private _entries;
    mapping(address => uint256) public ticketsOf;
    mapping(address => bool) public refunded;

    address public winner;
    uint256 public winnerIndex;
    bytes32 public seed;
    bytes32 public revealedSecret;
    bytes32 public usedBlockHash;

    event Entered(address indexed entrant, uint256 indexed entryIndex);
    event EntriesClosed(uint256 numEntries, uint256 drawBlock);
    event Drawn(address indexed winner, uint256 winnerIndex, uint256 prize, bytes32 seed, bytes32 secret, bytes32 blockHash, uint256 drawBlock);
    event Aborted(uint256 numEntries);
    event Refunded(address indexed entrant, uint256 amount);

    error WrongState();
    error WrongPayment();
    error TooEarly();
    error TooLate();
    error BadSecret();
    error NoEntries();
    error NotOrganizer();
    error TransferFailed();

    constructor(bytes32 commit, uint256 ticketPrice_, uint256 entryBlocks_, uint256 revealWindow_) payable {
        require(revealWindow_ > 0 && revealWindow_ < 200, "revealWindow");
        require(entryBlocks_ > 0, "entryBlocks");
        organizer = msg.sender;
        organizerCommit = commit;
        ticketPrice = ticketPrice_;
        entryEndBlock = block.number + entryBlocks_; // relative: robust to slow inclusion
        revealWindow = revealWindow_;
        bond = msg.value;
    }

    function numEntries() public view returns (uint256) { return _entries.length; }
    function entryAt(uint256 i) external view returns (address) { return _entries[i]; }
    function pot() public view returns (uint256) { return _entries.length * ticketPrice; }

    function enter() external payable {
        if (state != State.Open) revert WrongState();
        if (block.number > entryEndBlock) revert TooLate();
        if (msg.value != ticketPrice) revert WrongPayment();
        _entries.push(msg.sender);
        ticketsOf[msg.sender]++;
        emit Entered(msg.sender, _entries.length - 1);
    }

    /// @notice Anyone may close entries once the deadline block has passed. Fixes the drawing block
    ///         two blocks in the future so its hash is unknown at this point.
    function closeEntries() external {
        if (state != State.Open) revert WrongState();
        if (block.number <= entryEndBlock) revert TooEarly();
        if (_entries.length == 0) revert NoEntries();
        state = State.Closed;
        drawBlock = block.number + 2;
        emit EntriesClosed(_entries.length, drawBlock);
    }

    /// @notice Pure function so anyone can audit the outcome from public data.
    function computeWinner(bytes32 secret, bytes32 blockHash) public view returns (bytes32 seed_, uint256 index) {
        seed_ = keccak256(abi.encodePacked(secret, blockHash, _entries.length, address(this)));
        index = uint256(seed_) % _entries.length;
    }

    /// @notice Organizer reveals the secret; pays the pot to the winner and returns the bond.
    function draw(bytes32 secret) external {
        if (state != State.Closed) revert WrongState();
        if (msg.sender != organizer) revert NotOrganizer();
        if (block.number <= drawBlock) revert TooEarly();
        if (block.number > drawBlock + revealWindow) revert TooLate();
        if (keccak256(abi.encodePacked(secret)) != organizerCommit) revert BadSecret();
        bytes32 bh = blockhash(drawBlock);
        require(bh != bytes32(0), "blockhash unavailable");

        (bytes32 s, uint256 idx) = computeWinner(secret, bh);
        state = State.Drawn;
        seed = s;
        winnerIndex = idx;
        winner = _entries[idx];
        revealedSecret = secret;
        usedBlockHash = bh;

        uint256 prize = pot();
        emit Drawn(winner, idx, prize, s, secret, bh, drawBlock);
        _send(winner, prize);
        if (bond > 0) _send(organizer, bond);
    }

    /// @notice If the organizer fails to reveal in time, anyone can abort; entrants then pull
    ///         their ticket price back plus an equal share of the forfeited bond.
    function abort() external {
        if (state != State.Closed) revert WrongState();
        if (block.number <= drawBlock + revealWindow) revert TooEarly();
        state = State.Aborted;
        emit Aborted(_entries.length);
    }

    function claimRefund() external {
        if (state != State.Aborted) revert WrongState();
        uint256 t = ticketsOf[msg.sender];
        require(t > 0 && !refunded[msg.sender], "nothing to refund");
        refunded[msg.sender] = true;
        uint256 amount = t * ticketPrice + (bond * t) / _entries.length;
        emit Refunded(msg.sender, amount);
        _send(msg.sender, amount);
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
