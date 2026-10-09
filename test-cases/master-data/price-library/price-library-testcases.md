# Master Data — Price Library

The "Material Price Library" screen, reached from the "Inventory Item
Management" nav group (collapsed by default) but living at its **own**
route — `/master-data/price-library` — **not** nested under
`/master-data/inventory-item-management/...` like Additional Master and
Item Unit Price are. Structurally this is a genuine catalog/detail module,
not a flat code+name master: a record is keyed by an (Item, Supplier) pair,
and each pair can carry **multiple price tiers** (different MOQ/date/
customer combinations) viewed and managed from a dedicated per-item detail
page. No automation or documentation existed for this module before this
file.

| #     | Test case                                                               | Steps                                                                                                                                                                                                 | Expected result                                                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                        | 1. Go to Master Data > Inventory Item Management > Price Library.<br>2. Click "Add item".<br>3. Pick an Item code not already priced (e.g. search "thread" and pick one of the `ALTTHR...` options).<br>4. Pick a Supplier.<br>5. Set Price, Freight charges, Other charges, Currency, Start date, End date, MOQ, Customer.<br>6. Click "Confirm & save price". | The POST to `/api/price-library` returns `201`; the page silently redirects back to `/master-data/price-library`; the new (Item, Supplier) pair appears on the list with Status "Active" and the entered Price in the Price Range column. **No success toast is shown** (see Notes). |
| TC:2  | Verify successful creation with only required fields                     | 1. Click "Add item".<br>2. Pick an unpriced Item code and a Supplier.<br>3. Pick a Start date.<br>4. Leave Price/Freight/Other at their default `0.000`, Currency at default USD, End date at "No end date", MOQ at default 500, Customer at default "All customers".<br>5. Click "Confirm & save price". | Save succeeds (`201`) exactly as in TC:1 — confirms Price, Freight charges, Other charges, Currency, End date, MOQ, and Customer are all genuinely optional (their defaults satisfy validation even when never touched); only Item code, Supplier, and Start date are truly required. |
| TC:3  | Verify the per-item detail page and adding a second price tier           | 1. Click an existing Price Library row.<br>2. Observe the detail page.<br>3. Use the blank price row already present at the bottom of the "Prices" table to add a second tier (different MOQ or Start date) for the same item+supplier. | URL is `/master-data/price-library/<ItemCode>/<SupplierCode>` (e.g. `/master-data/price-library/THR000003/VDR00011`). Page shows the item name as H1, a Status badge, Item Code/Category/Supplier line, a sortable/searchable/filterable "Prices" table of **every** price tier for this pair, and a separate "Where Used" section. Adding a tier via the always-present blank row increases the list's "Prices" count for this item. |
| TC:4  | Verify list search by code, description, and supplier                    | 1. Search by a known Item Code (e.g. `THR000003`).<br>2. Clear and search by the item's description/name instead.<br>3. Clear and search by the Supplier's name.                                     | Each search narrows the table correctly; placeholder reads "Search by code, description, supplier…".                                                                                                                                                           |
| TC:5  | Verify All / Active / Expiring Soon / Expired tabs are status-computed, not a manual toggle | 1. Observe the 4 tabs and their counts.<br>2. Open a record whose End date is near-term vs. one with no End date vs. one whose End date has passed.                                                   | Status is **derived from each price row's Start/End date**, not a settable field anywhere on the Add/Edit form — a row with no End date (or a far-future one) shows "Active", one nearing its End date shows "Expiring Soon", and one past its End date shows "Expired". There is no manual Active/Inactive switch in this module. |
| TC:6  | Verify validation when Item code, Supplier, and Start date are all left unset | 1. Click "Add item".<br>2. Leave Item code and Supplier unpicked and Start date unset.<br>3. Click "Confirm & save price" immediately.                                                                | Save is blocked; inline errors appear simultaneously: **"Choose an item"** under Item code, **"Choose a supplier"** under Supplier, and **"Start date is required"** near the price row's Start date column; no toast, no navigation.                           |
| TC:7  | Verify duplicate (Item, Supplier) handling — **real bug, zero UI feedback** | 1. Create a price record for a given Item + Supplier pair.<br>2. Attempt to create a second, brand-new price record reusing the **same** Item + Supplier pair (this app's seed data has only one Supplier per item family, so this is easy to trigger by accident).<br>3. Click "Confirm & save price". | The backend correctly rejects it — `POST /api/price-library` returns **`409 CONFLICT`** with body `{"error":{"code":"CONFLICT","message":"A price record already exists for this item and supplier", ...}}`. **But the UI shows absolutely nothing**: no toast, no inline error, no visual change at all — the form just sits there with the user having no idea the save failed. **This is a genuine, confirmed UX bug**, not a documentation gap. |
| TC:8  | Verify Cancel discards changes on create                                 | 1. Click "Add item" and pick an Item/Supplier.<br>2. Click the "Cancel" link (top of the form).                                                                                                         | No record is created; a plain `<a href="/master-data/price-library">` navigates back to the list with no save call made (confirmed via aria snapshot — it is a real link, not a JS confirm-and-save handler).                                                 |
| TC:9  | Verify the Price field rejects negative input (edge)                     | 1. Click "Add item", pick an Item and Supplier.<br>2. Type `-5` into the Price field for the price row.                                                                                                | The minus sign is stripped entirely as it's typed — the field ends up showing `5`, not `-5` and not blocked/cleared. Confirmed live via `inputValue()` after `blur()`. Negative prices cannot be entered on this screen (contrast with Item Unit Price's Unit Price field, which has no such guard — see that module's own file). |
| TC:10 | Verify the Price field's real decimal precision vs. its displayed default (edge) | 1. Type `123.456789` into the Price field.                                                                                                                                                             | The value is truncated to **4 decimal places** (`123.4567`), not the 3 decimal places shown by the field's own default placeholder value (`0.000`) — a minor but real inconsistency between the default display precision and the actual accepted precision. |
| TC:11 | Verify Price field accepts 0 and very large values (edge)                | 1. Type `0` into the Price field and save (see TC:2).<br>2. Separately, type `1000000` into the Price field.                                                                                           | `0` is accepted as a valid price (used in TC:2's minimal-fields path). `1000000` is accepted as-is with no visible upper bound reached.                                                                                                                        |
| TC:12 | Verify non-numeric characters are stripped from the Price field (edge)   | 1. Type `abc` into the Price field.                                                                                                                                                                     | The field ends up empty (`inputValue()` returns `""`) — non-numeric input is fully rejected character-by-character, not merely blocked on save.                                                                                                                |
| TC:13 | Verify the last remaining price row cannot be removed (edge)             | 1. On the "Add item" form with exactly one price row present, locate its "Remove price entry 1" button.                                                                                                | The Remove button is rendered **disabled** when it is the only row — at least one price row is always required to stay on the form (separate from whether its fields are filled).                                                                            |
| TC:14 | Verify there is no success toast on a successful creation either (edge)  | 1. Repeat TC:1 or TC:2's happy path to completion, watching the screen immediately after clicking "Confirm & save price".                                                                               | Confirmed across 3 separate live creates (all returning `201`, all subsequently visible on the list with correct data): **no toast of any kind appears** — the only feedback is the silent URL redirect from `/price-library/new` back to `/price-library`. Combined with TC:7, this form gives no toast-based feedback in either the success or failure path, unlike every other Master Data screen explored in this repo. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) and
throwaway item-price records for `THR000001`/`THR000002`/`THR000003` ("Sewing
Thread 1/2/3", Seed Vendors 9/10/11) — this module had **zero** existing
documentation or automation in this repo before this file. Reached via
direct `page.goto('/master-data/price-library')` rather than expanding the
collapsed "Inventory Item Management" nav group.

- **Route is genuinely different from its sibling modules**, exactly as
  flagged in the task brief: `/master-data/price-library` and
  `/master-data/price-library/new`, **not** nested under
  `/master-data/inventory-item-management/...` like Additional Master and
  Item Unit Price are. The nav still groups it under "Inventory Item
  Management" visually, but the URL doesn't reflect that.
- **This is a catalog, not a flat master.** Create produces one (Item,
  Supplier) pair; that pair's detail page then holds a table of **multiple
  price tiers** (different MOQ/date-range/customer combinations), plus a
  "Where Used" section (not explored in depth this pass — looked like a
  read-only BOM/reference list). Don't model this module's "record" as a
  single row the way Additional Master's is.
- **Item code / Supplier pickers are live cmdk-style search comboboxes**
  sourced from the real Item Master / Vendor Master (not plain Radix
  selects) — same shape as Employees' "Department" picker described in
  `agent-notes/master-data-module.md`, items render as `[cmdk-item]`s, not
  `role=option`s, so `getByRole('option')` finds nothing. Both pickers offer
  a "Can't find it? Create in Item Master/Vendor Master →" escape-hatch link
  that deep-links out with `?create=1&from=price-library&returnTo=...`
  query params — not explored further (out of scope for this module's own
  file).
- **Confirmed real trap**: the item picker displays an "Alternate Code"
  style identifier (e.g. `ALTTHR000001`), but the Item Code actually
  persisted and shown in the Price Library's own list/search is the item's
  **base** code (e.g. `THR000001`) — a different value. A test that searches
  the list using the code shown in the picker dropdown will find nothing;
  search using the base code instead.
- **Seed data has effectively one Supplier per item family** — every item
  tried in this pass (`ADJ0000001`, `ALTTHR000001-3`, etc.) resolved to a
  single Supplier option in the picker. If a future test expects multiple
  Supplier choices to pick from and sees only one, that's expected seed-data
  shape, not a bug.
- **Exact toast/error text confirmed live:**
  - Required-field inline errors: `Choose an item`, `Choose a supplier`,
    `Start date is required`.
  - Duplicate (item, supplier) conflict: HTTP `409`, body
    `{"error":{"code":"CONFLICT","message":"A price record already exists for this item and supplier",...}}`
    — **no toast or inline surface for this at all** (TC:7).
  - Successful create: **no toast at all** (TC:14) — only a silent redirect.
- **The "Review" button on the list toolbar** was clicked live and produced
  no visible navigation or state change (same heading, same URL) — not
  explored further; may be an approvals/review queue that was empty for
  this seed data, or may need a different role. Flagged as unconfirmed for
  whoever picks this up next, rather than assumed to be a no-op button.
- **Not covered in this pass**: the "Import" bulk-import button, the date
  picker's actual min/max boundaries (none found in casual navigation, not
  exhaustively tested), Filters rule-builder, Export CSV content, Configure
  columns/Best-fit columns, the 3 layout modes, and the "Where Used" section's
  real content/behavior.
