# Master Data — Additional Master

The "Additional Master" screen under Master Data > Inventory Item Management
(`/master-data/inventory-item-management/additional-master`, reached via the
"Inventory Item Management" nav group — collapsed by default in the left
nav). Manages cost add-on records (freight, insurance, handling, inspection,
packaging surcharge, etc.) that get referenced elsewhere in costing/BOM
screens. The simplest-shaped of the three Inventory Item Management
sub-modules covered in this pass (Price Library, Additional Master, Item
Unit Price) — a plain two-field code/description master behind a modal
dialog, not a full page. No automation or documentation existed for this
module before this file.

| #     | Test case                                                            | Steps                                                                                                                                                                      | Expected result                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TC:1  | Verify successful creation with both fields filled                   | 1. Go to Master Data > Inventory Item Management > Additional Master.<br>2. Click "New Additional".<br>3. Fill Code (e.g. `TC-AddlMaster-<timestamp>`) and Description.<br>4. Click "Create". | Toast "Additional master created." appears; the dialog closes; the new row is visible on the list with the entered Code and Description and an auto-generated numeric ID in the ID column.                        |
| TC:2  | Verify Code and Description are the entire form — there is no "required fields only" variant | 1. Click "New Additional".<br>2. Observe the dialog's fields.                                                                                                             | The "New Additional" dialog has exactly three fields: ID (disabled, shows "< NEW >" placeholder), Code\* and Description\* — both starred/required. There are no optional fields on this form, so a "required-only" create is identical to a "full" create for this module. |
| TC:3  | Verify successful edit of an existing record's Description            | 1. Open the list, search for a known record, click its row (opens "Edit Additional").<br>2. Change the Description.<br>3. Click "Save changes".                           | Toast "Additional master updated." appears; the list reflects the new Description.                                                                                                                                  |
| TC:4  | Verify list search by Code and by Description                        | 1. Search by a known record's Code.<br>2. Clear and search by a substring of its Description instead.                                                                     | Both searches narrow the table to the matching row(s); placeholder reads "Search by code, name…".                                                                                                                   |
| TC:5  | Verify All / Active / Inactive tab filters — and the missing deactivate affordance | 1. Click the "Active" tab, then "Inactive", then "All".<br>2. Separately, open an existing record's Edit dialog and look for any Active/Inactive toggle.                  | Tabs filter correctly and each shows a live count. **But the Inactive tab is always 0** — there is no Active/Inactive switch anywhere on the Create or Edit form, and no deactivate action anywhere in the UI (only a hard "Delete" exists, see TC:11). The Inactive tab appears to be vestigial/unused for this module. |
| TC:6  | Verify validation when both fields are left blank                     | 1. Click "New Additional".<br>2. Leave Code and Description empty.<br>3. Click "Create".                                                                                  | Save is blocked; inline "Required" errors appear under both Code and Description simultaneously; the dialog stays open; no toast fires.                                                                            |
| TC:7  | Verify duplicate Code/Description handling                           | 1. Create a record with a given Code.<br>2. Attempt to create a second record reusing the **exact same** Code.<br>3. Click "Create".                                       | Second save is blocked with toast **"A record with this code or name already exists."** — the dialog stays open with the entered data intact, ready to correct and retry (no inline field-level error is shown, only the toast). |
| TC:8  | Verify Cancel discards changes on create                             | 1. Click "New Additional" and fill in Code and Description.<br>2. Click "Cancel".                                                                                          | No record is created; dialog closes; searching for the entered Code afterward returns zero rows.                                                                                                                    |
| TC:9  | Verify Code max length (edge)                                        | 1. Click "New Additional".<br>2. Type 250 characters into Code.                                                                                                            | Input silently stops accepting characters at exactly **200** (confirmed via the field's own `maxlength="200"` attribute and by reading `inputValue()` back after typing 250 `X`s — truncated to 200 `X`s). No inline "too long" error is shown. |
| TC:10 | Verify special/unicode characters in Description (edge)              | 1. Click "New Additional".<br>2. Enter a Description containing symbols, HTML-like text and unicode (e.g. `Test & Co. <script>alert(1)</script> / "quote" 日本語`).         | The full string is accepted into the field verbatim (confirmed via `inputValue()` equality) with no client-side character-set restriction; confirm on save whether it renders safely (escaped) in the list, not executed. |
| TC:11 | Verify Delete action is a genuine, permanent hard-delete              | 1. Create a throwaway record.<br>2. Open its Edit dialog and click the "Delete <ID>" button (top-left of the dialog, e.g. "Delete ADD0000012").<br>3. Read the confirmation dialog, then confirm. | An `alertdialog` appears titled **"Delete <ID>?"** with body text **"This permanently deletes <ID>. This action cannot be undone."** and Cancel/Delete buttons. Confirming shows toast **"Additional master deleted."** and the record disappears entirely from **both** the All and Inactive tabs — this is a true hard delete, not a soft deactivate (there is no "Inactive" landing state for a deleted record). |
| TC:12 | Verify ID and Code become immutable once a record is saved (edge/trap) | 1. Open an existing record's Edit dialog.<br>2. Inspect the ID and Code fields.                                                                                            | Both ID and Code render as **disabled** textboxes in Edit mode — only Description can be changed after creation. The Edit dialog's own subtitle shows the padded internal ID (e.g. "Editing #11 · ADD0000011"), which is a different, zero-padded format from the plain sequential number shown in the list's own "ID" column (e.g. "11") — a locator trap if a test asserts on "the ID" without specifying which format. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) and
throwaway records prefixed `TC-AddlMaster-...` — this module had **zero**
existing documentation or automation in this repo before this file. The
"Inventory Item Management" nav group is collapsed by default; this module
was reached via direct `page.goto('/master-data/inventory-item-management/additional-master')`
rather than expanding the nav (per the task brief, expansion wasn't needed).

- **Locator trap, confirmed live**: `page.getByLabel('Code')` (default
  substring match) also matches a grid "Resize Code column" button (`aria-label="Resize Code column"`)
  elsewhere on the page, causing a strict-mode violation. Scope the locator
  to the dialog first (`page.getByRole('dialog').getByRole('textbox', { name: /^Code/ })`)
  or use `exact: true` with the full accessible name `"Code *"`. Same shape
  of trap as the combobox collisions documented in
  `agent-notes/master-data-module.md` for other screens, just on a plain
  textbox here instead of a combobox.
- **Create/Edit is a modal dialog**, not a dedicated route — "New Additional"
  and "Edit Additional" both render as a Radix `dialog` on top of the list
  (URL does not change). Dialog title "New Additional" / "Edit Additional";
  create subtitle "Create a new additional master (cost add-on) record."
- **Exact toast text, confirmed live:**
  - Create: `Additional master created.`
  - Edit/Save: `Additional master updated.`
  - Delete: `Additional master deleted.`
  - Duplicate-code failure: `A record with this code or name already exists.`
  (All via `[data-sonner-toast]`, this app's sonner toast container — `getByRole('status')` does **not** find it; see `src/locators/**/*.locators.ts` for the established pattern elsewhere in this repo.)
- **No deactivate/soft-delete mechanism exists in this module at all** —
  only a genuine permanent Delete (TC:11). The list's Active/Inactive tabs
  are present (same shared grid component as other Master Data screens) but
  Inactive is always empty for this module since nothing ever lands there.
  Worth flagging to the team as a possible UI inconsistency with modules
  like Company Master that have real Active/Inactive lifecycles.
- **Not covered in this pass**: Filters button's rule-builder UI, Export
  CSV content, Configure columns/Best-fit columns, the 3 layout modes, and
  bulk/row-checkbox actions — same set of "not yet covered" toolbar features
  called out in several other Master Data files in this repo.
