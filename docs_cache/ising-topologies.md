# Ising Topologies

Every compute job on Quip Network is solved on real hardware, and real hardware is not fully connected. A quantum annealer has a fixed pattern of qubits and of couplers between them: some pairs of qubits can influence each other, and most pairs cannot. An Ising topology is that pattern, published on the chain as a graph, so that everyone works from the same picture of the machine: you when you post a problem, the miners when they solve it, and the chain when it checks the answers.

This page explains what a topology is, what the network does and does not do with it, and what both of those mean for a job you post. For the mechanics of posting one, see [Submit Your First Compute Job](/docs/compute/submit-a-job).

## A topology is a machine's connectivity graph

A registered topology is a list of nodes and a list of edges between them. The nodes stand for the machine's qubits and the edges for the couplers that connect them. The registration also records which coefficient values that machine's mining puzzles are drawn from, which matters for block production and not for your job; see below.

A topology is a snapshot of a machine, not a data sheet for a product. Annealers go through recalibration, and each one can take a qubit or a coupler out of service, so what gets published is the working graph as measured at that calibration rather than the idealized lattice in the vendor's specification. A recalibration that changes the working graph produces a fresh registration.

Registrations are permanent. A topology cannot be edited or withdrawn once it is on the chain, so superseding one means registering a new topology and pointing the network at it. The old entry stays where it is.

A topology is identified by a hash that covers the graph and the value sets together, not by a name or a hardware model number. Two networks running the same model of machine will not share an identifier, because each publishes its own calibration snapshot and its own value sets. Resolve the topology you want from the chain you are talking to rather than hard-coding an identifier you saw somewhere else.

## Your problem is placed onto a topology as a subgraph

When you post a job, the tools map your model's variables onto a topology's nodes, one variable to one node, so that every coupling in your model lands on an edge the hardware actually has. That is subgraph placement, and it is the reason your problem's shape matters: your graph has to fit inside the machine's graph as it is.

There is no minor embedding. The tools will not spread one of your variables across several hardware nodes to synthesize a connection the machine does not have. If your graph does not fit, or the search for a placement gives up before finding one, placement fails with a clear error before anything is submitted, so you spend nothing on a shape that cannot work. Native mode skips placement and submits your model over its own graph instead; see [Submit Your First Compute Job](/docs/compute/submit-a-job#placed-or-native).

Placement is deterministic. The same model against the same topology places the same way every time, which is what lets the tools read an answer back later without having stored the mapping.

## Node identifiers are hardware labels, not positions

A job carries the hardware's own labels for the nodes it uses, exactly as the topology publishes them. They are not renumbered into a tidy sequence starting at zero. A two-variable model that lands on hardware nodes 0 and 12 travels as the node list `[0, 12]`, never `[0, 1]`. Node sets are routinely sparse and non-contiguous, because a registered working graph has a gap wherever a qubit is offline, and that is valid rather than a defect to be normalized away.

Positions are a separate thing, and a job uses both. The graph uses labels; the coefficients and the answers use positions into the lists that graph is made of.

| Part of a job | Indexed by |
| --- | --- |
| the node list | hardware labels; their order defines the positions everything else uses |
| the edge list | pairs of hardware labels, each of which appears in the node list |
| the bias values | position in the node list |
| the coupling values | position in the edge list |
| a returned answer | position in the node list |

If you post jobs through the tools, this is handled for you. If you write software that reads jobs off the network, take the distinction seriously, because confusing the two fails quietly rather than loudly. Reading a label where a position is expected raises no error; it reads the wrong element, or runs off the end of the list when the labels happen to be larger than the graph. The symptom is a fleet that never answers rather than a fleet that reports a problem. If you need positions, derive them from the job's own node list.

## Registered, default, and mineable

Three ideas travel under the word "topology" on this network, and keeping them apart explains most of what follows.

* **Registered means published.** A registered topology is one anyone can read off the chain, and registering it states that the machine exists and this is its shape. It obligates nobody. No miner is required to support a registered topology, and the network does not promise that a job built against one will be answered. Registered means proposed, not supported.
* **Default is the one the tools reach for.** When you do not name a topology yourself, your job goes to whichever registered topology is currently marked the default.
* **Mineable belongs to block production, not to your compute job.** Producing blocks on Quip Network means solving a puzzle built from a topology, and only a topology in the mineable set can supply that puzzle. The set is deliberately tiny: the default is always in it, at most one other topology can join it at a time, and in steady state it holds the default alone. That is a design constraint, not a temporary configuration, because the difficulty mechanism that keeps block times stable has one global anchor and a second concurrently mined topology would corrupt it.

There is a fourth idea that deliberately does not exist: there is no set of topologies a miner is required to be able to solve, and no rule that admits or rejects your job based on which topology you built it against.

Registering a topology is a privileged operation today. There is no open path for anyone to publish one, which is a separate question from the policy stance below and is not a step toward it.

## The chain does not police topology, on purpose

A job carries its own graph inline, its nodes and edges and coefficients, and carries no topology identifier at all. So a registered but non-mineable topology is not something the network declines to work with. It is something the job market cannot perceive: nothing in a job says which topology it was built against, and everything needed to check an answer is rebuilt from the job itself.

The consequences follow directly. A job built against a registered but non-mineable topology is accepted and answered like any other. Being mineable is a property of the block-production puzzle, so it cannot affect whether your job is admitted or solved, and the Quip solver backend does not check it before submitting your job.

This is a design position rather than an unfinished feature. Topology policy as a class, meaning a list of topologies miners must solve, a list they must refuse, or a check at the door when you post a job, is out of scope on principle. Deciding which jobs to take is each miner's own policy, made in that miner's own software, and it stays there. Miner software cannot act on that policy today either, because a job carries no topology identifier to filter on.

> **Note**
> The network publishes a single default topology today. Choosing among several registered topologies for a given job, and ranking them by how often they return good answers, waits on a second one existing.

## Allowed values are advisory for your job

A registration also records which values that machine's mining puzzles draw from: which biases, which couplings, and which values a spin in an answer may take.

Those sets bind the mining puzzle. They do not bind your compute job. Your coefficients are submitted as you gave them and are not rejected for falling outside the published sets, for three reasons. The chain does not check them on the compute path. Nothing routes or filters on them, so an out-of-spec value changes nothing about who can pick your job up. And real annealing hardware rescales coefficients onto its own analog range in a way that preserves which answer is best, so a model outside the sets is still solved correctly. The tools warn you once and carry on.

One limit is not advisory. Coefficients travel as whole numbers carrying thousandths, in a 32-bit signed field, so a coefficient above 2,147,483 at natural scale does not fit and is rejected outright. Scale your model down if you reach it: multiplying every coefficient by the same positive number leaves the best answer unchanged.

## Size limits

| Limit | Value |
| --- | --- |
| Maximum nodes | 5,000 |
| Maximum edges | 50,000 |
| Minimum nodes | 16 |

For scale, a full working graph from a D-Wave Advantage2 system runs to roughly 4,800 nodes.
