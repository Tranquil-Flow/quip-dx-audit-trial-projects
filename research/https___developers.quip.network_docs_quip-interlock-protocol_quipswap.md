# QuipSwap

QuipSwap is Quip Network's protocol for trading assets directly with another party. You agree on the terms of a trade, then each of you locks the assets you are giving up in a shared settlement contract on your own chain. A single secret connects the two locks. When one side reveals the secret to claim their new assets, that same reveal lets the other side claim theirs. If the trade stalls, each side takes back what they locked once a deadline passes. The trade can run across two chains or entirely on one chain, and at no point does a bridge, an exchange, or any other custodian hold your money.

## Quantum protection comes first

QuipSwap's design leads with what protects the assets. The bridgeless design is a benefit, but a secondary one.

The assets in a swap are held and moved by Quip accounts, the quantum-resistant wallet layer described in [Quip Accounts](/docs/quip-interlock-protocol/quip-accounts). Every authorization above the settlement layer is protected there by post-quantum signatures. The settlement contract itself deliberately uses a simpler tool: a hash lock, a lock that opens only for whoever knows a chosen secret. Hash locks rest on hash functions, and hash functions are not weakened by the known quantum attacks that break ordinary wallet keys. The result is a trade in which no step depends on the kind of mathematics a quantum computer can break: quantum-resistant authentication in the wallet layer above, hash-based locks in the contract below.

The contract accepts the asset kinds you would expect on a smart contract chain: the chain's native coin, fungible tokens, and non-fungible tokens (NFTs), in any combination on either side of the trade.

## The swap lifecycle: commit, execute, reclaim

A swap moves through three actions.

**Commit.** Each party locks the assets they are offering into the settlement contract on their own chain. The contract records the agreed terms of the trade and the hash of the shared secret, and holds the assets in escrow. Both parties can independently check that the two commitments describe the same trade.

**Execute.** One party reveals the secret to claim the assets committed to them. Revealing the secret is what unblocks the other side: the secret becomes publicly visible on that chain, so the counterparty can read it and use it to execute on their own chain.

**Reclaim.** If the deadline on a commitment passes without execution, the party who committed takes their own assets back.

Every committed side of a swap ends in exactly one of two terminal states: it is executed before its deadline, or it is reclaimed after. There is no outcome in which the contract keeps your assets. Taken together, the two sides give the trade its central guarantee: either both legs complete and each party receives the other's assets, or neither completes and each party recovers their own. There is no state in which one side has claimed and the other has permanently lost funds.

## Timeout windows protect each side

The two commitments do not share one deadline. The initiator, the party who will reveal the secret first, takes the longer window. The counterparty takes the shorter one. The gap is what keeps the trade fair: if the initiator reveals late, the counterparty still has time to read the secret and claim before their own window closes.

The initiator's window must exceed the counterparty's by a safety margin that covers cross-chain observation delays, block confirmation times, and transaction inclusion delays. If the margin is too small, a race can open in which one party reclaims while the other has already revealed the secret.

> **Note**
> The contract enforces each deadline individually, but it cannot see the other chain, so it cannot check the gap between the two windows. If you integrate QuipSwap, that margin is a safety parameter you own. Choose it deliberately for the pair of chains you are trading across, and reject schedules that are formally valid but operationally unsafe.

## Finding a counterparty: makers and takers

The settlement protocol assumes you and your counterparty have already found each other and agreed on terms. The marketplace layer on top of it is how that happens when you do not have a counterparty in mind.

A **maker** posts an order: a statement of intent to swap that says what they are offering and what they want in return. A **taker** browses the open orders and takes one. Both parties then commit on-chain, and settlement proceeds through the same commit, execute, and reclaim flow described above. The order book is a convenience layer that runs off-chain; it helps people find each other, and the protocol does not care how the negotiation happened as long as both parties agree on the terms.

A maker order works like a request for quote (RFQ) run in reverse: instead of asking counterparties to quote a price, the maker publishes the full terms and waits for someone to accept them. If the maker leaves the amount of the counter asset open, the order becomes a classic request for quote, and takers respond with the price they are willing to give.

## Who can start a swap today

The settlement contract is gated: only Quip wallet contracts can initiate a swap. You cannot drive a swap from an ordinary account or from your own contract today.

The gate is deliberate. The guided wallet flow is part of the protocol's safety boundary, not a convenience: the wallet can observe both chains, bind you to the intended swap instance, and reject unsafe timing that the contract alone cannot check. Opening the contract to arbitrary callers would expose users to workflow-bypass, phishing, and timing-misuse risks that the wallet flow exists to reduce, so the team treats removing the gate as a future protocol-hardening decision, not a configuration switch.

## What QuipSwap does not do

QuipSwap is a settlement primitive, and it keeps its scope narrow on purpose.

* **No trade discovery, matching, or broadcast in the protocol.** The contract does not find counterparties, match orders, or announce open trades. Those jobs belong to layers built on top, such as the marketplace described above, or to whatever channel you and your counterparty prefer.
* **No slashing.** The protocol does not penalize a party who commits and then walks away. The honest party waits out the deadline and reclaims, losing time but not assets. Penalizing bad behavior requires a non-spoofable proof of commitment, which is an open problem, so any deterrence beyond reclaim is left to integrators.

## Why QuipSwap exists

Quip's network sells quantum computing work. QuipSwap is the payment rail that makes that work purchasable: it lets you exchange value from the chain you are already on, without migrating your assets to a new chain first. A swap is how assets on any supported chain become buying power on the Quip network, which is why Quip built the swap protocol rather than wait for a third party to provide one.

The propose, approve, and claim state machine underneath these steps is set out in [QUIP Lifecycle](/docs/quip-interlock-protocol/quip-lifecycle).
