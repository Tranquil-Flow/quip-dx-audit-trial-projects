# QUIP: The Quantum Unit Interlock Pathway

The Quantum Unit Interlock Pathway (“QUIP”) is the basic primitive building block of the Quip Network. Each QUIP is a secure lockbox or vault which protects user funds with a post-quantum signature. The algorithms generating the signature have no known vulnerabilities to quantum computing attackers. Beyond its role in safeguarding assets, the QUIP plays a crucial part in maintaining the integrity and functionality of the Quip Protocol.

QUIPs start with a user deposit on any blockchain into a QUIP-enabled smart contract. This action creates a QUIP transaction input, which can be used across the entire Quip Network. This deposit pairs the user’s classical wallet with information that can be used to uniquely generate a compatible post-quantum wallet.

In its simplest form, the user can withdraw their funds from a QUIP by signing a transaction with their post-quantum wallet and sending the post-quantum signature to a QUIP-enabled smart contract with their classical wallet. This action could be easily integrated into existing wallets using an extension, such that the post-quantum wallet is hidden within the normal operations of the user’s everyday wallet. The user can also split funds in a QUIP by sending a signed split transaction to the contract, such that some balance is sent to a receiver, and the remaining assets are then shifted to a new QUIP address owned by the sender.

QUIPs provide the ultimate protection for anyone worried about quantum computers. While funds are inside the QUIP they are safe even in the advent of a quantum zero day attack. An enterprising quantum attacker will be unable to provide the necessary post-quantum signature, which means they cannot provide a valid classical hash to the host transaction network, and thus they cannot create a valid QUIP transaction to remove the funds from the wallet. This guarantee holds true even if they can break the host transaction network’s consensus or steal funds from classical unprotected wallets.

## Properties

The QUIP is a versatile building block:

1. Every transaction enforces ACID (Atomicity, Consistency, Isolation, and Durability) principles. They either complete or they do not.
2. The protocol supports staking, swaps, flash loans, mixnets, zero-knowledge proofs, dark pools, voting, delegation, and any other process dreamable with boolean logic.
3. Each deposit requires no custody or lockup on any one transaction network.
4. Transaction resolution is independent and secure without need for any additional consensus mechanism or validator set.
5. Exchange of funds requires no oracles or cross-chain messaging.
6. Post-quantum guarantees are agnostic to the network consensus model and cryptographic architecture.
7. Clients need only rely on the chains to validate transactions: no state comparisons, intermediate networks, or zero knowledge proofs are necessary to perform the needed validations, beyond those required by the host network consensus model.

The states a QUIP moves through are described in [QUIP Lifecycle](/docs/quip-interlock-protocol/quip-lifecycle), and the contract that holds the funds is described in [Quip Accounts](/docs/quip-interlock-protocol/quip-accounts).
