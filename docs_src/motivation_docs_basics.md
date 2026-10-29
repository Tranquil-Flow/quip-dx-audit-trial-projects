# Motivation

## The Worldwide Quantum Computer

There will come a day not long from now, when quantum communication is so good that it is easier to scale your quantum computer horizontally than it is to build a more densely packed quantum processor, when we can entangle millions of processors around the world in a quantum internet all bending their capacities toward the same problem.

When this day comes, if we want to solve problems addressable only by such massively concurrent quantum computation, we will have to split jobs across heterogeneous processors owned by potentially untrustworthy operators. These operators may have incentives to lie or cheat on their work, to sabotage other computers in the network, or to snoop on the data submitted to their machines. We will have to have solutions to complex coordination problems.

But this tradeoff will be worth it. It is only with such a large network that we can answer questions unknowable by any other means, and discover hidden patterns in diverse industries such as materials design, commerce, logistics, artificial intelligence, and more.

Once robots are mining, manufacturing, distributing, and delivering end-to-end every single creature comfort, from raw material to finished product at your doorstep, it is only such a computer that can facilitate economical coordination of the swarm. When corporations are consuming more energy than a billion homes to train their new frontier models, it is only such a computer that will be able to fit the model and bring down the energy cost by orders of magnitude. When the AI models wish to simulate the world instead of building a new laboratory experiment, it is only such a computer that will report a faithful result.

The purpose of the Quip Network is to facilitate this shared computation worldwide, to ensure that programs execute on the network privately, securely, verifiably. To enforce payments and dispute resolution, auctions for quantum storage space and compute capacity, evictions for squatting data tenants denying other participants from running urgent jobs. It is not enough to share the computation, but we must also create a trustworthy protocol, socialize its design, and enforce its rules.

Quip Network is this protocol. It forms the foundation of the world's shared quantum computer, and it will do the jobs which quite literally no other platform on Earth can do.

## Starting Where We Are

The time for this level of fidelity in quantum communication has not yet arrived, but we can begin to build the foundations for it today. Quantum advantage is here, for both adiabatic and logic-based platforms as demonstrated by [D-Wave](https://www.science.org/doi/10.1126/science.ado6285) and [Google](https://www.nature.com/articles/s41586-025-09526-6) in their respective experiments racing against the Frontier supercomputer at Oak Ridge National Labs.

### The Core Challenges

Nonetheless, people do not believe that quantum advantage has arrived, and they are unclear on how these research examples translate into real-world value. Skeptics point out that these types of quantum advantage stunts are contrived, or that they elide pre-processing and post-processing steps required as parcel to the computation, which negatively impact the advantage that industrial applications can realistically expect to achieve with a quantum processor.

Furthermore, the truly advantageous application of a quantum computer is the fruit of close attention and rigorous optimization. The most likely purchasers of a $20 million machine have likely already spent hundreds of millions on optimizing solutions using existing hardware, so the quantum computing manufacturers are not entering a vacuum. They must insert themselves into a highly optimized pipeline, where the latency of communicating with a manufacturer's cloud over a thousand miles away could easily swamp the advantage achieved by using the quantum processor. This latency wouldn't exist if the client purchased a computer and colocated it with their high-performance infrastructure, but they will want to see a proof of outperformance before making the purchase.

For this reason, most manufacturers are their own cloud providers, and the current status quo is to contact each manufacturer directly and ask if you can use their platform. If you seem like a likely prospect to purchase a $70,000 recurring license to the cloud or to purchase a computer, they will help you enter a three to six month consulting process to arrive at your highly optimized solution and demonstrate the value of their processors for your business use case. This is a very costly onboarding pipeline for both parties, and it filters out a large segment of the population of potential users who both desire and can afford the product.

As a result, the computers often sit around under-utilized, and as super-cooled machines they cannot be turned off without a lengthy and expensive recalibration process. These are fixed costs that only compound as you scale up computers and demand whipsaws with market interest and energy prices. Even if you wanted to open up the excess capacity on these machines to an anonymized network of quantum computers, there are so few machines in distribution it would be relatively easy to tell who was serving your job, and there would be no way to verify the output for certain classes of problems.

Finally, the industrial applications for these computers are limited by the talent pool that can explore them. There are maybe 4,000 quantum programmers and algorithm designers in the world, if we are generous. These highly educated experts tend to work either for a government, in which case their work is top secret; a quantum manufacturer, in which case their work is proprietary; or for a university, in which case they are not getting paid commensurately for their contributions. This has a chilling effect on the production and dissemination of meaningful applications, and demands a new market incentive to socialize new algorithms and monetize their usage.

### An Immediate Solution

The Quip Network aims to solve all of these incentive problems and inadequate equilibria with its first Proof of Useful Work network, which requires miners of any kind to solve optimization problems in the form of Ising models.

There are over 100 known industrial applications for the Ising model, from traveling salesman problems, to knapsack problems, to job scheduling problems, and beyond. More importantly, it's a proof of work that can be solved by any known computation platform, from central processing units, to graphical processing units, to application-specific integrated chips, and even both adiabatic and circuit-based quantum processing units. These comparative proofs of work can be used to judge the quality, time-to-solution, and cost from each platform and validate that quantum computers are really offering advantage.

By getting these platforms to compete against each other in a gradually escalating proof of work, specifically larger and larger Ising models with higher and higher connectivity, it is possible to create an immutable record of the performance of each platform on this industrially relevant benchmark. If your platform cannot economically compete to mine blocks, then the miners will stop mining, and it would become very expensive to fake competitive performance in the network. The skeptics can rest easy knowing that miners have to put up, or shut up.

Once we have deployed the proof of work, then we can open up a smart contract layer that supports highly optimized submissions from algorithm designers which provide the necessary pre-processing and post-processing steps to convert business data into the Ising model, and reconvert the answer back into the relevant subject domain. This cryptographically anonymized smart contract layer unlocks talent from the top firms and provides meaningful paths to revenue for researchers working at passion projects with little upside.

A potential consumer of these jobs can submit their data to a job queue with a bid of protocol tokens, and a miner can choose whether or not to fulfill this job for the proposed bid. After the job has run, the protocol, the algorithm designer, and the miner all split the proceeds from the consumer's bid, and the consumer walks away with an efficient, highly optimized answer to their question which they can compare to their existing infrastructural solutions. No more six month consulting process to get your high quality answer.

This is also a boon for the quantum computer operator, as now they can earn token rewards with their unused compute, defraying the cost of keeping their computer online and providing a default amortization schedule for any loans used to purchase the machine. Operating in a cryptographically encrypted network with heterogeneous platforms allows the operator to maintain optionality in revealing their identity to the network as a whole, and gives consumers confidence that they're really receiving the highest quality and fastest possible answers that any machine can provide.

This initial Proof of Useful Work network solving Ising models is the first of many like it, but it is the most important for understanding the capabilities and limitations of the verification model today. It is only the beginning, and the prelude to a much more ambitious network.

## Expanding the Solution Space

Once we have vetted and proven the first proof of work, we will introduce additional proofs of work to expand the industrial applications and consumer footprint of the Quip Network. Candidate applications for the first networks include quantum random number generation, quantum variational autoencoders, Shor's algorithm for factoring, Grover's algorithm for search, or even quantum memory and storage. The number of subnets will be limited only by our community's imagination, and they are bound to surprise the world with the applications that they make possible.

### Mapping Capabilities

The same platforms that win the most blocks on the primary subnet may not be the ones that excel elsewhere. Part of the benefit of this model is that we can map the performance space of many applications of quantum computers, and it may turn out that cold atom processors have unique qualities that allow them to outperform superconducting processors on specific proofs of work.

Building this diverse network of processors, sensors, storage media, and communications equipment is a necessary prerequisite to the worldwide quantum computer. Mapping the capabilities of these machines is a dependency to efficiently allocating available resources in the network and the result of this eternal competition will form a public dataset that can inform the development of the first nodes on the quantum internet.

Indeed, some manufacturers may wish to use the public dataset and the proposed subnets to inform the development of future capabilities and technology. We anticipate providing some incentive mechanism design that supports consumers in requesting this kind of development through bounties for deploying novel and useful subnets, as well as programmatic rewards for demonstrating new performance profiles within each subnet.

### Breaking Ground

Once we have established this leadership, we will actually develop the first quantum interconnects and invest in physical infrastructure which operates on the network. We are already working with community colleges, universities, NGOs, and government labs to facilitate training programs and research collaborations to this end.

The ultimate goal is that we are publishing novel research in distributed quantum computation, breaking records, and establishing precedent that the worldwide quantum computer is not just possible, but inevitable. Through these research partnerships we intend to resolve questions of quantum multi-party computation, zero-knowledge quantum programs, verifiable quantum workloads, and beyond.

It is an enormous volume of research that will be required, but the rewards that lie at the end of the journey are sure to justify much greater expenditures in the pursuit thereof. If all goes well, we will have created the new http for quantum information and established the standards that generations of quantum programmers and experimentalists will use for decades to come.

## Conclusion

It took over seventy years from the first 10Kb computer to the first large language models that define today's current hopes for the future of artificial intelligence and clearly outperform the median human on a huge variety of tasks. It will be another seventy years before we begin to see the fruits made possible by the advent of the worldwide quantum computer, but it is imperative that we begin planting those seeds today.

Quantum computing threat vectors are imminent. Over the past few years, there has been a steady stream of results published by quantum computing researchers demonstrating significant increases in physical qubit counts, tremendous reductions in error rates, and other substantial improvements to practical computing factors relevant to real-world deployments. These improvements taken as a whole paint a compelling picture that the first quantum computers capable of compromising widely used cryptographic algorithms, like ECC256 or RSA2048, will arrive before the end of the decade.

## Coda: Post-quantum Cryptography

The coherence values of superconducting qubit architectures like Google’s Willow chip and the low error rates of Riken’s fusion-based photonics platform represent significant leaps forward in the capabilities of contemporary quantum processing units. We are rapidly approaching a cost of attack of less than 4% of the value held in the largest Bitcoin wallets. Indeed, the marginal cost of an attack on RSA2048 for a well-equipped quantum computing lab is estimated to approach $20,000, and the cost of an attack on ECC256 is likely even lower.

Unfortunately, broad adoption of post-quantum cryptography has lagged behind the accelerating scale of the threat, and few agents in the world are prepared for quantum attackers. While Bitcoin’s pay-to-quantum-resistant-hash proposal has been reviewed by at least one commenter, the specification remains undecided and largely undiscussed. Similarly, the Ethereum improvement proposal offering solutions for EVM networks is likewise lacking in detail and serious discussion, with no further development on any of the EVM L2s or appchains. These approaches remain reactive rather than proactive, leaving room for grievous harm to users who might be caught unaware and unprepared.

Many skeptics point out that P2PKH transactions on Bitcoin remain secure as long as the new public key is not disclosed with a payment transaction, however these users are not protected against block reorganization attacks made possible by quantum computers, and few users maintain sufficient operational discipline to maintain the integrity of their undisclosed public key.

Advocates for delaying adoption of post-quantum commitments claim that other targets are more likely to take priority over cryptocurrency addresses, and such advocates will often proclaim that a swift upgrade will deploy upon discovery of a viable quantum attack. However, we find this argument unconvincing, as many such large targets have immense incentives to keep any compromise a secret, and the deployment of a chain upgrade closes its eyes to the possibility of a rewind attack through a chainwide block reorganization which impacts significantly more wallets than a single private key.

Exacerbating matters, traditional financial firms and certificate authorities show similar vulnerabilities to cryptocurrency networks, relying on insecure algorithms that provide guarantees sufficient only for classical computing. The Hudson Institute estimates that over $3.3 trillion in value hangs in the balance as financial contagion threatens to expand damages from the first quantum victim to the rest of the free market.

## Challenges & Opportunities in Post-quantum Readiness

Any serious attempt to rectify the lackluster adoption of these necessary upgrades must grapple with the challenges that have hindered uptake in previous post-quantum protocols:\\

| Key Considerations                                                                                                                                                          | The Solution Must…                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Initial costs of a quantum computing attack filter viable targets down to very large wallets, and larger post-quantum signatures create significant negative externalities. | be adoptable in part or in whole by individuals without any requirements for change to the underlying protocols.                    |
| Clients do not wish to give up any capabilities of their assets for post-quantum security or otherwise split liquidity.                                                     | use native primitives on each network and maintain external interfaces of standard user accounts while staying post-quantum secure. |
| There is a huge risk associated with moving locked funds onto a less secure ledger.                                                                                         | provide the same security guarantees wherever the client chooses to transact.                                                       |

The four properties any solution to these problems has to exhibit are set out in [Key Properties](/docs/basics/key-properties).
