// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.24;

/// Minimal ERC-7913 signature-verifier interface (Quip's on-chain SHRINCS
/// verifier implements this). https://eips.ethereum.org/EIPS/eip-7913
interface IERC7913SignatureVerifier {
    function verify(
        bytes calldata key,
        bytes32 hash,
        bytes calldata signature
    ) external view returns (bytes4);
}

/// The slice of Quip's live WalletFactory we need: membership lookup.
/// `walletOwner(wallet)` returns the wallet's owner (0 if not a Quip wallet).
interface IQuipWalletFactory {
    function walletOwner(address wallet) external view returns (address);
}
