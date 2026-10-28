# -*- coding: utf-8 -*-
"""Submit the shared QUBO to Quip Network's aglais testnet via SolverQuip.

Flow:
  1. Create/load a brand-new throwaway keystore under ./keys (never ~/.quip).
  2. Connect via SolverQuip.for_network("aglais").
  3. Quote the job; try the chain's default topology first, fall back to
     topology="native" (model's own coupling graph) on PlacementError.
  4. If the fresh account is short, pull one 10-AGLS drip from the public
     faucet (https://faucet.aglais.quip.network/request) and wait for the
     balance to cover the quote.
  5. Capture the propose_job extrinsic hash via _prepare(), then solve()
     (propose + poll until final by block height) and save everything.
"""

import json
import logging
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from qubo import brute_force, build_model, energy, model_spec, sample_to_dict  # noqa: E402
from xqsa import SolverQuip  # noqa: E402
from xqsa.quip_codec import PlacementError  # noqa: E402
from xqsa.quip_signing import generate_keystore, load_keystore  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

ROOT = Path(__file__).resolve().parent.parent
KEYSTORE = ROOT / "keys" / "keystore.json"
ACCOUNT_FILE = ROOT / "keys" / "ACCOUNT.txt"
OUT = Path(__file__).parent / "network_result.json"
FAUCET = "https://faucet.aglais.quip.network/request"
TIMEOUT = 600
POLL_INTERVAL = 6


def account_ss58(account_id: bytes) -> str:
    from substrateinterface.utils.ss58 import ss58_encode

    return ss58_encode(account_id, 42)


def faucet_drip(account_hex: str) -> dict:
    body = json.dumps({"dest": account_hex}).encode()
    req = urllib.request.Request(
        FAUCET, data=body, headers={"content-type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return {"status": resp.status, "body": json.loads(resp.read().decode())}


def main() -> int:
    model = build_model()
    opt_energy, _ = brute_force()

    # --- keys ------------------------------------------------------------
    if KEYSTORE.exists():
        ks = load_keystore(KEYSTORE)
        created = False
    else:
        ks = generate_keystore(KEYSTORE)
        created = True
    account_hex = "0x" + bytes(ks.account_id).hex()
    ss58 = account_ss58(bytes(ks.account_id))
    print(f"keystore: {KEYSTORE} (created={created})")
    print(f"account : {ss58}  {account_hex}")
    ACCOUNT_FILE.write_text(f"ss58: {ss58}\nhex: {account_hex}\nkeystore: {KEYSTORE}\n")

    # --- solver ----------------------------------------------------------
    solver = SolverQuip.for_network(
        "aglais",
        keystore=str(KEYSTORE),
        autoconfirm=True,
        autofund=True,
        timeout=TIMEOUT,
        poll_interval=POLL_INTERVAL,
    )

    # --- placement: default chain topology first, fall back to native ----
    topo = None  # None = chain DefaultTopology
    quote = None
    try:
        quote = solver.quote(model)
        print("placement: default chain topology OK")
    except PlacementError as exc:
        print(f"placement: default topology failed ({type(exc).__name__}: {exc}); "
              f"falling back to topology='native'")
        topo = "native"
        quote = solver.quote(model, topology="native")
    print(quote)

    # --- funding ----------------------------------------------------------
    faucet_result = None
    if quote.shortfall_planck:
        print(f"shortfall {quote.shortfall_planck} planck; requesting faucet drip")
        faucet_result = faucet_drip(account_hex)
        print("faucet:", json.dumps(faucet_result))
        deadline = time.monotonic() + 90
        while solver._free_balance() < quote.total_planck:
            if time.monotonic() > deadline:
                raise SystemExit("faucet drip did not land in time")
            time.sleep(POLL_INTERVAL)
        print("balance covers the quote")
    else:
        print("balance already covers the quote (no drip needed)")

    # --- capture extrinsic hash + solve -----------------------------------
    solve_kwargs = {}
    if topo:
        solve_kwargs["topology"] = topo
    job, wire, ext_hash, final_quote = solver._prepare(model, solve_kwargs)
    print("propose_job extrinsic hash:", ext_hash)
    print(final_quote)

    t0 = time.time()
    try:
        res = solver.solve(model, **solve_kwargs)
        error = None
    except Exception as exc:  # record any typed failure (timeout, job failed, ...)
        res = None
        error = {"type": type(exc).__name__, "message": str(exc)}
        order_id = getattr(exc, "order_id", None)
        if order_id is not None:
            error["order_id"] = order_id
        print("solve failed:", error)
    wall = time.time() - t0

    result = {
        "network": "aglais",
        "model": model_spec(),
        "brute_force_optimum_energy": opt_energy,
        "account_ss58": ss58,
        "account_hex": account_hex,
        "keystore": str(KEYSTORE),
        "keystore_created": created,
        "topology_used": topo or "chain DefaultTopology",
        "extrinsic_hash": ext_hash,
        "quote": {
            "reward_planck": final_quote.reward_planck,
            "fee_planck": final_quote.fee_planck,
            "fee_exact": final_quote.fee_exact,
            "balance_planck": final_quote.balance_planck,
            "token_symbol": final_quote.token_symbol,
            "token_decimals": final_quote.token_decimals,
        },
        "faucet": faucet_result,
        "wall_seconds": wall,
        "error": error,
    }
    if res is not None:
        x = sample_to_dict(res.sample)
        result["solution"] = {
            "sample": [x[i] for i in range(model.size)],
            "energy": res.energy,
            "recomputed_energy_local": energy(x),
            "energy_matches_local_recompute": res.energy == energy(x),
            "is_optimal": energy(x) == opt_energy,
            "timing_solver": res.timing,
            "metadata": res.metadata,
        }
    OUT.write_text(json.dumps(result, indent=2))
    print("saved", OUT)
    print(json.dumps(result.get("solution", result), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
