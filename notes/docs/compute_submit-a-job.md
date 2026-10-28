# Submit your first compute job

Anyone can post an optimization problem to Quip Network with a reward attached, and miners compete to return the best answer.

This page walks you through installing the tools, describing a problem, and following your job from submission to result.

## Install the tools

Install the `xquad` package from the Python Package Index (PyPI). It requires Python 3.13 or newer and installs the compatible versions of the lower-level packages it uses.

* **`xquad`** is the umbrella package for the [XQuad toolchain](/docs/xquad-toolchain): it provides the modeling and program interface and installs compatible versions of the lower-level packages, including `xqsa`.
* **`xqsa`** contains the solver adapters. Its `quip` extra is included by the `xquad[quip]` install below. Every solver exposes the same `solve()` call, whether it runs on your own machine or on the Quip Network, so you can develop locally and switch to the network by changing one line.

```sh
pip install "xquad[quip]"
```

The base install of `xqsa` includes a local simulated annealing solver that runs on your central processing unit (CPU), so you can test a model without touching the network or spending anything. The `[quip]` extra adds the two pieces that the network backend, `SolverQuip`, needs: a chain client and a signing extension that produces the hybrid (classical plus post-quantum) signatures Quip transactions require. Every other solver in `xqsa` installs and runs without the extra.

> **Note**
> The chain interfaces behind the `[quip]` extra are pre-release. The package's own documentation notes that chain metadata and economic parameters can change between releases, so expect to update the packages as the network evolves.

## Describe your problem as an Ising model

The network's miners solve one kind of problem: an Ising model. The format is simpler than the name suggests.

An Ising model is a graph. Every node carries a variable called a spin, which takes exactly one of two values, minus one or plus one. Every node can have a bias, a number that pulls its spin toward one value or the other. Every edge has a coupling, a number that rewards the two connected spins for agreeing or for disagreeing. An answer assigns a value to every spin, and each answer has an energy:

```
energy = sum over nodes of (bias × spin) + sum over edges of (coupling × spin × spin)
```

The best answer is the one with the lowest energy. That is the entire contract: you describe what you want by choosing biases and couplings so that good outcomes have low energy, and miners search for low-energy assignments.

One convention matters for integrators: all coefficients and energies travel as whole numbers carrying thousandths (a value of 1.5 is transmitted as 1500). This fixed-point rule means every machine on the network computes the identical energy for the same answer, with no floating-point disagreement.

In code, you build a model and hand it to a solver. This example uses the local CPU solver, which needs no network connection:

```python
from xqvm_py import XQMX
from xqsa import SolverDWaveCPU

model = XQMX.binary_model(size=4)
model.set_linear(0, -1)        # bias on variable 0
model.set_quadratic(0, 1, 2)   # coupling between variables 0 and 1

result = SolverDWaveCPU().solve(model)
print(result.sample, result.energy)
```

The tools accept binary models (variables of 0 or 1) as well as spin models, and convert binary models to the spin basis for you.

To submit the same model to the network, swap in the `SolverQuip` backend. It connects to a Quip node, posts your model to the job mempool, waits for a miner to solve it, and returns the best answer, all through the same single `solve()` call:

```python
from xqsa import SolverQuip

solver = SolverQuip(
    url="<websocket address of a Quip node>",   # or set QUIP_RPC_URL
    keystore="<path to your keystore>",         # or seed=..., or set QUIP_KEYSTORE
)
result = solver.solve(model)
print(result.sample, result.energy)
```

You need two things to construct the solver: the WebSocket remote procedure call (RPC) address of a Quip node, and a funded account (a seed or a keystore file, which is created for you on first use if it does not exist). You can also set a reward explicitly; if you do not, the solver uses the chain's configured minimum. Connection details for the public test network have not been published yet, so this page cannot include a node address.

## What makes a set of answers acceptable

Miners do not submit one answer; they submit a set of candidate answers. When you post a job you can set three quality floors, each optional:

* **A minimum number of valid answers.** The job does not settle for a single lucky sample.
* **An energy threshold.** Answers above the threshold do not count as good.
* **A diversity floor.** The answers in the set must genuinely differ from one another.

Diversity is measured pairwise across the submitted set, using a distance that accounts for the mirror symmetry of Ising models (flipping every spin in an answer produces the same energy, so a flipped copy does not count as different). The practical effect is that a miner cannot pad a submission with twenty copies of the same answer: duplicates collapse to one, and a set that fails your floors is rejected.

## Your problem must fit a registered topology

At present, a submitted problem must fit inside a hardware topology that is registered on the chain. Concretely, the solver places your model's variables onto the nodes of a registered topology, so your problem's graph must be a subgraph of one of those registered shapes. Arbitrary problem shapes are not yet supported.

The placement step fails with a clear error before your reward is committed if your graph does not fit, so you lose nothing by trying a shape that does not work. [Ising Topologies](/docs/compute/ising-topologies) explains what a topology is, why the shapes are what they are, and why the chain does not filter jobs by topology.

## What happens to your job

From your `solve()` call to the answer coming back:

1. **You post the job with a bid.** The solver encodes your model, places it onto the target topology, checks that your account can cover the reward plus the transaction fee, and submits the job to the Quip job mempool. Your reward is reserved on-chain, held in escrow until the job resolves.
2. **A miner picks it up.** The open order is visible to miners on the network's optimization subnet, which spans CPU, graphics processing unit (GPU), and quantum annealing hardware. By default any registered solver may compete; you can instead restrict a job to named miners or to particular hardware types.
3. **The chain verifies answers.** Every submitted answer is checked on-chain against your problem: spins must be minus one or plus one, the energy is recomputed from your coefficients, diversity is computed across the set, and your quality floors are enforced. Miners cannot grade their own homework.
4. **Competition runs on a clock.** Each job carries a hard deadline, measured in blocks. When the first valid solution arrives, a shorter competition window opens so that other miners have a fair chance to beat it. The order closes at whichever comes first, the hard deadline or the end of that window.
5. **The reward is split.** You choose the split when posting: the single best answer takes the whole reward, or the top answers share it weighted by quality, or the top answers share it equally.
6. **The result comes back to you.** Your `solve()` call polls until the order is final and returns the winning answer as `result.sample` with its energy in `result.energy`. The result is also readable on-chain by order identifier, so a timed-out client can recover it later through the solver's `query()` method. If the job closes with no acceptable answer, the reserved reward is reclaimed to your account.

> **Note**
> Interested in the other side of this marketplace, earning rewards by solving jobs? See the [Nodes section](/docs/nodes/run-a-node-testnet) for running a miner.
