#!/usr/bin/env bash
# End-to-end: solve on Quip (QPU-restricted by default) -> record on Quip Aglais EVM -> read back + verify.
set -euo pipefail
cd "$(dirname "$0")"
MODE=${1:---qpu}   # --qpu (D-Wave-typed miners only) | --open (any miner) | --local (CPU, no chain)
case "$MODE" in
  --qpu)   .venv/bin/python quantum/solve.py --qpu;  RES=out/quip_qpu_result.json ;;
  --open)  .venv/bin/python quantum/solve.py;        RES=out/quip_result.json ;;
  --local) .venv/bin/python quantum/solve.py --local; exit 0 ;;
esac
.venv/bin/python scripts/record_result.py "$RES"
JOB=$(jq -r .metadata.order_id "$RES")
.venv/bin/python scripts/read_result.py --job "$JOB" --verify
