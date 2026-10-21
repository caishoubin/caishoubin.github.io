# Cake & Company

Buildless English-language Palworld Normal Cake planner for https://caishoubin.github.io/palworld-cake/. The checked-in HTML, CSS and JavaScript are the site; no bundler or package installation is needed.

## Files

- `calculations.js`: pure CommonJS/browser model (`CakeMath`), recipe constants, capacity/deficit/milling calculations and text export.
- `plans.js`: exact versioned numeric schema, catalog identifier, local-storage key and bounded URL-fragment codec (`CakePlans`).
- `app.js`: live validation, DOM rendering, optional local saving, protected shared previews, clipboard/manual fallback and local text download.
- `index.html`, `styles.css`, `bakery.svg`, `favicon.svg`: responsive parchment-and-forest planner with original artwork.
- `guide.html`: worked seven-cake batch and a valid example snapshot link.
- `methodology.html`, `sources.html`, `privacy.html`, `about.html`: formulas, assumptions, source/version transparency and publisher.
- `sitemap.xml`: the six public pages, dated 2026-10-21.
- `tests/*.test.cjs`: dependency-free model, exact-schema, simulated-DOM and static-site tests.

## Verification

From the repository root:

```sh
node --check palworld-cake/calculations.js
node --check palworld-cake/plans.js
node --check palworld-cake/app.js
node --test palworld-cake/tests/*.test.cjs
```

The initial implementation passed 53 tests, including 1,600 flour/wheat conservation combinations. Tests cover tied limiting ingredients, ready-cake surplus, whole milling boundaries, schema incompatibility, corrupt data, shared-preview edits/reset/restore, blocked storage, clipboard failure and stale asynchronous clipboard callbacks. They do not establish real-browser rendering or in-game behavior. Live browser visual/keyboard/mobile QA is handled separately by the deployment task; no local browser pass is claimed.

## Model

Reference snapshot reviewed 2026-10-21:

- Normal Cake: 5 flour + 8 red berries + 7 milk + 8 eggs + 2 honey → 1 cake. https://palworld.wiki.gg/wiki/Cakes
- Flour: 3 wheat → 1 flour at a Mill. https://palworld.wiki.gg/wiki/Flour

Only Normal Cake is included; the Wiki also contains other variants. No exact current game-build compatibility is promised. There is no cooking-time, breeding, farming, spoilage, work-speed or world-setting simulation.

`remaining = max(0, target - ready)`. Requirements apply only to this remaining count. Every numeric input must be an actual finite integer between 0 and 1,000,000. The UI accepts decimal whole-count strings, not exponent notation or blank/fractional input. Imported JSON must contain numeric values, never coercible strings or booleans.

Immediate capacity uses ready flour. Post-milling capacity uses ready flour plus `floor(wheat / 3)`. Both capacities are unlimited by target and exclude ready cakes; separate coverage text caps them at the remaining target. Every tied minimum ingredient is listed.

Batch milling uses at most the pre-milling flour deficit and at most the owned whole-flour milling capacity. It does not consume extra wheat. Post-milling flour shortage and additional wheat are alternative gathering routes, never added together. Additional wheat is `max(0, 3 × pre-milling flour deficit - all owned wheat)`, preserving credit for leftover wheat below a complete milling recipe.

## State and privacy

- Plan schema version 1; recipe catalog `normal-cake-2026-10`; storage key `palworld-cake.plan.v1`.
- Exact fields: `version`, `catalog`, `target`, `ready`, `gather`, `stock`; stock has exactly `flour`, `berries`, `milk`, `eggs`, `honey`, `wheat`.
- Remembering is opt-in, and only valid complete plans are saved. Invalid edits preserve the last valid saved plan.
- A valid shared hash takes precedence over saved inputs but never writes them. Shared-mode editing, clearing stock and resetting the preview are temporary. Only the explicit shared-save control replaces saved state and re-enables remembering.
- Returning to saved state does not overwrite malformed saved data. Normal reset forgets this tool only; shared-mode reset preserves saved data and resets the temporary preview.
- Invalid links are ignored with feedback. Ordinary anchors work normally. Edits remove stale plan hashes. Generated links discard unrelated query parameters.
- No accounts, backend, network recipe fetch, analytics, cookies, advertising scripts or external fonts. AdSense ownership meta is present without an advertising script. Hosting still receives ordinary request metadata.
- URL fragments are absent from ordinary HTTP requests but visible to link recipients, browser history/sync and potentially extensions. They are not secret or encrypted.
- Clipboard fallback exposes selectable plain text. Export creates a local text-file download. Blocked storage never prevents calculation; blocked deletion is clearly disclosed.
