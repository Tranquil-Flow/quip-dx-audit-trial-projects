#!/usr/bin/env bash
# Deploys the Quip SHRINCS account stack (verifier, WalletFactory proxy, ShrincsWallet impl)
# onto Aglais, because none of it is deployed there by Quip. Plain CREATE (no CreateX on Aglais).
# Artifacts come from ../vendor/ethereum-sdk (GitLab quip.network/ethereum-sdk @ v1.0.0-rc.2).
# Writes addresses to ./quip-stack.json.
set -euo pipefail
cd "$(dirname "$0")"
RPC=${RPC:-https://evm-rpc.aglais.quip.network:20049}
OUT=../vendor/ethereum-sdk/out
KS=(--keystore ../keys/deployer --password-file ../keys/deployer.pw)
OWNER=$(cat ../keys/deployer.addr)
bc() { jq -r .bytecode.object "$OUT/$1.sol/$1.json"; }

deploy() { # $1 label, $2 initcode
  local line; line=$(cast send --rpc-url "$RPC" "${KS[@]}" --timeout 600 --json --create "$2")
  echo "$1 $(echo "$line" | jq -r '"\(.contractAddress) tx=\(.transactionHash) status=\(.status) gasUsed=\(.gasUsed)"')" >&2
  echo "$line" | jq -r .contractAddress
}

VERIFIER=$(deploy SHRINCS256sKeccak "$(bc SHRINCS256sKeccak)")
FACTORY_IMPL=$(deploy WalletFactoryImpl "$(bc WalletFactory)$(cast abi-encode 'c(uint256)' 1000000000000000000 | cut -c3-)")
INIT=$(cast calldata 'initialize(address)' "$OWNER")
FACTORY=$(deploy WalletFactoryProxy "$(bc ERC1967Proxy)$(cast abi-encode 'c(address,bytes)' "$FACTORY_IMPL" "$INIT" | cut -c3-)")
WALLET_IMPL=$(deploy ShrincsWalletImpl "$(bc ShrincsWallet)$(cast abi-encode 'c(address,address)' "$FACTORY" "$VERIFIER" | cut -c3-)")
echo "vetImplementation:" >&2
cast send --rpc-url "$RPC" "${KS[@]}" --timeout 600 --json "$FACTORY" 'vetImplementation(address)' "$WALLET_IMPL" \
  | jq -r '"tx=\(.transactionHash) status=\(.status) gasUsed=\(.gasUsed)"' >&2

jq -n --arg v "$VERIFIER" --arg fi "$FACTORY_IMPL" --arg f "$FACTORY" --arg w "$WALLET_IMPL" --arg o "$OWNER" \
  '{chainId:20033, shrincsVerifier:$v, walletFactoryImpl:$fi, walletFactory:$f, shrincsWalletImpl:$w, factoryOwner:$o}' > quip-stack.json
cat quip-stack.json
echo "latestWalletImpl: $(cast call --rpc-url "$RPC" "$FACTORY" 'latestWalletImpl()(address)')"
echo "creationFee: $(cast call --rpc-url "$RPC" "$FACTORY" 'creationFee()(uint256)')  executeFee: $(cast call --rpc-url "$RPC" "$FACTORY" 'executeFee()(uint256)')"
