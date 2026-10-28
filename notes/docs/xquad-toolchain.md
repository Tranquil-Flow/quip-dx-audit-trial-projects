# Toolchain

XQuad compiles quadratic optimization problems into bytecode for a single virtual machine, the XQVM, and runs that bytecode on whichever backend you point it at. A problem written once runs unchanged on a D-Wave quantum processor, a GPU annealer, a local CPU sampler, or the Quip Network. It plays the role LLVM plays for compilers: one intermediate representation, many targets.

> **Note**
> **Early public release.** The instruction set, binary format, and public API may change before v1.0.

## What it models

Combinatorial problems that reduce to quadratic binary models: QUBO, Ising, and discrete formulations. Traveling salesman, graph coloring, knapsack, set cover, maximum independent set, and portfolio optimization all fall in range. You write the model in a constraint-programming DSL or in `.xqasm` assembly, compile it to a `.xqb` binary, and hand the result to a solver.

## Components

A Rust core does the execution. Python packages wrap it and add the modeling and solver layers.

| Package | Language | Role |
| --- | --- | --- |
| `xqvm` | Rust | The VM interpreter, opcode table, and bytecode codec. Builds `no_std + alloc`, so it also runs inside WASM runtimes and Substrate pallets |
| `xqasm` | Rust | Assembler for the `.xqasm` text format |
| `xqcli` | Rust | The `xquad` command: `asm`, `dism`, `run`, `verify` |
| `xqffi` | Python | PyO3 bindings that expose `xqvm` and `xqasm` to Python |
| `xqvm_py` | Python | Pure-Python reference VM, used as the conformance oracle |
| `xqcp` | Python | Constraint-programming DSL that compiles to `.xqasm` |
| `xqsa` | Python | Solver adapters for every supported backend |
| `xquad` | Python | Umbrella package with the interactive `Program` / `Session` / `RunResult` API |

A written specification defines every behavior, and CI runs each conformance vector on both the Rust VM and the Python reference VM. If the two disagree, the build fails.

## Backends

| Backend | Hardware | Install |
| --- | --- | --- |
| Simulated annealing | CPU | `pip install xquad` |
| CUDA annealer | NVIDIA GPU | `pip install xquad[cuda]` |
| Metal annealer | Apple Silicon GPU | `pip install xquad[metal]` |
| D-Wave Advantage | Quantum annealer | `pip install xquad[dwave]` |
| Quip Network | Network-provided solvers | `pip install "xquad[quip]"` |

Extras compose: `pip install xquad[cuda,dwave]`.

## Getting started

```sh
pip install xquad          # Python toolchain
cargo install xqcli        # the `xquad` binary
```

The full documentation covers installation, modeling, the instruction set, worked examples for a dozen classic problems, and the reference for every package.

To run a model on the Quip Network rather than on your own hardware, see [Submit Your First Compute Job](/docs/compute/submit-a-job).
