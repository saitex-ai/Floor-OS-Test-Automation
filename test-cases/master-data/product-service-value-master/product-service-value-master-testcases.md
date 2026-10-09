# Master Data — Product Service Value Master

The "Product Service Value Master" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/product-service-value-master`,
nav group collapsed by default). Holds preset **values** for a parent Product
Service (e.g. for product service "WASH", values like "Stone wash" / "Acid
wash") — a one-level child master, not referencing Item Class or Item Master
at all. No automation exists for this module yet, so this file uses the
simple 4-column format (no ClickUp/Automated/Verified columns).

| #    | Test case                                                                   | Steps                                                                                                                                                                                                 | Expected result                                                                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify successful creation with all fields filled                            | 1. Go to Product Service Value Master > "Add Value".<br>2. Click "Pick product service" and select a row from the picker (its Description, Item Category Code, and Item Category Description auto-fill).<br>3. Fill Description.<br>4. Click "Create". | Toast "Value created" appears (no trailing period); redirected to the list; the new row shows the auto-generated Value ID, the picked Product Service, the entered Description, the auto-derived Category, and Status "Active". |
| TC:2 | Verify successful creation with only required fields                         | 1. Open "Add Value".<br>2. Pick a Product Service (required) and fill Description (required) only.<br>3. Click "Create".                                                                              | Save succeeds with toast "Value created" — confirms Active/Status, and the auto-fetched Product Service Description/Item Category Code/Item Category Description display fields are not independently fillable/required (they derive from the picker). |
| TC:3 | Verify successful edit of an existing value                                  | 1. Open the list, search for a known Value ID or description, click its row (opens directly into "Edit Value" — no separate read-only detail view).<br>2. Change the Description.<br>3. Click "Save changes". | Toast "Value updated" appears (no trailing period); the list reflects the new Description.                                                                                                                                |
| TC:4 | Verify list search by value code, description, or parent service             | 1. Open the list.<br>2. Search by a known Value ID.<br>3. Clear and search by Description text.<br>4. Clear and search by the parent Product Service ID.                                               | Each search narrows the table to the matching row(s); matches the search box's own placeholder ("Search by value code, description, or parent service…").                                                               |
| TC:5 | Verify All / Active / Inactive tab filters on the list                       | 1. Open the list.<br>2. Click the "Active" tab, then "Inactive", then back to "All".                                                                                                                    | Each tab's live count matches the rows shown. **Note**: the "Inactive" tab is confirmed-live to always show 0 — see Notes, there is no way to produce an Inactive value through this UI.                                 |
| TC:6 | Verify validation when both required fields are left blank                   | 1. Open "Add Value".<br>2. Leave Product Service unpicked and Description empty.<br>3. Click "Create".                                                                                                 | Save is blocked; inline "Required" errors appear simultaneously under both Product Service ID and Description — no toast, no navigation, dialog stays open.                                                               |
| TC:7 | Verify the "Pick product service" picker — cross-module reference            | 1. Open "Add Value".<br>2. Click the "Pick product service" field.                                                                                                                                      | A "Select Product Service" dialog opens immediately (no typing needed) listing live Product Service Master records (confirmed 20 rows at time of writing) with columns #, Product Service ID, Product Service Description, Item Category. Picking a row auto-fills Product Service Description, Item Category Code, and Item Category Description as disabled/read-only fields in the parent form. |
| TC:8 | Verify duplicate (same Product Service + same Description) is blocked        | 1. Create a Value under a given Product Service with a given exact Description.<br>2. Attempt to create a second Value under the **same** Product Service with the **exact same** Description.<br>3. Click "Create" for both. | First save succeeds ("Value created"). Second save is blocked with toast "Could not create the value" — a generic error, no field-level indication of which field conflicted; the dialog stays open with the entered data intact. |
| TC:9 | Verify Cancel discards changes on create                                     | 1. Open "Add Value", pick a Product Service and type a Description.<br>2. Click "Cancel".                                                                                                               | No record is created; dialog closes; the list's total count is unchanged.                                                                                                                                                 |
| TC:10| Verify Description max length (edge)                                         | 1. Open "Add Value" (or Edit an existing Value).<br>2. Type 250+ characters into Description.                                                                                                          | The field silently stops accepting input at exactly **200 characters** (hard `maxlength`) — confirmed live via `inputValue()` after attempting 250/300-char strings in both Create and Edit; the on-screen counter reads "200/200", no inline "too long" error ever appears because the cap is enforced before that point. |
| TC:11| Verify special/unicode characters in Description (edge)                      | 1. Open "Add Value", pick a Product Service.<br>2. Enter a Description containing symbols, HTML-like text and unicode (e.g. `Wash & Co. <script>alert(1)</script> "quote" 日本語 50%`) and save.         | The full string (up to the 200-char cap) is accepted with no client-side character-set restriction; save succeeds with toast "Value created" — confirm on the list that it renders safely (escaped), not executed.       |
| TC:12| Verify the Status/Active field cannot actually be changed — **confirmed bug** | 1. Open "Add Value" or Edit an existing Value.<br>2. Inspect the "Active" checkbox under "Status".<br>3. Attempt to click/uncheck it.                                                                   | **The checkbox is always checked and genuinely disabled** (`disabled` property `true`, `pointer-events: none`) in both Create and Edit — a real click attempt times out / never registers. There is no way to deactivate a Product Service Value anywhere in this UI, consistent with the "Inactive" tab permanently reading 0. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`) and
throwaway records prefixed `TC-PSVal-...` — this module (and the whole
"Inventory Item Management" nav group) had **zero** existing documentation
or automation in this repo before this session.

- **Nav**: "Inventory Item Management" is a separate, collapsed-by-default
  nav group from "System Management" — confirmed the
  `page.getByText(/inventory item management/i).first().evaluate((el) =>
  el.click())` DOM-click workaround is only needed if navigating via the
  sidebar; `page.goto()` straight to the route works fine once authenticated
  and is what every scratch script in this session used instead.
- **List**: heading "Product Service Value Master" (`level=1`), one-line
  description "Preset values for product services.", tabs All/Active/
  Inactive (each with a live count, 56→57+ during this session), search
  ("Search by value code, description, or parent service…"),
  Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit
  columns (not explored in depth), an "Add Value" button (not "New Value" —
  yet another per-screen casing/wording variant, consistent with this app's
  established lack of a shared button-naming convention across Master Data
  screens). Table columns: Value ID, Product Service ID, Product Service,
  Description, Category, Status.
- **"Add Value" opens a modal `dialog`, not a page navigation** (URL stays
  on the list route) — a different shape from Company/Customer Master's
  `?create=true` full-page pattern, and from Item Class/Item Master's own
  `?create=true`/`?addToItemMaster=true` full-page pattern (see those two
  files). Clicking a row to edit also opens a dialog ("Edit Value") in
  place, not a navigation.
- **Create/Edit dialog fields**: Value ID (disabled, shows literally `<
  NEW >` before save), Status/Active (checkbox, always checked and
  disabled — see TC:12), Product Service ID\* (a picker field, placeholder
  "Click to pick a product service…", `aria-label="Pick product service"`),
  Product Service Description / Item Category Code / Item Category
  Description (all disabled, auto-fetched from the picked Product Service),
  Description\* (textbox, placeholder "Medium wash", live `0/200` character
  counter). **Only Product Service ID and Description are genuinely
  required** — confirmed live via empty submit showing "Required" under
  both simultaneously, no gap between what looks required and what's
  enforced (unlike several other Master Data screens' known traps).
- **Exact success toast text, confirmed live — no trailing period on
  either, unlike most other Master Data screens**:
  - Create: `Value created`
  - Edit/Save: `Value updated`
  - Duplicate-create failure: `Could not create the value`
- **Confirmed-live bug: the Status/Active checkbox is always checked and
  permanently disabled** in both the Create and Edit dialogs
  (`el.disabled === true`, `pointer-events: none`, `opacity: 0.5` via
  computed style — the plain `getAttribute('disabled')` call returns an
  empty string which is easy to misread as falsy; check the computed style
  or the `disabled` DOM property instead). A real Playwright `.click()` or
  `.uncheck()` on it times out waiting for actionability. This fully
  explains why the "Inactive" tab's count read **0** throughout this
  session regardless of how many values existed — there appears to be **no
  way to deactivate a Product Service Value anywhere in this UI**. Worth
  flagging to the team; this is a step further than Company/Customer
  Master's "Deactivate button never relabels" bug — here there is no
  deactivate affordance at all.
- **No delete action found** anywhere on this screen (list or dialog) —
  contrast with Item Master, which has a real "Delete permanently" flow
  (see that module's file).
- **Confirmed-live hard cap: Description truncates silently at exactly 200
  characters** in both Create and Edit — attempted 250/300-char strings
  both landed at length 200 via `inputValue()`, the counter reads
  `200/200`. No inline "too long" error ever fires since the cap blocks
  further typing before that validation would trigger.
- **Duplicate (same Product Service + exact same Description) is blocked**,
  confirmed via two back-to-back creates with identical picker selection
  and identical Description text — second attempt fails with the generic
  toast `Could not create the value`, dialog stays open with the entered
  data intact so the user can tweak and retry. Not yet determined whether
  the uniqueness constraint is on Description alone or the
  (ProductService, Description) pair — not tested with same Description
  under a *different* Product Service (would need to check whether that
  succeeds).
- **Product Service picker, cross-module note**: the "Select Product
  Service" dialog is a live, searchable (`Search by ID, code, description,
  or category…`) table sourced from the Product Service Master (20 rows at
  time of writing) — real plain `row`s (not cmdk-style buttons), so
  `getByRole('row')` works directly, unlike Employees' Department picker
  (see `agent-notes/master-data-module.md`). Did not cross-reference
  Product Service Master's own test coverage per the task's instructions —
  only confirmed what this module's own picker surfaces.
- **Not covered in this pass**: Filters button's rule-builder UI, Export
  CSV content, Configure columns/Best-fit columns, the 3 layout modes,
  row-level checkboxes/bulk actions, and whether the (Product Service,
  Description) uniqueness check is really a compound key or just
  Description alone.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see
  `agent-notes/master-data-module.md`).
