# m4-b

- **Round:** Round 2
- **Model:** DeepSeek V4 Pro
- **Task:** Raffle using QVRF, or a documented substitute
- **Source:** Quip Network Developer Experience Audit (Aug-Oct 2026). Project built by an AI coding agent working only from public docs; kept as built.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| Raffle using QVRF, or a documented substitute | DeepSeek V4 Pro | Aglais EVM; QVRF unreachable | Built and working on testnet with the substitute the brief allowed (commit-reveal plus block hashes); QVRF unusable | ~41 min | [C-TRL-47]. In one rebuild an entry was included about 30 blocks after it was sent, after the commit deadline, and reverted. Independently rebuilt and confirmed. |

## Trial card

- **Model:** DeepSeek V4 Pro (all 127 model calls).
- **What it does:** A Solidity commit-reveal raffle on Aglais: entrants pay 1 AGLS against a hidden commitment, reveal their salts, anyone closes reveals (fixing an anchor block), and `draw()` folds five anchor-block hashes together with the revealed-salt aggregate to pick a winner. Python/web3.py scripts run the full lifecycle — deploy, enter, reveal, close, draw, claim/refund — and a `verify.py` independently recomputes the draw from chain data. QVRF was researched and documented as unusable, so the brief's fallback clause was followed.
- **Quip products and integration:** Aglais EVM (raffle contract/calls) — CHAIN_ONLY; randomness — FALLBACK (blockhash + commit-reveal; QVRF has no documented request interface). Both independent rebuilds agree.
- **Evidence:** contract [0x1179b9b7d5e9DA6dA2a594b2721874842048aEe7](https://explorer.aglais.quip.network/address/0x1179b9b7d5e9DA6dA2a594b2721874842048aEe7), deploy tx [0x5a6c5e26646943d6ca4a6dc0224e6b8fcf0b4df2b2e0547644ec98e76ca9b3f0](https://explorer.aglais.quip.network/tx/0x5a6c5e26646943d6ca4a6dc0224e6b8fcf0b4df2b2e0547644ec98e76ca9b3f0), draw tx [0x124b8c2154bbe06f40d894cd67148daebe2fe97d8e55050f3db4725ec234eb8b](https://explorer.aglais.quip.network/tx/0x124b8c2154bbe06f40d894cd67148daebe2fe97d8e55050f3db4725ec234eb8b) (winner index 1). Both independent rebuilds ran the full lifecycle on fresh contracts; one rebuild needed a second attempt with longer windows.
- **Time:** 41 min.
- **Key Quip call** (`contracts/AglaisQuantumRaffle.sol:146-153`):
```solidity
bytes32 ah = bytes32(0);
for (uint256 b = anchorBlock; b < anchorBlock + MIN_CONFIRMATIONS; b++) {
    ah = keccak256(abi.encode(ah, blockhash(b)));
}
anchorHash = ah;

uint256 seed = uint256(keccak256(abi.encode(drawAggregate, ah)));
winnerIndex = seed % entries.length;
```
- **What got in the way:** QVRF has no documented request interface, endpoint, package or code example [[C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)]; separately, in one rebuild one entry transaction was included about 30 blocks after it was sent, after the commit deadline had passed, so it reverted. Short commit windows are fragile when inclusion is slow. The cause of this delay (2026-09-29, about 07:40 UTC) is not established; very slow inclusion did not reproduce in our low-load check on 2026-09-28 (see section 9 of the main report).

## About this branch

This branch contains the project exactly as the agent left it, minus dependencies, keys and vendored clones (see `EXCLUDED.md`). Testnet key material and personal paths were removed; nothing here was edited to fix the project. Re-install dependencies from the lockfile before running.
