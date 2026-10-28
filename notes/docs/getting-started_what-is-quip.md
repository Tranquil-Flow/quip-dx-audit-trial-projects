# What is Quip Network?

Quip is **not** a single blockchain or a single quantum computer. Think of it as two orthogonal layers that can be adopted together or separately:

1. **Compute-Consensus Layer (Quip Network)** – a new Nakamoto-style chain whose proof-of-work _is a useful optimization job_. This turns spare classical/quantum hardware into block-production while producing answers clients are willing to pay for.
2. **Asset Layer (QUIP Account & Interlock)** – a post-quantum wrapper you deploy _on any existing chain_ to lock, move, or atomically swap value without bridges or oracles. It upgrades security today without requiring any hardware or protocol changes.

These layers share the **same token ($QUIP)** and the same validator/miner economy, but either layer can function on its own:

* **Only need useful-work mining?** Point your QPU/GPU/CPU farm at the Quip Network; earn $QUIP even if you never lock assets.
* **Only need PQ security?** Use wallets on Ethereum/Solana/Bitcoin/Substrate with no exposure to mining.

## 1. Mission & Scope

Quip delivers **two coupled services**:

1. **Decentralized compute marketplace** – miners solve real optimization jobs instead of wasteful hashes, proving quantum advantage under a single token economy.
2. **Post-quantum asset security** – hash-based vaults wrap ECC keys with quantum-resistant WOTS+ keys, offering drop-in protection on any chain.

This secures existing value, monetizes idle quantum-classical hardware, and funds open-source quantum research.

For why the network is built this way, see [Motivation](/docs/basics/motivation); for the constraints the design has to satisfy, see [Key Properties](/docs/basics/key-properties). [How Quip Network Fits Together](/docs/quip-interlock-protocol/how-quip-fits-together) puts both layers in a single diagram.

## 2. Core Components

### 2.1. QUIP Account

* Deposit on any chain → vault ID & first WOTS+ public key.
* Each action signed with next WOTS+ key → immutable hash-chain of ownership.
* Safe through host-chain reorgs; can always withdraw back to native chain.

### 2.2. Interlock

* Two parties can perform atomic swaps across chains by cryptographically exchanging quantum-resistant private keys
* With their single use keys, each party encrypts a new quip wallet holding the assets they want to trade with a commitment to the details of the receiver and transferred tokens, and this begins a timer
* If one executes their half of the trade, they reveal the information necessary for the other to execute the other half of the trade. If neither party acts, the expired timers allow refunds
* No bridges or oracles required.

### 2.3. Consensus – Quantum PoW (QPoW)

* **Canonical chain:** Random Ising models are generated using a block header `prevHash‖Merkle‖height‖addr‖keys` with difficulty determined by chain clock speed
* **Side-chains/uncles:** Jobs submitted by consumers can be included as an uncle block in any chain: different processors can mine same job class, and publish alternate solutions to validate quality
* Miner must output **N** low-energy, pairwise-distant solutions.
* Identity = {ECDSA, rolling WOTS+}; difficulty & streak bonuses bind to key.

### 2.4 Subnet & Pipeline Marketplace

* Each arrow is pluggable; component authors earn royalties.
* First subnet = Optimization (QUBO -> Ising: knapsack, TSP, SVP, job scheduling…).
* Future subnets: Verifiable Random Functions, Search, Factoring, Circuit Mapping.

User Data → Template → Graph Reduce → Embed → Algo Select → HW Select → Compute

## 3 Actors & Incentives

| Actor                                | Role                                             | Earns                    |
| ------------------------------------ | ------------------------------------------------ | ------------------------ |
| **Miner** (CPU/GPU/ASIC/QPU)         | Solve Proofs of Useful Work, broadcast blocks    | Block reward + job fees  |
| **Validator**                        | Batch QUIP tx, finalize blocks, track reorgs     | Network fees + emissions |
| **Algorithm/Pipeline Designer**      | Publish templates, reducers, algos               | Royalty on every call    |
| **Nominator**                        | Delegate $QUIP to validators                     | Share of validator yield |

## 4 Token Economics

### 4.1 Supply (fixed commitments)

One billion QUIP will have been emitted when all pre-mine allocations finish vesting — and emissions continue at 40M/year after that, so this is not a maximum supply:

* **Subnet Emissions:** 40 %
* **Quip Foundation:** 20 %
* **Early Investors:** 15 %
* **Builders:** 15 %
* **Community Programs:** 10 %

### 4.2 Utilities

| Layer                | Action          | Payer           | $QUIP sink            |
| -------------------- | --------------- | --------------- | --------------------- |
| **Asset (Wallet)**   | Account deposit | Creator         | Flat fee (protocol fee) |
|                      | Transfer        | Sender          | Flat fee → validators |
|                      | Contract exec   | Caller          | % routed to treasury  |
|                      | Swap open       | Both parties    | Escrow (slashable)    |
|                      | Swap claim      | Claimer         | Nominal fee           |
| **Compute (Sinnet)** | Job bid         | Consumer        | Variable fee          |
|                      | Block reward    | Protocol        | Newly-minted          |
|                      | Staking bond    | Validators/Noms | Locked collateral     |
|                      | Bounty payout   | Treasury        | Stream release        |

Key points: universal denomination, predictable costs, treasury buyback into permanent liquidity (no burn), security-fee coupling.

### 4.3 Emission Outline

* **Fixed and flat:** 40 million QUIP per year, regardless of price, activity, or subnet count — no halvings.
* **Implicit decay:** each new subnet competes for a share of the same annual emission, so QUIP emitted per unit of compute falls as the network grows.
