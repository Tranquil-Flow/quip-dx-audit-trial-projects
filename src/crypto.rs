//! H4 key generation, account derivation and signing — mirrors
//! `quip-transaction-crypto-core` (QuipNetwork/quip-validator).

use blake2::digest::{consts::U32, Digest};
use pqhybridsign::composite_delta;
use pqhybridsign::suite::DeltaSuite;
use pqhybridsign::SrFn512;

pub const HYBRID_PUBLIC_LEN: usize = SrFn512::PUBLIC_KEY_LEN; // 929
pub const HYBRID_SIGNATURE_LEN: usize = SrFn512::MAX_SIGNATURE_LEN; // 731
pub const HYBRID_SECRET_LEN: usize = SrFn512::SECRET_KEY_LEN; // 1409
const ACCOUNT_ID_DOMAIN: &[u8] = b"quip-account-v1";
const SUBSTRATE_PAIR_SIGNATURE_CONTEXT: &[u8] = b"quip/substrate-pair-signature/v1";

pub type H4Secret = [u8; HYBRID_SECRET_LEN];
pub type H4Public = [u8; HYBRID_PUBLIC_LEN];
pub type H4Signature = [u8; HYBRID_SIGNATURE_LEN];
pub type AccountId = [u8; 32];

pub fn blake2b_256(data: &[u8]) -> [u8; 32] {
    let mut h = blake2::Blake2b::<U32>::new();
    h.update(data);
    h.finalize().into()
}

/// Generate a fresh throwaway master seed (32 random bytes).
pub fn random_seed() -> [u8; 32] {
    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).expect("OS randomness available");
    seed
}

/// Derive the H4 keypair (secret, public) from a 32-byte master seed.
pub fn keypair_from_seed(seed: &[u8; 32]) -> (H4Secret, H4Public) {
    let mut secret = [0u8; HYBRID_SECRET_LEN];
    let mut public = [0u8; HYBRID_PUBLIC_LEN];
    composite_delta::keypair_from_seed::<SrFn512>(seed, &mut secret, &mut public)
        .expect("valid 32-byte master seed");
    (secret, public)
}

/// Derive the compact AccountId32: blake2b_256("quip-account-v1" || public).
pub fn account_id_from_public(public: &H4Public) -> AccountId {
    let mut hasher = blake2::Blake2b::<U32>::new();
    hasher.update(ACCOUNT_ID_DOMAIN);
    hasher.update(public);
    hasher.finalize().into()
}

/// Sign a message with H4 (sr25519 + FN-DSA-512).
/// The >256-byte blake2 rule is the caller's responsibility.
pub fn sign(secret: &H4Secret, message: &[u8]) -> H4Signature {
    let mut signature = [0u8; HYBRID_SIGNATURE_LEN];
    let wire_len = composite_delta::sign_deterministic::<SrFn512>(
        secret,
        message,
        SUBSTRATE_PAIR_SIGNATURE_CONTEXT,
        b"",
        &mut signature,
    )
    .expect("H4 signing succeeded");
    debug_assert_eq!(wire_len, HYBRID_SIGNATURE_LEN);
    signature
}

/// Verify an H4 signature (used as a local sanity check before submission).
pub fn verify(public: &H4Public, message: &[u8], signature: &H4Signature) -> bool {
    composite_delta::verify::<SrFn512>(public, message, SUBSTRATE_PAIR_SIGNATURE_CONTEXT, signature)
}

/// SS58-encode (format 42, "Substrate" default) with the standard checksum
/// (first 2 bytes of blake2b-512("SS58PRE" || body)).
pub fn ss58_encode(account: &AccountId) -> String {
    use blake2::digest::consts::U64;
    let mut body = vec![42u8];
    body.extend_from_slice(account);
    let mut h = blake2::Blake2b::<U64>::new();
    h.update(b"SS58PRE");
    h.update(&body);
    let chk: [u8; 64] = h.finalize().into();
    body.extend_from_slice(&chk[..2]);
    bs58::encode(&body).into_string()
}

/// Decode an SS58 address (format 42) into the raw 32-byte AccountId.
pub fn ss58_decode(s: &str) -> Result<AccountId, String> {
    use blake2::digest::consts::U64;
    let bytes = bs58::decode(s.trim())
        .into_vec()
        .map_err(|e| format!("invalid base58: {e}"))?;
    if bytes.len() != 35 {
        return Err(format!("expected 35-byte SS58 body, got {}", bytes.len()));
    }
    if bytes[0] != 42 {
        return Err(format!("unexpected SS58 prefix {} (expected 42)", bytes[0]));
    }
    let mut h = blake2::Blake2b::<U64>::new();
    h.update(b"SS58PRE");
    h.update(&bytes[..33]);
    let chk: [u8; 64] = h.finalize().into();
    if chk[..2] != bytes[33..35] {
        return Err("SS58 checksum mismatch".into());
    }
    let mut account = [0u8; 32];
    account.copy_from_slice(&bytes[1..33]);
    Ok(account)
}

/// Accept "0x"+64-hex or an SS58 address; return the 32-byte AccountId.
pub fn parse_account(s: &str) -> Result<AccountId, String> {
    let t = s.trim();
    if let Some(h) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        if h.len() != 64 {
            return Err("0x address must be 64 hex digits (32 bytes)".into());
        }
        let bytes = hex::decode(h).map_err(|e| format!("bad hex: {e}"))?;
        let mut account = [0u8; 32];
        account.copy_from_slice(&bytes);
        return Ok(account);
    }
    ss58_decode(t)
}

/// Parse a decimal AGLS amount into planck (1 AGLS = 10^12 planck).
pub fn parse_agls(s: &str) -> Result<u128, String> {
    const DECIMALS: u32 = 12;
    let t = s.trim();
    let (int_part, frac_part) = match t.split_once('.') {
        Some((i, f)) => (i, f),
        None => (t, ""),
    };
    if int_part.is_empty() && frac_part.is_empty() {
        return Err("empty amount".into());
    }
    if frac_part.len() > DECIMALS as usize {
        return Err(format!("amount has more than {DECIMALS} decimals"));
    }
    let mut planck: u128 = 0;
    if !int_part.is_empty() {
        let i: u128 = int_part
            .parse()
            .map_err(|_| format!("bad integer part: {int_part}"))?;
        planck = i
            .checked_mul(10u128.pow(DECIMALS))
            .ok_or("amount overflow")?;
    }
    let mut scale = 10u128.pow(DECIMALS) / 10;
    for ch in frac_part.chars() {
        let d = ch.to_digit(10).ok_or("bad fraction digit")? as u128;
        planck = planck
            .checked_add(d * scale)
            .ok_or("amount overflow")?;
        scale /= 10;
    }
    if planck == 0 {
        return Err("amount must be greater than zero".into());
    }
    Ok(planck)
}

pub fn format_agls(planck: u128) -> String {
    let whole = planck / 1_000_000_000_000u128;
    let frac = planck % 1_000_000_000_000u128;
    format!("{whole}.{frac:012}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ss58_roundtrip() {
        let seed = [7u8; 32];
        let (_, public) = keypair_from_seed(&seed);
        let account = account_id_from_public(&public);
        let ss58 = ss58_encode(&account);
        assert_eq!(ss58_decode(&ss58).unwrap(), account);
        assert_eq!(parse_account(&format!("0x{}", hex::encode(account))).unwrap(), account);
    }

    #[test]
    fn known_substrate_ss58_vector() {
        // Standard Substrate/Polkadot checksum test vector, prefix 42.
        let account: AccountId = [
            0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78,
            0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56, 0x78, 0x90, 0x12, 0x34, 0x56,
            0x78, 0x90, 0x12, 0x34,
        ];
        // This is just a roundtrip sanity check; the exact string is not pinned.
        let ss58 = ss58_encode(&account);
        assert_eq!(ss58_decode(&ss58).unwrap(), account);
    }

    #[test]
    fn agls_parsing() {
        assert_eq!(parse_agls("1").unwrap(), 1_000_000_000_000u128);
        assert_eq!(parse_agls("0.001").unwrap(), 1_000_000_000u128);
        assert_eq!(parse_agls("2.5").unwrap(), 2_500_000_000_000u128);
        assert_eq!(format_agls(2_500_000_000_000u128), "2.500000000000");
    }

    #[test]
    fn ss58_pinned_vector_crosschecked_with_polkadotjs() {
        // AccountId from keygen run; SS58 string cross-checked against
        // @polkadot/util-crypto encodeAddress(hex, 42).
        let account: AccountId = {
            let h = "7b75f18d911815d4309d01c2163e8dcf6c0d4ca626c5fb3238ccc561c959b3de";
            let bytes = hex::decode(h).unwrap();
            let mut a = [0u8; 32];
            a.copy_from_slice(&bytes);
            a
        };
        assert_eq!(
            ss58_encode(&account),
            "5EranQ54774fzs8u2JF93sKrRGzXy1HtLvviFkxX8J99fVvz"
        );
        assert_eq!(
            ss58_decode("5EranQ54774fzs8u2JF93sKrRGzXy1HtLvviFkxX8J99fVvz").unwrap(),
            account
        );
    }

    #[test]
    fn sign_verify_roundtrip() {
        let seed = random_seed();
        let (secret, public) = keypair_from_seed(&seed);
        let sig = sign(&secret, b"hello aglais");
        assert!(verify(&public, b"hello aglais", &sig));
        assert!(!verify(&public, b"tampered", &sig));
    }

    #[test]
    fn sizes_pinned() {
        assert_eq!(HYBRID_PUBLIC_LEN, 929);
        assert_eq!(HYBRID_SIGNATURE_LEN, 731);
        assert_eq!(HYBRID_SECRET_LEN, 1409);
    }
}
