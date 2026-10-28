# FRICTION

Every moment a real developer would be confused, misled, stuck, or annoyed.

1. https://duckduckgo.com/?q=Quip+Network+developer+docs
   Screen showed: "Unfortunately, bots use DuckDuckGo too. Please complete the following
   challenge to confirm this search was made by a human." with a 3x3 image grid
   ("Select all squares containing a duck").
   Expected: normal search results. Got: a CAPTCHA. Then
   https://www.google.com/search?q=Quip+Network+developer+docs showed Google's /sorry
   CAPTCHA too. Two search engines in a row blocked a plain documentation search — a
   frustrating start when the goal is just to read vendor docs.

2. Bing results for "Quip Network developer docs"
   Screen showed: results for quip.com ("real-time collaborative documents", Salesforce),
   getquip.com ("Dentist-Recommended Electric Toothbrushes"), and Wikipedia's "Quip
   (software)".
   Expected: Quip Network, the quantum-compute blockchain. Got: a docs suite and a
   toothbrush brand. The project does not rank for its own name on Bing, and the name
   collides with two well-known brands. The vendor should own the term "Quip Network"
   in search results.

3. https://quip.network/ — clicked the "Docs" nav item
   Screen showed: the homepage again, unchanged.
   Expected: to land on documentation. Got: nothing — the click was silently swallowed
   (anchor link not followed by the browser harness). Only `qb url` revealed the real
   destination https://developers.quip.network/docs. A visible, conventional
   /docs or docs.quip.network URL would remove the guesswork.

4. Docs Quickstart page
   Screen showed: "Run a node" and "Generate quantum-resistant keys" as the only two
   quickstart tasks; the code path is a GitLab release download of a desktop app.
   Expected: a copy-pasteable "hello world" for developers (SDK install + one script).
   Got: node-running orientation. The actual 10-line compute demo is buried two levels
   deeper under COMPUTE > Submit Your First Compute Job.

5. https://developers.quip.network/docs/getting-started/quip-sdk
   Screen showed: install table with npm/pip commands, and a warning box that the
   `latest` npm tag "resolves to outdated builds from 2025".
   Expected: a current default install (`npm install @quip.network/ethereum-sdk`).
   Got: mandatory @beta/@rc tags, with a warning that the plain package name installs
   year-old code. This will bite every new developer who skims the table.

6. https://developers.quip.network/docs/compute/submit-a-job — the example code
   Screen showed:
     from xqmx import XQMX
     model.set_quadratic((0, 1, 2))
   Expected: working code. Got: `ModuleNotFoundError: No module named 'xqmx'` — the real
   import is `from xqsa.solver import XQMX`. And `set_quadratic((0,1,2))` raises
   `TypeError: missing 2 required positional arguments` — the real signature is
   `set_quadratic(i, j, value)`. The flagship tutorial code block does not run as printed;
   that is the single most damaging doc bug for a new developer.

7. Quip SDK docs, "Packages that do not exist yet"
   Screen showed: `@quip.network/quip-swap` and `@quip.network/sdk` listed as
   "not publicly available".
   Expected: only published packages in an install guide. Got: a table row for
   non-existent packages. Confusing — I had to re-read to avoid trying to install them.

8. First network solve attempt
   Screen showed: "QuipTimeoutError: order 196 did not reach finality before the timeout"
   after ~30s.
   Expected: the docs' default example to work out of the box. Got: a timeout because the
   SolverQuip constructor's default `timeout=600` had to be shortened to connect, and
   miners need >30s on a quiet testnet. A beginner would think the network is broken;
   the docs never mention that job finality takes on the order of minutes.

9. First successful solve produced nonsense semantics
   Screen showed: spins [1,1,1,...] (all same), "Cuts: 0/15" with negative couplings.
   Expected: an obvious Max-Cut formulation. Got: I had to re-derive the sign convention
   from the energy formula myself. The docs explain "coupling rewards agreeing or
   disagreeing spins" but give no worked Max-Cut example showing which sign to use, and
   nothing explains that `binary_model` uses {0,1} while `spin_model` uses {-1,+1} until
   you read the class docs in the source.

10. SolverQuip initialization appeared to hang
    Screen showed: no output for 30+ seconds on `SolverQuip.for_network("aglais", ...)`.
    Expected: quick connect or a clear error. Got: silent multi-second initialization
    (chain metadata fetch). No progress indication anywhere.

11. Coefficient warning during solve
    Screen showed: "25 encoded coefficient(s) fall outside this topology's allowed-value
    set (e.g. h[0] = 750000 milli)."
    Expected: example coefficients from the docs that are in-range. Got: warnings on the
    tutorial's own values (SCALE=1000 couplings exceed the topology's allowed set),
    pointing to a GitLab link. The docs should show a value range that actually fits the
    default topology, or the warning should say what to change.
