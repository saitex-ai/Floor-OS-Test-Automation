# Master Data — GMT Inseam Master

- **Route:** `/master-data/system-management/gmt-inseam` (System Management group)
- **Description:** "Manage garment inseam codes used in size charts and techpack measurements." A
  simple lookup-value master — first test-case documentation for this screen, confirmed live against
  `https://dev.flooros.app` on 2026-10-06 (`master-data` test user), nothing assumed or carried over.

Despite looking like a measurement master, the Inseam Code field is confirmed to be **plain free
text, not numeric** — see TC:9/TC:10 and the Notes below.

| #    | Test case                                                      | Steps                                                                                                                                       | Expected result                                                                                                                                                                 |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC:1 | Verify GMT Inseam Master list layout                           | 1. Navigate to Master Data > System Management > GMT Inseam Master.                                                                           | Heading "GMT Inseam Master" loads with tabs All/Draft/Approved/Inactive/Rejected (each with a live count), a "Search by code, description…" box, Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns, 3 layout modes, and a "New Inseam" button. Table has exactly two columns: Inseam Code, Inseam Description. |
| TC:2 | Verify successful inseam creation with both fields filled       | 1. Click "New Inseam".<br>2. Fill Inseam Code (e.g. a 5-char code) and Description.<br>3. Click "Create".                                      | Modal dialog closes; toast reads exactly **"Inseam created."**; the new row appears in the list immediately.                                                                    |
| TC:3 | Verify validation when both fields are left blank               | 1. Click "New Inseam".<br>2. Leave both fields blank.<br>3. Click "Create".                                                                    | Save is blocked; an inline "Required" paragraph appears under both Inseam Code and Description. Dialog stays open.                                                              |
| TC:4 | Verify Inseam Code is required                                 | 1. Click "New Inseam".<br>2. Fill only Description, leave Inseam Code blank.<br>3. Click "Create".                                             | Save is blocked; "Required" appears under Inseam Code only; no record created.                                                                                                   |
| TC:5 | Verify Description is required                                 | 1. Click "New Inseam".<br>2. Fill only Inseam Code, leave Description blank.<br>3. Click "Create".                                             | Save is blocked; "Required" appears under Description only; no record created.                                                                                                    |
| TC:6 | Verify successful inseam edit                                   | 1. Double-click an existing row to open "Edit Inseam".<br>2. Change the Description.<br>3. Click "Save changes".                               | Toast reads exactly **"Inseam updated."**; the list reflects the new description after the dialog closes.                                                                        |
| TC:7 | Verify Inseam Code is locked on edit                             | 1. Open "Edit Inseam" for an existing record.                                                                                                  | The "Inseam Code" textbox is rendered **disabled** — only Description can be changed after creation.                                                                             |
| TC:8 | Verify Cancel discards changes                                  | 1. Click "New Inseam" (or open an Edit dialog).<br>2. Enter/change a value.<br>3. Click "Cancel".                                              | Dialog closes; no record is created/changed; list is unaffected.                                                                                                                  |
| TC:9 | Verify duplicate Inseam Code is blocked with a specific message | 1. Click "New Inseam".<br>2. Enter a code that already exists in the list (e.g. an existing code).<br>3. Fill Description.<br>4. Click "Create". | Save is blocked; toast reads exactly **"An inseam with this code already exists. Use a different code."** Dialog stays open with values intact so the code can be corrected.    |
| TC:10 | Edge: Inseam Code has a 5-character limit and accepts any text | 1. Click "New Inseam".<br>2. Enter a code longer than 5 characters (e.g. a 9-digit number or 8-letter string).<br>3. Fill Description, click "Create". | Input is capped at **5 characters** (`maxlength="5"` on the field); whatever is typed/filled is truncated to the first 5 characters and saved as-is — confirmed live with a truncated numeric code. |
| TC:11 | Edge: Description has a 50-character limit                     | 1. Click "New Inseam".<br>2. Enter a Description longer than 50 characters.<br>3. Fill Inseam Code, click "Create".                             | Input is capped at **50 characters** (`maxlength="50"` on the field, confirmed via DOM inspection, not exercised to the save step in this pass).                                  |
| TC:12 | Verify list search by code or description                      | 1. Type a known code or part of a description into the Search box.                                                                             | The grid filters to matching rows only (confirmed live while isolating individual test records by code and by description substring).                                           |

## Notes for whoever picks this up next

**No status-change / deactivate flow is reachable from this UI**, despite the list offering
Draft/Approved/Inactive/Rejected tabs with live counts (same shared grid component as Vendor Master
and the rest of Master Data). Confirmed live two ways: (1) selecting a row's checkbox shows only "1
item selected" and a "Clear selection" button — no Approve/Deactivate buttons appear, unlike Vendor
Master's row-selection toolbar; (2) "Configure columns" lists only 2 columns total (Inseam Code,
locked; Inseam Description) — there is no hidden Status column to surface. Every one of the 29 seed
records is "Approved" and Draft/Inactive/Rejected are permanently at 0. Don't build a deactivate test
for this screen — there's currently no way to trigger one from the UI with this user's role.

**Inseam Code is genuinely free text, not numeric**, despite its placeholder ("30") and the module's
measurement-sounding name. Not independently fuzz-tested here the way Waist Master's code field was
(see that file's TC:10/TC:11 and Notes) — seed data already contains non-numeric codes like `IN28`,
`Q0001`, and `TTEST`, which is itself live evidence the field accepts arbitrary text, not just
digits. Worth assuming the same unrestricted-text behavior holds here too, by analogy with the
(fully fuzz-tested) Waist master, which shares this form's identical shape.

**Create/Edit is a modal `dialog`, not a drawer** (unlike Vendor Master's side-drawer pattern) — it
has its own "Maximize"/"Close" buttons in the header, confirmed via `getByRole('dialog', { name: 'New Inseam' })` / `'Edit Inseam'`. Doesn't change query params the way Vendor's `?create=true`/`?edit=` does.

**Duplicate-code handling here is better than Vendor Master's.** The toast gives a specific,
actionable message ("An inseam with this code already exists. Use a different code.") instead of
Vendor's generic "Failed to create vendor." — worth citing as the better pattern if that Vendor Master
gap ever gets raised with the team.

**Data prerequisite / cleanup:** one throwaway record was created and left in the dev data — code
`79128` (the last 5 digits of a timestamp, since the real `TCI...` prefix this session intended
didn't fit the 5-character code limit), description edited during testing to read
"TC-Inseam edited description". Safe to ignore, delete, or reuse.

**Not covered in this pass:** Export CSV, Filters panel, column reordering, Draft/Rejected tab
contents (both empty — nothing to verify), and exact behavior at exactly 5/50 characters (boundary
vs. one-over was inferred from the `maxlength` DOM attribute and a live over-limit truncation check,
not independently verified character-by-character at the boundary).
