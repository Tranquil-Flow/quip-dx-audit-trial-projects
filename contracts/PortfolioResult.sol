// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Immutable public record linking a Quip compute order to its result.
contract PortfolioResult {
    uint256 public immutable jobId;
    uint8 public immutable assetMask;
    int64 public immutable energy;
    bytes32 public immutable resultHash;
    address public immutable recorder;

    event ResultRecorded(
        uint256 indexed jobId,
        uint8 assetMask,
        int64 energy,
        bytes32 indexed resultHash,
        address indexed recorder
    );

    constructor(uint256 jobId_, uint8 assetMask_, int64 energy_, bytes32 resultHash_) {
        require(jobId_ > 0, "job id is zero");
        jobId = jobId_;
        assetMask = assetMask_;
        energy = energy_;
        resultHash = resultHash_;
        recorder = msg.sender;
        emit ResultRecorded(jobId_, assetMask_, energy_, resultHash_, msg.sender);
    }

    function getResult()
        external
        view
        returns (uint256, uint8, int64, bytes32, address)
    {
        return (jobId, assetMask, energy, resultHash, recorder);
    }
}
