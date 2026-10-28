// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AglaisQuantumRaffle
/// @notice Provably-fair commit-reveal raffle for the Quip Network Aglais testnet
///         (EIP-155 chain id 20033, pallet-revive EVM).
///
/// RANDOMNESS DESIGN NOTE (why not QVRF):
///   Quip's QVRF (quantum randomness) is the intended randomness source for
///   contracts, but as of this build its request interface is unpublished
///   ("not yet final", no function names/parameters in docs), access is gated
///   behind a "Request Access" form, on-chain verification contracts are
///   "in development", and there is no QVRF contract/pallet/precompile on the
///   Aglais testnet runtime (verified in quip-validator source: Precompiles=()).
///   Inside the Aglais EVM, block.prevrandao/difficulty is a hard-coded
///   constant (2.5e15, see pallet-revive vm/evm.rs) and the BABE epoch
///   randomness is not exposed to contracts.
///
///   Fallback: commit-reveal entries + winner drawn from the hash of
///   (revealed-entry aggregate, K consecutive canonical block hashes whose
///   values cannot be known until after the reveal window is closed).
///   blockhash(n) returns the real Substrate block hash inside this EVM
///   (pallet-revive exec.rs). With K=5 consecutive blocks (30s), an attacker
///   must author the entire anchor window to re-roll the draw, and finality
///   (GRANDPA) prevents reorgs. This is the classic multi-block-anchor scheme
///   used by on-chain raffles where no VRF oracle exists. Limitations are
///   documented in RESULT.md.
contract AglaisQuantumRaffle {
    uint256 public constant MIN_CONFIRMATIONS = 5; // blocks after anchor
    uint256 public constant ENTRY_FEE = 1 ether;   // 1 AGLS per entry

    enum Phase { Commit, Reveal, Closed }

    struct Entry {
        address player;
        bytes32 commitment; // keccak256(abi.encode(player, salt))
        bytes32 salt;       // zero until revealed
        bool revealed;
        bool refunded;
    }

    address public immutable owner;
    uint256 public immutable commitDeadline; // block number
    uint256 public immutable revealDeadline; // block number

    Entry[] public entries;
    mapping(address => uint256) public entryIndex; // +1, 0 = none
    uint256 public revealedCount;
    uint256 public refundedCount;

    uint256 public anchorBlock;   // first block of the K-block anchor window
    bytes32 public drawAggregate; // hash over ordered revealed salts
    bytes32 public anchorHash;    // fold of the K anchor block hashes
    uint256 public winnerIndex;
    address public winner;
    uint256 public drawBlock;
    bool public drawn;
    bool public paidOut;

    event Entered(address indexed player, uint256 index, bytes32 commitment);
    event Revealed(address indexed player, uint256 index, bytes32 salt);
    event RevealClosed(bytes32 aggregate, uint256 anchorBlock);
    event DrawExecuted(uint256 winnerIndex, address winner, uint256 drawBlock,
                       bytes32 aggregate, bytes32 anchorHash);
    event PaidOut(address winner, uint256 amount);
    event Refunded(address indexed player, uint256 amount);

    error NotOwner();
    error WrongPhase(uint8 required);
    error AlreadyEntered();
    error NotAnEntrant();
    error BadCommitment();
    error TooEarly();
    error TooLate();
    error NotRevealed(address player);
    error AlreadyDrawn();
    error AlreadyPaid();

    modifier onlyOwner() { if (msg.sender != owner) revert NotOwner(); _; }

    /// @notice Phase is derived from block numbers, not stored state, so the
    ///         raffle progresses automatically and nobody can stall it.
    function currentPhase() public view returns (Phase) {
        if (anchorBlock != 0) return Phase.Closed;
        if (block.number > revealDeadline) return Phase.Closed;
        if (block.number > commitDeadline) return Phase.Reveal;
        return Phase.Commit;
    }

    modifier inPhase(Phase p) { if (currentPhase() != p) revert WrongPhase(uint8(p)); _; }

    constructor(uint256 _commitBlocks, uint256 _revealBlocks) payable {
        owner = msg.sender;
        commitDeadline = block.number + _commitBlocks;
        revealDeadline = commitDeadline + _revealBlocks;
    }

    /// @notice Enter the raffle with a commitment to (player, salt).
    function enter(bytes32 commitment) external payable inPhase(Phase.Commit) {
        if (block.number > commitDeadline) revert TooLate();
        if (msg.value != ENTRY_FEE) revert(); // exact fee
        if (entryIndex[msg.sender] != 0) revert AlreadyEntered();

        entries.push(Entry(msg.sender, commitment, 0, false, false));
        entryIndex[msg.sender] = entries.length;
        emit Entered(msg.sender, entries.length - 1, commitment);
    }

    /// @notice Reveal your salt during the reveal window.
    function reveal(bytes32 salt) external inPhase(Phase.Reveal) {
        uint256 idx = entryIndex[msg.sender];
        if (idx == 0) revert NotAnEntrant();
        Entry storage e = entries[idx - 1];
        if (e.revealed) revert AlreadyEntered();
        if (keccak256(abi.encode(msg.sender, salt)) != e.commitment)
            revert BadCommitment();
        e.salt = salt;
        e.revealed = true;
        revealedCount += 1;
        emit Revealed(msg.sender, idx - 1, salt);
    }

    /// @notice Anyone may close the reveal window once the deadline passes.
    ///         Anchors the draw to this block; the K hashes used in draw()
    ///         are unknowable until anchorBlock + K - 1 exists.
    function closeReveals() external {
        if (block.number <= revealDeadline) revert TooEarly();
        if (anchorBlock != 0) revert AlreadyDrawn();
        bytes32 agg = keccak256(abi.encodePacked(entries.length, revealedCount));
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].revealed) {
                agg = keccak256(abi.encode(agg, entries[i].player, entries[i].salt));
            }
        }
        drawAggregate = agg;
        anchorBlock = block.number;
        emit RevealClosed(agg, anchorBlock);
    }

    /// @notice Execute the draw once the anchor window has fully elapsed.
    function draw() external {
        if (anchorBlock == 0) revert TooEarly();
        if (drawn) revert AlreadyDrawn();
        if (block.number < anchorBlock + MIN_CONFIRMATIONS) revert TooEarly();

        bytes32 ah = bytes32(0);
        for (uint256 b = anchorBlock; b < anchorBlock + MIN_CONFIRMATIONS; b++) {
            ah = keccak256(abi.encode(ah, blockhash(b)));
        }
        anchorHash = ah;

        uint256 seed = uint256(keccak256(abi.encode(drawAggregate, ah)));
        winnerIndex = seed % entries.length;
        winner = entries[winnerIndex].player;
        drawn = true;
        drawBlock = block.number;
        emit DrawExecuted(winnerIndex, winner, block.number, drawAggregate, ah);
    }

    /// @notice Withdraw the pot for the winning entrant (only if revealed).
    ///         Refund obligations for revealed non-winners are reserved so
    ///         an early claim cannot grief their refunds.
    function claim() external {
        if (!drawn) revert NotRevealed(address(0));
        if (msg.sender != winner) revert NotOwner();
        if (!entries[winnerIndex].revealed) revert NotRevealed(msg.sender);
        if (paidOut) revert AlreadyPaid();
        paidOut = true;
        uint256 owed = ENTRY_FEE * (revealedCount - 1 - refundedCount);
        uint256 amount = address(this).balance - owed;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit PaidOut(msg.sender, amount);
    }

    /// @notice After the draw, any revealed non-winner may reclaim their fee.
    ///         Unrevealed entrants forfeit their fee to the pot (they could
    ///         have affected the outcome and chose not to participate).
    function refund() external {
        if (!drawn) revert TooEarly();
        uint256 idx = entryIndex[msg.sender];
        if (idx == 0) revert NotAnEntrant();
        Entry storage e = entries[idx - 1];
        if (e.player == winner) revert(); // winner cannot refund
        if (!e.revealed) revert NotRevealed(msg.sender);
        if (e.refunded) revert AlreadyPaid();
        e.refunded = true;
        refundedCount += 1;
        (bool ok, ) = msg.sender.call{value: ENTRY_FEE}("");
        require(ok, "transfer failed");
        emit Refunded(msg.sender, ENTRY_FEE);
    }

    function entryCount() external view returns (uint256) { return entries.length; }

    function pot() external view returns (uint256) { return address(this).balance; }

    /// @notice Full on-chain evidence for the draw, verifiable by anyone.
    function drawEvidence()
        external
        view
        returns (uint256 nEntries, uint256 nRevealed, uint256 anchor,
                 uint256 drawBlockNum, bytes32 aggregate, bytes32 anchorHashOut,
                 uint256 wIndex, address w, bytes32[5] memory hashes)
    {
        for (uint256 i = 0; i < MIN_CONFIRMATIONS; i++) {
            hashes[i] = blockhash(anchorBlock + i);
        }
        return (entries.length, revealedCount, anchorBlock, drawBlock,
                drawAggregate, anchorHash, winnerIndex, winner, hashes);
    }
}
