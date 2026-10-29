# QUIP Lifecycle

A user creates a QUIP when they deposit funds to a QUIP-enabled smart contract or QUIP-enabled wallet. At any time, the user can transfer the QUIP to another owner using a regular cryptocurrency transaction. The QUIP also has three additional states that enable programmability:

<figure><img src="/docs/assets/quip_lifecycle.svg" alt="State diagram titled A Quip's Journey: a new QUIP moves to Proposed, then Approved, then Claimable, while a proposal timeout diverts it to Cancellable and an approval timeout to Slashable, all enclosed by a post-quantum signature wall separating the coins from attacking qubits" width="2685" height="1619" decoding="async"><figcaption><p>The QUIP Lifecycle</p></figcaption></figure>

1. _Propose_: A proposed QUIP signals that a user is ready to conduct a transaction
2. _Approve_: An approval accepts the proposal and enables changes to the network state
3. _Claim_: A claim executes the approved changes to the network state

When multiple parties exchange QUIPs, there are also two timeout cases:

1. _Cancellable proposal timeout_: A user can cancel a proposed QUIP once an initial timer expires with no counterparty matching the proposal. This resets the QUIP state.
2. _Slashable approval timeout_: If a user has approved a matching proposal and a second timer expires without all parties’ approval, any approver can slash QUIPs belonging to the delinquent parties.

These states are what a cross-chain trade moves through in practice; see [QuipSwap](/docs/quip-interlock-protocol/quipswap) for how two parties use them to settle without a bridge or a custodian.
