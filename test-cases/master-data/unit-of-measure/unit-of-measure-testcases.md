# Master Data — Unit of Measure

System Management > Unit of Measure (`/master-data/system-management/uom`) manages the UoMs
(weight, length, area, count, volume) used in BOM and inventory. This is the first test-case
documentation for this screen; nothing here was carried over from notes — every row below was
confirmed directly against `https://dev.flooros.app` (session: `.auth/master-data.json`, user
`alice`/Admin), including real throwaway records (`Q####`-coded, since the UoM Code field only
allows 5 characters — too short to fit a `TC-UOM-` prefix) created, edited, and deleted live.

This is genuinely the simplest of the three Master Data screens covered this session — just two
fields, no Item Category, no Active toggle on create — so the case count below is intentionally
smaller than Size/Color Master rather than padded to match them.

| #    | Test case                                                            | Steps                                                                                                                                          | Expected result                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify Unit of Measure list screen layout                           | 1. Navigate to Master Data > System Management > Unit of Measure.                                                                             | "Unit of Measure" heading and description load. Tabs All/Active/Inactive each show a live count. Table columns: **UoM Code, Description only** (no Status/Item Category column). A "New UoM" button, Search, Filters, Refresh, Export CSV and column-layout controls are present — **no "Upload" bulk-import button**, unlike Size Master and Color Master, which both have one. |
| TC:2 | Verify successful UoM creation with valid Code and Description      | 1. Click "New UoM".<br>2. Enter a unique UoM Code (≤5 characters, e.g. `Q0723`).<br>3. Enter a Description.<br>4. Click "Create".              | Toast reads exactly "UoM created." A new row appears with the entered Code and Description. **Confirmed live**: unlike Size/Color Master, there is no separate auto-generated ID here — the UoM Code *itself* is the primary key, and it defaults to active with no visible toggle to control that on Create. |
| TC:3 | Verify editing an existing UoM's Description                        | 1. Open an existing (throwaway) UoM.<br>2. Change the Description.<br>3. Click "Save changes".                                                | Save succeeds; toast reads exactly "UoM updated." Note: UoM Code is disabled/locked in the Edit dialog — only Description can be changed. There is also **no Active/Status checkbox anywhere on this form** (Create or Edit). |
| TC:4 | Verify Cancel on Edit discards unsaved changes                      | 1. Open an existing UoM.<br>2. Change the Description.<br>3. Click "Cancel" (not Save).<br>4. Re-open the same UoM.                            | The dialog closes without saving. Re-opening shows the original, unedited Description — confirmed live by round-tripping the value.                                                                                   |
| TC:5 | Verify searching the UoM list by code                                | 1. Enter an existing UoM Code into "Search by code, name…".                                                                                    | The grid narrows to just the matching row within ~1-2 seconds.                                                                                                                                                         |
| TC:6 | Verify permanently deleting a UoM                                   | 1. Open an existing (throwaway) UoM.<br>2. Click "Delete `<code>`".<br>3. On the confirmation dialog, click "Delete" again.                    | A confirmation `alertdialog` appears first: "Delete `<code>`? This permanently deletes `<code>`. This action cannot be undone." — **this screen's lifecycle action is "Delete", not "Deactivate"**, and it is a genuine hard delete. Confirming calls `DELETE /api/uoms/{code}` (200); toast reads exactly "UoM deleted."; searching for that code afterward returns zero rows — the record is fully gone, not soft-deactivated. |
| TC:7 | Verify cancelling the delete confirmation aborts it                 | 1. Open an existing UoM.<br>2. Click "Delete `<code>`".<br>3. On the confirmation dialog, click "Cancel".                                      | The dialog closes, no API call is made, and the record remains in the list unchanged.                                                                                                                                 |
| TC:8 | Verify UoM Code is a genuinely required field                       | 1. Open "New UoM".<br>2. Leave UoM Code blank; fill Description.<br>3. Click "Create".                                                         | Save is blocked. An inline "Required" message appears under UoM Code.                                                                                                                                                  |
| TC:9 | Verify Description is a genuinely required field                    | 1. Open "New UoM".<br>2. Fill UoM Code; leave Description blank.<br>3. Click "Create".                                                         | Save is blocked. An inline "Required" message appears under Description.                                                                                                                                              |
| TC:10 | Verify duplicate UoM Code is rejected                               | 1. Create a UoM with a given Code (succeeds).<br>2. Repeat "New UoM" with the exact same Code.<br>3. Click "Create".                           | Save is blocked. **Confirmed live**: the API returns `409 uom_conflict` with message `uom <code> already exists` — but the UI only shows a generic "Failed to create UoM." toast; the specific reason is never surfaced. |
| TC:11 | Verify UoM Code and Description respect their max-length limits    | 1. Open "New UoM".<br>2. Attempt to type more than 5 characters into UoM Code, and more than 20 into Description.                              | Both fields stop accepting further characters at their limit (`maxlength="5"` on UoM Code, `maxlength="20"` on Description — confirmed via the rendered input attributes and by typing a 27-character description, which was silently truncated to exactly 20 saved characters). |

## Notes for whoever picks this up next

**This is structurally the simplest of the three Master Data screens** documented this session —
just UoM Code (≤5 chars) + Description (≤20 chars), no Item Category lookup, no Active/Status
control anywhere on Create or Edit. Don't assume it shares Size/Color Master's "Active checkbox +
Deactivate button" lifecycle — it genuinely doesn't.

**Confirmed-live field requiredness**: both UoM Code and Description are genuinely required
(TC:8-9) — confirmed via real inline "Required" errors on empty submit.

**Confirmed-live toasts**: Create → `"UoM created."`, Edit save → `"UoM updated."`, Delete →
`"UoM deleted."` (all with trailing periods). Duplicate-code create → generic `"Failed to create
UoM."` (same pattern as Size Master's and Color Master's generic-failure toasts — the backend's
real `uom_conflict` message is never shown to the user).

**Real, surprising finding — this screen's lifecycle action is a genuine hard delete, not a soft
deactivate**: the Edit dialog's action button is labelled **"Delete `<code>`"**, not "Deactivate"
like Size/Color Master. Clicking it shows an explicit, clearly-worded confirmation (`"This
permanently deletes <code>. This action cannot be undone."`) before calling `DELETE
/api/uoms/{code}`, after which the record is completely gone from the list and from search — not
merely flagged inactive. **Practical consequence**: the "Inactive" tab shown on this list (count 0
in every observation this session) most likely can never be populated through the normal UI, since
there is no "deactivate, keep for history" path here the way there is on Size/Color Master — only
permanent removal. Worth flagging to the team as either (a) the Inactive tab is vestigial/copy-pasted
scaffolding from the shared grid component and should be removed from this screen, or (b) a real
gap if "retire a UoM without losing its history" is an actual business need.

**Max-length boundaries (TC:11)**: both limits are enforced client-side via the HTML `maxlength`
attribute (5 for Code, 20 for Description) — typing past the limit simply stops accepting
characters rather than producing a validation error after the fact. Confirmed live by typing a
27-character description and reading back exactly 20 saved characters.

**No "Upload" bulk-import button** on this screen's toolbar (TC:1) — Size Master and Color Master
both have one; worth double-checking if that's intentional (UoM truly is a small, stable list) or
a gap before assuming every Master Data screen gets bulk import.

**Data prerequisite for re-running TC:10**: needs any already-used UoM Code, or create one fresh
in TC:2 and immediately retry it with the same code.

**Not covered / not yet verified**: Export CSV content, the Filters rule-builder panel, column
configuration/resizing, and the three layout-mode toggles — same scope limit as the other two
Master Data screens documented this session.
