// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
/// @title LootDrop v2 — a small-footprint, fixed-size loot drop that
///         consumes a QVRF-style callback. This version is tuned to
///         fit comfortably inside Aglais's modest EVM contract
///         limits and uses fixed-size bytes32 names instead of
///         dynamic strings, so the constructor stays cheap.
contract LootDropV2 {
    // items encoded as bytes32 so we don't need a dynamic string array
    bytes32 public itemCommon    = "WoodenSword";
    bytes32 public itemUncommon  = "IronDagger";
    bytes32 public itemRare      = "CrystalStaff";
    bytes32 public itemLegendary = "QuantumEdge";

    address public qvrfCoordinator;
    address public owner;

    // Per-loot state.
    struct Request {
        address player;
        uint256 randomness;
        bool fulfilled;
        bool revealed;
        uint8 rarity;        // 0..3
        uint8 itemIndex;     // 0..3
    }
    mapping(uint256 => Request) public requests;
    uint256 public nextRequestId;
    uint256 public lootPriceWei;

    event LootOpened(uint256 indexed requestId, address indexed player, uint256 price);
    event RandomnessRequested(uint256 indexed requestId, address indexed player);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness);
    event LootRevealed(uint256 indexed requestId, address indexed player, uint8 rarity, uint8 itemIndex, bytes32 name);

    modifier onlyCoordinator() {
        require(msg.sender == qvrfCoordinator, "only QVRF coordinator");
        _;
    }
    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address _qvrfCoordinator, uint256 _lootPriceWei) {
        qvrfCoordinator = _qvrfCoordinator;
        owner = msg.sender;
        lootPriceWei = _lootPriceWei;
    }

    function openLoot() external payable returns (uint256 requestId) {
        require(msg.value == lootPriceWei, "bad loot price");
        requestId = nextRequestId++;
        requests[requestId].player = msg.sender;
        emit LootOpened(requestId, msg.sender, msg.value);
        emit RandomnessRequested(requestId, msg.sender);
    }

    function revealLoot(uint256 requestId) external {
        Request storage r = requests[requestId];
        require(r.player != address(0), "unknown request");
        require(r.fulfilled, "not fulfilled");
        require(!r.revealed, "already revealed");
        r.revealed = true;
        uint256 roll = r.randomness % 1000;
        uint8 rarity;
        if (roll < 900) rarity = 0;
        else if (roll < 970) rarity = 1;
        else if (roll < 995) rarity = 2;
        else rarity = 3;
        r.rarity = rarity;
        r.itemIndex = rarity;
        bytes32 name;
        if (rarity == 0) name = itemCommon;
        else if (rarity == 1) name = itemUncommon;
        else if (rarity == 2) name = itemRare;
        else name = itemLegendary;
        emit LootRevealed(requestId, r.player, rarity, rarity, name);
    }

    function rawFulfillRandomness(uint256 requestId, uint256 randomness) external onlyCoordinator {
        Request storage r = requests[requestId];
        require(r.player != address(0), "unknown request");
        require(!r.fulfilled, "already fulfilled");
        r.randomness = randomness;
        r.fulfilled = true;
        emit RandomnessFulfilled(requestId, randomness);
    }

    function setQvrfCoordinator(address c) external onlyOwner { qvrfCoordinator = c; }
    function setLootPrice(uint256 p) external onlyOwner { lootPriceWei = p; }
    function withdraw() external onlyOwner { payable(owner).transfer(address(this).balance); }
}
