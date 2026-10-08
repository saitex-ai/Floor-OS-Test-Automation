# Master Data — Size Master

System Management > Size Master (`/master-data/system-management/sizes`) manages size codes
that are *composed* from an Item Category + Inseam + Waist combination (not typed free-hand) —
used downstream in Techpack and Inventory. This is the first test-case documentation for this
screen; nothing here was carried over from notes — every row below was confirmed directly against
`https://dev.flooros.app` (session: `.auth/master-data.json`, user `alice`/Admin).

| #     | Test case                                                                    | Steps                                                                                                                                                                                 | Expected result                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Size Master list screen layout                                        | 1. Navigate to Master Data > System Management > Size Master.                                                                                                                         | "Size Master" heading and description load. Tabs All/Draft/Approved/Inactive/Rejected each show a live count. Table columns: Size ID, Item Category, Inseam, Waist, Description, Status. A "New Size" button is visible, along with Search, Filters, Refresh, Upload, Export CSV and column-layout controls. |
| TC:2  | Verify successful Size creation with all required fields                     | 1. Click "New Size".<br>2. Click "Pick item category", search, and select a category (e.g. "GMT — Garment").<br>3. Click "Pick inseam" and select an inseam.<br>4. Click "Pick waist" and select a waist not already paired with that inseam+category.<br>5. Click "Create". | Toast reads exactly "Size created." (confirmed live). A new row appears with a system-generated Size ID (format like `SMC0007255`), the selected Item Category/Inseam/Waist, and Status "Approved" — no draft/approval step despite the Draft/Rejected tabs existing. |
| TC:3  | Verify Description auto-fills from Inseam × Waist and cannot be typed into   | 1. Open "New Size" and pick an Item Category.<br>2. Pick an Inseam, then a Waist.                                                                                                     | The Description field auto-populates as `"<InseamCode> - <WaistCode>"` (e.g. "IS111 - 12") as soon as both are selected. The field is read-only (confirmed: `maxlength="200"` but `readonly` — attempting to type into it directly has no effect). |
| TC:4  | Verify editing an existing Size's Inseam/Waist                               | 1. Open an existing Size row.<br>2. Change the Waist selection via "Pick waist".<br>3. Click "Save changes".                                                                          | Save succeeds and the Waist field itself updates. **Bug, confirmed live while automating this case** (corrects this row's original expectation): Description does **not** re-derive — the API's own `PATCH` response shows `waistCode` correctly updated but `description`/`sizeName` still holding the *original* Inseam/Waist text, even after save and reopening the record. Description only derives at create time, never on edit. Size ID and Item Category are both disabled/locked in the Edit dialog — the category cannot be changed after creation, only Inseam/Waist can. |
| TC:5  | Verify searching the Size list by code                                       | 1. Enter an existing Size ID or Item Category/Inseam code fragment (e.g. "IS111") into the "Search by code, name…" box.                                                               | The grid narrows to just the matching row(s) within ~1-2 seconds, no page reload.                                                                                                                                |
| TC:6  | Verify Item Category is a genuinely required field                           | 1. Open "New Size".<br>2. Leave Item Category unset; pick an Inseam and Waist.<br>3. Click "Create".                                                                                  | Save is blocked. An inline "Required" message appears under Item Category and its lookup field is marked invalid.                                                                                              |
| TC:7  | Verify Inseam is a genuinely required field                                  | 1. Open "New Size".<br>2. Pick an Item Category and a Waist; leave Inseam unset.<br>3. Click "Create".                                                                                | Save is blocked. An inline "Required" message appears under Inseam.                                                                                                                                              |
| TC:8  | Verify Waist is a genuinely required field                                   | 1. Open "New Size".<br>2. Pick an Item Category and an Inseam; leave Waist unset.<br>3. Click "Create".                                                                               | Save is blocked. An inline "Required" message appears under Waist.                                                                                                                                               |
| TC:9  | Verify duplicate Inseam+Waist within the same Item Category is rejected      | 1. Create a Size with a given Item Category + Inseam + Waist (succeeds).<br>2. Repeat "New Size" with the exact same Item Category + Inseam + Waist.<br>3. Click "Create".            | Save is blocked. **Confirmed live**: the API returns `409 size_conflict` with message "a size with the same inseam/waist or description already exists in category GMT" — but the UI only ever shows a generic toast, "Failed to create size." The real conflict reason is never surfaced to the user. |
| TC:10 | Verify Cancel on "New Size" discards all selections                          | 1. Open "New Size" and pick an Item Category (and optionally Inseam/Waist).<br>2. Click "Cancel".<br>3. Re-open "New Size".                                                           | The dialog closes without creating a record. Re-opening shows a fully blank form — no leftover selection from the cancelled attempt.                                                                            |
| TC:11 | Verify deactivating a Size (and the list's reaction to it)                   | 1. Open an existing (non-critical, e.g. a throwaway test) Size.<br>2. Click "Deactivate `<SizeID>`" in the dialog header.                                                             | **Bug, confirmed live**: the click fires immediately with **no confirmation prompt** and calls `DELETE /api/sizes/{code}`, which returns 200 with `activeFlag:false` — the record *is* deactivated server-side. But the list's Status column still reads "Approved", the row still counts under "All"/"Approved" (not "Inactive"), and this persists even after a full page reload. The "Deactivate" button in the Edit dialog also still reads "Deactivate" (not "Activate") afterward. The list/tab UI never reflects the real deactivated state. |
| TC:12 | Verify the search box safely handles unusual/special-character input        | 1. Type a script-like string, e.g. `<script>alert(1)</script>`, into Search.                                                                                                          | No script executes, no error is thrown; the grid simply shows zero matching rows.                                                                                                                                |

## Notes for whoever picks this up next

**Nothing in this module behaves like a plain "code + name" lookup master** — don't assume that
shape going in (it's genuinely different from Color Master and Unit of Measure, both covered
alongside this one). Every Create/Edit field is either disabled, a pick-from-existing-master
lookup (Item Category/Inseam/Waist, each opening its own searchable grid dialog, same shape as
Techpack's AI-mode pickers and the Department/Site "Add site" pattern noted in
`agent-notes/master-data-module.md`), or a read-only derived field (Description). **There is no
free-text entry anywhere on this form** — so the usual "max length" / "special characters in a
text field" edge cases from other modules' create forms simply don't apply here; the only place
free text matters at all is the Search box (TC:12).

**Confirmed-live field requiredness**: Item Category, Inseam, and Waist are all genuinely
required (TC:6-8) — confirmed by actually submitting with each one missing and reading the real
inline "Required" error, not assumed from the `*` in the label. Active defaults to checked and
isn't user-togglable on Create (no way to create a size pre-deactivated).

**Confirmed-live success toast**: exactly `"Size created."` (with trailing period). Edit uses
"Save changes" but no edit-save toast text was captured in this pass.

**Real, reproducible bug (TC:4), found while automating this case**: editing an existing Size's
Waist updates `waistCode` correctly (confirmed via the real `PATCH /api/sizes/{code}` response
body) but does **not** recompute `description`/`sizeName` — both stay frozen at whatever they were
when the Size was first created, even after Save and reopening the record. This directly
contradicts this row's originally-written expectation ("Description re-derives from the new
Inseam/Waist pair") — that assumption was never actually verified against a real edit at the time
this doc was first written, only against Create. Net effect: a saved Size's visible Description can
silently go stale/inconsistent with its real Inseam/Waist the moment anyone edits it.

**Real, reproducible bug (TC:11)**: deactivating a Size updates the backend (`activeFlag: false`
via a real `DELETE` call) but the list screen — both the Status column and the Inactive tab/count
— never reflects it, even after a hard reload. This was cross-checked against Color Master, where
the equivalent Deactivate flow **does** correctly flip the row to "Inactive" and update tab
counts — so this is a genuine Size-Master-specific defect, not a shared/expected platform
behavior. Also worth a bug report on its own: unlike Unit of Measure's "Delete" action (which asks
"Delete `<code>`? This permanently deletes `<code>`. This action cannot be undone." before acting),
Size's "Deactivate" button has **no confirmation step at all** — a single misclick deactivates
immediately.

**Duplicate handling (TC:9)**: the backend validates duplicates correctly (409 with a specific,
useful message naming the conflicting category) but the UI swallows that message behind a generic
"Failed to create size." toast. Same exact pattern was confirmed on Color Master and Unit of
Measure (generic "Failed to create X." toasts) — looks like a shared, deliberate(?) toast-handling
choice across all three Master Data screens built this session, not a one-off bug. Worth raising
with the team as a UX gap either way: the user never learns *why* their save failed beyond "it
failed."

**Data prerequisite for re-running TC:9**: needs at least one existing Item Category (e.g. "GMT —
Garment") with at least one already-used Inseam+Waist pair, or create one fresh in TC:2 first and
immediately retry it.

**Not covered / not yet verified**: reactivating a deactivated Size via the Active checkbox +
"Save changes" (tested successfully on Color Master — presumably works the same way here, but not
independently confirmed against Size given the list-refresh bug above makes it hard to verify by
eye); bulk "Upload" import; Export CSV content; Filters rule-builder panel; column
configuration/resizing; the three layout-mode toggles (No split / Vertical split / Horizontal
split).
