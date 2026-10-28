// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Public, append-able on-chain proof that a Quip Network quantum
/// compute job produced a given portfolio selection.
/// Anyone can overwrite the stored record (testnet demo); the point is that
/// anyone can READ it and check it against the chain (job id resolves on
/// Subscan / the Quip mempool pallet; the bits can be verified by anyone who
/// re-runs the QUBO).
contract PortfolioProof {
    uint64 public jobId;         // QuantumComputeMempool order id (aglais testnet)
    uint8 public nAssets;        // number of assets in the universe (8)
    uint64 public selectedMask;  // bit i set => asset i held (LSB = asset 0)
    int64 public energy;         // QUBO Hamiltonian energy of the chosen selection
    string public solver;        // miner account (ss58) that solved the job
    uint64 public recordedAt;    // block.timestamp of the recording

    event SolutionRecorded(
        uint64 jobId,
        uint8 nAssets,
        uint64 selectedMask,
        int64 energy,
        string solver
    );

    function record(
        uint64 _jobId,
        uint8 _nAssets,
        uint64 _selectedMask,
        int64 _energy,
        string calldata _solver
    ) public {
        jobId = _jobId;
        nAssets = _nAssets;
        selectedMask = _selectedMask;
        energy = _energy;
        solver = _solver;
        recordedAt = uint64(block.timestamp);
        emit SolutionRecorded(_jobId, _nAssets, _selectedMask, _energy, _solver);
    }

    /// @notice Decode the stored selection into an array of nAssets bits.
    function selectedBits() public view returns (bool[] memory) {
        bool[] memory bits = new bool[](nAssets);
        for (uint8 i = 0; i < nAssets; i++) {
            bits[i] = ((selectedMask >> i) & 1) == 1;
        }
        return bits;
    }
}
