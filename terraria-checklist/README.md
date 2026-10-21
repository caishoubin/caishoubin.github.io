# Before Hardmode

A buildless Terraria preparation planner for `https://caishoubin.github.io/terraria-checklist/`. Eight static HTML pages, local CSS/SVG assets, and dependency-free JavaScript. No server, external fonts, analytics, ad-serving scripts, game-file access, or planner network requests.

## Maintain and preview

The HTML files in this directory are the source of truth. Edit them directly along with `assets/planner.js` and `assets/style.css`. Do **not** run the older `site-build/terraria-checklist/build_pages.py` against this directory: its templates predate named worlds and would overwrite the new UI and disclosures. That stale generator has deliberately not been copied here.

From the repository root, serve `python -m http.server 8000`, then open `http://localhost:8000/terraria-checklist/`. Deploy this directory at the existing `/terraria-checklist/` path. Maintenance files under `tests/` and this README are not needed at runtime. Keep the existing canonical URLs, AdSense ownership tag (`ca-pub-6637568737373692`), and source links.

## Features

- 24 unchanged checkpoints in four categories, with search and completion/advice filters.
- Up to 50 named worlds with independent progress, stable IDs, a world switcher, and confirmed create/rename forms. Names are 1–60 UTF-16 code units, trimmed, unique ignoring case, and always rendered with `textContent` rather than HTML.
- Delete and reset confirmations name the affected world; neither changes other worlds. The final world cannot be deleted.
- A next-step card prioritizes unfinished recommendations, then mechanics, then optional tasks. Its button clears filters and focuses the corresponding checkbox. Completing all tasks never claims combat readiness or a requirement to enter Hardmode.
- Current-world and all-world JSON exports. Imports validate first, confirm counts, and **add copies**, never replace existing worlds. ID/name collisions are handled automatically. Re-importing creates another copy.
- Native dialog, keyboard controls, visible focus styling, status announcements, responsive layout, reduced motion, and print styling. Every page links back to `/playbook/`.

## Persistence and backups

New local key: `before-hardmode.worlds.v2`.

```json
{"app":"before-hardmode","version":2,"activeWorldId":"world-123","worlds":[{"id":"world-123","name":"My first world","checked":["health"]}]}
```

Legacy key: `before-hardmode.progress.v1`.

```json
{"app":"before-hardmode","version":1,"checked":["health"]}
```

If v2 does not exist, valid v1 progress becomes **My first world**. The legacy key is removed only after a successful v2 write, including a later retry after failed saving. A blocked removal leaves the legacy recovery copy. Existing valid v2 takes precedence. Malformed saved data is preserved, not automatically overwritten.

Both versions are accepted as imports. Imports reject invalid JSON, wrong application/version, unknown checkpoint IDs, duplicate world IDs/names, invalid names, unsupported selections, and files over 65,536 bytes. The resulting collection must remain at or below 50 worlds. Every supported maximum-size v2 export fits within that import limit. Unknown extra properties are discarded. Exports include the current in-memory copy even when local storage fails.

Each write compares the exact value previously read. Web Locks serialize participating tabs when supported; the fallback still checks for a stale snapshot, but localStorage is not a transactional collaboration database. Avoid simultaneous editing across tabs in older browsers without Web Locks. Valid external updates preserve the currently selected world if it still exists. Unsaved changes, external clearing, unreadable data, and stale writes preserve this tab’s copy and show an explicit recovery choice instead of automatically overwriting storage. Loading the saved copy or replacing it requires confirmation. A failed write stays visibly unsaved even after import, reset, or export.

Names and progress stay in browser storage and chosen JSON files. Other pages sharing the origin can technically read origin-local storage. Do not put confidential information in world names. The privacy and how-to pages describe these limits.

## Verification

Run from the repository root:

```sh
node --check terraria-checklist/assets/planner.js
node terraria-checklist/tests/test-model.cjs
node terraria-checklist/tests/test-integration.cjs
```

The model suite covers stable IDs, v1/v2 validation and round trips, name/size/world limits, independent import copies, and stale/failed writes. The dependency-free simulated-DOM suite covers migration, isolated worlds, rename/delete/reset, import/export, cancellation, malformed data, blocked storage, recovery, selection-preserving tab updates, external clearing, keyboard next-step navigation, and the no-Web-Locks fallback.

These tests do not claim real-browser rendering or native download/dialog QA. Local Chromium launch was attempted but blocked by the execution sandbox (`socket() failed: Operation not permitted`). The parent task owns live browser verification after deployment. Review desktop/mobile layout, dialog Cancel/Escape, repeated actions, actual downloads, cross-tab updates, and storage-blocked states there.

## Content and advertising

All 24 original item IDs, gameplay advice, category labels, guide prose, and official Terraria Wiki references remain unchanged. Gameplay sources remain dated October 20, 2026; tool/how-to/privacy changes are dated October 21, 2026. This is an independent, unofficial fan resource, not a prediction or guarantee of victory.

The AdSense ownership meta tag is static metadata only, not an approval or earnings claim. No advertising or tracking has been activated. Any future advertising needs a fresh disclosure/consent review.
