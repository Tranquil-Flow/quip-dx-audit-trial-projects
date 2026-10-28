//! Quip Network post-quantum (hash-based) signature demo.
//!
//! Exercises Quip's published Rust crate `hashsigs-rs` (SHRINCS scheme:
//! WOTS-C/UXMSS stateful path + SPHINCS+C stateless path) end to end:
//!
//!   1. generate a fresh throwaway SHRINCS keypair (seed from OS CSPRNG)
//!   2. persist the secret to ./keys/ (0600, never printed)
//!   3. hash a message with SHA-256 (SHRINCS signs 32-byte hashes)
//!   4. sign on the stateful (everyday) path
//!   5. verify the signature -> Valid
//!   6. flip one bit of the message  -> verification FAILS
//!   7. flip one bit of the signature-> verification FAILS
//!   8. reload the key from ./keys via the validating import, sign a second
//!      message with the NEXT one-time leaf (slot discipline), verify again
//!
//! Run: cargo run --release
//!
//! Keys are throwaway demo keys generated fresh on every run; nothing here
//! touches any network, chain, or existing wallet.

use hashsigs_rs::profiles::selected::{SelectedProfile, NUM_CHAINS, NUM_LAYERS};
use hashsigs_rs::shrincs::{sign, ShrincsSigner, ShrincsVerifier};
use hashsigs_rs::{VerifierInterface, VerifyOutcome};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::Write;
use std::path::Path;

type Hash = [u8; hashsigs_rs::HASH_LEN];

fn sha256(msg: &[u8]) -> Hash {
    let d = Sha256::digest(msg);
    let mut out = [0u8; 32];
    out.copy_from_slice(&d);
    out
}

fn hexs(b: &[u8]) -> String {
    // Only ever used for PUBLIC material (commitment, hashes, sizes).
    hex::encode(b)
}

fn outcome_str(o: VerifyOutcome) -> &'static str {
    match o {
        VerifyOutcome::Valid => "Valid",
        VerifyOutcome::Invalid => "Invalid (crypto reject)",
        VerifyOutcome::Malformed => "Malformed (undecodable envelope)",
    }
}

/// Persist the 264-byte flat secret with tight permissions. Content never printed.
fn save_secret(keys: &hashsigs_rs::shrincs::Keys, dir: &Path, name: &str) -> std::io::Result<()> {
    fs::create_dir_all(dir)?;
    let path = dir.join(name);
    {
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            let mut f = fs::OpenOptions::new()
                .write(true)
                .create(true)
                .truncate(true)
                .mode(0o600)
                .open(&path)?;
            f.write_all(&keys.to_bytes())?;
            f.sync_all()?;
        }
        #[cfg(not(unix))]
        {
            let mut f = fs::File::create(&path)?;
            f.write_all(&keys.to_bytes())?;
        }
    }
    println!("  saved secret key -> {} ({} bytes, mode 0600)", path.display(), hashsigs_rs::shrincs::Keys::to_bytes(keys).len());
    Ok(())
}

/// Load a 264-byte flat secret and rebuild the keypair through the VALIDATING
/// import (recomputes both roots from seeds; rejects corrupted bytes).
fn load_secret(dir: &Path, name: &str) -> Option<hashsigs_rs::shrincs::Keys> {
    let bytes = fs::read(dir.join(name)).ok()?;
    let candidate = hashsigs_rs::shrincs::Keys::from_bytes::<SelectedProfile>(&bytes)?;
    let (keys, _pk) = ShrincsSigner::import_signing_key::<SelectedProfile, NUM_CHAINS, NUM_LAYERS>(candidate)?;
    Some(keys)
}

fn main() {
    println!("=== Quip Network post-quantum signature demo (hashsigs-rs / SHRINCS) ===");
    println!("crate: hashsigs-rs 0.2.1-rc9 | profile: {} (default)", hashsigs_rs::shrincs::PROFILE_NAME);
    println!();

    // ---------------------------------------------------------------- keygen
    println!("[1] Generating fresh throwaway SHRINCS keypair");
    let mut seed = [0u8; 32];
    getrandom::getrandom(&mut seed).expect("OS entropy");
    let max_stateful = 16u32; // small throwaway budget for the demo
    let t0 = std::time::Instant::now();
    let (mut keys, public_key) = ShrincsSigner::keygen::<SelectedProfile, NUM_CHAINS, NUM_LAYERS>(
        &seed,
        max_stateful,
    )
    .expect("keygen");
    println!("  keygen took {:?}", t0.elapsed());
    println!("  profile             : {}", hashsigs_rs::shrincs::PROFILE_NAME);
    println!(
        "  public commitment   : 0x{} (32 B, the only on-chain key material)",
        hexs(&public_key.public_key_commitment)
    );
    println!("  public bundle       : {} B (resupplied on every verify)", public_key.to_bytes().len());
    println!(
        "  stateful budget     : {} one-time signatures (leaf counter at {})",
        keys.stateful().public_key().max_signatures,
        keys.stateful().next_leaf_index()
    );
    // Best effort: wipe the raw seed copy we held (crate zeroizes its own paths).
    use zeroize_wipe::wipe;
    wipe(&mut seed);

    let key_dir = Path::new("./keys");

    // ------------------------------------------------------------- sign/verify
    let message = b"attack at dawn? no - quip network hash-based signatures demo 2026";
    let hash = sha256(message);
    println!();
    println!("[2] Signing (stateful everyday path)");
    println!("  message        : {:?}", String::from_utf8_lossy(message));
    println!("  SHA-256(msg)   : 0x{}", hexs(&hash));
    let t1 = std::time::Instant::now();
    let envelope = sign::<SelectedProfile, NUM_CHAINS>(&mut keys, &hash).expect("stateful sign");
    println!("  signed in {:?}; envelope {} B (abi.encode(PublicKey, Signature))", t1.elapsed(), envelope.len());
    println!("  leaf counter now {}", keys.stateful().next_leaf_index());
    // One-time-key discipline (Quip docs): persist state AFTER every stateful
    // sign so the saved leaf counter reflects the consumed one-time leaf.
    save_secret(&keys, key_dir, "shrincs-demo.secret").expect("save secret after sign");

    println!();
    println!("[3] Verifying genuine signature");
    let v = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &hash, &envelope);
    println!("  outcome: {}", outcome_str(v));
    assert_eq!(v, VerifyOutcome::Valid, "genuine signature must verify");
    println!("  OK ✓");

    // tampered variant computed once, reused by sections [4] and [7]
    let mut tampered_bytes = message.to_vec();
    tampered_bytes[0] ^= 0x01;
    let tampered_hash_pre = sha256(&tampered_bytes);

    // ------------------------------------------------------------------ tamper
    println!();
    println!("[4] Tampering with the message (flip one bit)");
    let tampered_hash = tampered_hash_pre;
    let v = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &tampered_hash, &envelope);
    println!("  tampered SHA-256: 0x{}", hexs(&tampered_hash));
    println!("  outcome: {}", outcome_str(v));
    assert_ne!(v, VerifyOutcome::Valid, "tampered message must NOT verify");
    println!("  correctly REJECTED ✓");

    println!();
    println!("[5] Tampering with the signature (flip one bit near the end)");
    let mut tampered_sig = envelope.clone();
    let last = tampered_sig.len() - 1;
    tampered_sig[last] ^= 0x01;
    let v = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &hash, &tampered_sig);
    println!("  outcome: {}", outcome_str(v));
    assert_ne!(v, VerifyOutcome::Valid, "tampered signature must NOT verify");
    println!("  correctly REJECTED ✓");

    println!();
    println!("[6] Tampering with the key commitment (wrong signer)");
    let mut wrong_key = public_key.public_key_commitment.clone();
    wrong_key[0] ^= 0x01;
    let v = ShrincsVerifier::new().verify(&wrong_key, &hash, &envelope);
    println!("  outcome: {}", outcome_str(v));
    assert_ne!(v, VerifyOutcome::Valid, "wrong commitment must NOT verify");
    println!("  correctly REJECTED ✓");

    // ------------------------------------------- stateless break-glass path
    println!();
    println!("[7] Stateless (break-glass / recovery) path: SPHINCS+C, no leaf consumed");
    use hashsigs_rs::shrincs::{encode_stateless_envelope, ShrincsVerifierExt};
    let t2 = std::time::Instant::now();
    let stateless_sig = hashsigs_rs::shrincs::ShrincsSigner::sign_stateless_adapter::<
        SelectedProfile,
        NUM_LAYERS,
    >(&keys, &public_key, hash)
    .expect("stateless sign");
    let stateless_ms = t2.elapsed().as_secs_f64() * 1000.0;
    let stateless_env = encode_stateless_envelope(&public_key, &stateless_sig);
    println!(
        "  signed in {:.1} ms; envelope {} B (big: this is the expensive path)",
        stateless_ms,
        stateless_env.len()
    );
    let v = ShrincsVerifier::new().verify_stateless_signature(
        &public_key.public_key_commitment,
        &hash,
        &stateless_env,
    );
    println!("  verify: {}", outcome_str(v));
    assert_eq!(v, VerifyOutcome::Valid);
    // tampered message must fail here too
    let v = ShrincsVerifier::new().verify_stateless_signature(
        &public_key.public_key_commitment,
        &tampered_hash_pre,
        &stateless_env,
    );
    println!("  verify(tampered msg): {}", outcome_str(v));
    assert_ne!(v, VerifyOutcome::Valid);
    println!(
        "  leaf counter still {} (stateless signing consumes no one-time leaf) ✓",
        keys.stateful().next_leaf_index()
    );

    // ------------------------------------------- persistence + slot discipline
    println!();
    println!("[8] Reloading key from ./keys and signing a SECOND message (next leaf)");
    let mut reloaded = load_secret(key_dir, "shrincs-demo.secret").expect("validating import");
    println!(
        "  reloaded; leaf counter at {} of {}",
        reloaded.stateful().next_leaf_index(),
        reloaded.stateful().public_key().max_signatures
    );
    let msg2 = b"second message: signing from reloaded state uses the next one-time leaf";
    let hash2 = sha256(msg2);
    let envelope2 = sign::<SelectedProfile, NUM_CHAINS>(&mut reloaded, &hash2).expect("sign #2");
    let v = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &hash2, &envelope2);
    println!("  verify(msg#2): {}", outcome_str(v));
    assert_eq!(v, VerifyOutcome::Valid);
    // and the first signature still verifies against its own message
    let v0 = ShrincsVerifier::new().verify(&public_key.public_key_commitment, &hash, &envelope);
    println!("  verify(msg#1) after reload: {}", outcome_str(v0));
    assert_eq!(v0, VerifyOutcome::Valid);
    println!("  OK ✓  (each signature bound to its own message; leaf advanced to {})", reloaded.stateful().next_leaf_index());

    // save the advanced state so a future run continues the chain
    save_secret(&reloaded, key_dir, "shrincs-demo.secret").expect("save advanced secret");

    println!();
    println!("All checks passed: genuine signatures verify; tampered message, tampered");
    println!("signature, and wrong signer key are all rejected. Demo keys are throwaway.");
}

/// Tiny helper so we do not need to add a direct `zeroize` dependency just to
/// scrub the seed buffer we ourselves allocated.
mod zeroize_wipe {
    pub fn wipe(buf: &mut [u8]) {
        buf.fill(0);
    }
}
