//! agls-tool — Substrate-side CLI for Quip Network's Aglais testnet.
//!
//! Talks to the official Substrate JSON-RPC (default
//! https://bootnode-1.aglais.quip.network:20049/rpc), NOT the EVM RPC.
//!
//! Wire-format knowledge (from QuipNetwork/quip-validator runtime 118 and the
//! QuipNetwork/polkadot-sdk fork @ 845eb9986c7131056b077d14ad7249f9d65ca111):
//!  - AccountId32 = blake2b_256("quip-account-v1" || 929-byte H4 public key)
//!  - H4 = sr25519 + FN-DSA-512 via pqhybridsign::composite_delta::<SrFn512>
//!    with signing context b"quip/substrate-pair-signature/v1"
//!  - Signature envelope: public[929] || signature[731] (1660 bytes)
//!  - Extrinsic v4 (0x84): address(0x00||account32) || envelope || extra || call
//!  - Signed payload: call || era || nonce || tip || mode || spec_version ||
//!    tx_version || genesis_hash || birth_hash || metadata_hash_option
//!  - >256-byte payloads are blake2-256'd before signing (Substrate rule)

mod cli;
mod crypto;
mod rpc;
mod scale;
mod substrate;

fn main() {
    cli::run();
}
