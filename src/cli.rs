//! Command-line interface.

use crate::crypto;
use crate::rpc::Rpc;
use crate::substrate;
use std::path::PathBuf;
use std::time::Duration;

const DEFAULT_RPC: &str = "https://bootnode-1.aglais.quip.network:20049/rpc";
const DEFAULT_FAUCET: &str = "https://faucet.aglais.quip.network/request";
const SUBSCAN_BASE: &str = "https://subscan.aglais.quip.network";

fn usage() -> ! {
    eprintln!(
        "agls-tool — Substrate-side CLI for Quip Network's Aglais testnet

USAGE:
  agls-tool keygen                       generate a throwaway H4 keypair (saved to ./keys/)
  agls-tool faucet <address>             request 10 AGLS from the official faucet
  agls-tool balance <address>            query AGLS balance via Substrate RPC (System.Account)
  agls-tool transfer --seed <seedfile|0xseed> --to <address> --amount <AGLS> [--dry-run] [--no-wait]
  agls-tool wait <txhash>                poll finalized blocks until the tx is included

FLAGS:
  --rpc <url>      Substrate JSON-RPC endpoint
                   (default {DEFAULT_RPC}; env AGLS_RPC also works)
  --faucet <url>   faucet endpoint (default {DEFAULT_FAUCET})

Addresses may be SS58 (prefix 42) or 0x-prefixed 64-hex AccountIds.
Amounts are decimal AGLS (12 decimals)."
    );
    std::process::exit(2);
}

struct Args {
    command: String,
    positional: Vec<String>,
    rpc: String,
    faucet: String,
    seed: Option<String>,
    to: Option<String>,
    amount: Option<String>,
    dry_run: bool,
    no_wait: bool,
}

fn parse_args() -> Args {
    let mut args = Args {
        command: String::new(),
        positional: Vec::new(),
        rpc: std::env::var("AGLS_RPC").unwrap_or_else(|_| DEFAULT_RPC.to_string()),
        faucet: DEFAULT_FAUCET.to_string(),
        seed: None,
        to: None,
        amount: None,
        dry_run: false,
        no_wait: false,
    };
    let argv: Vec<String> = std::env::args().skip(1).collect();
    if argv.is_empty() {
        usage();
    }
    args.command = argv[0].clone();
    let mut i = 1;
    while i < argv.len() {
        match argv[i].as_str() {
            "--rpc" => {
                i += 1;
                args.rpc = argv.get(i).cloned().unwrap_or_else(|| usage());
            }
            "--faucet" => {
                i += 1;
                args.faucet = argv.get(i).cloned().unwrap_or_else(|| usage());
            }
            "--seed" => {
                i += 1;
                args.seed = Some(argv.get(i).cloned().unwrap_or_else(|| usage()));
            }
            "--to" => {
                i += 1;
                args.to = Some(argv.get(i).cloned().unwrap_or_else(|| usage()));
            }
            "--amount" => {
                i += 1;
                args.amount = Some(argv.get(i).cloned().unwrap_or_else(|| usage()));
            }
            "--dry-run" => args.dry_run = true,
            "--no-wait" => args.no_wait = true,
            other => args.positional.push(other.to_string()),
        }
        i += 1;
    }
    args
}

fn load_seed(spec: &str) -> Result<[u8; 32], String> {
    let t = spec.trim();
    if let Some(h) = t.strip_prefix("0x").or_else(|| t.strip_prefix("0X")) {
        if h.len() != 64 {
            return Err("seed hex must be 64 digits (32 bytes)".into());
        }
        let bytes = hex::decode(h).map_err(|e| format!("bad seed hex: {e}"))?;
        let mut seed = [0u8; 32];
        seed.copy_from_slice(&bytes);
        return Ok(seed);
    }
    let path = PathBuf::from(t);
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("cannot read seed file {}: {e}", path.display()))?;
    let h = content.trim().trim_start_matches("0x");
    if h.len() != 64 {
        return Err(format!(
            "seed file {} must contain a 64-digit hex seed (32 bytes)",
            path.display()
        ));
    }
    let bytes = hex::decode(h).map_err(|e| format!("bad seed file hex: {e}"))?;
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&bytes);
    Ok(seed)
}

fn cmd_keygen() -> Result<(), String> {
    let seed = crypto::random_seed();
    let (_, public) = crypto::keypair_from_seed(&seed);
    let account = crypto::account_id_from_public(&public);
    let ss58 = crypto::ss58_encode(&account);
    let keys_dir = std::path::Path::new("keys");
    std::fs::create_dir_all(keys_dir).map_err(|e| e.to_string())?;
    let seed_hex = hex::encode(seed);
    let fname = format!("seed-{}.txt", &seed_hex[..10]);
    let path = keys_dir.join(&fname);
    std::fs::write(&path, format!("{seed_hex}\n")).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }
    println!("THROWAWAY KEY — testnet only, holds no value, do not reuse.");
    println!("seed file:  {}", path.display());
    println!("seed hex:   {seed_hex}");
    println!("public key: 929 bytes (sr25519 + FN-DSA-512, H4)");
    println!("account id: 0x{}", hex::encode(account));
    println!("ss58:       {ss58}");
    println!("next: run `agls-tool faucet {ss58}` then `agls-tool balance {ss58}`");
    Ok(())
}

fn cmd_faucet(rpc: &Rpc, faucet: &str, address: &str) -> Result<(), String> {
    let _ = rpc; // faucet is independent of the substrate RPC
    let body = serde_json::json!({ "dest": address });
    let resp = ureq::post(faucet)
        .set("content-type", "application/json")
        .set("user-agent", "curl/8.0") // the faucet refuses browser calls
        .timeout(Duration::from_secs(60))
        .send_string(&body.to_string())
        .map_err(|e| format!("faucet request failed: {e}"))?;
    let status = resp.status();
    let text = resp.into_string().unwrap_or_default();
    println!("HTTP {status}: {text}");
    Ok(())
}

fn cmd_balance(rpc: &mut Rpc, address: &str) -> Result<(), String> {
    let account = crypto::parse_account(address)?;
    println!("rpc:     {}", rpc.url());
    println!("account: {} (0x{})", crypto::ss58_encode(&account), hex::encode(account));
    let (info, number) = substrate::query_balance(rpc, &account)?;
    println!(
        "free:     {} AGLS ({} planck)",
        crypto::format_agls(info.free),
        info.free
    );
    println!("reserved: {} AGLS", crypto::format_agls(info.reserved));
    println!("frozen:   {} AGLS", crypto::format_agls(info.frozen));
    println!("nonce:    {}", info.nonce);
    if let Some(n) = number {
        println!("head:     #{}", n);
    }
    Ok(())
}

fn cmd_transfer(args: &Args, rpc: &mut Rpc) -> Result<(), String> {
    let seed_spec = args.seed.as_deref().ok_or("--seed <file|0xhex> is required")?;
    let to = args.to.as_deref().ok_or("--to <address> is required")?;
    let amount = args.amount.as_deref().ok_or("--amount <AGLS> is required")?;

    let seed = load_seed(seed_spec)?;
    let dest = crypto::parse_account(to)?;
    let value = crypto::parse_agls(amount)?;

    let (_, public) = crypto::keypair_from_seed(&seed);
    let sender = crypto::account_id_from_public(&public);
    let sender_ss58 = crypto::ss58_encode(&sender);

    println!("rpc:     {}", rpc.url());
    println!("sender:  {} (0x{})", sender_ss58, hex::encode(sender));
    println!("to:      {} (0x{})", crypto::ss58_encode(&dest), hex::encode(dest));
    println!("amount:  {} AGLS", crypto::format_agls(value));

    let (info, _) = substrate::query_balance(rpc, &sender)?;
    println!(
        "balance: {} AGLS ({} planck)",
        crypto::format_agls(info.free),
        info.free
    );
    println!("nonce:   {}", info.nonce);

    let built = substrate::build_signed_transfer(&seed, &dest, value, info.nonce)?;
    println!("tx hash:        {}", built.tx_hash);
    println!(
        "extrinsic size: {} bytes (envelope {} bytes, payload {} bytes{})",
        (built.extrinsic_hex.len() - 2) / 2,
        built.envelope_len,
        (built.payload_hex.len() - 2) / 2,
        if built.message_hashed { ", payload >256B: signed blake2-256 hash" } else { "" }
    );

    // Fee estimate (best effort — informational only).
    match rpc.payment_query_info(&built.extrinsic_hex) {
        Ok(info) => {
            let fee = info["partialFee"].as_str().unwrap_or("?");
            let planck = u128::from_str_radix(fee.trim_start_matches("0x"), 16).ok();
            match planck {
                Some(p) => println!("fee:     {} AGLS ({} planck)", crypto::format_agls(p), p),
                None => println!("fee:     {fee} (raw)"),
            }
        }
        Err(e) => eprintln!("fee estimate unavailable: {e}"),
    }

    if args.dry_run {
        println!("dry-run: extrinsic NOT submitted");
        println!("payload_hex:    {}", built.payload_hex);
        println!("extrinsic_hex:  {}", built.extrinsic_hex);
        return Ok(());
    }

    println!("submitting…");
    let (block, index) =
        substrate::submit_and_wait(rpc, &built.extrinsic_hex, &built.tx_hash, Duration::from_secs(150))?;
    println!();
    println!("INCLUDED in finalized block #{block}, extrinsic index {index}");
    println!("tx hash:  {}", built.tx_hash);
    println!("subscan extrinsic: {SUBSCAN_BASE}/sub/extrinsic/{block}-{index}");
    println!("subscan block:     {SUBSCAN_BASE}/sub/block/{block}");
    println!("subscan sender:    {SUBSCAN_BASE}/sub/account/{}", sender_ss58);
    println!("subscan recipient: {SUBSCAN_BASE}/sub/account/{}", crypto::ss58_encode(&dest));
    Ok(())
}

fn cmd_wait(rpc: &mut Rpc, txhash: &str) -> Result<(), String> {
    let (block, index) = substrate::submit_and_wait(rpc, "", txhash, Duration::from_secs(150))?;
    println!("tx {txhash} is in finalized block #{block}, extrinsic index {index}");
    println!("subscan: {SUBSCAN_BASE}/sub/extrinsic/{block}-{index}");
    Ok(())
}

pub fn run() {
    let args = parse_args();
    let mut rpc = Rpc::new(&args.rpc);
    let result = match args.command.as_str() {
        "keygen" => cmd_keygen(),
        "faucet" => {
            let addr = args.positional.first().cloned().unwrap_or_else(|| usage());
            cmd_faucet(&rpc, &args.faucet, &addr)
        }
        "balance" => {
            let addr = args.positional.first().cloned().unwrap_or_else(|| usage());
            cmd_balance(&mut rpc, &addr)
        }
        "transfer" => cmd_transfer(&args, &mut rpc),
        "wait" => {
            let h = args.positional.first().cloned().unwrap_or_else(|| usage());
            cmd_wait(&mut rpc, &h)
        }
        other => {
            eprintln!("unknown command: {other}");
            usage();
        }
    };
    if let Err(e) = result {
        eprintln!("ERROR: {e}");
        std::process::exit(1);
    }
}
