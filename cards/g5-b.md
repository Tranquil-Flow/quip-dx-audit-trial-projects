# g5-b

- **Round:** Round 3
- **Model:** GPT-5.6
- **Task:** QUBO locally and on testnet compute
- **Source:** not retained. The agent worked in a temporary directory that was later deleted; only the report card below survives.

## Summary (report section 7)

| Task | Model | Quip components | Outcome | Time | Notes |
|---|---|---|---|---|---|
| QUBO locally and on testnet compute | GPT-5.6 | xquad/xqsa, quip-signer, faucet, Subscan API | Built and working on testnet | 15 min | `quip-signer` builds from source on macOS and fails under a parent Cargo workspace [C-CMP-11, C-R5-09, C-TRL-22, C-R4-22]. Independently rebuilt and confirmed. |

## Trial card

- **Model:** GPT-5.6.
- **What it does:** A Python CLI that defines a 4-variable maximum-weight-independent-set QUBO, verifies its unique optimum by enumeration, solves it locally with xquad's CPU adapter and on Aglais with `SolverQuip` (native topology, faucet autofund, genesis-hash guard), writes JSON evidence and re-verifies the proposal through the Subscan API.
- **Quip products and integration:** `xquad` / `xqsa` `SolverDWaveCPU` and `SolverQuip`, `quip-signer`, Aglais faucet and Subscan API — NATIVE.
- **Evidence:** Order 179 on Aglais (5 submissions, final); `propose_job` extrinsic [0xf920ce02f4b0557f0bb529313466e42d823cfcb9cce9196f838733ae6ecd6fbc](https://subscan.aglais.quip.network/sub/extrinsic/0xf920ce02f4b0557f0bb529313466e42d823cfcb9cce9196f838733ae6ecd6fbc) (block 389539). The builder disclosed a patched `quip-signer` sdist and a private-method override to capture the extrinsic. First rebuild: works, with its own order 194 and propose_job [0x0ebaaab78942697eae50256e7f20a1a64f222b1cda226ee9e902f663c1453e40](https://subscan.aglais.quip.network/sub/extrinsic/0x0ebaaab78942697eae50256e7f20a1a64f222b1cda226ee9e902f663c1453e40). Second rebuild: works (order 213, same result).
- **Time:** 15 min.
- **What got in the way:** When this run read the Submit a Job page, at about 09:40 UTC on 2026-09-29, the page still said that connection details were unpublished [[C-CMP-01](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Connection%20details%20for%20the%20public%20test%20network%20have%20not%20been%20published%20yet)]. Quip's fix had been merged at 07:08 UTC, and runs that read the page from about 09:45 UTC saw the new version. Install lines disagree across pages [[C-CMP-13](https://developers.quip.network/llms.txt#:~:text=pip%20install%20%22xqsa%5Bquip%5D%22)]. `quip-signer` has no macOS wheel, so the install builds Rust from source [[C-CMP-11](https://pypi.org/project/xqffi/0.4.1/)], and its sdist crates claim to be their own workspace without a workspace table, so the build fails under a parent Cargo workspace [[C-R5-09](https://pypi.org/project/quip-signer/0.3.0/)]. Subscan routes 404 [[C-NET-10](https://subscan.aglais.quip.network/account/0x0fB3366B98302D61Ee216B607576cC147A509e8B)]. The job result omits the extrinsic hash [[C-TRL-22](https://github.com/QuipNetwork/xquad/blob/5239d71bfbd025a91f06d872ad7e98da4b5e4556/xqsa/quip.py#L1140-L1156)]. Order status stays "Opened" after finality [[C-R4-22](https://developers.quip.network/docs/compute/submit-a-job#:~:text=The%20order%20closes%20at%20whichever%20comes%20first%2C%20the%20hard%20deadline%20or%20the%20end%20of%20that%20window)]. `topology="native"` is documented only in the GitLab book [[C-TRL-17](https://developers.quip.network/docs/compute/submit-a-job#:~:text=Arbitrary%20problem%20shapes%20are%20not%20yet%20supported)].
