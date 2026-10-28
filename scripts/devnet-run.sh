#!/bin/bash
# Full devnet run: create PQ smart account + WOTS+ transfer + show (once funded).
# Prereq: keys/payer.json etc. exist (node dist/quipwallet.cjs generate) and payer has SOL.
set -euo pipefail
cd "$(dirname "$0")/.."
RECIP=${1:-}
if [ -z "$RECIP" ]; then
  RECIP=$(node -e "const {Keypair}=require('@solana/web3.js'); const fs=require('fs');
    let p='keys/devnet-recipient.json';
    if(!fs.existsSync(p)){const k=Keypair.generate(); fs.writeFileSync(p, JSON.stringify({secretKey:Array.from(k.secretKey), publicKey:k.publicKey.toBase58()}));}
    console.log(JSON.parse(fs.readFileSync(p)).publicKey)")
  echo "recipient (fresh, keys/devnet-recipient.json): $RECIP"
fi
node dist/quipwallet.cjs create 0.05
node dist/quipwallet.cjs transfer "$RECIP" 0.01
node dist/quipwallet.cjs show
echo "recipient balance:"
node -e "const {Connection,PublicKey}=require('@solana/web3.js');
  new Connection('https://api.devnet.solana.com').getBalance(new PublicKey('$RECIP')).then(b=>console.log(b/1e9,'SOL'))"
