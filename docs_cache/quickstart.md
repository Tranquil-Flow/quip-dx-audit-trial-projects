# Quickstart

The Quip Network protocol is published as open source software on [GitHub](https://github.com/quipnetwork/) and [GitLab](https://gitlab.com/quip.network). There are two things you can do with it today: run a node, and generate quantum-resistant keys. This page covers both.

## Run a node

If you wish to run a node, you can download the desktop node runner on Windows, Linux, or Mac OSX which will guide you through setting up your environment:\
\
[https://gitlab.com/quip.network/quip-node-manager/-/releases](https://gitlab.com/quip.network/quip-node-manager/-/releases)

For more node running options see the [Nodes section](/docs/nodes/run-a-node-testnet), which covers server deployment with docker-compose and building from source.

## Generate quantum-resistant keys

Right now there's not much to do other than mine blocks, generate some quantum-resistant keys through our wallets on Ethereum, Solana, their L2s, and the Bitcoin L2s Arch and Midl, but we are building out the smart contract layer so you can take advantage of the quantum computers too.

You can generate post-quantum keys to prepare for the smart contract layer by using our wallets at [account.quip.network](https://account.quip.network/) or you can use the libraries below.

## Use the libraries directly

Quip's implementation of various hash algorithms, especially the preferred Winternitz One-Time Signature (WOTS+), is available as a library for [rust](https://crates.io/crates/hashsigs-rs), [c++](https://github.com/quipnetwork/hashsigs-cpp), [typescript](https://www.npmjs.com/package/@quip.network/hashsigs), and [solidity](https://www.npmjs.com/package/@quip.network/hashsigs-solidity). If you do not want to use these libraries directly, you can use the interface at [account.quip.network](https://account.quip.network/).

All Quip Network libraries and contracts are available for review on [GitHub](https://github.com/QuipNetwork).

## Where to go next

If you are new to the network, [What is Quip Network?](/docs/getting-started/what-is-quip) explains the two layers and how they relate, and [How Quip Network Fits Together](/docs/quip-interlock-protocol/how-quip-fits-together) shows the whole system in one diagram.

For building, start from the [Quip SDK](/docs/getting-started/quip-sdk). To put a problem in front of the compute network, see [Submit Your First Compute Job](/docs/compute/submit-a-job).

> **Note**
> Want to learn more about QUIPs from scratch? Head to the [Basics](/docs/quip-interlock-protocol/quip-the-quantum-unit-interlock-pathway) section to learn more.
