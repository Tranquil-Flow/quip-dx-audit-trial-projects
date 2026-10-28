# Miners

Two families of hardware mine on Quip Network.

**Classical miners** are the compute platforms that do not support entanglement: CPUs, GPUs, TPUs, NPUs, and the like. While the network often leads with quantum computing as a differentiator, these traditional architectures are first-class citizens that help validate the quantum computers are really delivering improved performance. The network currently publishes Metal and CUDA solvers as well as direct implementations for x86 and ARM CPUs.

**Quantum miners** are any compute platform that supports entanglement through adiabatic quantum computing, or gate-based platforms featuring CNOT or Toffoli gates: neutral atom, trapped ion, superconducting, photonic, or otherwise. The ultimate goal of the network is to maximize the utilization of all quantum processors everywhere and to connect them together to solve the hardest problems as one unified quantum system.

## Node Requirements

Node requirements are minimal. There is no barrier to entry for running a node, but you will have to fit the blockchain on local storage and your block rewards will be correlated with your ability to efficiently solve the Proofs of Useful Work supported by the network.

The first Proof of Useful Work is finding the ground state energy of a Hamiltonian, often called an Ising Model problem. These solutions can be used in a variety of optimization and constraint programming problems, providing useful outputs for real businesses. Future Proofs of Useful Work may include things like Verifiable Random Functions, Hidden Subgroup Problems, Search, Quantum Key Distribution, or otherwise.

The network currently publishes Qiskit and Ocean SDK solutions for the Ising subnet. If you have another framework or instruction set you would like to support, please submit an issue on [GitHub](https://github.com/quipnetwork).

## Run a Node

Please see the [Run a Node](/docs/nodes/run-a-node-testnet) section.
