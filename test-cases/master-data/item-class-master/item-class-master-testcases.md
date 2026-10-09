# Master Data — Item Class Master

The "Item Class Master" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/item-class-master`, nav
group collapsed by default). High-level groupings (e.g. a Stock Type's
classes) that aggregate one or more Item Categories — the layer Item Master
itself picks from on its "Item Class" field. No automation exists for this
module yet, so this file uses the simple 4-column format (no
ClickUp/Automated/Verified columns).

**Update (2026-10-08, later the same day): Create's backend bug described
below has been RESOLVED.** It was confirmed broken earlier in the day (see
Notes for the original 409 evidence) but 3 independent live re-checks later
that day — one of them via this file's own now-passing automation — all
created successfully (`Item class created.`, a real `201` from
`POST /api/item-classes`). TC:1/TC:2 below are written against this current,
working behavior. The original broken-state evidence is kept in the Notes
for history/traceability, not because it's still reproducible.

| #     | Test case                                                                      | Steps                                                                                                                                                                                                                | Expected result                                                                                                                                                                                                           |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                             | 1. Go to Item Class Master > "New Item Class".<br>2. Fill Prefix Code.<br>3. Click "Pick stock type" and select a row.<br>4. Fill Description.<br>5. Move at least one row from "Available Categories" to "Selected Categories" using the ">" button.<br>6. Click "Create". | Toast "Item class created." appears; redirected to the list; new row visible with the entered Prefix/Description/Stock Type and the selected categories. **Note**: this was confirmed BROKEN (HTTP 409) earlier on 2026-10-08 and RESOLVED later the same day — see Notes. |
| TC:2  | Verify successful creation with only required fields                          | 1. Open "New Item Class".<br>2. Fill only Prefix Code, pick a Stock Type, and move one category into "Selected Categories" (skip Description).<br>3. Click "Create".                                                  | Save succeeds with toast "Item class created." — confirms Description is genuinely optional. |
| TC:3  | Verify successful edit of an existing item class                              | 1. Open the list, search for a known Item Class Code, click its row (opens directly into "Edit Item Class" — no separate read-only detail view).<br>2. Change the Description.<br>3. Click "Save changes".          | Toast "Item class updated." appears; the list reflects the new Description. Edit has worked correctly throughout, independent of Create's (now-resolved) bug.                               |
| TC:4  | Verify list search by code or name                                            | 1. Open the list.<br>2. Search by a known Item Class Code.<br>3. Clear and search by its Description or Prefix.                                                                                                      | Each search narrows the table to the matching row(s); matches the search box's own placeholder ("Search by code, name…").                                                                                             |
| TC:5  | Verify All / Active / Inactive tab filters on the list                        | 1. Open the list.<br>2. Click "Active", then "Inactive", then back to "All".                                                                                                                                          | Each tab's live count matches the rows shown. **Note**: "Inactive" is confirmed-live to always show 0 — see Notes, there is no way to produce an Inactive item class through this UI.                                 |
| TC:6  | Verify validation when all required fields are left blank                     | 1. Open "New Item Class".<br>2. Leave Prefix Code, Stock Type, and Item Categories all empty.<br>3. Focus the "Create" button and press Enter (see Notes re: the floating AI button trap, do not `.click()` directly). | Save is blocked; inline "Required" errors appear simultaneously under Prefix Code and Stock Type — no toast, no navigation. **Correction (confirmed live again while automating this test):** with Stock Type never picked at all, Item Categories does **not** show "Select at least one item category." — it still just shows its default "Pick a Stock Type first to load matching categories." prompt. That category-specific error only appears once a Stock Type **is** picked but zero categories are then moved into "Selected Categories" (see TC:9's own flow) — a different scenario than this one. The original version of this row incorrectly merged both scenarios; corrected here. |
| TC:7  | Verify Stock Group, Custom Code-style asterisked fields that are NOT actually enforced — **surprising, confirmed live** | 1. Open "New Item Class".<br>2. Pick a Stock Type whose underlying record has no Stock Group value (e.g. one of the synthetic classes like `CHEM-WASH` in the picker list, which shows a blank Stock Group Code column).<br>3. Leave the auto-populated "Stock Group" field blank and complete the rest of the form. | **Stock Group carries a red `*` in the UI exactly like Item Class/Stock Type/Item Category, but is never enforced** — it is a read-only auto-fetched field anyway (not independently fillable), so "required" here is cosmetic only. (Confirmed as part of investigating TC:1's blocking bug — the generic 409 conflict occurred regardless of whether Stock Group was populated.) |
| TC:8  | Verify Item Categories picker is scoped to the picked Stock Type              | 1. Open "New Item Class".<br>2. Pick a Stock Type.<br>3. Observe "Available Categories".                                                                                                                              | "Available Categories" is empty with the message "Pick a Stock Type first to load matching categories." until a Stock Type is picked; after picking, it populates with only the categories belonging to that Stock Type (confirmed live: picking Stock Type "BD" showed exactly 1 available category, "BMT — Building Maintenance"). |
| TC:9  | Verify moving a category out of "Selected Categories" removes it from "Available Categories" too | 1. Open "New Item Class", pick a Stock Type, move its only available category into "Selected Categories" using ">".                                                                                                   | "Available Categories" count drops to 0 and shows "No categories for stock type <code>." while "Selected Categories" shows the moved item — confirmed live, the picker correctly treats these as a single pool split across two panes, not independent lists. |
| TC:10 | Verify Cancel discards changes on create                                      | 1. Open "New Item Class" and fill in several fields (Prefix Code, pick a Stock Type).<br>2. Click "Cancel" (the full-text "Cancel" button, not the small icon-only "Cancel" near the Stock Type search field — see Notes re: locator trap).                 | No record is created; user is returned to the Item Class Master list; the list's total count is unchanged (confirmed live: stayed at 34 before and after).                                                            |
| TC:11 | Verify Prefix Code and Description max length (edge)                          | 1. Open "New Item Class".<br>2. Type 50+ characters into Prefix Code.<br>3. Type 300+ characters into Description.                                                                                                    | Prefix Code silently truncates at exactly **10 characters**; Description silently truncates at exactly **200 characters** — both confirmed live via `inputValue()`, no inline "too long" error either way.           |
| TC:12 | Verify the Active flag cannot actually be changed — **confirmed bug, same pattern as Product Service Value Master** | 1. Open "New Item Class" or Edit an existing one.<br>2. Inspect the "Active" checkbox.<br>3. Attempt to click/uncheck it.                                                                                              | **The checkbox is always checked and genuinely disabled** (`disabled` DOM property `true`, `pointer-events: none`) in both Create and Edit — a real click attempt times out. Matches Product Service Value Master's own confirmed bug; there is no way to deactivate an Item Class through this UI. |
| TC:13 | Verify the floating AI launcher overlaps and intercepts the Create button — **confirmed live trap, not module-specific** | 1. Open "New Item Class" at a standard desktop viewport (1400×1000 confirmed).<br>2. Attempt `page.getByRole('button', { name: 'Create', exact: true }).click()`.                                                     | The click times out ("element is outside of the viewport" / actionability failure is NOT what happens here — instead a `{ force: true }` click actually lands on and opens the "Ask FloorOS AI" launcher dialog instead of submitting the form, since the launcher's circular button visually and physically overlaps the bottom-right corner of the sticky Cancel/Create footer at this viewport size). **Workaround confirmed working**: `await createButton.focus(); await page.keyboard.press('Enter');` submits the real form instead. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`).
This module had **zero** existing documentation or automation in this repo
before this session, and so did the whole "Inventory Item Management" nav
group (collapsed by default, confirmed `page.goto()` straight to the route
works fine once authenticated — never needed the DOM-click nav-expansion
workaround in practice, just used it once to visually confirm the group's
three modules).

- **RESOLVED later on 2026-10-08 — kept below for history/traceability.**
  **Originally: CRITICAL, confirmed-live, reproducible bug: Create is broken.** Every
  single attempt to create a new Item Class in this dev environment (5
  consecutive attempts across 2 separate script runs, with different valid
  Prefix Codes — 3, 4, 6, and 10-character values all tried) fails with an
  HTTP 409 from `POST /api/item-classes`:
  `{"error":{"code":"item_class_conflict","message":"item class ICC0000019
  already exists", ...}}` (code number increments each attempt: 19, 20, 21,
  22...). Searching the list for each of those exact codes (`ICC0000018`
  through `ICC0000022`) confirms **they already exist as real pre-existing
  records** — e.g. `ICC0000018` is the real "Sub Contract Service Items"
  class (Prefix `SSITEM`). This means **the server's next-Item-Class-Code
  generator is out of sync with the table's real max ID** and is handing
  out codes that collide with existing rows on every single attempt,
  regardless of what Prefix/Stock Type/Category the user picks. At the time,
  **Create was completely non-functional for Item Class Master on dev.**
  **Re-checked later the same day (2026-10-08) while building this
  module's real Playwright automation: 3 independent live attempts — a
  standalone verification script, then this file's own TC:1 and TC:13 —
  all created successfully** (`Item class created.`, a real `201` from
  `POST /api/item-classes`, e.g. `ICC0000026`/`ICC0000028`). The ID
  generator appears to have caught up with the table's real max ID on its
  own (or was fixed server-side) sometime between the two checks. TC:1/TC:2
  now describe this current, confirmed-working behavior; the automation
  (`ItemClassMasterPage.expectCreateFailedGeneric()`) still keeps the old
  failure-path assertion available for regression value only.
- **Despite Create being broken, Edit works correctly** — confirmed via a
  full live edit-and-revert round trip on the real `ICC0000018` record
  (changed Description, saved, confirmed the toast and list update, then
  changed it back to its original value `Sub Contract Service Items` to
  avoid leaving a stray artifact on pre-existing shared data). **Lesson
  re-learned this session**: when verifying Edit behavior, prefer a
  freshly-created throwaway record over any pre-existing one — editing a
  real record and forgetting its original value is an easy, avoidable
  mistake; this session made it once and had to recover by re-reading the
  value from a fresh list-row render. Now that Create works again, the
  automated TC:3 creates and edits its own fresh throwaway record instead
  of touching any pre-existing one, avoiding this trap entirely going
  forward.
- **List**: heading "Item Class Master" (`level=1`), description
  "High-level groupings (e.g. APPAREL, ACCESSORY) that aggregate one or more
  item categories.", tabs All/Active/Inactive (34/34/0 at time of writing),
  search ("Search by code, name…"), a "New Item Class" button. Table
  columns: Item Class Code, Stock Group Code, Stock Type Code, Stock Type
  Description, Description, Status, Prefix, Stock Group Description.
- **Create/Edit is a full-page navigation** (`?create=true` /
  `?edit=<ItemClassCode>` on the same base route), not a dialog — contrast
  with Product Service Value Master's modal-dialog pattern (see that
  module's file).
- **Create form fields**, exactly as marked live with a red `*`: Class Code
  (disabled, shows `< NEW >`), Prefix Code\*, Stock Type\* (a picker,
  "Click to pick a stock type…"), Description (no asterisk, genuinely
  optional, placeholder "Optional notes"), Active (checkbox, defaults
  checked — see TC:12), Item Categories\* (a dual-list mover: "Available
  Categories" / "Selected Categories" with `>`, `>>`, `<`, `<<` buttons).
  Stock Group\* and Stock Type\* also show asterisks but are **auto-derived,
  disabled display fields**, not independently fillable — see TC:7.
  Confirmed-required-and-enforced (inline error + appears in a toast
  summary): Prefix Code, Stock Type, Item Categories. Description is
  genuinely optional (no asterisk at all in Create).
- **Locator trap, confirmed live**: `getByRole('button', { name: 'Cancel'
  })` without `exact: true` matches **two** elements — an icon-only
  `aria-label="Cancel"` ghost button near the Stock Type picker's clear/
  search affordance, and the real full-text "Cancel" button in the form's
  bottom action bar. Use `{ name: 'Cancel', exact: true }.last()` (or scope
  more tightly) to hit the real one.
- **Confirmed-live trap, not module-specific — the floating "Ask FloorOS
  AI" launcher button physically overlaps the sticky Create/Cancel footer**
  at a standard 1400×1000 viewport. A plain `.click()` on Create times out;
  a `{ force: true }` click is actively dangerous here since Playwright's
  force click still performs a real mouse click at the element's
  coordinates and that pixel is covered by the AI launcher's higher
  z-index circle — confirmed this literally opens the "Ask FloorOS AI"
  dialog instead of submitting the form. **The reliable workaround
  confirmed working**: focus the Create button via `.focus()` then
  `page.keyboard.press('Enter')`, which dispatches a real submit without
  going through screen-coordinate hit-testing. This same trap was seen
  again on Item Master's own Create form (see that module's file) — it's
  likely a global app-shell overlay, not specific to either screen, so
  check for it on any Master Data create form with a bottom-right sticky
  footer before assuming a plain `.click()` is safe.
- **Exact success toast text, confirmed live**: Edit/Save only —
  `Item class updated.` (with trailing period). Create's real success toast
  could not be confirmed (see the Create-is-broken note above); its failure
  toast is the generic `Failed to create item class.` regardless of the
  underlying cause (empty-required-field submits never reach this toast at
  all since they're blocked client-side first; the 409 conflict is what
  actually produces this toast).
- **Confirmed-live bug: the Active checkbox is always checked and
  permanently disabled** in both Create and Edit (`disabled` DOM property
  `true`, `pointer-events: none`) — identical pattern to Product Service
  Value Master. No way to deactivate an Item Class through this UI,
  consistent with "Inactive" always reading 0.
- **Confirmed-live hard caps**: Prefix Code truncates at exactly 10
  characters; Description truncates at exactly 200 characters. Neither
  shows an inline "too long" error — the input simply stops accepting more
  characters.
- **No delete action found** anywhere on this screen (list or Edit form) —
  contrast with Item Master's real "Delete permanently" flow.
- **Not covered in this pass**: Filters/Export CSV/Configure columns/Best-
  fit columns/layout modes, duplicate-Prefix-Code handling (blocked by the
  Create bug before this could be tested), and whether removing every
  category from "Selected Categories" on an existing Edit re-triggers the
  "Select at least one item category." validation (not tested, time
  constraints).
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see
  `agent-notes/master-data-module.md`) — one script run in this session hit
  a flaky `page.goto()` (not `gotoAuthenticated()`) mid-loop that landed on
  the OIDC gate instead of the target route; always route every navigation
  through `gotoAuthenticated()`, even repeat navigations within the same
  script, not just the first one.
- **Update while building the real Playwright automation for this file
  (2026-10-08): TC:6's original wording was wrong, corrected above.** A
  real automated run of a truly-blank submit failed against the original
  assertion that "Select at least one item category." appears — it
  doesn't, on a genuinely blank form. That message is scenario-specific to
  "a Stock Type is picked but no category is moved across" (TC:9), and the
  original manual exploration pass had conflated the two scenarios into
  one combined claim. Also confirmed in automation: **Edit's "Save
  changes" does not navigate back to the list** (same as Item Master's own
  Update, see that module's file) — a caller that just saved an edit and
  wants to act on the list again must re-navigate, not assume it's already
  there.
