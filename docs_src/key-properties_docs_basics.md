# Key Properties

## Distributed Compute Protocol

In order to ensure the successful adoption of the distributed compute standard, the Quip Network must exhibit four properties: hardware and implementation agnosticism, layered abstraction for specialists, computational tractability, and consumer legibility.

1. **Hardware and Implementation Agnosticism**

The esoteric nature of quantum computing and the broadly divergent specifications for all the different architectures represent a challenge for the prospective consumer of quantum solvers. It is a full-time job to understand one quantum processor, much less the broad array of available designs from various manufacturers.

For this reason, the design of the network must be hardware and implementation agnostic. The network should only specify an input, an output, and a validation function to reject improper combinations of these data.

2. **Layered Abstraction for Specialists**

In general, industrial consumers of computation are not specialists in quantum physics or computing, and the service providers who consult with these consumers are unlikely to have any additional skill in the subject. There is an enormous developer community around the world for traditional computation, but quantum developers are still few and far between.

The system must divide out the layers of abstraction so specialists can easily interface with subject matter experts outside their domain of focus. We choose to make these layers of abstraction explicit in the network design, with a) consumers specializing in their industry, b) application developers specializing in professional services for that industry, c) smart contract developers specializing in data transformation and ETL, d) algorithm and protocol designers specializing in quantum computation and computational equivalence, e) hardware operators and manufacturers who specialize in fine-tuning for compiler targets, and f) liquidity providers who are trying to efficiently discover the true price of the spot compute capacity available on the network.

<figure><picture><source type="image/webp" srcset="/docs/assets/stakeholder-categories-2.webp"><img src="/docs/assets/stakeholder-categories-2.png" alt="Five stacked participant layers, from Compute Consumers at the top through Application Developers, Algorithm Developers and Protocol Developers to Compute Providers at the bottom, with $QUIP passing down the stack and Liquidity Providers exchanging USD and $QUIP alongside it" width="3600" height="3600" loading="lazy" decoding="async"></picture><figcaption><p>The layers of the Quip Network Protocol</p></figcaption></figure>

3. **Computational tractability**

Quantum computing is still in its infancy, where most of the proposed applications of the new paradigm are prospective rather than truly advantageous to implement on current hardware. Additionally, the hardware is still in limited distribution, requiring classical hardware validators to prevent the network from amounting to a permissioned node set.

The design of the first subnets must take these factors into account and only introduce computational complexity at the level the network can support. Only once there is a significant distribution of quantum computers, can we graduate to QMA complexity class proofs of useful work. Until then, all subnets must have a validation function efficiently computable by classical platforms.

4. **Consumer legibility**

The most important element of the protocol is that the use thereof has to be understandable by non-domain experts. If a trucker can't come to an application developer's website and get a useful result out of the network we have failed.

The protocol must prioritize tools for discovery, understanding, and quick delivery of useful results.

## Interlock Protocol

In order to ensure the successful adoption of the quantum-resistant standard, the Quip Network must exhibit four pairs of properties: post-quantum and classically secure, native and portable, transparent and composable, liquid and bondable.

1. **Post-quantum and Classically Secure**

While there are many proposed post-quantum algorithms, none have been battle-tested by actual quantum attackers, and some may even remain vulnerable to attacks via classical computing methods.

For this reason, the Quip architecture should wrap a battle-tested cryptographic primitive such as ECC with a post-quantum primitive such as WOTS, so the end user can benefit from both layers of security. Where possible, the protocol should give the user choice over the post-quantum algorithm that wraps the classical primitive.

2. **Native and Portable**

Consumers do not want to move funds to yet another transaction network, as splitting the client’s liquidity across multiple networks reduces the leverage and capabilities available to that client. Additionally, a client does not want to lose post-quantum security because they migrated their funds from one transaction network to another.

Wherever possible, the Quip architecture should empower clients to remain on the protocols where they already hold funds while still receiving the benefit of post-quantum security, even when a Turing-complete smart contract language is not available. Furthermore, once the client has locked funds on one chain, they should be able to withdraw equivalent value on another chain at the minimum shared clock cycle.

3. **Transparent and Composable**

Bridging funds between chains and executing cross-chain intents is a convoluted and error-prone process. Many oracular and bridging protocols rely on decentralized validator networks to monitor the latest state on source and destination networks, where malicious nodes can be slashed for any perfidy. Such protocols are vulnerable to cartels, require significant resources to support new network deployments, and remain opaque to the end-user in the event of defection.

In contrast, the Quip architecture should prioritize transparency for the direct participants in the transaction, who may reveal all the information required to unwrap a post-quantum signature offline if they so wish. This process should be isolated, asynchronous, and concurrent, and should support the arbitrary composition of functions on dissimilar protocols, such that the outputs of a function on one network can be coerced into the inputs of arbitrary functions on the second network.

4. **Liquid and Bondable**

Splitting liquidity is an enormous problem for consumers in the cryptocurrency industry, where clients must maintain balances on multiple chains in order to transact. Building on the difficulties of cross-chain intents, there are few resources that can bond funds on one-chain to deploy equivalent capital on another in an atomic and verifiable fashion.

Ultimately, the Quip architecture should enable a process whereby any funds on any chain can be wrapped in a post-quantum signature and used as collateral or consideration for equivalent value on any other chain.

These properties follow from the problems set out in [Motivation](/docs/basics/motivation). The primitive that delivers them is described in [QUIP: The Quantum Unit Interlock Pathway](/docs/quip-interlock-protocol/quip-the-quantum-unit-interlock-pathway).
