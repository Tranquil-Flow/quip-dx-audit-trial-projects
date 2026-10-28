---
description: >-
  Conceptual overview of QVRF, Quip's quantum randomness service: where the
  numbers come from, what the service guarantees today, and what it does not.
icon: dice
---

# Quantum Randomness (QVRF)

QVRF (Quantum Verifiable Random Function) is Quip Network's quantum randomness service. It supplies random numbers to smart contracts, and the numbers come from measurements taken on a real quantum computer rather than from a formula. Your contract asks for random values and receives them back later through a callback, the same request-and-callback shape used by existing randomness oracles. The values are delivered over an encrypted application programming interface (API) connection when requested.

This page covers concepts only. The request interface is not yet final, so no function names or parameters appear here.

## The name is historical: QVRF is not a VRF

Despite the name, QVRF is not a verifiable random function (VRF) in the cryptographic sense, and you should not reason about it as if it were one.

In the cryptographic literature, a VRF is a keyed pseudorandom function: a secret key turns an input into an output, along with a proof that anyone can check against the matching public key. QVRF is a different kind of object. It is a physical randomness source with a verification record: the randomness comes from quantum measurements, and the record lets you check where and when those measurements happened. If you are assessing QVRF for your application, do not import the standard VRF security definitions, because they do not apply. This correction comes from Quip's own security model, which keeps the project name and flags the distinction so that reviewers start from the right definitions.

## Why quantum hardware

A classical random number generator is a formula. Anyone who learns the formula and its inputs can reproduce every number it will ever produce. A measurement on a quantum computer is different: the outcome does not exist until the measurement is taken. That is the core guarantee quantum hardware adds. The number was created at a known moment, and only the party who generated it could have known it before delivery.

The certification design supports that guarantee from two sides, both described here qualitatively:

- **A timing threshold.** The challenge that decides which quantum measurements to take is derived from a public source of randomness, so nobody can know it in advance, and a valid answer must come back within a short deadline. Producing a convincing answer by classical simulation would take far longer than the deadline allows, so a fast, valid answer is evidence that a quantum computer produced it. The blockchain records both ends of that time window, a technique the design calls carbon dating, which makes the timeline publicly checkable.
- **A fidelity score.** After the fact, verifiers use classical simulation to check a sample of the returned measurements and score how closely they match what the requested quantum process should produce. A sufficiently high score is evidence that a quantum device genuinely ran the process rather than guessing.

## What V0 guarantees, and what it does not

V0 is the first version of the service, and its trust model is deliberately simple. Integrate with these three facts in mind:

- **Delivery is operator-trusted.** In V0, Quip operates both the randomness generator and the delivery service. You are trusting a single operator to run the pipeline honestly.
- **The operator can withhold values, but cannot swap them.** Before any randomness is handed out, a commitment to the generated values is published on chain. A delivered value must match that earlier commitment, so an operator could refuse to deliver, but could not substitute different numbers after the fact without detection.
- **Verification is asynchronous.** The checks described above run after the fact, not at the moment of delivery. A value has not yet passed the full verification pipeline when you receive it; the verification record catches up later.

If your application needs stronger guarantees than this, treat V0 as a trusted randomness feed with a public commitment trail, and revisit as the trust model evolves in later versions.

## Where QVRF fits

Randomness is the Quip Network's second subnet, alongside the optimization subnet described in [Submit Your First Compute Job](submit-a-job.md). Quantum miners produce the raw randomness by running sampling circuits, and classical miners verify the results, so the service is itself a form of the network's proof of useful work.

QVRF is designed to be the first product sold over Quip's swap-protocol payment rail. QuipSwap, Quip's peer-to-peer swap protocol, lets two parties settle a trade directly across chains, and QVRF uses that same mechanism as its payment path. In practice, payment does not tie you to one network: you can purchase randomness from any supported chain.

The first consumer of QVRF is [Quantum Echoes](https://echoes.quip.network/), a collection of Quantum Forged Tokens (QFTs). Each mint requests a seed from the QVRF coordinator, and the token's traits are derived from the quantum randomness that comes back.

{% hint style="info" %}
The request interface, the fee model, and the exact certification parameters are still being finalized. Integration documentation with installable packages and code examples will follow once those details settle.
{% endhint %}
