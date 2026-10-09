# Master Data — Item Unit Price

The "Item Unit Price (THD Master)" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/item-unit-price`,
reached via the "Inventory Item Management" nav group — collapsed by
default in the left nav). This is **not** a simple CRUD master: it is a
**revision-based** pricing ledger. The screen's own subtitle: "Revision-
based THD pricing. Each revision is an Open → Posted workflow; a new
revision carries forward the last posted prices. Details are editable only
while the revision is Open." A revision holds many per customer/item/
sub-item/currency/vendor "Detail Prices" rows. No automation or
documentation existed for this module before this file.

| #     | Test case                                                                | Steps                                                                                                                                                                                                   | Expected result                                                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify list layout and seeded revision data                               | 1. Go to Master Data > Inventory Item Management > Item Unit Price.                                                                                                                                    | Heading "Item Unit Price (THD Master)" with the Open→Posted subtitle quoted above. Columns: Rev No, Status, Detail Count, Posted By, Posted Date, Created By, Created Date. Seed data (confirmed live) shows Rev 1 and Rev 2 as "Posted", Rev 3 as "Open". |
| TC:2  | Verify "New Revision" behavior while a revision is already Open — **finding updated 2026-10-09, see Notes** | 1. With a revision already Open (e.g. Rev 3), click "New Revision".                                                                                                                                      | A real confirmation dialog **"Open a new revision"** opens ("Copies all detail rows from the most recently posted revision into the new one.", a "Carry forward last posted prices" toggle defaulting on, Cancel/"Create revision" buttons). Whether confirming while one is already Open succeeds or is blocked was not tested (see Notes). |
| TC:3  | Verify opening the Open revision's detail/edit view                       | 1. Click the Open revision's row (e.g. Rev 3).                                                                                                                                                          | Client-side navigation to `?edit="<RevNo>"` (note the value is itself a JSON-quoted string — the raw query is `?edit=%223%22`, decoding to `edit="3"`). Page shows "Rev <N>" / "Edit pricing details", a read-only header (Rev No, Status badge "Open", Created By, Created Date, Posted By "-", Posted Date "-"), "Add Items"/"Upload"/"Add row" buttons, a "Detail Prices" table, and Close/Save details/Post revision actions. |
| TC:4  | Verify the "Add Items" bulk picker                                        | 1. On an Open revision's detail page, click "Add Items".                                                                                                                                                | A dialog "Add THD items" opens — "Select one or more THD items to add as price rows," with a search box and a checkbox-driven table (Inventory ID, Description, Alternate Code, Base Unit, Vendor Code, Vendor Name, Currency) sourced from the real THD item list — a bulk alternative to adding rows one at a time via "Add row". |
| TC:5  | Verify required-field validation on a manually added blank row            | 1. On an Open revision, click "Add row" to append a blank Detail Prices row.<br>2. Leave all its fields unset.<br>3. Click "Save details".                                                              | Save is blocked with toast **"Each row needs an item, currency, UOM, and vendor before it can be saved."** — confirming Item, Currency, UOM, and Vendor (Supplier) are the truly required per-row fields. Customer, Sub Item, Color, Size, Unit Price, and Remark are **not** required (Unit Price escapes the check only because it always carries a pre-filled `0.0000` default). |
| TC:6  | Verify a Posted revision is genuinely read-only                           | 1. Open a Posted revision (e.g. Rev 1).<br>2. Observe the Detail Prices section and the action buttons.                                                                                                 | The Detail Prices section shows the plain text **"This revision is posted and read-only."** (trailing period confirmed live via a failure screenshot — see Notes) instead of an editable table toolbar. "Save details", "Post revision", and "Add row" are **not rendered at all** (confirmed via `isVisible()` returning `false` for all three, not merely `disabled`) — genuinely enforced read-only, matching the screen's own subtitle claim. |
| TC:7  | Verify Unit Price accepts negative values — **real bug, cross-module inconsistency** | 1. On the Open revision (Rev 3), locate an existing Detail Prices row's Unit Price cell (format `0.0000`).<br>2. Type `-20` into it.                                                                     | The value is accepted **verbatim as `-20`** — not stripped, not blocked, not clamped. Confirmed live via `inputValue()` (then restored to the original value and **not saved**, to avoid mutating this shared fixture revision). **This directly contradicts Price Library's own Price field** in the very same "Inventory Item Management" nav group, which actively strips the minus sign on identical input (see that module's TC:9) — a genuine, confirmed inconsistency between two sibling pricing screens. |
| TC:8  | Verify Unit Price accepts arbitrary decimal precision with no truncation (edge) | 1. On the same row, type `5.123456` into Unit Price.                                                                                                                                                    | The full 6-decimal value is retained as-is (`5.123456`) — no truncation to the field's own displayed `0.0000` (4-decimal) format. Contrast with Price Library's Price field, which truncates to 4 decimals regardless of its 3-decimal default display (that module's TC:10) — another cross-module numeric-formatting inconsistency. |
| TC:9  | Verify Unit Price accepts 0 (edge)                                       | 1. Type `0` into Unit Price.                                                                                                                                                                            | Accepted without issue — consistent with Price Library's own Price field accepting 0 (not a bug, just confirming parity on this one point).                                                                                                           |
| TC:10 | Verify removing a Detail Prices row                                      | 1. On an Open revision, click "Add row" to add a throwaway blank row.<br>2. Click that row's "Remove" button (no confirmation dialog expected for an unsaved row).                                       | The row disappears from the table immediately; no confirmation prompt is shown for a row that was never saved.                                                                                                                                        |
| TC:11 | Verify "Close" navigates back — unsaved-change prompt not confirmed (edge/trap) | 1. On an Open revision's detail page, make an unsaved edit (e.g. add a blank row), then click "Close" without saving.                                                                                   | **Not fully confirmed live this session** — whether Close silently discards or prompts for unsaved changes was not exercised to avoid leaving the shared Rev 3 fixture in an inconsistent state. Flagged explicitly for whoever picks this up next to confirm either way before relying on it in automation. |
| TC:12 | Verify "Search revisions…" on the list                                  | 1. On the list, use the search box to search by a known Rev No.                                                                                                                                          | The table narrows to the matching revision row(s); placeholder reads "Search revisions…".                                                                                                                                                              |
| TC:13 | Verify Post Revision's documented behavior — **not executed live, see Notes** | 1. On an Open revision with all rows valid, click "Post revision".                                                                                                                                      | Per the screen's own subtitle, this should transition the revision from Open → Posted (after which it becomes read-only per TC:6) and allow a subsequent "New Revision" to carry forward its prices as the new Open revision's starting point. **This transition was deliberately not executed in this pass** — see Notes. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) —
this module had **zero** existing documentation or automation in this repo
before this file. Reached via direct
`page.goto('/master-data/inventory-item-management/item-unit-price')`
rather than expanding the collapsed "Inventory Item Management" nav group.

- **This is the most structurally different of the three modules in this
  pass** — not a master of individual priced items, but a **revision
  ledger**: each revision is a point-in-time snapshot of many Detail Prices
  rows, with an enforced Open → Posted lifecycle and (confirmed live) a
  **hard system-wide constraint of at most one Open revision at a time**.
  Seed data at the time of this pass: Rev 1 (Posted, 2 details, created by
  `seed` 6/10/2026), Rev 2 (Posted, 2 details, created by `seed` 6/10/2026,
  posted by `alice` 6/22/2026), Rev 3 (Open, 2 details, created by `alice`
  6/22/2026, not yet posted).
- **Deliberately did not click "Post revision" on Rev 3.** Rev 3 is
  pre-existing shared fixture data this session did not create (unlike
  Additional Master/Price Library, where every risky action — delete,
  duplicate-conflict — was exercised against throwaway records this session
  made itself). Posting is a one-way Open → Posted transition per the
  screen's own copy, and since only one Open revision can exist system-wide
  (TC:2), posting Rev 3 would leave the whole module with **zero** Open
  revisions until someone creates a new one — a real, hard-to-reverse change
  to shared dev state that other engineers/QAs or parallel test sessions may
  be relying on. **TC:13 documents the expected behavior per the app's own
  stated workflow but it was not exercised live** — flagged explicitly
  rather than fabricated as "confirmed." Whoever picks this up next should
  coordinate a dedicated throwaway revision cycle (or confirm no one else
  depends on Rev 3 staying Open) before exercising Post Revision for real.
- **Exact toast/message text confirmed live:**
  - Per-row required-field validation (on Save details with an incomplete
    row): `Each row needs an item, currency, UOM, and vendor before it can be saved.`
  - Posted/read-only state message (shown in place of the edit toolbar):
    `This revision is posted and read-only.` (note the trailing period —
    an earlier pass of this file dropped it when transcribing, which broke
    an exact-text locator until caught via a failure screenshot while
    automating TC:6; fixed here and in the page object).
  - "New Revision" while one is already Open: see the **2026-10-09 update**
    below — no longer a silent no-op.
- **UPDATE (2026-10-09), while building automation for this file:** TC:2's
  original finding ("New Revision" is a silent no-op with one already Open)
  **no longer holds**. Re-running the exact same steps live now opens a real
  **"Open a new revision"** confirmation dialog — "Copies all detail rows
  from the most recently posted revision into the new one.", a "Carry
  forward last posted prices" toggle (defaults on), and Cancel/"Create
  revision" buttons — confirmed via a fresh screenshot, not assumed. The dev
  app's own behavior genuinely changed between 2026-10-08 and 2026-10-09;
  this is not a re-observation error (both sessions used the same steps, same
  seeded Rev 3 Open, and the dialog's absence/presence was each confirmed via
  a network listener/screenshot, not eyeballed). **Still unconfirmed**:
  whether clicking "Create revision" inside that dialog actually succeeds
  while a revision is already Open, or is blocked by some other mechanism at
  that point — not tested, for the same shared-fixture-safety reason Post
  Revision (TC:13) was never executed. Whoever picks this up next should
  re-verify the "only one Open revision system-wide" constraint still holds
  via this new dialog before assuming either outcome.
- **Two confirmed, genuine numeric-field inconsistencies with Price Library**
  (same "Inventory Item Management" nav group, both are pricing screens):
  Unit Price here accepts negative values and unlimited decimal precision,
  while Price Library's Price field strips negative signs and truncates to
  4 decimals. Worth raising with the team as a real cross-screen consistency
  gap, not just documenting separately per module.
- **URL shape trap**: a revision row's edit URL query param is a
  JSON-stringified value (`?edit=%223%22` → `edit="3"`), not a plain
  `?edit=3`. A test building this URL directly needs to account for the
  extra quoting, not just interpolate the Rev No.
- **Not covered in this pass**: the "Upload" bulk-import button, Filters
  rule-builder, Export CSV content, Configure columns/Best-fit columns, the
  3 layout modes, row-level Customer/Sub Item/Currency/Supplier picker
  internals (only confirmed they exist and are labeled "Pick customer" /
  "Pick item" / "Pick sub item" / "Pick currency" / "Pick supplier"), and
  the actual Post Revision confirmation flow/toast text (see TC:13).
