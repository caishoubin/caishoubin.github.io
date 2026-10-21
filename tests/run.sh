#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for dir in stardew-planner terraria-checklist factory-planner palworld-cake valheim-supplies; do
  while IFS= read -r -d '' file; do node --check "$file"; done < <(find "$dir" -name '*.js' -not -path '*/tests/*' -print0)
done
node --test stardew-planner/tests/*.test.js
node --test factory-planner/tests/*.test.cjs
node --test palworld-cake/tests/*.test.cjs
node --test valheim-supplies/tests/*.test.cjs
node terraria-checklist/tests/test-model.cjs
node terraria-checklist/tests/test-integration.cjs
python3 factory-planner/tests/validate_site.py
python3 tests/validate-site.py
