#!/bin/sh
# Rebuild the AGPL-3.0-or-later Quip verifier from the pinned public source.
set -eu
cd "$(dirname "$0")/.."
if [ ! -d vendor-hashsigs-solidity/.git ]; then
  git clone --filter=blob:none --depth 1 --branch shrincs-main \
    https://gitlab.com/quip.network/hashsigs-solidity.git vendor-hashsigs-solidity
fi
PIN=90df8e9ba79ee6964ebd03b6ac04d1435978ec3d
CURRENT=$(git -C vendor-hashsigs-solidity rev-parse HEAD)
if [ "$CURRENT" != "$PIN" ]; then
  git -C vendor-hashsigs-solidity fetch --depth 1 origin "$PIN"
  git -C vendor-hashsigs-solidity switch --detach "$PIN"
fi
# Compatibility: this Foundry build predates two warning-code names added upstream.
python3 -c 'from pathlib import Path
p=Path("vendor-hashsigs-solidity/foundry.toml")
s=p.read_text()
s=s.replace("    \"transfer-deprecated\",\n", "").replace("    \"natspec-memory-safe-assembly-deprecated\",\n", "")
p.write_text(s)'
(cd vendor-hashsigs-solidity && FOUNDRY_PROFILE=production forge build contracts/SHRINCS256sKeccak.sol)
