#!/usr/bin/env python3
"""Verify the recorded Quip proposal against the public Aglais Subscan API."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parent
TESTNET_OUTPUT = PROJECT_ROOT / "outputs" / "testnet.json"
VERIFICATION_OUTPUT = PROJECT_ROOT / "outputs" / "subscan_verification.json"
SUBSCAN_API = "https://subscan.aglais.quip.network/api/scan/extrinsic"
EXPECTED_ISING = {
    "nodes": [0, 1, 2, 3],
    "edges": [{"col1": 0, "col2": 1}, {"col1": 1, "col2": 2}, {"col1": 2, "col2": 3}],
    "h_values": [0, 2000, 1000, 1000],
    "j_values": [1500, 1500, 1500],
    "min_energy_milli": None,
    "min_diversity_milli": None,
    "min_solutions": None,
}


def fetch_extrinsic(extrinsic_hash: str) -> dict[str, Any]:
    request = urllib.request.Request(
        SUBSCAN_API,
        data=json.dumps({"hash": extrinsic_hash}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    if not isinstance(body, dict):
        raise RuntimeError("Subscan returned a non-object response")
    return body


def main() -> None:
    testnet = json.loads(TESTNET_OUTPUT.read_text())
    proposal = next(
        item
        for item in testnet["testnet"]["extrinsics"]
        if item["call_function"] == "propose_job"
    )
    response = fetch_extrinsic(proposal["extrinsic_hash"])
    if response.get("code") != 0 or not isinstance(response.get("data"), dict):
        raise RuntimeError(f"Subscan query failed: {response}")

    data = response["data"]
    params = {
        parameter["name"]: parameter["value"]
        for parameter in data.get("params", [])
    }
    checks = {
        "hash_matches": data.get("extrinsic_hash") == proposal["extrinsic_hash"],
        "block_matches": int(data.get("block_num")) == testnet["testnet"]["order_status"]["created_at"],
        "call_matches": (
            data.get("call_module") == "QuantumComputeMempool"
            and data.get("call_module_function") == "propose_job"
        ),
        "dispatch_succeeded": data.get("success") is True,
        "subscan_reports_finalized": data.get("finalized") is True,
        "ising_payload_matches": params.get("ising_params") == EXPECTED_ISING,
        "reward_matches_quote": int(params.get("reward"))
        == testnet["testnet"]["quote_before_funding"]["reward_planck"],
        "deadline_matches": params.get("deadline_blocks") == 100,
        "block_wait_matches": params.get("block_wait") == 10,
    }
    output = {
        "status": "WORKING" if all(checks.values()) else "PARTIAL",
        "api_url": SUBSCAN_API,
        "extrinsic_hash": data.get("extrinsic_hash"),
        "extrinsic_index": data.get("extrinsic_index"),
        "block_number": data.get("block_num"),
        "account_ss58": data.get("account_id"),
        "call_module": data.get("call_module"),
        "call_function": data.get("call_module_function"),
        "fee_planck": int(data.get("fee")),
        "finalized": data.get("finalized"),
        "success": data.get("success"),
        "decoded_ising_params": params.get("ising_params"),
        "checks": checks,
    }
    VERIFICATION_OUTPUT.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")
    print(json.dumps(output, indent=2, sort_keys=True))
    if output["status"] != "WORKING":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
