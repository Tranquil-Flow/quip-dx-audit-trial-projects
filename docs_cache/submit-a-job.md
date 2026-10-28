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

The base install of `xqsa` includes a local simulated annealing solver that runs on your central processing unit (CPU), so you can test a model without touching the network or spending anything. The `[quip]` extra adds the two pieces that the network backend, `SolverQuip`, needs: a chain client and a signing extension that produces the hybrid (classical plus post-quantum) signatures Quip transactions require. Every other solver in `xqsa` installs and runs without the extra. The signing extension, `quip-signer`, ships a prebuilt wheel for Linux; on macOS and Windows, `pip` builds it from source, which needs a local [Rust toolchain](https://rustup.rs).

> **Note**
> The chain interfaces behind the `[quip]` extra are pre-release. The package's own documentation notes that chain metadata and economic parameters can change between releases, so expect to update the packages as the network evolves.

## Describe your problem as an Ising model

The network's miners solve one kind of problem: an Ising model. The format is simpler than the name suggests.

An Ising model is a graph. Every node carries a variable called a spin, which takes exactly one of two values, minus one or plus one. Every node can have a bias, a number that pulls its spin toward one value or the other. Every edge has a coupling, a number that rewards the two connected spins for agreeing or for disagreeing. An answer assigns a value to every spin, and each answer has an energy:

```
energy = sum over nodes of (bias × spin) + sum over edges of (coupling × spin × spin)
```

The best answer is the one with the lowest energy. That is the entire contract: you describe what you want by choosing biases and couplings so that good outcomes have low energy, and miners search for low-energy assignments.

One convention matters for integrators: all coefficients and energies travel as whole numbers carrying thousandths (a value of 1.5 is transmitted as 1500). This fixed-point rule means every machine on the network computes the identical energy for the same answer, with no floating-point disagreement. Coefficients finer than a thousandth or larger in magnitude than 2,147,483 are rejected before submission; if you hit either limit, scale your model, as [Allowed values are advisory for your job](/docs/compute/ising-topologies#allowed-values-are-advisory-for-your-job) explains.

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

solver = SolverQuip.for_network("aglais", keystore="~/.quip/keystore.json")
result = solver.solve(model)
print(result.sample, result.energy)
```

This example prints a warning that some coefficients fall outside the topology's allowed values. The job is still submitted and solved as given; [Allowed values are advisory for your job](/docs/compute/ising-topologies#allowed-values-are-advisory-for-your-job) explains why.

`for_network("aglais")` connects to the public test network using its published node and faucet addresses. Your account lives in the keystore, `~/.quip/keystore.json`, which is also the default when you leave out `keystore=`. It is created on first use with no password, so keep it private, and it starts empty; [the faucet step](#fund-your-account-from-the-faucet) covers that.

To reach a node of your own, construct `SolverQuip(url=..., keystore=...)` with its WebSocket remote procedure call (RPC) address, or set `QUIP_RPC_URL`. Test network endpoints can move between releases; [aglais.quip.network](https://aglais.quip.network) publishes the current ones.

## What a job costs

A job on `aglais` costs the chain's minimum reward, 1 AGLS, plus a transaction fee that is a small fraction of that. The minimum reward is a runtime constant that gates submissions, not a price for the work: the chain [meters none of the solver's compute](https://gitlab.com/quip.network/quip-validator/-/blob/161667b2ed7e375390ada523a459258f0f576f78/runtime/src/configs/mod.rs#L650).

* **The fee** grows with the size of your model. On the `aglais` test network it is burned, which is the test network's behavior, not the $QUIP fee model described on the [Token](/docs/network/token) page.
* **The reward** is nearly all of the cost. It is reserved from your account when the job is posted and paid to the winning miners. Pass `reward=` (in planck; 1 AGLS is 1,000,000,000,000 planck) to offer more than the minimum.

AGLS is free from the faucet. The exact amounts can change with runtime upgrades, so ask the chain:

```python
quote = solver.quote(model)
print(quote)
```

It builds the same transaction `solve()` would send, asks the chain for the fee, checks your balance, and submits nothing. `solve()` prints the same quote before it submits. The [first-job tutorial](/docs/xquad/solving/quip-first-job.html) walks through a full run with its output.

## Fund your account from the faucet

A new account holds no AGLS, and you do not need to fund it by hand. By default, `solve()` quotes the job, draws one faucet drip of 10 AGLS if your balance is short, and submits. Pass `autoconfirm=False` or `autofund=False` to be asked on the terminal first; a job you decline draws no drip and puts nothing on chain. The [solver reference](/docs/xquad/solving/quip-network.html) covers the gates in full.

To fund an account yourself, send a POST request to the faucet:

```sh
curl -X POST https://faucet.aglais.quip.network/request \
  -H 'Content-Type: application/json' \
  -d '{"dest": "<your address>"}'
```

Your address is the `account_id_hex` field of your keystore file. Each request sends one drip. A `429` with `retry_after_seconds` means the address was funded seconds ago, so wait that long and retry; a `429` without it means a request for the address is still in flight. A `403` means the address already holds more than one drip; it can draw again once spending takes it back below that.

## What makes a set of answers acceptable

Miners do not submit one answer; they submit a set of candidate answers. When you post a job you can set three quality floors, each optional:

* **A minimum number of valid answers.** The job does not settle for a single lucky sample.
* **An energy threshold.** Answers above the threshold do not count as good.
* **A diversity floor.** The answers in the set must genuinely differ from one another.

Diversity is measured pairwise across the submitted set, using a distance that accounts for the mirror symmetry of Ising models (flipping every spin in an answer produces the same energy, so a flipped copy does not count as different). The practical effect is that a miner cannot pad a submission with twenty copies of the same answer: duplicates collapse to one, and a set that fails your floors is rejected.

## Placed or native

The solver can submit your problem in one of two modes.

By default, the solver places your model's variables onto the nodes of the chain's default registered topology, one variable to one node, so that every coupling lands on an edge the hardware has. This is subgraph placement. The search for a placement can give up on dense models, such as the one-hot cliques in a travelling-salesman encoding. When it finds no placement, it raises `PlacementError` before anything is submitted or spent, so you lose nothing by trying.

In native mode, the solver submits your problem over its own coupling graph and skips placement, so any shape is accepted up to the job mempool's limits of 5,000 nodes and 50,000 edges. Turn it on with `topology="native"` on `for_network()` or on a single `solve()` call. The cost is who can answer: a miner that cannot embed an arbitrary graph, such as one backed by a quantum processing unit (QPU), cannot solve a native job. The simulated annealing miners on the test network can.

[Ising Topologies](/docs/compute/ising-topologies) explains what a topology is, why the shapes are what they are, and why the chain does not filter jobs by topology.

## What happens to your job

From your `solve()` call to the answer coming back:

1. **You post the job with a bid.** The solver encodes your model, places it onto the target topology unless native mode is on, checks that your account can cover the reward plus the transaction fee, and submits the job to the Quip job mempool. Your reward is reserved on-chain, held in escrow until the job resolves.
2. **A miner picks it up.** The open order is visible to miners on the network's optimization subnet, which spans CPU, graphics processing unit (GPU), and quantum annealing hardware. By default any registered solver may compete; you can instead restrict a job to named miners or to particular hardware types.
3. **The chain verifies answers.** Every submitted answer is checked on-chain against your problem: spins must be minus one or plus one, the energy is recomputed from your coefficients, diversity is computed across the set, and your quality floors are enforced. Miners cannot grade their own homework.
4. **Competition runs on a clock.** Each job carries a hard deadline, measured in blocks. When the first valid solution arrives, a shorter competition window opens so that other miners have a fair chance to beat it. The order closes at whichever comes first, the hard deadline or the end of that window.
5. **The reward is split.** You choose the split when posting: the single best answer takes the whole reward, or the top answers share it weighted by quality, or the top answers share it equally.
6. **The result comes back to you.** Your `solve()` call polls until the order is final and returns the winning answer as `result.sample` with its energy in `result.energy`. The result is also readable on-chain by order identifier, so a timed-out client can recover it later through the solver's `query()` method.

If the order closes with no submissions, `solve()` tries to reclaim the reserved reward and raises `QuipJobFailedError`; if it does not close in time, it raises `QuipTimeoutError`. Both carry the `order_id`. The reclaim is best-effort: if it fails, the error says so, and `query()` with that `order_id` frees the reward later. The fee is not refunded. The [Failure Taxonomy](/docs/xquad/solving/quip-network.html#failure-taxonomy) lists every error the solver raises.

> **Note**
> Interested in the other side of this marketplace, earning rewards by solving jobs? See the [Nodes section](/docs/nodes/run-a-node-testnet) for running a miner.
