# Friction log

## Search engine did not load

- URL requested: `https://duckduckgo.com`
- Screen: completely blank; the browser reported `chrome-error://chromewebdata/` and HTTP status 0 (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0001.png`).
- Expected: DuckDuckGo's search box.
- Actual: no error text, controls, or recovery action appeared, so I had to try another search engine.

## Google rejected the first search

- URL: Google search for `Quip Network quantum compute QUBO max cut`
- Screen: “Our systems have detected unusual traffic from your computer network” with HTTP 429 and no usable search results (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0005.png`).
- Expected: ordinary search results after using the visible Google search box.
- Actual: the shared browser egress was rate-limited; I had to switch search engines again.

## Bing rendered an empty page

- URL: `https://www.bing.com/`
- Screen: a uniformly dark viewport despite an HTTP 200 response and a valid Bing title (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0006.png`).
- Expected: a visible search box.
- Actual: there were no visible or numbered interactive elements, requiring another search-engine fallback.

## Brave Search CAPTCHA was invisible

- URL: Brave search for `Quip Network quantum compute QUBO max cut`
- Screen: completely blank with title `Captcha - Brave Search` and HTTP 429 (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0009.png`).
- Expected: search results, or at minimum a visible challenge that a person could complete.
- Actual: the search was blocked and no CAPTCHA controls rendered.

## Mojeek also rejected the browser network

- URL: Mojeek search for `Quip Network quantum compute QUBO max cut`
- Screen: `403 - Forbidden` and “Sorry your network appears to be sending automated queries so we can't process your search at this time” (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0012.png`).
- Expected: search results from a smaller engine after Google and Brave blocked the shared egress.
- Actual: another hard block; its only link was “contact us,” which would violate the no-public-posting rule and would not solve the research task promptly.

## Yahoo Search closed the connection

- URL: `https://search.yahoo.com/`
- Screen: none; `qb open` failed before a screenshot with `Page.goto: net::ERR_CONNECTION_CLOSED`.
- Expected: another search-engine fallback.
- Actual: the page could not be opened at all.

## Startpage explicitly suspended the shared connection

- URL: `https://www.startpage.com/` redirected to `https://cdn.startpage.com/sp/cdn/error-pages/blocked.html`.
- Screen: “Access Temporarily Suspended,” explaining that anti-abuse systems trigger on a large number of searches from a shared connection and suggesting another VPN/Tor endpoint (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0013.png`).
- Expected: a search box.
- Actual: hard block. The only action was “Contact Support,” which I did not use because the task forbids public posting/contact and the shared network cannot be changed. This confirmed the common cause of the search failures.

## A trivial QUBO triggered unexplained topology coefficient warnings

- Context: first placed-topology Aglais quote/submission through `SolverQuip`.
- Screen/output: `4 encoded coefficient(s) fall outside this topology's allowed-value set (e.g. j[0] = 500 milli)` followed by a claim that “real hardware rescales coefficients monotonically (the optimum is preserved).”
- Expected: the four-cycle's tiny integer coefficients would either meet a documented topology's range or the warning would identify the topology and its accepted values before submission.
- Actual: submission proceeded, but the quickstart never showed how to inspect the chosen topology's allowed set or how rescaling affects precision. The linked detail was a GitLab source-document URL rather than an explanation in the docs journey.

## Explorer silently discarded a valid submission block hash

- URL: `https://subscan.aglais.quip.network/`
- Screen: the explorer offered a `Substrate Block` search field. I entered the block hash logged by the SDK (`0x743c…fcf52`) and pressed Enter (screenshots `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0031.png` and `0032.png`).
- Expected: the included block, or an explicit validation/not-found message.
- Actual: the field first appeared to clear silently. Opening the type selector then revealed a routed hash URL, but the page said only “We didn't find any results. Try refining your search” (`0033.png`). The SDK log provided no block number or extrinsic hash, making the human explorer path needlessly hard.

## SDK lifecycle status contradicts finality

- Context: read-only `SolverQuip.status(184)` after `solve()` returned successfully.
- Output: `status: "Opened"` together with `is_final: true`, `effective_expiry: 389649`, and current block 389734.
- Expected: a settled/closed status once the result is final.
- Actual: callers must know to trust the separate `is_final` field rather than the human-readable status, an avoidable source of uncertainty when verifying a paid job.

## Explorer displayed the wrong event ID in its heading

- URL: `https://subscan.aglais.quip.network/sub/event/389635-51`
- Screen: the JobProposed event details correctly contained `order_id=184`, but the heading read `Substrate Event 389635-11` (screenshot `/private/tmp/qbrowse/v3-gpt-5.6-sol/shots/0045.png`).
- Expected: event `389635-51`, matching the URL and event row selected.
- Actual: the heading reused extrinsic index 11, which makes evidence citations ambiguous.
