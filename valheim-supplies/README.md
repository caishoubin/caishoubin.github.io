# Hearth & Pack — Valheim Party Supply Planner

Static client-side planner at `/valheim-supplies/`. No dependencies or runtime network requests.

Seven source-checked normal recipes are intentionally hard-coded in `model.js`. All targets and stocks are strict bounded integers. Party demand is combined before recipe-batch rounding; shared raw stock is deducted once after combining recipe ingredients. Mead recipes include one base through six finished bottles. Cooking bonuses, already-made bases, production time, fuel, world/mod modifiers, weight and consumption are excluded.

`app.js` binds the form to the pure model. The `hearth-pack.plan.v1` localStorage key is unique to this tool. Shared `#plan=` snapshots use strict versioned schemas and length caps. Shared previews, invalid state and cross-tab conflicts cannot silently overwrite saved plans. User must explicitly save a shared preview. Clipboard failures offer selectable text; exported `.txt` files are generated locally.

Run `node --test valheim-supplies/tests/*.test.cjs` from the repository root. Run `bash tests/run.sh` for the aggregate suite. Serve the repository with a static HTTP server to test visually. Browser UI, real clipboard/download behavior and physical device behavior are not established by a model/DOM harness pass.
