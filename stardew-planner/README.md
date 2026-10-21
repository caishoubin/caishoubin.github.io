# Last Seed

A standalone, buildless English Stardew Valley planting-deadline and seed-budget mini-site. Intended URL: https://caishoubin.github.io/stardew-planner/ . This folder is self-contained and does not depend on the parent homepage.

## Contents

- `index.html`: live calculator, ranked/selectable crop comparison, 28-day calendar, remember/share/export controls
- `guides/planting-deadlines.html`: original guide to growth-day counting and deadlines
- `guides/seed-budget.html`: original worked 500g / 20-plot comparison
- `guides/late-season.html`: original regrowth and late-season loss guide
- `about.html`: model, limitations, sources, publisher information
- `privacy.html`: truthful current data/hosting/advertising disclosure
- `assets/`: dependency-free calculator, validated plan-state module, and UI JavaScript, responsive CSS, original SVG artwork
- `sitemap.xml`: six canonical pages

## Run

Open index.html in a browser, or serve this folder with any static web server. No package installation, bundler, or build step is required. The calculator makes no runtime network requests. Valid plans are optionally remembered in browser local storage; the preference is visible and can be turned off. Share links encode inputs only in the URL fragment after `#`, never in an HTTP query. Generated links also strip any existing query parameters. CSV exports are created locally.

## Model

One initial planting only. Single-harvest crops are not replanted. Regrowing crops continue on their normal interval until day 28. Standard outdoor single-season crops; no fertilizer, professions, random yield bonuses, quality upgrades, processing, crop loss, multi-season crops, greenhouse, Ginger Island, or modded rules. Normal 100% profit margin. Seeds use standard Pierre prices. Items use base-quality raw sale prices and minimum yield.

- firstHarvest = plantingDay + growthDays
- lastPlant = 28 - growthDays
- harvests = 0 if firstHarvest > 28, otherwise 1 + floor((28 - firstHarvest) / regrowDays) when regrowDays > 0; otherwise 1
- plants = min(plots, floor(budget / seedCost))
- spend = plants * seedCost
- items = plants * harvests * minimumYield
- revenue = items * sellPrice
- net = revenue - spend
- cashLeft = budget - spend

Zero-harvest plans retain their hypothetical seed cost and show the resulting loss. Zero plants produce no highlighted calendar harvests and no displayed harvest count. The crop's underlying mathematical harvest count remains available in the calculation model, independent of plant quantity.

Input limits: day 1–28, budget 0–100,000,000g, plots 0–1,000,000; whole numbers only. Result arithmetic stays within safe integer bounds.

## Source data

Original research checked October 20, 2026 against https://stardewvalleywiki.com/Crops and its individual crop pages. The existing 15-crop catalog was rechecked against the Wiki crop reference on October 21, 2026; no data or model changes were needed. Standard 1.6-era mechanics, not a claim of later major-version verification.

| Season | Crop | Pierre seed | Growth | Regrowth | Base sale | Minimum yield |
|---|---|---:|---:|---:|---:|---:|
| Spring | Parsnip | 20 | 4 | 0 | 35 | 1 |
| Spring | Potato | 50 | 6 | 0 | 80 | 1 |
| Spring | Cauliflower | 80 | 12 | 0 | 175 | 1 |
| Spring | Kale | 70 | 6 | 0 | 110 | 1 |
| Spring | Green Bean | 60 | 10 | 3 | 40 | 1 |
| Summer | Blueberry | 80 | 13 | 4 | 50 | 3 |
| Summer | Melon | 80 | 12 | 0 | 250 | 1 |
| Summer | Tomato | 50 | 11 | 4 | 60 | 1 |
| Summer | Radish | 40 | 6 | 0 | 90 | 1 |
| Summer | Hops | 60 | 11 | 1 | 25 | 1 |
| Fall | Pumpkin | 100 | 13 | 0 | 320 | 1 |
| Fall | Eggplant | 20 | 5 | 5 | 60 | 1 |
| Fall | Bok Choy | 50 | 4 | 0 | 80 | 1 |
| Fall | Cranberries | 240 | 7 | 5 | 75 | 2 |
| Fall | Yam | 60 | 10 | 0 | 160 | 1 |

Direct source links are generated in the UI for each crop and appear in the guides. Important examples: https://stardewvalleywiki.com/Potato , https://stardewvalleywiki.com/Blueberry , https://stardewvalleywiki.com/Cranberries . Guide examples use the same model.

## State, sharing, and comparison

- `assets/calculator.js` remains the authoritative, unchanged 15-crop model.
- `assets/plan.js` validates versioned plans, parses fragments/storage, orders comparison rows, and generates CSV. `assets/app.js` owns DOM interactions and recovery messages.
- Storage key: `last-seed.plan.v1`. Only validated user edits and comparison settings are saved; initial default/restored/shared renders do not write. The remember-off record contains only its version and preference, not plan inputs. Invalid edits keep the previous valid saved plan; blocked storage never stops calculation. Reset restores defaults and keeps the remembering preference.
- Loading precedence: a complete valid `#plan=v1&...` fragment, then a valid saved plan, then defaults. Empty and ordinary navigation fragments are ignored. Malformed, mismatched, duplicated, unsupported, missing-field, and oversized plan fragments are ignored atomically with a notice. No partially applied plan. Initial loading and hash navigation never write storage: shared links are previews, and unreadable stored records remain untouched until a valid user edit or explicit remember-on.
- Fragment fields: `plan`, `season`, `crop`, `day`, `budget`, `plots`, `sort`, `ready`. Every field is required; unknown and duplicate fields are rejected. Numeric inputs must be decimal whole numbers in the published ranges. Hash maximum 512 characters, storage maximum 2,048 characters. Editing an imported plan removes the old plan fragment, so a reload does not silently restore the stale link over new saved inputs.
- “Copy plan link” uses the clipboard when available and a selected, readonly text fallback otherwise. Stale asynchronous clipboard completions cannot replace newer UI state. Anyone with the full link can see its inputs. Browser/clipboard history and external sharing apps may retain them.
- Comparison defaults to descending actual seed-only net, with deterministic ties. Alternative orders are first real harvest and total seed spending. “Only crops I can buy and harvest” also requires one or more plants. Losses are not hidden by that filter. Recommendations require positive net; zero plants and late-season no-harvest cases do not get a misleading winner.
- CSV uses the visible order and filter, includes the selected row, input values, numeric results, per-crop sources, and explicit model assumptions. Numeric cells are not formatted as currency. A BOM and CRLF improve spreadsheet import compatibility. No free-text user fields are accepted.

## Verification

From this directory, run on Node 18+:

```sh
node --check assets/calculator.js
node --check assets/plan.js
node --check assets/app.js
node --test tests/*.test.js
git diff --check -- .
```

All 54 tests pass:

- `tests/calculator.test.js`: 26 original model regression tests, including all crops’ last-planting-day boundaries, zero budgets/plots, maximum safe integer outputs, one-sowing behavior, and guide examples.
- `tests/plan.test.js`: 12 state/comparison/CSV tests, including all 420 crop/day invariants, every crop’s share round-trip, malformed and oversized input, deterministic sort/filter behavior, and conservative yields.
- `tests/app.test.js`: 16 integration tests execute the actual shipped scripts against a small DOM derived from `index.html`. They cover initial render, saved/hash precedence, corrupt and blocked storage, invalid edit recovery, always-reachable reset, remember-off/on, crop selection, Spring 25/Fall 24, clipboard fallback/races, CSV download content, and hash navigation.

Integration tests are not layout tests. A local Chromium launch was attempted October 21, 2026 but failed before loading the page because IPC socket creation is blocked (`Operation not permitted`). No successful real-browser visual pass or screenshot is claimed. On a normal browser, verify at 390px and 1440px: no page-level horizontal overflow; comparison scrolling stays inside its table; keyboard focus and crop selection remain visible; reset works after an empty input; clipboard fallback is selectable; CSV opens; on-device state survives reload; an imported plan survives copy/open and rejects malformed links without changing a good plan.

## Deployment and advertising notes

This round edits only the local `stardew-planner/` directory. It does not commit, push, or publish. Deploy this directory only through the owner-authorized GitHub Pages workflow. Include the new `assets/plan.js` file alongside the updated app and HTML. Each page has its own title, description, canonical URL, and publisher-ownership meta tag for `ca-pub-6637568737373692`.

There is deliberately no ad-serving script, analytics, consent bypass, fictitious ad slot, or approval claim. AdSense ownership metadata does not mean the site is approved. Add any necessary advertising disclosures and consent controls before enabling future ad scripts. Crawlers normally read the origin-root robots.txt; the site owner can maintain its sitemap list separately.

Every page links back to `/playbook/`. Navigation to sibling `/terraria-checklist/` and `/factory-planner/` is discreetly included. Those folders must be deployed separately. This site has no runtime dependency on them.
