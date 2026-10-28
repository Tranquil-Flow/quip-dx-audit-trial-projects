//! Substrate-side building blocks: storage keys, AccountInfo, extrinsic
//! construction, signing, and inclusion polling.
//!
//! Chain constants (Aglais testnet, runtime spec 118 / tx 7):
//!  - SS58 prefix 42, AGLS 12 decimals
//!  - Balances pallet index 4; transfer_allow_death = call index 0
//!  - TxExtension tuple (runtime/src/lib.rs):
//!      (AuthorizeCall, CheckNonZeroSender, CheckSpecVersion, CheckTxVersion,
//!       CheckGenesis, CheckEra, CheckNonce, CheckWeight,
//!       ChargeTransactionPayment, CheckMetadataHash, SetOrigin, WeightReclaim)
//!    Extra area: era || nonce || tip || mode(0x00=disabled)
//!    Signed-payload suffix: spec_version || tx_version || genesis_hash ||
//!      birth_hash(= genesis for immortal) || 0x00 (metadata hash: None)

use crate::crypto::{self, AccountId};
use crate::rpc::Rpc;
use crate::scale;
use blake2::digest::Digest;
use serde_json::json;
use std::time::{Duration, Instant};

pub const SPEC_VERSION: u32 = 118;
pub const TX_VERSION: u32 = 7;

pub const GENESIS_HASH: [u8; 32] = hex_literal_59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286();

/// Genesis hash as hex-literal helper (avoids a hex crate const fn).
const fn hex_literal_59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286() -> [u8; 32] {
    let s = "59e064bddd49a920d1392693c728c3bf9867f2cf3e0f8fea8c2498b389b0c286";
    let bytes = s.as_bytes();
    let mut out = [0u8; 32];
    let mut i = 0;
    while i < 32 {
        let hi = hexval(bytes[2 * i]);
        let lo = hexval(bytes[2 * i + 1]);
        out[i] = (hi << 4) | lo;
        i += 1;
    }
    out
}

const fn hexval(c: u8) -> u8 {
    match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        _ => 0,
    }
}

/// Substrate twox128 hash (two xxhash64 passes with seeds 0 and 1).
pub fn twox128(data: &[u8]) -> [u8; 16] {
    use std::hash::Hasher;
    let mut out = [0u8; 16];
    let mut h0 = twox_hash::XxHash64::with_seed(0);
    h0.write(data);
    let mut h1 = twox_hash::XxHash64::with_seed(1);
    h1.write(data);
    out[..8].copy_from_slice(&h0.finish().to_le_bytes());
    out[8..].copy_from_slice(&h1.finish().to_le_bytes());
    out
}

fn blake2b_128(data: &[u8]) -> [u8; 16] {
    let mut h = blake2::Blake2b::<blake2::digest::consts::U16>::new();
    h.update(data);
    h.finalize().into()
}

/// Storage key for frame_system::Account (Blake2_128Concat hasher).
pub fn system_account_key(account: &AccountId) -> String {
    let mut key = Vec::new();
    key.extend_from_slice(&twox128(b"System"));
    key.extend_from_slice(&twox128(b"Account"));
    key.extend_from_slice(&blake2b_128(account));
    key.extend_from_slice(account);
    format!("0x{}", hex::encode(key))
}

/// Storage key for frame_system::Number (latest block number).
pub fn system_number_key() -> String {
    let mut key = Vec::new();
    key.extend_from_slice(&twox128(b"System"));
    key.extend_from_slice(&twox128(b"Number"));
    format!("0x{}", hex::encode(key))
}

#[derive(Debug, Clone)]
pub struct AccountInfo {
    pub nonce: u32,
    pub free: u128,
    pub reserved: u128,
    pub frozen: u128,
}

fn read_u32(b: &[u8], off: &mut usize) -> u32 {
    let v = u32::from_le_bytes(b[*off..*off + 4].try_into().unwrap());
    *off += 4;
    v
}

fn read_u128(b: &[u8], off: &mut usize) -> u128 {
    let v = u128::from_le_bytes(b[*off..*off + 16].try_into().unwrap());
    *off += 16;
    v
}

/// Decode frame_system AccountInfo: nonce, consumers, providers, sufficients,
/// data { free, reserved, frozen, flags }.
pub fn decode_account_info(raw: &[u8]) -> Result<AccountInfo, String> {
    if raw.len() < 8 + 64 {
        return Err(format!("AccountInfo too short: {} bytes", raw.len()));
    }
    let mut off = 0;
    let nonce = read_u32(raw, &mut off);
    let _consumers = read_u32(raw, &mut off);
    let _providers = read_u32(raw, &mut off);
    let _sufficients = read_u32(raw, &mut off);
    let free = read_u128(raw, &mut off);
    let reserved = read_u128(raw, &mut off);
    let frozen = read_u128(raw, &mut off);
    let _flags = read_u128(raw, &mut off);
    Ok(AccountInfo { nonce, free, reserved, frozen })
}

/// Fetch System.Account + latest block number for an address.
pub fn query_balance(rpc: &mut Rpc, account: &AccountId) -> Result<(AccountInfo, Option<u64>), String> {
    let key = system_account_key(account);
    let raw = rpc
        .storage_at(&key, None)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "account does not exist on-chain (no System.Account entry)".to_string())?;
    let info = decode_account_info(&raw)?;
    let number = rpc
        .storage_at(&system_number_key(), None)
        .ok()
        .flatten()
        .and_then(|v| {
            if v.len() >= 4 {
                Some(u32::from_le_bytes(v[..4].try_into().unwrap()) as u64)
            } else {
                None
            }
        });
    Ok((info, number))
}

/// Build the Balances.transfer_allow_death call bytes (pallet 4, call 0).
fn transfer_call(dest: &AccountId, value: u128) -> Vec<u8> {
    let mut call = Vec::new();
    call.push(0x04); // Balances pallet index
    call.push(0x00); // transfer_allow_death call index
    call.push(0x00); // MultiAddress::Id variant
    call.extend_from_slice(dest);
    call.extend_from_slice(&scale::compact_u128(value));
    call
}

pub struct SignedTransfer {
    pub extrinsic_hex: String,
    pub tx_hash: String,
    pub payload_hex: String,
    pub envelope_len: usize,
    pub message_hashed: bool,
}

/// Build and sign a transfer extrinsic (immortal era, zero tip, metadata-hash
/// disabled) and self-verify the signature locally.
pub fn build_signed_transfer(
    seed: &[u8; 32],
    dest: &AccountId,
    value: u128,
    nonce: u32,
) -> Result<SignedTransfer, String> {
    let (secret, public) = crypto::keypair_from_seed(seed);
    let sender = crypto::account_id_from_public(&public);

    let call = transfer_call(dest, value);

    // Extension "extra" area: era(immortal) || nonce || tip(0) || mode(disabled)
    let mut extra = Vec::new();
    extra.push(0x00); // Era::Immortal
    extra.extend_from_slice(&scale::compact_u32(nonce));
    extra.extend_from_slice(&scale::compact_u128(0)); // tip
    extra.push(0x00); // CheckMetadataHash::Mode::Disabled

    // Signed payload: call || extra || implicit
    let mut payload = Vec::new();
    payload.extend_from_slice(&call);
    payload.extend_from_slice(&extra);
    payload.extend_from_slice(&SPEC_VERSION.to_le_bytes());
    payload.extend_from_slice(&TX_VERSION.to_le_bytes());
    payload.extend_from_slice(&GENESIS_HASH);
    payload.extend_from_slice(&GENESIS_HASH); // CheckEra implicit for immortal = genesis hash
    payload.push(0x00); // CheckMetadataHash implicit: Option::None

    // Substrate rule: blake2-256 the payload when it exceeds 256 bytes.
    let message_hashed = payload.len() > 256;
    let message: Vec<u8> = if message_hashed {
        crypto::blake2b_256(&payload).to_vec()
    } else {
        payload.clone()
    };

    let signature = crypto::sign(&secret, &message);

    // Self-check before submission.
    if !crypto::verify(&public, &message, &signature) {
        return Err("local signature verification failed (bug in tool)".into());
    }

    // Extrinsic v4 signed: 0x84 || address || envelope || extra || call
    let mut inner = Vec::new();
    inner.push(0x84);
    inner.push(0x00); // MultiAddress::Id
    inner.extend_from_slice(&sender);
    inner.extend_from_slice(&public);
    inner.extend_from_slice(&signature);
    inner.extend_from_slice(&extra);
    inner.extend_from_slice(&call);

    let mut extrinsic = scale::compact_len(inner.len());
    extrinsic.extend_from_slice(&inner);

    let tx_hash = crypto::blake2b_256(&extrinsic);
    Ok(SignedTransfer {
        extrinsic_hex: format!("0x{}", hex::encode(&extrinsic)),
        tx_hash: format!("0x{}", hex::encode(tx_hash)),
        payload_hex: format!("0x{}", hex::encode(&payload)),
        envelope_len: crypto::HYBRID_PUBLIC_LEN + crypto::HYBRID_SIGNATURE_LEN,
        message_hashed,
    })
}

/// Submit and poll for inclusion in a finalized block.
/// Returns (block_number, extrinsic_index).
pub fn submit_and_wait(rpc: &mut Rpc, xt_hex: &str, expected_hash: &str, timeout: Duration) -> Result<(u64, usize), String> {
    let submitted = rpc.submit_extrinsic(xt_hex).map_err(|e| e.to_string())?;
    let submitted = submitted.strip_prefix("0x").unwrap_or(&submitted);
    if !submitted.eq_ignore_ascii_case(&expected_hash[2..]) {
        eprintln!(
            "note: node returned tx hash {} which differs from locally computed {}",
            submitted, expected_hash
        );
    }
    let expected = expected_hash.trim_start_matches("0x").to_ascii_lowercase();
    let start = Instant::now();
    let mut attempts = 0u32;
    while start.elapsed() < timeout {
        attempts += 1;
        std::thread::sleep(Duration::from_secs(6));
        let head = match rpc.call("chain_getFinalizedHead", vec![]) {
            Ok(h) => h.as_str().unwrap_or_default().to_string(),
            Err(e) => {
                eprintln!("poll error: {e}");
                continue;
            }
        };
        let block = match rpc.call("chain_getBlock", vec![json!(head)]) {
            Ok(b) => b,
            Err(e) => {
                eprintln!("poll error: {e}");
                continue;
            }
        };
        let number = block["block"]["header"]["number"]
            .as_str()
            .and_then(|n| u64::from_str_radix(n.trim_start_matches("0x"), 16).ok())
            .unwrap_or(0);
        let extrinsics = block["block"]["extrinsics"].as_array().cloned().unwrap_or_default();
        for (idx, xt) in extrinsics.iter().enumerate() {
            let xt_hex = xt.as_str().unwrap_or_default();
            let xt_bytes = hex::decode(xt_hex.trim_start_matches("0x")).unwrap_or_default();
            let h = hex::encode(crypto::blake2b_256(&xt_bytes));
            if h.eq_ignore_ascii_case(&expected) {
                return Ok((number, idx));
            }
        }
        eprintln!(
            "attempt {attempts}: finalized head #{number} does not yet contain tx {}…",
            expected_hash
        );
    }
    Err(format!(
        "transaction {expected_hash} not seen in finalized blocks within {}s",
        timeout.as_secs()
    ))
}
