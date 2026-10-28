# v6-b

- **Round:** Round 4
- **Model:** GPT-6
- **Task:** QVRF randomness from a contract (screenshot-only)
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| QVRF randomness from a contract (screenshot-only) | GPT-6 | Aglais EVM and faucet (plain EVM); QVRF unreachable | Partly working: a request-and-callback loot-drop contract on Aglais with an owner-fed stand-in provider; QVRF unusable | 16 min | The QVRF page lists no function names or address [C-R6-02, C-TRL-47, C-TRL-48, C-TRL-50]. Rebuilds differ (works / partial). |

## Trial card

- **Model:** GPT-6.
- **What it does:** A Foundry project with an asynchronous request-and-callback loot-drop contract (`LootDrop`) and an owner-fed `DemoProvider`, deployed to Aglais, with tests and a README that says plainly it is not QVRF. The developer concluded from the QVRF docs that no callable interface is published, and listed five changes it would ask Quip for.
- **Quip products and integration:** QVRF — NONE (no published interface or address to call); Aglais EVM RPC and faucet — CHAIN_ONLY.
- **Evidence:** `DemoProvider` deploy [0x1a6c6ec5342d119b295bee8b8703f752af7c38b34bd37cca8e71d9df0b4ac738](https://explorer.aglais.quip.network/tx/0x1a6c6ec5342d119b295bee8b8703f752af7c38b34bd37cca8e71d9df0b4ac738) creating [0x8BCB2BCf1E79B532FBCB32ecd64789De20537ad6](https://explorer.aglais.quip.network/address/0x8BCB2BCf1E79B532FBCB32ecd64789De20537ad6); `LootDrop` deploy [0x80e77984ee47d24b3291c72d3d9d0df2338b046f82a0e41c26b0ee42d554f7d9](https://explorer.aglais.quip.network/tx/0x80e77984ee47d24b3291c72d3d9d0df2338b046f82a0e41c26b0ee42d554f7d9) creating [0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574](https://explorer.aglais.quip.network/address/0xB872afEecf2b1F9300Aed2D9Ec817b7aA702D574); `requestDrop` [0x06cc33922fed1e09a511d09e0b27654752a127319de82c946cd59bd8a81a7f25](https://explorer.aglais.quip.network/tx/0x06cc33922fed1e09a511d09e0b27654752a127319de82c946cd59bd8a81a7f25) and the owner's `fulfill(1, 49)` [0xed35cb830a1cf8fc1422e7215e02f40336eb1c5f05d3d46284bc99e6c4aaddb2](https://explorer.aglais.quip.network/tx/0xed35cb830a1cf8fc1422e7215e02f40336eb1c5f05d3d46284bc99e6c4aaddb2), all status 1; `drops(1)` returns the claimed player, tier and status. First rebuild: works (4 of 4 tests pass, and its own deploys and request/fulfil cycle on Aglais succeeded, for example `LootDrop` [0x93bFa4dd90af90378831b45bBD806B407760744B](https://explorer.aglais.quip.network/address/0x93bFa4dd90af90378831b45bBD806B407760744B)). Second rebuild: partly working; the build, tests and its own Aglais deploy ([0xf076A31eEeFf2BA82b3a6d705c7982504a1a3c85](https://explorer.aglais.quip.network/address/0xf076A31eEeFf2BA82b3a6d705c7982504a1a3c85)) work, but the brief's QVRF part cannot be done.
- **Time:** 16 min.
- **Key Quip call** (`src/LootDrop.sol:31-38`, excerpt; the provider is the builder's stand-in, not QVRF):
```solidity
function requestDrop() external returns (uint256 requestId) {
    requestId = IDemoRandomnessProvider(provider).requestRandomness();
    if (requestId == 0) revert InvalidRequestId();
    if (drops[requestId].status != Status.None) revert DuplicateRequestId();
    drops[requestId] = Drop(msg.sender, 0, Status.Pending);
    emit DropRequested(requestId, msg.sender);
}
```
- **What got in the way:** The QVRF page lists no function names, contract address or package [[C-TRL-47](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here), [C-TRL-49](https://registry.npmjs.org/-/v1/search?text=qvrf)], although a QVRF consumer and its dispenser are live on Ethereum mainnet [[C-R6-02](https://developers.quip.network/docs/compute/qvrf#:~:text=The%20request%20interface%20is%20not%20yet%20final%2C%20so%20no%20function%20names%20or%20parameters%20appear%20here)]. No coordinator address is published for any chain [[C-TRL-50](https://developers.quip.network/docs/compute/qvrf#:~:text=QVRF%20coordinator)], and quip.network/qvrf leads with "Request Access" [[C-TRL-48](https://quip.network/qvrf/#:~:text=You%20can%20check%20it%20without%20trusting%20us)]. The nav "Docs" link opens a new tab with no signal [[C-R5-26](https://quip.network/)].
