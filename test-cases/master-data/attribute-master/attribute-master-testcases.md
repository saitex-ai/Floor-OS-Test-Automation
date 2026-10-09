# Master Data — Attribute Master

The "Attribute Master" screen under Master Data > Inventory Item Management
(`/master-data/inventory-item-management/attribute-master`). Defines techpack
attributes scoped per item category — Material, GSM, Composition, etc. — each
with a Data Type (Text/Number), and two descriptive flags (Required, Desc
Flag) that control how the attribute behaves wherever it's consumed
elsewhere (Techpack). No automation or prior documentation exists for this
module yet, so this file uses the simple 4-column format (no
ClickUp/Automated/Verified columns), matching Company Master's file.

| #     | Test case                                                               | Steps                                                                                                                                                                                                                 | Expected result                                                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                        | 1. Go to Attribute Master > "New Attribute".<br>2. Click "Pick item category", search/filter, and select a category (e.g. ADJ — Adjustable).<br>3. Fill Attribute Name.<br>4. Open the Data Type combobox and select "Number".<br>5. Check "Required" and "Desc Flag".<br>6. Click "Create". | Toast "Attribute created." appears; dialog closes; the new row appears on the list with the entered Attribute Name, the chosen Item Category, Data Type "NUMBER", Required "Yes", Desc Flag "Yes", Status "Active".                     |
| TC:2  | Verify successful creation with only required fields                     | 1. Open "New Attribute".<br>2. Pick an Item Category.<br>3. Fill only Attribute Name (leave Data Type on its default "Text", leave Required and Desc Flag unchecked).<br>4. Click "Create".                         | Toast "Attribute created." appears; new row shows Data Type "TEXT", Required "No", Desc Flag "No", Status "Active" — confirms Data Type/Required/Desc Flag are genuinely optional-with-defaults, not blocking.                          |
| TC:3  | Verify successful edit of an existing attribute                          | 1. Open the list, search for a known attribute, click its row (opens straight into "Edit Attribute" — no separate read-only detail view).<br>2. Change the Attribute Name and switch Data Type from Text to Number.<br>3. Click "Save changes". | Toast "Attribute updated." appears; the list reflects the new Attribute Name and Data Type "NUMBER" — confirms Data Type (unlike Item Category, see TC:8) remains editable after creation.                                             |
| TC:4  | Verify list search by Attribute Name                                     | 1. Open the list.<br>2. Type a known attribute's name (or a substring) into Search.                                                                                                                                  | The table narrows to only matching row(s); placeholder itself documents scope ("Search by name, description…").                                                                                                                         |
| TC:5  | Verify All / Active / Inactive tab filters on the list                   | 1. Open the list.<br>2. Click "Active", then "Inactive", then back to "All", noting each tab's live count.                                                                                                           | Each tab filters to matching rows; counts match the rows shown. (As of this pass the "Inactive" tab reads 0 for every attribute in the system — see Notes, no confirmed path to get a record into that state exists in this UI.)        |
| TC:6  | Verify validation when both required fields are left blank               | 1. Open "New Attribute".<br>2. Leave Item Category unpicked and Attribute Name empty (Data Type already defaults to "Text").<br>3. Click "Create".                                                                   | Save is blocked; inline "Required" errors appear simultaneously under both the "Pick item category" field and Attribute Name; the Item Category field also gets an `[invalid]` state; no toast, dialog stays open.                      |
| TC:7  | Verify duplicate Attribute Name is blocked **within the same Item Category** | 1. Create an attribute with a given name under Item Category A.<br>2. Attempt to create a second attribute with the **exact same name** under the **same** Item Category A.<br>3. Click "Create".                 | Second save is blocked with a generic toast "Failed to create attribute." — no inline field-level error pinpoints the duplicate; the dialog stays open with the entered data intact to retry.                                           |
| TC:8  | Verify the same Attribute Name is allowed across **different** Item Categories (not a bug) | 1. Create an attribute named "X" under Item Category A.<br>2. Create a second attribute also named "X" but under a **different** Item Category B.<br>3. Click "Create" on the second.                              | Both saves succeed with "Attribute created." — confirms Attribute Name uniqueness is scoped per Item Category, not global across the whole master.                                                                                      |
| TC:9  | Verify Cancel discards changes on create                                 | 1. Open "New Attribute" and fill in the Attribute Name (and optionally pick a category).<br>2. Click "Cancel".                                                                                                       | No record is created; dialog closes; searching for the typed name afterward returns zero rows; the list's total count is unchanged.                                                                                                      |
| TC:10 | Verify Attribute Name max length (edge)                                  | 1. Open "New Attribute".<br>2. Type 300 characters into Attribute Name.                                                                                                                                              | The field silently stops accepting input at **200 characters** — confirmed live via `inputValue()` after typing 300 characters (length came back exactly 200); no inline "too long" error is shown, the field simply truncates at the cap. |
| TC:11 | Verify special/unicode characters in Attribute Name (edge)               | 1. Open "New Attribute", pick a category.<br>2. Enter an Attribute Name containing symbols, HTML-like text and unicode (e.g. `Test & <script>alert(1)</script> "quote" 日本語`).<br>3. Click "Create".                 | The full string is accepted with no client-side character-set restriction and saves successfully ("Attribute created."); confirm it renders safely (escaped, not executed) in the list.                                                 |
| TC:12 | Verify Item Category becomes locked after creation (edge/trap)           | 1. Open an existing attribute's Edit screen.<br>2. Inspect the "Pick item category" field and its button.                                                                                                            | Both the textbox and the "Pick item category" button are **disabled** in Edit mode — the Item Category chosen at creation can never be changed afterward, confirmed live. Attribute Name and Data Type remain editable.                 |
| TC:13 | Verify there is **no confirmed way to deactivate an attribute** (bug-like gap, confirmed live) | 1. Open an attribute's Create or Edit dialog and inspect the "Active" checkbox.<br>2. Select a row's checkbox on the list and observe what appears.<br>3. Inspect the Status column cells in the table.              | The "Active" checkbox is **checked and disabled** in both Create and Edit — it can never be unchecked through the dialog. Selecting a row only shows a floating "N item selected / Clear selection" pill with **no bulk action buttons** (no delete/deactivate). The Status column is a plain read-only cell (not a clickable control, unlike Attribute Value Master's Status badge — see that module's file). No path to move a record to "Inactive" was found anywhere in this screen.                |
| TC:14 | Verify Data Type dropdown options                                        | 1. Open "New Attribute".<br>2. Open the Data Type combobox.                                                                                                                                                           | A plain Radix listbox opens immediately with exactly two options: "Text" and "Number" (default is "Text").                                                                                                                              |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-08 using a real authenticated session (`.auth/master-data.json`,
logged in as `alice`/Admin) and throwaway records prefixed `TC-Attr-...` —
this module had **zero** existing documentation or automation in this repo
before this file.

- **This is a dialog-based CRUD screen, not a routed one.** Clicking "New
  Attribute" or a list row does **not** navigate to a new URL — it opens a
  modal `dialog` ("New Attribute" / "Edit Attribute") on top of the list,
  confirmed by watching `page.url()` stay at
  `/master-data/inventory-item-management/attribute-master` throughout every
  flow (create, edit, cancel). Unlike Company Master/Customer Master's
  `?create=true` / `?edit=<id>` query-param pattern, there is no URL state
  change here at all.
- **List**: heading "Attribute Master" (`level=1`), tabs All/Active/Inactive
  (each with a live count), search ("Search by name, description…"),
  Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit
  columns, 3 layout modes, a "New Attribute" button (capital A — yet another
  per-screen casing variant per the cross-module casing note in
  `agent-notes/master-data-module.md`). Table columns: Attribute ID,
  Attribute Name, Item Category, Data Type, Required, Desc Flag, Status.
- **Create form (dialog) fields, exactly as marked live with `*`**: Attribute
  ID (disabled, "Auto-generated"), Item Category\* (a "Pick item category"
  textbox + button that opens a separate picker dialog — see below),
  Attribute Name\* (textbox, placeholder "Material"), Data Type\* (Radix
  combobox, defaults "Text", no need to type to search), Active (checkbox,
  always checked **and disabled** — cannot be touched even on create),
  Required (checkbox, defaults unchecked), Desc Flag (checkbox, defaults
  unchecked). Submitting with Item Category unpicked and Attribute Name
  empty shows inline "Required" under both simultaneously, confirmed live —
  Data Type/Required/Desc Flag never block save since they always have a
  value (default or unchecked is valid).
- **"Pick item category" opens a separate, full-featured picker `dialog`**
  ("Select Item Category") — an AG-grid-style grid of **174** real item
  categories (Category Code, Description, Stock Type, Active, Capitalization,
  GMT Size, Last Inventory ID, Stock Item), with per-column filter textboxes/
  buttons, paginated 50 rows at a time. Selecting a row closes the picker and
  populates the parent field as `"<CODE> — <Description>"` (e.g.
  `ADJ — Adjustable`). This is the same shared grid-picker component pattern
  used by Attribute Value Master's "Pick parent attribute" and Product
  Service Master's own "Pick item category" (see those files) — worth
  reusing a common page-object helper across all three modules.
- **Exact success toast text, confirmed live:**
  - Create: `Attribute created.`
  - Edit/Save: `Attribute updated.`
  (Both carry a trailing period.)
- **Duplicate-handling, confirmed live by creating the same Attribute Name
  twice under the same category:** blocked with a generic toast "Failed to
  create attribute." — no field-level inline indication of *why*. Confirmed
  separately that the **same name under a different category is allowed**
  (uniqueness is scoped per Item Category, not attribute-name-global) — do
  not treat that as a bug if you rediscover it.
- **Item Category is permanently locked after creation.** Confirmed live: in
  Edit Attribute, both the "Pick item category" textbox and its button carry
  `[disabled]`. Attribute Name and Data Type, by contrast, remain fully
  editable in Edit mode (Data Type's combobox is NOT disabled, confirmed by
  `isEnabled()` returning `true` and successfully switching Text → Number on
  a real record).
- **No deactivate/delete path exists anywhere in this screen, confirmed
  live** — a genuinely surprising/bug-like gap worth flagging to the team,
  especially by contrast with Attribute Value Master (same parent module),
  which has both a real permanent-delete flow and a working inline
  "Change record status → Inactive" action on its list. Checked all three
  places such an action might live: (1) the Active checkbox — always
  `checked + disabled` in both Create and Edit; (2) row selection — checking
  a row's checkbox only surfaces a floating "N item selected / Clear
  selection" pill with zero action buttons; (3) the Status column cell —
  it's a plain read-only `cell`, not a clickable `button` (contrast Attribute
  Value Master's Status column, where the cell *is* a button that opens a
  status-change menu). Every one of the 23 attributes in the system reads
  "Active"; the "Inactive" tab shows 0 and there is no confirmed way to put
  anything there through this UI.
- **Attribute Name is capped at 200 characters, confirmed live** by typing
  300 'X' characters and reading `inputValue()` back (length 200, no inline
  "too long" error — silent truncation, same UX pattern as Company Master's
  Company Code/Prefix Code caps).
- **Special/unicode characters are accepted with no restriction**, confirmed
  live with a string containing `&`, a fake `<script>` tag, a literal quote,
  and Japanese characters — full string preserved in `inputValue()` and the
  create succeeded.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see
  `agent-notes/master-data-module.md`).
- **Not covered in this pass**: Filters button's rule-builder UI, Export CSV
  content, Configure columns/Best-fit columns, the 3 layout modes, the
  "Upload" style bulk-import affordance if one exists elsewhere in Inventory
  Item Management, and exhaustive behavior of the Required/Desc Flag flags
  downstream in Techpack (not explored — out of scope for this module's own
  CRUD surface).
