# Master Data — GMT Waist Master

- **Route:** `/master-data/system-management/gmt-waist` (System Management group)
- **Description:** "Manage garment waist codes used in size charts and techpack measurements." A
  simple lookup-value master, identical in shape to GMT Inseam Master (see that module's own file) —
  first test-case documentation for this screen, confirmed live against `https://dev.flooros.app` on
  2026-10-06 (`master-data` test user), independently verified rather than assumed to mirror Inseam.

The Waist Code field is confirmed, live, to be **completely unvalidated free text** — negative
numbers, zero, decimals, and letters are all accepted and saved as literal strings with no numeric
coercion at all. See TC:9–TC:12.

| #     | Test case                                                      | Steps                                                                                                                                        | Expected result                                                                                                                                                                 |
| ----- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify GMT Waist Master list layout                             | 1. Navigate to Master Data > System Management > GMT Waist Master.                                                                              | Heading "GMT Waist Master" loads with tabs All/Draft/Approved/Inactive/Rejected (each with a live count), a "Search by code, description…" box, Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns, 3 layout modes, and a "New Waist" button. Table has exactly two columns: Waist Code, Waist Description. |
| TC:2  | Verify successful waist creation with both fields filled        | 1. Click "New Waist".<br>2. Fill Waist Code (e.g. a 5-char code) and Description.<br>3. Click "Create".                                          | Modal dialog closes; toast reads exactly **"Waist created."**; the new row appears in the list immediately.                                                                      |
| TC:3  | Verify validation when both fields are left blank                | 1. Click "New Waist".<br>2. Leave both fields blank.<br>3. Click "Create".                                                                       | Save is blocked; an inline "Required" paragraph appears under both Waist Code and Description. Dialog stays open.                                                                |
| TC:4  | Verify Waist Code is required                                   | 1. Click "New Waist".<br>2. Fill only Description, leave Waist Code blank.<br>3. Click "Create".                                                 | Save is blocked; "Required" appears under Waist Code only; no record created.                                                                                                     |
| TC:5  | Verify Description is required                                  | 1. Click "New Waist".<br>2. Fill only Waist Code, leave Description blank.<br>3. Click "Create".                                                 | Save is blocked; "Required" appears under Description only; no record created.                                                                                                     |
| TC:6  | Verify successful waist edit                                    | 1. Double-click an existing row to open "Edit Waist".<br>2. Change the Description.<br>3. Click "Save changes".                                  | Toast reads exactly **"Waist updated."**; the list reflects the new description after the dialog closes.                                                                          |
| TC:7  | Verify Waist Code is locked on edit                              | 1. Open "Edit Waist" for an existing record.                                                                                                     | The "Waist Code" textbox is rendered **disabled** — only Description can be changed after creation.                                                                               |
| TC:8  | Verify Cancel discards changes                                  | 1. Click "New Waist" (or open an Edit dialog).<br>2. Enter/change a value.<br>3. Click "Cancel".                                                 | Dialog closes; no record is created/changed; list is unaffected.                                                                                                                   |
| TC:9  | Verify duplicate Waist Code is blocked with a specific message  | 1. Click "New Waist".<br>2. Enter a code that already exists in the list (e.g. "25").<br>3. Fill Description.<br>4. Click "Create".              | Save is blocked; toast reads exactly **"A waist with this code already exists. Use a different code."** Dialog stays open with values intact so the code can be corrected.        |
| TC:10 | Edge: negative number and zero accepted as Waist Code            | 1. Click "New Waist".<br>2. Enter Waist Code `-5`, Description "desc--5"; Create.<br>3. Repeat with Waist Code `0`, Description "desc-0".        | Both save successfully with **"Waist created."** toasts; rows for `-5` and `0` appear in the list exactly as typed — no numeric range/positivity validation exists on this field. |
| TC:11 | Edge: decimal value accepted as Waist Code                       | 1. Click "New Waist".<br>2. Enter Waist Code `32.5`, Description "desc-32.5"; Create.                                                            | Saves successfully; row shows literal code "32.5" — confirms the field does not require (or coerce to) a whole number despite the module modeling a garment measurement.          |
| TC:12 | Edge: non-numeric text accepted as Waist Code                    | 1. Click "New Waist".<br>2. Enter Waist Code `ABCDE123`, Description "desc-ABCDE123"; Create.                                                    | Saves successfully; code is truncated to the field's 5-character limit ("ABCDE") and saved — confirms the field is plain text with no numeric-only restriction at all.             |
| TC:13 | Edge: Waist Code has a 5-character limit                        | 1. Click "New Waist".<br>2. Enter a code longer than 5 characters (e.g. a 9-digit number).<br>3. Fill Description, click "Create".               | Input is capped at **5 characters** (`maxlength="5"`); the value is truncated to the first/visible 5 characters before saving.                                                     |
| TC:14 | Verify list search by code or description                       | 1. Type a known code or part of a description into the Search box.                                                                               | The grid filters to matching rows only (confirmed live while isolating individual test records, e.g. searching "TC-Waist" or "desc-").                                            |

## Notes for whoever picks this up next

**This module mirrors GMT Inseam Master's shape exactly** (same list layout, same modal Create/Edit
dialog, same two-field form, same `maxlength` limits of 5/50), but every behavior in this file was
independently re-verified live rather than assumed from Inseam's — per the session's instruction not
to carry anything over. The one thing worth calling out as **not** identical: this file goes further
on the numeric-edge-case fuzzing (TC:10–TC:12) than the Inseam file does, specifically to settle
whether "Waist Code"/"Inseam Code" are secretly numeric-validated measurement fields. They are not —
confirmed live, four separate accepted values (`-5`, `0`, `32.5`, `ABCDE123`→`ABCDE`), each producing
a clean "Waist created." toast and a literal, unmodified (aside from truncation) row in the list.

**No status-change / deactivate flow is reachable from this UI**, same finding as GMT Inseam Master.
Despite Draft/Approved/Inactive/Rejected tabs with live counts, selecting a row's checkbox shows only
"1 item selected" with no Approve/Deactivate actions, and right-clicking a row produces no context
menu. Don't build a deactivate test for this screen.

**Duplicate-code handling gives a specific, actionable message** — "A waist with this code already
exists. Use a different code." — same better-than-Vendor-Master pattern as Inseam. Worth citing
together if the Vendor Master's generic "Failed to create vendor." toast (see that file's Notes) ever
gets raised as an inconsistency.

**Create/Edit is a modal `dialog`** (`getByRole('dialog', { name: 'New Waist' })` /
`'Edit Waist'`), not a side-drawer or dedicated route — same as Inseam, different from Vendor Master.

**Data prerequisite / cleanup:** several throwaway records were created and left in the dev data
during this pass:
- Waist Code `22097` (last 5 digits of a timestamp — the 5-char limit prevented a literal
  `TC-Waist-` code prefix), Description `TC-Waist-<timestamp>`.
- Edge-case probe rows: codes `0`, `-5`, `32.5`, `ABCDE` with descriptions `desc-0`, `desc--5`,
  `desc-32.5`, `desc-ABCDE123` respectively.

All are safe to ignore, delete, or reuse; none collide with real seed data (seed codes are plain
numbers 12–38 or `W0xxx`/`WNNNN` style QA codes).

**Not covered in this pass:** Export CSV, Filters panel, column reordering/Configure columns beyond
confirming there's no hidden Status column, and Draft/Rejected tab contents (both empty — nothing to
verify).
