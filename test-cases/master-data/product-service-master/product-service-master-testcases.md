# Master Data — Product Service Master

The "Product Service Master" screen under Master Data > Inventory Item
Management (`/master-data/inventory-item-management/product-service-master`).
Defines service definitions scoped per item category (e.g. "Calibration
service" under "Capital Equipment") — the simplest of the three Inventory
Item Management screens: no approval workflow, no delete action, just a
straightforward two-required-field create/edit form. No automation or prior
documentation existed for this module before this file, so it uses the
simple 4-column format.

| #     | Test case                                                                 | Steps                                                                                                                                                                                                              | Expected result                                                                                                                                                                                                                      |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                          | 1. Go to Product Service Master > "Add Service".<br>2. Click "Pick item category", filter/select a category (e.g. BAG — BAG).<br>3. Fill Product Service Description.<br>4. Click "Create".                        | Toast `Service created` appears (no trailing period — confirmed live); dialog closes; new row shows the picked Item Category, the entered Description, and Status "Active".                                                      |
| TC:2  | Verify required fields are exactly Item Category and Description (no other optional fields to test separately) | 1. Open "Add Service".<br>2. Pick a category and fill Description only — this is already the full required set, there is nothing else optional to omit.<br>3. Click "Create".                                      | Save succeeds with toast `Service created` — this form has no additional optional fields beyond the two required ones and the always-locked Active checkbox.                                                                       |
| TC:3  | Verify successful edit of an existing service                              | 1. Search for a known service, click its row (opens "Edit Service" directly — no separate read-only view).<br>2. Change the Description.<br>3. Click "Save changes".                                               | Toast `Service updated` appears (no trailing period, consistent with the Create toast's own missing period — this module is internally consistent even though it differs from its sibling screens, see Notes).                    |
| TC:4  | Verify list search by service code or description                          | 1. Open the list.<br>2. Search by a known service's Product Service ID, then by its Description.                                                                                                                  | Both searches narrow the table to matching rows; placeholder documents scope: "Search by service code or description…".                                                                                                           |
| TC:5  | Verify All / Active / Inactive tab filters on the list                     | 1. Open the list.<br>2. Click "Active", then "Inactive", then back to "All", noting each tab's live count.                                                                                                          | Each tab filters to matching rows; counts match what's shown. (As of this pass "Inactive" reads 0 for all 20 services — see Notes, no confirmed path to reach that state exists in this UI, same gap as Attribute Master.)         |
| TC:6  | Verify validation when both required fields are left blank                 | 1. Open "Add Service".<br>2. Leave Item Category unpicked and Description empty.<br>3. Click "Create".                                                                                                             | Save is blocked; inline "Required" appears under both "Pick item category" (which also gets `[invalid]`) and Product Service Description simultaneously; no toast, dialog stays open.                                             |
| TC:7  | Verify duplicate Description is blocked **within the same Item Category**  | 1. Create a service with a given Description under Item Category A.<br>2. Attempt to create a second service with the **exact same Description** under the **same** Item Category A.<br>3. Click "Create".        | Second save is blocked with toast `Could not create the service` — no field-level inline indicator; dialog stays open with the entered data intact.                                                                                |
| TC:8  | Verify the same Description is allowed across **different** Item Categories (not a bug) | 1. Create a service named "X" under Item Category A.<br>2. Create a second service also named "X" but under a **different** Item Category B.<br>3. Click "Create" on the second.                                   | Both saves succeed with `Service created` — confirms Description uniqueness is scoped per Item Category, matching the same pattern already confirmed on Attribute Master (see that module's file).                                 |
| TC:9  | Verify Cancel discards changes on create                                   | 1. Open "Add Service" and fill in the Description (category optional for this check).<br>2. Click "Cancel".                                                                                                        | No record is created; dialog closes; searching for the typed description afterward returns zero rows; list total count unchanged.                                                                                                  |
| TC:10 | Verify Product Service Description max length (edge)                       | 1. Open "Add Service".<br>2. Type 400 characters into Product Service Description.                                                                                                                                 | The field silently stops accepting input at **200 characters** — confirmed live via `inputValue()` after typing 400 (length came back exactly 200); no inline "too long" error, same silent-truncation pattern as Attribute Master's Attribute Name. |
| TC:11 | Verify special/unicode characters in Description (edge)                    | 1. Open "Add Service", pick a category.<br>2. Enter a Description containing symbols, HTML-like text and unicode (e.g. `Test & <script>alert(1)</script> "quote" 日本語`).<br>3. Click "Create".                    | The full string is accepted with no client-side restriction and the create succeeds; confirm it renders safely (escaped, not executed) on the list/edit view.                                                                      |
| TC:12 | Verify Item Category becomes locked after creation (edge/trap)             | 1. Open an existing service's Edit screen.<br>2. Inspect the "Pick item category" field and its button.                                                                                                             | Both the textbox and button carry `[disabled]` — the Item Category chosen at creation can never be changed afterward, confirmed live. Description remains editable. Same lock pattern as Attribute Master and Attribute Value Master's own parent-reference fields. |
| TC:13 | Verify there is **no confirmed way to deactivate a service** (bug-like gap, confirmed live) | 1. Inspect the "Active" checkbox in both Create and Edit dialogs.<br>2. Select a row's checkbox on the list and observe what appears.<br>3. Inspect the Status column cells.                                        | The "Active" checkbox is **checked and disabled** everywhere — it can never be unchecked. Selecting a row surfaces only a floating "N item selected / Clear selection" pill with **no action buttons** — no delete, no deactivate. The Status column is a plain read-only cell, not an interactive control (contrast Attribute Value Master's clickable Status button). No path to move a record to "Inactive" exists in this screen, confirmed live — identical gap to Attribute Master. |
| TC:14 | Verify the Item Category picker is the same shared component used elsewhere | 1. Open "Add Service".<br>2. Click "Pick item category" and inspect the resulting dialog.                                                                                                                           | A "Select Item Category" picker dialog opens — an AG-grid-style grid of 174 real item categories with per-column filters (Category Code, Description, Stock Type, Active, Capitalization, GMT Size, Last Inventory ID, Stock Item), confirmed to be the exact same component as Attribute Master's own "Pick item category" picker. |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`,
logged in as `alice`/Admin) and throwaway records prefixed
`TC-ProdSvc-...` — this module had **zero** existing documentation or
automation in this repo before this file. This is the simplest of the three
Inventory Item Management screens explored in this pass (compare Attribute
Master and Attribute Value Master's own files for the richer workflows).

- **Dialog-based CRUD, same pattern as its two sibling screens** —
  "Add Service" / clicking a row open modal dialogs ("Add Service" / "Edit
  Service") with no URL change; `page.url()` stays on
  `/master-data/inventory-item-management/product-service-master` throughout
  every flow.
- **List**: heading "Product Service Master", tabs All/Active/Inactive (each
  with a live count — simpler than Attribute Value Master's five-tab
  Draft/Approved/Inactive/Rejected workflow), search ("Search by service
  code or description…"), the usual Filters/Refresh/Export CSV/Toggle cell
  filters/Configure columns/Best-fit columns/3 layout modes, a single "Add
  Service" button. Table columns: Product Service ID, Product Service
  Description, Item Category (rendered `<CODE> — <Description>`), Status.
  The smallest column set of the three modules.
- **Create form fields, exactly as marked live with `*`**: Product Service ID
  (disabled, placeholder `< NEW >` — same literal placeholder text as
  Attribute Value Master's Attribute Value Code field, but different from
  Attribute Master's "Auto-generated" wording), Item Category\* (a "Pick item
  category" textbox + button opening the same shared picker component used
  by Attribute Master — see TC:14), Product Service Description\* (textbox,
  placeholder "Stone wash"), Status (checkbox, always checked **and
  disabled**, identical non-interactive pattern to both sibling modules).
  Only two genuinely required fields — the simplest form of the three.
- **Exact toast text, confirmed live:**
  - Create: `Service created` — **no trailing period**.
  - Edit/Save: `Service updated` — **no trailing period**.
  (Internally consistent with each other, but a different convention from
  both Attribute Master, whose toasts *do* carry a trailing period
  ("Attribute created.", "Attribute updated."), and Attribute Value Master,
  whose create toast is a dynamic string with a period but whose edit toast
  has none. Three screens in the same nav group, three different
  period/no-period/dynamic-text conventions — flagged in all three files as
  a cross-module consistency gap worth raising with the team.)
- **Duplicate handling confirmed live**: same Description under the same
  Item Category is blocked with toast `Could not create the service` — a
  third distinct wording (compare Attribute Master's "Failed to create
  attribute." and Attribute Value Master's "Could not create the value").
  Confirmed separately that the **same Description under a different Item
  Category is allowed** — uniqueness is scoped per category, matching
  Attribute Master's own pattern exactly.
- **Item Category is permanently locked after creation**, confirmed live via
  Edit Service: both the "Pick item category" textbox and button carry
  `[disabled]`. Description remains fully editable.
- **No deactivate or delete path exists anywhere in this screen, confirmed
  live** — identical gap to Attribute Master (see that file's own note for
  the full list of places checked: Active checkbox always
  checked-and-disabled, row-selection pill has no action buttons, Status
  cell is a plain read-only cell not a button). Contrast with Attribute
  Value Master, which has both a real delete and a working inline
  deactivate — worth raising to the team as an inconsistency across what are
  otherwise structurally near-identical screens.
- **Product Service Description is capped at 200 characters**, confirmed
  live by typing 400 'Z' characters and reading `inputValue()` back (length
  200, silent truncation, no inline error) — the same 200-char cap as
  Attribute Master's Attribute Name, unlike Attribute Value Master's own
  User Attribute Value Code field which caps at 20 and force-uppercases.
- **Special/unicode characters are accepted with no restriction**, confirmed
  live with a string containing `&`, a fake `<script>` tag, a literal quote,
  and Japanese characters — preserved exactly in `inputValue()` and the
  create succeeded.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen.
- **Not covered in this pass**: Filters rule-builder, Export CSV content,
  Configure/Best-fit columns, the 3 layout modes, and whether Product
  Service Master values are actually consumed/validated anywhere downstream
  (e.g. Techpack or a BOM screen) — out of scope for this module's own CRUD
  surface.
