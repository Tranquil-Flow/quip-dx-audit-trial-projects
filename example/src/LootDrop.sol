// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

import {IQVRFConsumer, IQVRFDispenser} from "./IQVRF.sol";

/// @title LootDrop — quantum-random loot drops for an on-chain game
/// @notice Requests verifiable quantum randomness from a QVRF coordinator and
///         rolls loot when the callback arrives. Follows the same
///         request→callback shape as the live Quantum Echoes consumer on
///         Ethereum mainnet (the first production QVRF consumer).
///
/// Flow:
///   1. Player calls requestLoot() — contract commits a challenge and asks the
///      coordinator for randomness.
///   2. QVRF coordinator calls fulfillRequest(requestId, randomWords).
///   3. Contract derives loot rarity from the words and emits LootRolled.
///
/// NOTE (2026-10): Quip's QVRF request interface is not finalized and no
/// coordinator is deployed on the Aglais testnet yet. Point DISPENSER at the
/// mock here for integration testing; swap in the real coordinator address
/// when Quip publishes it. See developers.quip.network/docs/compute/qvrf.
contract LootDrop is IQVRFConsumer {
    IQVRFDispenser public immutable dispenser;

    uint256 public constant WORDS_PER_REQUEST = 4;

    enum Rarity { Common, Uncommon, Rare, Epic, Legendary }

    struct Drop {
        uint256 requestId;
        address player;
        Rarity rarity;
        uint256 seedWord; // which random word drove the roll
        bool rolled;
        bool pending;
    }

    mapping(uint256 => Drop) public drops; // requestId => drop
    mapping(address => uint256[]) private _dropsOf; // player => requestIds
    mapping(uint256 => uint256) public dropOfToken; // convenience: token => requestId

    uint256 public nextTokenId = 1;

    event LootRequested(uint256 indexed requestId, address indexed player, bytes32 challenge);
    event LootRolled(
        uint256 indexed requestId,
        address indexed player,
        uint256 indexed tokenId,
        Rarity rarity,
        bytes32 word
    );

    error OnlyDispenser();
    error NoPendingRequest(uint256 requestId);
    error BadWordCount(uint256 got, uint256 expected);

    constructor(address dispenser_) {
        require(dispenser_ != address(0), "zero dispenser");
        dispenser = IQVRFDispenser(dispenser_);
    }

    /// @notice Request quantum randomness for one loot roll.
    /// @dev The challenge binds the request to this block so the coordinator's
    ///      commitment (published on chain before delivery, per Quip's V0 model)
    ///      can be checked against what we asked for.
    function requestLoot() external returns (uint256 requestId) {
        bytes32 challenge = keccak256(
            abi.encodePacked(msg.sender, block.number, _dropsOf[msg.sender].length)
        );
        requestId = dispenser.requestRandomness{value: 0}(address(this), challenge);
        drops[requestId] = Drop({
            requestId: requestId,
            player: msg.sender,
            rarity: Rarity.Common,
            seedWord: 0,
            rolled: false,
            pending: true
        });
        _dropsOf[msg.sender].push(requestId);
        emit LootRequested(requestId, msg.sender, challenge);
    }

    /// @inheritdoc IQVRFConsumer
    function fulfillRequest(uint256 requestId, bytes32[] calldata randomWords)
        external
        override
    {
        if (msg.sender != address(dispenser)) revert OnlyDispenser();
        Drop storage d = drops[requestId];
        if (!d.pending) revert NoPendingRequest(requestId);
        if (randomWords.length != WORDS_PER_REQUEST) {
            revert BadWordCount(randomWords.length, WORDS_PER_REQUEST);
        }

        // Derive rarity from the first word. Weighted: 50% Common, 25%
        // Uncommon, 15% Rare, 8% Epic, 2% Legendary.
        uint256 r = uint256(randomWords[0]) % 100;
        Rarity rarity = Rarity.Common;
        if (r >= 98) rarity = Rarity.Legendary;
        else if (r >= 90) rarity = Rarity.Epic;
        else if (r >= 75) rarity = Rarity.Rare;
        else if (r >= 50) rarity = Rarity.Uncommon;

        d.rarity = rarity;
        d.seedWord = uint256(randomWords[0]);
        d.rolled = true;
        d.pending = false;

        uint256 tokenId = nextTokenId++;
        dropOfToken[tokenId] = requestId;

        emit LootRolled(requestId, d.player, tokenId, rarity, randomWords[0]);
    }

    function dropsOf(address player) external view returns (uint256[] memory) {
        return _dropsOf[player];
    }

    function getDrop(uint256 requestId) external view returns (Drop memory) {
        return drops[requestId];
    }

    /// @notice Accept direct ether (e.g. refund sends).
    receive() external payable {}
}
