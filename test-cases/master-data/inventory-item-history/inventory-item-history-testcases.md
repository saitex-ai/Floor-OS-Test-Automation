# Master Data — Inventory Item History

The "Inventory Item History" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/inventory-item-history`).
The "Inventory Item Management" nav group is collapsed by default — direct
`page.goto()` to the route works fine once authenticated, no need to expand
the group first. No automation or documentation existed for this module
before this file.

**Important, confirmed live — this is NOT a pure read-only audit log, and
NOT a full CRUD master either.** The screen's own subtitle states its scope
exactly: _"Click an item to update its Alternate Code and Item Description
and view its change history."_ There is no "New"/"Add" button anywhere on
the list (confirmed: the toolbar goes straight from Filters/Refresh/Export
CSV/... to the column headers, no create entry point), and a direct
`page.goto('.../inventory-item-history/new')` does **not** hit a route at
all — it renders the app's own generic "Not Found" page, same pattern as
Currency Rate's own confirmed 404 (see that module's file). (An earlier pass
of this exploration wrongly concluded this redirects to the FloorOS App
Launcher home page — that was an artifact of a malformed URL built with
Node's `path.join()` on a full `https://` URL in the throwaway exploration
script, which silently collapsed the double slash; re-verified with a
correct `gotoAuthenticated()` call, confirmed above.) However, clicking a row **does** open a genuine, limited
edit form (`?edit=<InventoryID>` query param) where exactly two fields —
Alternate Code and Item Description — can be changed, plus a "Change
history" section underneath showing that item's audit trail. The test cases
below reflect this real, narrow shape: List/Filter/Search/Export/Sort plus
the limited two-field Update flow and its validation — not a fabricated
full Create/Delete CRUD shape, and no actual mutating Update was performed
against this screen's real inventory records during this session (see
Notes — only non-persisting validation checks were run, deliberately, since
every row here is real shared inventory data, not a throwaway test record,
and there is no "New" path to create a disposable one).

| #     | Test case                                                                      | Steps                                                                                                                                                                          | Expected result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Inventory Item History list screen layout                               | 1. Navigate to Master Data > Inventory Item Management > Inventory Item History.                                                                                               | Heading "Inventory Item History" and subtitle "Click an item to update its Alternate Code and Item Description and view its change history." load. **No tabs (no All/Active/Inactive split)** and **no "New"/"Add" button anywhere in the toolbar.** Columns: Inventory ID, Alternate Code, Item Description, Status, Item Class Code, Stock Type Code, Item Category Code, BLUESIGN, Base Unit, Content, Custom Code, GSM, HS Code (13 total). Toolbar has Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns and 3 layout-mode toggles, a search box, and pagination controls. |
| TC:2  | Verify no Create entry point exists for this screen                            | 1. On the list, inspect every visible toolbar button.<br>2. Additionally try navigating directly to `/master-data/inventory-item-management/inventory-item-history/new`.       | No "New"/"Add" button exists anywhere. The direct `/new` URL renders the app's own generic "Not Found" page — same pattern as Currency Rate's own confirmed 404 for its `/new` route.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| TC:3  | Verify clicking a row opens a limited Update form, not a full detail/edit page | 1. Click any row in the list.                                                                                                                                                  | URL changes to `?edit=<InventoryID>` (no dialog — a full in-page view, confirmed via `getByRole('dialog')` returning 0). Heading "Update Inventory Item" with the Inventory ID shown read-only/disabled, followed by exactly two editable fields — **Alternate Code \*** and **Item Description \*** — then a "Change history" heading, then Cancel/Update buttons. None of the list's other 10 columns (Status, Item Class Code, Stock Type Code, Item Category Code, BLUESIGN, Base Unit, Content, Custom Code, GSM, HS Code) are editable or even shown on this form.                                        |
| TC:4  | Verify Alternate Code is a genuinely required field                            | 1. Open an item's Update form.<br>2. Clear the Alternate Code field (leave Item Description untouched).<br>3. Click "Update".                                                  | Save is blocked; inline error "Alternate Code is required" appears directly under the field; the URL stays on `?edit=<InventoryID>` (no navigation back to the list, confirming no save occurred); no toast appears.                                                                                                                                                                                                                                                                                                                                                                                            |
| TC:5  | Verify Item Description is a genuinely required field                          | 1. Open an item's Update form.<br>2. Clear the Item Description field (leave Alternate Code untouched).<br>3. Click "Update".                                                  | Save is blocked; inline error "Item Description is required" appears directly under the field; same no-navigation/no-toast confirmation as TC:4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| TC:6  | Verify Cancel discards unsaved changes without navigating away silently        | 1. Open an item's Update form.<br>2. Clear or change a field.<br>3. Click "Cancel" (the one at the bottom, next to "Update").                                                  | Navigates back to the list (`?edit=` query param removed from the URL); no toast appears; re-opening the same item shows its original, unmodified values (confirmed by never having completed a real submit in this session — Cancel is a pure no-op on the backend).                                                                                                                                                                                                                                                                                                                                           |
| TC:7  | Verify the "Change history" section's real empty state                         | 1. Open any item's Update form.<br>2. Scroll to the "Change history" section beneath the two editable fields.                                                                  | **Confirmed live across multiple items** (`THSB-SB0301CH`, `GSM406EW29032`, `GSM406EW29030`): every item checked in this session shows the exact empty-state text "No audit history yet for this item." — no item with a populated change history was found in dev during this pass; don't assume a populated-history case was verified.                                                                                                                                                                                                                                                                        |
| TC:8  | Verify list search by Inventory ID                                             | 1. On the list, type an exact existing Inventory ID (e.g. `GSM406EW29032`) into the search box (placeholder "Search by Inventory ID, Alternate Code, or Description…").        | The grid narrows to exactly one matching row within ~1-2 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| TC:9  | Verify list search by a partial Item Description keyword                       | 1. Clear the search box.<br>2. Type a keyword known to appear in several descriptions (e.g. `STRAIGHT`).                                                                       | The grid narrows to all rows whose Item Description contains that keyword (confirmed live: 18 matching rows out of the seeded dev data, down from the full multi-page list).                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| TC:10 | Verify list search with no matches shows the real empty state                  | 1. Type a search term guaranteed not to match anything (e.g. `ZZZZZNOPE999`).                                                                                                  | Grid shows zero data rows (header row only) with the exact empty-state text "No inventory items yet." / "Try removing a filter or clearing them all." underneath the empty table.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| TC:11 | Verify column sort on Inventory ID                                             | 1. Click the "Inventory ID" column header once, then again.                                                                                                                    | First click sorts ascending (e.g. `ADJ0000001`, `ADJ0000002`, `BOK0000003`, ... at the top); second click reverses to descending (e.g. `ZZ-NOMATCH-FAB`, `ZIP0000002`, `ZIP0000001`, ... at the top) — confirmed live by reading the re-ordered row text directly, not just the sort icon state.                                                                                                                                                                                                                                                                                                                |
| TC:12 | Verify Export CSV                                                              | 1. Click the "Export CSV" toolbar icon.                                                                                                                                        | A file download is triggered with suggested filename **`inventory-item-history.csv`** — confirmed live via Playwright's `download` event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| TC:13 | Verify "Configure columns" panel lists exactly the 13 real columns             | 1. Click the "Configure columns" toolbar icon.                                                                                                                                 | A "Columns" panel opens showing "13/13" with Inventory ID locked/always-visible (checkbox disabled) and the other 12 columns each independently toggleable, reorderable (drag handle or Move up/Move down), with Search columns/Show all/Hide all/Reset to default/Apply controls.                                                                                                                                                                                                                                                                                                                              |
| TC:14 | Verify pagination via "Jump to page"                                           | 1. Note the "Jump to page (1 to N)" textbox and the total page count it reports (27 pages at the time of this session, ~50 rows/page).<br>2. Type `2` into it and press Enter. | The grid loads page 2's rows (different Inventory IDs than page 1, confirmed live — e.g. `THR000023ALT`, `THR000022ALT`, ... — not a stale/cached repeat of page 1).                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| TC:15 | Verify "Filters" and "Toggle cell filters" accessible-name collision           | 1. Attempt to locate the rule-builder filter icon with `getByRole('button', { name: 'Filters' })` (default substring match).                                                   | Strict-mode violation: this matches **both** the real "Filters" icon button and the separate "Toggle cell filters" icon button, because the latter's accessible name contains the substring "Filters". Needs `{ name: 'Filters', exact: true }` — same shape of trap documented elsewhere in `agent-notes/master-data-module.md` for comboboxes and in Currency Rate's own file for tab names, now confirmed here too on toolbar icon buttons.                                                                                                                                                                  |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`).
**No records were created, edited, or deactivated in this module during
this session** — every row in the live dev list is real shared inventory
data (not a throwaway test record prefixed `TC-...`), there is no "New"
entry point to create a disposable one, and the task's own guidance was to
not mutate this screen if it turned out to be read-only-shaped. It turned
out to be _narrowly_ writable (see below), and a sandboxed attempt at a real
end-to-end Update (fill valid data, click Update, confirm the toast, then
revert) was specifically avoided/blocked as a "modify shared resources"
action — only non-persisting validation checks (clearing a required field
and confirming the save is blocked, never actually completing a save) were
run. **This means TC:3's exact success toast text for a real Update, and
whether Change history actually populates after a real edit, are
genuinely unverified** — flagged explicitly below, not glossed over.

- **This screen's real shape, confirmed via its own subtitle text**: "Click
  an item to update its Alternate Code and Item Description and view its
  change history." It is not a pure read-only audit log like Currency Rate
  (see that module's file) — it has a real, working Update form — but it is
  also not a full inventory-item CRUD master. Only 2 of the list's 13
  columns (Alternate Code, Item Description) are editable from here; the
  other 11 (Inventory ID, Status, Item Class Code, Stock Type Code, Item
  Category Code, BLUESIGN, Base Unit, Content, Custom Code, GSM, HS Code)
  are display-only on both the list and the Update form. In particular,
  **Status cannot be toggled from this screen at all** — there is no
  Active/Inactive control anywhere on the Update form, even though Status
  is a real list column. No Inactive-status row was found anywhere across
  the first 2 pages checked in this session either, so it's unclear from
  this pass alone whether any Inactive inventory items exist in dev at all.
- **No Create route**: a direct `/new` URL renders the app's own generic
  "Not Found" page — the same shape as Currency Rate's own confirmed 404
  (see that module's file). **Correction (2026-10-08, re-verified during
  automation):** an earlier pass of this exploration reported this as a
  silent redirect to the FloorOS App Launcher home page instead — that was
  wrong, caused by a malformed URL in the throwaway exploration script
  (`path.join('https://dev.flooros.app', '/.../new')`, which collapses the
  `https://` double-slash down to `https:/`, something `page.goto()` then
  silently normalized back to the bare origin). Re-verified with a correct
  `gotoAuthenticated()` call against the real route: it reliably renders
  "Not Found", it does not redirect anywhere. Flagging this miscorrection
  explicitly rather than quietly fixing it, since the automation (built
  from this same doc) initially encoded the wrong behavior too.
- **Exact strings confirmed live:**
  - Page subtitle: `Click an item to update its Alternate Code and Item
Description and view its change history.`
  - Required-field errors: `Alternate Code is required` / `Item
Description is required` (both confirmed via real empty-submit
    attempts that were allowed to fail client-side, never actually saved).
  - Change-history empty state: `No audit history yet for this item.`
    (checked on 3 different items, all showed the same text — no item with
    real history was found).
  - List search placeholder: `Search by Inventory ID, Alternate Code, or
Description…`.
  - List empty-state (no search matches): `No inventory items yet.` / `Try
removing a filter or clearing them all.`
  - Export CSV filename: `inventory-item-history.csv`.
- **Locator trap, confirmed live**: `getByRole('button', { name: 'Filters'
})` without `exact: true` also matches "Toggle cell filters" (substring
  collision) — same general pattern as the tab-name trap documented in
  Currency Rate's own file and the combobox-name traps in
  `agent-notes/master-data-module.md`, now confirmed on toolbar icon
  buttons specifically.
- **Not verified in this pass, flagged explicitly rather than assumed**:
  - The exact success toast text for a real Update (e.g. "Inventory item
    updated." or similar) — not confirmed, since no real save was
    completed against this shared data.
  - Whether "Change history" actually populates with an entry after a real
    edit (the obvious hypothesis given the section's name and the form's
    own subtitle, but genuinely unconfirmed — every item checked showed
    the same pre-existing empty state).
  - Whether any Inactive-status inventory item exists anywhere in the full
    27-page dev dataset (only pages 1-2 were spot-checked).
  - The Filters rule-builder panel's full UI (clicking it with an exact
    locator did not surface a `dialog`-role element in this pass — likely
    a popover of a different shape not yet investigated), Configure
    columns' drag-reorder behavior, Best-fit columns, the 3 layout modes,
    and row-level checkboxes/bulk actions.
- If a future session needs to verify the real Update flow end-to-end
  (toast text + Change history population), do it against a record that is
  confirmed safe to touch (check with whoever owns the dev seed data first)
  or wait for a dedicated throwaway/sandbox inventory item to exist — don't
  repeat a real mutating Update against one of the live rows documented
  here without that confirmation.
