#!/usr/bin/env bash
# Verify a Quip WOTS+ signature on the Aglais testnet (Quip Network, chainId 20033).
# Usage: script/testnet-verify.sh <verifierAddress> <fixture.json> [--consume]
set -euo pipefail
RPC=${RPC:-https://evm-rpc.aglais.quip.network:20049}
V=$1; F=$2
j() { python3 -c "import json,sys;d=json.load(open('$F'));print($1)"; }
SEED=$(j "d['publicSeed']"); PKH=$(j "d['publicKeyHash']"); MSG=$(j "d['messageHash']")
SIG=$(j "'['+','.join(d['signature'])+']'")
BAD=$(j "'['+','.join(d['signature'][:10]+[hex(int(d['signature'][10],16)^1).replace('0x','0x'+'0'*(66-len(hex(int(d['signature'][10],16)^1))))]+d['signature'][11:])+']'")
SIGT='verify(bytes32,bytes32,bytes32,bytes32[67])(bool)'
echo "valid    eth_call verify -> $(cast call $V "$SIGT" $SEED $PKH $MSG "$SIG" --rpc-url $RPC)"
echo "tampered eth_call verify -> $(cast call $V "$SIGT" $SEED $PKH $MSG "$BAD" --rpc-url $RPC)"
echo "wrongmsg eth_call verify -> $(cast call $V "$SIGT" $SEED $PKH $(cast keccak tampered) "$SIG" --rpc-url $RPC)"
if [[ "${3:-}" == "--consume" ]]; then
  PK=$(python3 -c "import json;print(json.load(open('keys/deployer.json'))[0]['private_key'])")
  echo "--- tampered verifyAndConsume tx (expected to revert InvalidQuipSignature):"
  cast send $V 'verifyAndConsume(bytes32,bytes32,bytes32,bytes32[67])' $SEED $PKH $MSG "$BAD" --rpc-url $RPC --private-key $PK 2>&1 | tail -3 || true
  echo "--- valid verifyAndConsume tx:"
  cast send $V 'verifyAndConsume(bytes32,bytes32,bytes32,bytes32[67])' $SEED $PKH $MSG "$SIG" --rpc-url $RPC --private-key $PK --json \
    | python3 -c "import json,sys;r=json.load(sys.stdin);print('tx',r['transactionHash'],'status',r['status'],'gasUsed',int(r['gasUsed'],16),'logs',len(r['logs']))"
  echo "usedPublicKey($PKH) -> $(cast call $V 'usedPublicKey(bytes32)(bool)' $PKH --rpc-url $RPC)"
fi
