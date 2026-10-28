// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QuipResultRegistry
/// @notice Public, append-only record of optimisation results computed on Quip Network.
///         Each entry links a Quip compute job (QuantumComputeMempool order id on the
///         Aglais Substrate chain) to the problem that was solved and the chosen solution,
///         so anyone can re-check it: re-derive the QUBO, hash it, compare `problemHash`,
///         and re-evaluate `energyMilli` for `selection`.
contract QuipResultRegistry {
    struct Result {
        uint64 jobId;          // QuantumComputeMempool order_id on the Quip chain
        bytes32 problemHash;   // sha256 of the canonical QUBO JSON (see quantum/portfolio.py)
        uint8 selection;       // bitmask over the 8 assets (bit i = asset i chosen)
        int64 energyMilli;     // QUBO energy of `selection`, x1000 fixed point (Quip convention)
        bytes32 solver;        // Quip account (AccountId32) of the miner whose answer won
        bytes32 topology;      // Quip topology hash the job was placed on
        string assets;         // comma separated asset tickers, bit order
        address submitter;
        uint64 timestamp;
    }

    Result[] private results;
    mapping(uint64 => uint256) public indexByJobId; // index + 1; 0 = unknown

    event ResultRecorded(uint256 indexed index, uint64 indexed jobId, bytes32 indexed problemHash,
                         uint8 selection, int64 energyMilli, address submitter);

    function record(uint64 jobId, bytes32 problemHash, uint8 selection, int64 energyMilli,
                    bytes32 solver, bytes32 topology, string calldata assets) external returns (uint256 index) {
        require(indexByJobId[jobId] == 0, "job already recorded");
        index = results.length;
        results.push(Result(jobId, problemHash, selection, energyMilli, solver, topology, assets,
                            msg.sender, uint64(block.timestamp)));
        indexByJobId[jobId] = index + 1;
        emit ResultRecorded(index, jobId, problemHash, selection, energyMilli, msg.sender);
    }

    function count() external view returns (uint256) { return results.length; }

    function get(uint256 index) external view returns (Result memory) { return results[index]; }

    function getByJobId(uint64 jobId) external view returns (Result memory) {
        uint256 i = indexByJobId[jobId];
        require(i != 0, "unknown job");
        return results[i - 1];
    }
}
