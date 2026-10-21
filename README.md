# Independent game tools

Public static site: https://caishoubin.github.io/

The maintained game tools are:

- `/stardew-planner/`: single-sowing crop timing and seed-budget comparison, saved/shareable plans and CSV export.
- `/terraria-checklist/`: a 24-item pre-Hardmode checklist with named worlds and local JSON backups.
- `/factory-planner/`: conveyor throughput, belt-tier comparison and outage-buffer recovery, with saved/shareable plans.
- `/palworld-cake/`: Normal Cake ingredient deficits, flour/wheat milling and immediate/after-milling craftability, with safe shared previews and exports.
- `/valheim-supplies/`: seven-recipe party supply planner with finished and raw inventory, whole-batch rounding, equal personal packs and shared previews.
- `/playbook/`: tool and guide directory.

These are unofficial fan tools. They do not read game saves. The model assumptions and source links on each site are part of the product, not optional fine print. Existing ClickDesk and legacy content are preserved separately.

## Run locally

No build or dependency installation is needed. Serve the repository root with any static HTTP server, for example `python3 -m http.server 8000`, then open `http://localhost:8000/`.

## Validate before publishing

Use Node.js 24 and Python 3:

```sh
bash tests/run.sh
git diff --check
```

The aggregate check runs JavaScript syntax, pure model/state and integration suites, local HTML links, fragments, metadata, XML sitemaps and checks against accidental runtime advertising/network requests. The GitHub Actions workflow runs this same check on pushes and pull requests. Browser testing remains necessary for visual layouts, clipboard/download UI, keyboard flows and storage across real tabs.

## Publishing

The repository's `master` branch is the existing GitHub Pages source. No frontend build is needed. Keep the root `robots.txt` and sitemap index in sync with maintained destinations. The custom `404.html` returns visitors to the tools without changing their saved state.

Before calling a release live, verify the exact remote commit, its validation workflow and Pages deployment, then reload the public URLs and exercise the changed controls. A successful local test alone is not a deployment.

## Privacy and advertising

Tool data is processed locally. Browser storage is not cloud sync. Calculator share links explicitly encode a plan in the URL fragment; browsers do not send that fragment in an ordinary HTTP request, but anyone given the full link can read the plan. Terraria backups include world names and checked item IDs, so users should treat exported files accordingly.

Preserve `ads.txt` and existing AdSense account-verification metadata. They are ownership information, not active advertisements or approval claims. This release does not add analytics, tracking, ad-serving scripts, remote fonts, paid services, or accounts. Future advertising activation requires a separate privacy/consent review.
