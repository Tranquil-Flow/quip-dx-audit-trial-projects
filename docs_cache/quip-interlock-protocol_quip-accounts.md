# Quip Accounts

A Quip Account is where your assets live under post-quantum protection. This page explains what the account is, how you reach it, how its signatures work, and the one signature behavior every integrator needs to understand before relying on it.

## A lockbox on the chain you already use

A Quip Account is a smart contract deployed on the blockchain you already use. It works like a lockbox: your assets sit inside the contract, and the contract releases them only when it is shown a valid signature from a quantum-resistant key. The signature scheme is hash-based, which means its security rests on the strength of a hash function rather than on the mathematical problems that a quantum computer could one day solve.

Nothing about your assets moves to a new network. You keep using the chain, the tokens, and the tooling you already have. Your existing wallet still has a job: it submits transactions to the network and pays the fees. The quantum-resistant signature is what authorizes the movement of assets.

A factory contract creates each account, and the account's address is derived deterministically from its creation inputs rather than assigned at random.

## One account, two doors

Quip Network provides two clients for the same account: a browser extension and the web application at [account.quip.network](https://account.quip.network/). They are two doors into one account, not two wallets. The account itself is the contract on chain. Both clients read the same balances and history and produce signatures for the same account, so nothing you create through one client is trapped in the other.

If your application points users at Quip, route Chrome users to the extension and everyone else to the web app. The web app requires no installation and runs in any modern browser. The extension wraps the same account surface and adds the click-the-icon flow and the decentralised application (dApp) connection surface that Chrome users expect from a wallet.

## How signing works

Quip Accounts sign with hash-based one-time signatures, packaged in a construction called SHRINCS. A hash-based one-time key can safely sign exactly one message, so SHRINCS commits to a large collection of one-time keys under a single compact public commitment and gives the account two ways to use them:

* **The everyday path.** Cheap to verify and used for normal operations. Each signature consumes one slot from a fixed budget that is set when the key bundle is created. Once a slot has been used, it is gone: signing again requires the next unused slot.
* **The break-glass path.** A more expensive signature reserved for recovery and for rotating to a fresh key bundle. It does not depend on any record of which slots have been used, which is exactly what you want when that record has been lost.

```mermaid
graph TD
    C["One public key commitment<br/>(the account's quantum-resistant identity)"]
    C --> A["Everyday path<br/>cheap signatures,<br/>one slot consumed per signature"]
    C --> B["Break-glass path<br/>expensive recovery signatures,<br/>no slot records needed"]
    A --> V["Account verifies the signature<br/>and executes the operation"]
    B --> V
```

The chain verifies signatures; it does not manage your signing state. Which slots have been consumed is state that belongs to the signer, and the Quip clients track it for you.

## If you build your own signer, track your slots

This is the one discipline that makes Quip Accounts different from a classical wallet integration. A classical key can sign any number of times. A slot in a Quip Account key bundle must sign at most once.

If you integrate at the level of the signing libraries rather than through the Quip clients, you own that state:

* Record which slots have been consumed, and update the record before you broadcast, not after.
* Never sign two different messages with the same slot. Reusing a slot weakens the one-time scheme it belongs to.
* Treat the slot budget as a finite resource and plan for rotation to a fresh key bundle well before the budget runs out.

The specific size of the slot budget is an implementation parameter and is not documented here. Design your integration to read the budget from the account rather than assume it.

## Signature checks by other contracts are not one-time

Third-party contracts, such as exchanges with off-chain order books or permit-style token approvals, can ask a Quip Account whether it authorized a message through the standard contract-signature interface, ERC-1271 (Ethereum Request for Comments 1271).

> **Warning**
> **ERC-1271 checks are view-only and do not consume a slot.** A signature verified through `isValidSignature` remains valid for as long as the key it was made with stays installed on the account. The one-time-use guarantee that applies to every other signature path does **not** apply here. This is a deliberate design choice, not an oversight.

The consequence for integrators: if your protocol assumes a signature can only be used once, you must enforce that yourself. Common approaches are tracking nonces in your own contract, binding signatures to an expiry, or treating the account's verification key as something to be replaced once its signature has served its purpose. Do not assume replay protection on the ERC-1271 surface, because the account does not provide it there.

## Upgrades are yours to accept

Account logic will improve over time, and the upgrade model is designed around user consent:

* **Opt-in only.** You are prompted when a new account version is available, and nothing changes until you explicitly approve the upgrade. Quip never upgrades your account for you.
* **Your address is preserved.** An upgrade replaces the account's executable logic while the address, balance, and state stay where they are. Funds do not move, and integrations that reference your address keep working.

## Standards lineage

Quip Accounts are built on public, citable standards rather than proprietary cryptography.

| Standard | What it is | Role in Quip Accounts |
| --- | --- | --- |
| [RFC 8391](https://datatracker.ietf.org/doc/html/rfc8391) | XMSS: eXtended Merkle Signature Scheme (RFC is Request for Comments) | Baseline for the stateful Merkle-tree component behind the everyday signing path |
| [FIPS 202](https://csrc.nist.gov/pubs/fips/202/final) | SHA-3 Standard (FIPS is Federal Information Processing Standards) | Defines the Keccak hash family used throughout the signature scheme |
| [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) | Stateless Hash-Based Digital Signature Standard | Conventions and cross-checks for the break-glass recovery path |
| [ERC-1271](https://eips.ethereum.org/EIPS/eip-1271) | Standard Signature Validation Method for Contracts | The contract-signature interface described in the warning above |
| [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) | Account Abstraction Using Alt Mempool | The smart-account execution model the account contracts follow |
| [ERC-7913](https://eips.ethereum.org/EIPS/eip-7913) | Signature Verifiers | The interface exposed by the on-chain signature verifier contracts |

A Quip Account is one of four pieces that make up the network. [How Quip Network Fits Together](/docs/quip-interlock-protocol/how-quip-fits-together) shows how it connects to [QuipSwap](/docs/quip-interlock-protocol/quipswap) and the compute network.
