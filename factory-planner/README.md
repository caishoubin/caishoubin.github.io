# Belt & Buffer

Buildless English-language Satisfactory solid-item logistics tool for https://caishoubin.github.io/factory-planner/. The live HTML files are the source of truth. No package install or build is required. Do not regenerate these pages from an older external `site-build` copy.

## Files

- `calculations.js`: pure validated model, exposed as `FactoryMath` or CommonJS. Six belt tiers, independent parallel vs single-route calculations, tier comparison, inventory and outage/recovery calculations.
- `plans.js`: versioned validated plan format, local storage key, serialization and URL-fragment codec. No external requests.
- `app.js`: accessible keyboard tabs, presets, live validation, tier selection, storage helper, clipboard summaries, opt-in remembering, hash-link loading and reset.
- `index.html`, `styles.css`: calculator and responsive field-tool design.
- `guides/`: worked examples with shareable snapshot links.
- `privacy.html`, `sources.html`, `about.html`: data handling, model assumptions and publisher.
- `tests/`: dependency-free Node model/plan/simulated-DOM tests and Python static-site validator. Browser smoke testing is separate.

## Run and test

Serve the repository root with an approved static-server workflow, then open `/factory-planner/`. All runtime assets are local relative paths.

```sh
node --check app.js
node --check calculations.js
node --check plans.js
node --test tests/*.test.cjs
python tests/validate_site.py
```

Optional real-browser smoke tests require an existing Playwright installation and Chromium. Set `BASE_URL` to the deployed tool or an approved local preview. `CHROMIUM_PATH` may select an installed browser.

```sh
BASE_URL=https://caishoubin.github.io/factory-planner/ node tests/browser-smoke.cjs
```

The October 21 implementation passed 56 model/plan/simulated-DOM tests and the seven-page static validator. Actual Chromium rendering was attempted but the sandbox blocked OS socket creation before launch (`Operation not permitted`). No real-browser rendering or in-game pass is claimed. Re-run browser smoke tests against deployment and visually check desktop/mobile before final sign-off.

## Plan behavior

- Remembering is opt-in. Only a complete, valid snapshot is saved in localStorage. Invalid edits preserve the last saved valid plan.
- A valid `#plan=...` snapshot takes precedence over saved inputs. Loading it does not write storage. Later edits save it only if remembering is enabled.
- Invalid/oversized/unsupported snapshots are ignored with feedback, preserving the current or saved plan. Ordinary anchors remain usable.
- Share links contain both calculators, helper stack size and selected tab in the URL fragment, never the query string. The generated link drops unrelated query parameters. Editing a loaded snapshot removes its stale hash from the address bar.
- Reset clears only this tool’s saved key, turns remembering off, restores examples and removes a loaded plan hash. Other same-origin apps’ data is untouched.
- Clipboard failure exposes a selectable link; blocked storage never prevents calculation.

## Model and verified data

Reference values reviewed October 21, 2026 against indexed official Satisfactory wiki entries (direct wiki fetch returned HTTP 403):

- https://satisfactory.wiki.gg/wiki/Conveyor_Belts: Mk.1–6 = 60, 120, 270, 480, 780, 1200 items/min.
- https://satisfactory.wiki.gg/wiki/Industrial_Storage_Container (redirects to Storage Container): standard 24 slots, industrial 48 slots. Industrial outputs do not guarantee even splitting.

The target determines parallel route count; supply and demand determine single-route delivery. The parallel scenario uses the same supply/demand but `route count × selected capacity`, with no shared bottleneck assumed. Tier recommendations concern capacity only, not cost or unlocks.

Buffer input is actual post-bottleneck supply. Required output must be supported by the exit route. Constant-rate continuous stock is not game-tick simulation. Positive inputs below 0.000001 or above 1e9 are rejected, as are blanks, non-numbers, coercible booleans/null, non-finite values, stock above capacity and unsafe whole-item outage totals. Zero is allowed except for capacities. Derived numeric results are finite; unreachable/unlimited clocks use `null`, rendered as explicit words. Whole-count rounding corrects tiny binary rounding noise.

Outage reserve rounds up to whole items. Recovery replaces stock actually consumed after input returns, while demand continues. It is distinct from time to full and preparation for another outage. Missed demand is shown, not magically recovered. Equal/lower input cannot recharge depleted stock, and an oversized reserve cannot fit even with a surplus. No recipes, fluid physics, power, scheduling or machine restart simulation is included.

## Privacy and advertising

No network fetches, account, cookies, analytics, advertising script, external fonts or libraries. Optional localStorage and hash sharing are documented in `privacy.html`. URL fragments are not included in ordinary HTTP requests, but complete links can be seen by recipients, browser history and sync services. A shared plan is not encrypted.

Preserves public AdSense account ownership metadata `ca-pub-6637568737373692` only. No ad serving, tracking, approval or revenue claim is introduced. Hosting still sees normal request metadata. Any future advertising needs a separate privacy and consent review.
