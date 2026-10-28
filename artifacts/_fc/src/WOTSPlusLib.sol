// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.28;
import "../lib/WOTSPlus/WOTSPlus.sol";
// Deployable wrapper that exposes the WOTSPlus library functions externally,
// so the library code is genuinely present on-chain (matching how Quip
// publishes the WOTSPlus contract at 0x1Ad02... on the public chains).
contract WOTSPlusLib {
    function verify(
        WOTSPlus.WinternitzAddress calldata pk,
        WOTSPlus.WinternitzMessage calldata m,
        WOTSPlus.WinternitzElements calldata sig
    ) external pure returns (bool) {
        return WOTSPlus.verify(pk, m, sig);
    }
}
