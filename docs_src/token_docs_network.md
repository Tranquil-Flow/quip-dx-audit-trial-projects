# Token

The $QUIP token is a shared compute credit across all the operators in the decentralized compute protocol. In addition to being used to reserve spot capacity on quantum and classical hardware, it is an integral component to the functioning of the protocol.

## Token Purpose & Value Accrual

The $QUIP token serves as the incentive layer that ensures Quip Network remains secure, performant, and decentralized:

* Reward miners for proving availability on the network
* Punish bad actors for breaking shared programs
* Simplify consumer experience with a shared compute credit
* Facilitate quantum-resistant transactions across chains

## Buy & LP Mechanism

$QUIP implements a value accrual mechanism:

1. Users pay transaction and network fees in $QUIP
2. A portion of these fees buys $QUIP back off the market and pairs it into permanent 50/50 liquidity pools — nothing is ever burned
3. Smart contract deployers earn tokens of their choice for each execution
4. Node operators earn $QUIP for providing services
5. The protocol earns AMM transaction fees when consumers buy or sell $QUIP

As the network grows and demand for quantum compute increases:

* More demand requires more computation
* More computation requires more $QUIP to buy space in the next block
* All these revenues are used to buy and LP $QUIP
* Increasing demand + decreasing float + deeper liquidity = upward price pressure and lower price volatility

More quantum demand = more $QUIP buy pressure = more $QUIP liquidity

This creates a $QUIP-native economy where the protocol continuously earns a larger portion of transaction volume denominated in $QUIP. The more activity on Quip Network, the more $QUIP flows into buying and locking active trading pairs in captive liquidity pools, creating price stability and token scarcity.

## Tokenomics Overview

* Ticker: $QUIP
* Initial allocation: 1 billion QUIP will have been emitted when all pre-mine allocations finish vesting, split 40% subnet emissions / 20% Quip Foundation / 15% early investors / 15% builders / 10% community programs
* Emission: 40 million QUIP per year, fixed and flat — emissions continue at this rate after the first billion has vested, so the first billion is not a maximum supply
* Implicit decay: each new subnet competes for a share of the same 40M annual emission, so issuance per subnet falls as the network grows — no halvings, no burns
* Token Standard: PSP-3 on Substrate, ERC-20 on Ethereum, SPL on Solana

## Governance

Emissions are routed by the Quip Control Asset (QCA). In its canonical implementation, veQUIP, holders lock QUIP in an Interlock-enforced escrow to gain control weight that grows with lock duration, then vote each epoch to divide the fixed emission among subnets. The escrowed position remains liquid — it can be lent, borrowed, or posted as collateral while it votes.

The Control Asset binds to a zero-knowledge identity credential so the protocol can apply per-identity limits, such as quadratic decay in marginal control weight, that a token-only system cannot enforce against an actor splitting a balance across wallets. Subnet backers can also pay veQUIP voters through an explicit, permissionless incentive market, turning emission routing into a transparent auction that prices demand for each problem class.

For who earns and spends $QUIP, see [Participants](/docs/network/participants). To buy compute with it, see [Submit Your First Compute Job](/docs/compute/submit-a-job).
