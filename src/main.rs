//! Demo: Quip Network post-quantum hash-based signatures (SHRINCS, via `hashsigs-rs`).
use hashsigs_rs::profiles::selected::{SelectedProfile, NUM_CHAINS, NUM_LAYERS};
use hashsigs_rs::shrincs::{ActionContext, ShrincsSigner, ShrincsVerifier};
use sha2::{Digest, Sha256};
use std::{fs, path::Path, time::Instant};

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn ctx(message: &[u8]) -> ActionContext {
    let mut one = [0u8; 32];
    one[31] = 1;
    ActionContext {
        domain_separator: Sha256::digest(b"quip-pq-demo").into(),
        nonce: one,
        key_version: one,
        action_type: one,
        payload_hash: Sha256::digest(message).into(),
    }
}

fn main() {
    // Throwaway seed lives in ./keys (never printed).
    let seed_path = Path::new("keys/demo_seed.bin");
    if !seed_path.exists() {
        fs::create_dir_all("keys").unwrap();
        let mut s = [0u8; 32];
        getrandom::fill(&mut s).unwrap();
        fs::write(seed_path, s).unwrap();
        println!("generated new throwaway seed in {}", seed_path.display());
    }
    let seed = fs::read(seed_path).unwrap();

    let t = Instant::now();
    let (mut sk, pk) = ShrincsSigner::keygen::<SelectedProfile, NUM_CHAINS, NUM_LAYERS>(&seed, 4)
        .expect("keygen");
    println!("keygen: {:?}", t.elapsed());
    println!("public key commitment: 0x{}", hex(&pk.public_key_commitment));

    let message = b"pay 100 units to account 42";
    let c = ctx(message);
    let t = Instant::now();
    let sig = ShrincsSigner::sign_stateful_action::<SelectedProfile, NUM_CHAINS>(&mut sk, &pk, &c)
        .expect("sign");
    println!("sign (stateful path): {:?}, {} bytes", t.elapsed(), sig.to_bytes().len());

    let commitment: [u8; 32] = pk.public_key_commitment.as_slice().try_into().expect("32 bytes");
    let v = ShrincsVerifier::new();
    let ok = v.verify_stateful(commitment, &pk, &c, &sig);
    println!("verify original message : {}", if ok { "VALID" } else { "INVALID" });

    let tampered = ctx(b"pay 999 units to account 42");
    let bad = v.verify_stateful(commitment, &pk, &tampered, &sig);
    println!("verify tampered message : {}", if bad { "VALID (BUG!)" } else { "INVALID (expected)" });

    if !ok || bad {
        std::process::exit(1);
    }
}
