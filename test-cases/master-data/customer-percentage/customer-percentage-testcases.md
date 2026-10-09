# Master Data — Customer Percentage

The "Customer Percentage" screen under Master Data > System Management
(`/master-data/system-management/customer-percentage`). Holds
per-customer, per-item-type consumption percentages used by cost-sheet and
need-sheet logic ("Same screen layout as the legacy MIS Customer
Percentage.", per the screen's own subtitle). Unlike Currency Rate /
Currency Rate Buyer, this screen **does** have full Create/Edit/Delete for
the seeded `master-data` test user, confirmed live by actually creating,
editing, and deleting a real throwaway row. No automation or
documentation exists for this module yet, so this file uses the simple
4-column format (no ClickUp/Automated/Verified columns).

| #     | Test case                                                                   | Steps                                                                                                                                                                             | Expected result                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify screen layout and list load                                         | 1. Navigate to Master Data > System Management > Customer Percentage.                                                                                                              | Heading "Customer Percentage", subtitle, a search box ("Search by customer code or item ty..."), grid toolbar (Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns/layout-mode icons), an "Add Row" button, and a paginated table with columns Customer, Item Type, Item Category, Cutticket %, NeedSheet %, CostSheet Internal %, CostSheet Buyer % (29 seeded rows across 2 pages at the time of testing). |
| TC:2  | Verify successful creation with all fields filled (`TC-CustPct-` prefix)    | 1. Click "Add Row".<br>2. Pick an existing test Customer (e.g. search "AutoTest_Customer").<br>3. Pick Item Type "Information Technology".<br>4. Fill Cutticket %, Need Sheet %, Cost Sheet Internal %, Cost Sheet Buyer % with valid values (e.g. 0).<br>5. Click "Create". | Toast "Row created" (no trailing period) appears; the dialog closes. Re-searching by the customer's code afterwards (a fresh page load/search, not the same stale list — see Notes) shows the new row with the entered values. |
| TC:3  | Verify successful creation with only required fields                       | 1. Click "Add Row".<br>2. Pick a Customer and an Item Type.<br>3. Leave Item Category and all four percentage fields empty.<br>4. Click "Create".                                   | Row is created successfully — Item Category and all percentage fields are genuinely optional (percentages presumably default to 0 server-side; Item Category shows blank on the list, matching several real existing rows, e.g. "Customer Trading Co. / FB" with no category). |
| TC:4  | Verify validation when both required fields are left blank                 | 1. Click "Add Row".<br>2. Leave Customer and Item Type both unpicked.<br>3. Click "Create".                                                                                         | Save is blocked; inline "Required" errors appear under both **Customer** and **Item Type**. Item Category and the four percentage fields show no such error (confirmed optional). |
| TC:5  | Verify successful edit of an existing row, including persistence after reload | 1. Search for a known row, click it to open "Edit Row".<br>2. Change Cutticket % to a new value (e.g. 77.25) and click "Save changes".<br>3. Reload the page and re-search for the same row. | Toast "Row updated" appears. **Known UI quirk** (see Notes): immediately re-opening the same row's Edit dialog in the same session can still show the pre-edit value — but a full page reload followed by re-search confirms the new value (77.2500) was genuinely persisted server-side. |
| TC:6  | Verify Delete flow with confirmation dialog                                | 1. Open a row's "Edit Row" dialog.<br>2. Click the trash/delete icon in the dialog header.<br>3. Review the confirmation dialog, then click "Delete".                               | A confirmation dialog titled "Delete `<Customer>` · `<ItemType>`?" appears with body text "This permanently deletes `<Customer>` · `<ItemType>`. This action cannot be undone." and Cancel/Delete buttons. Confirming shows toast "Row deleted"; a fresh page reload confirms the row no longer exists. |
| TC:7  | Verify Delete Cancel preserves the row                                     | 1. Open a row's "Edit Row" dialog and click the delete icon.<br>2. On the confirmation dialog, click "Cancel".                                                                      | Confirmation dialog closes with no deletion; the Edit Row dialog remains open/unaffected; the row is unchanged on reload. |
| TC:8  | Verify list search by Customer **code** works but by Customer **name** does not | 1. Note a row's Customer code (e.g. `CTC0000829`) and its display name (e.g. `AutoTest_Customer_1790070729752`).<br>2. Search by the full display name.<br>3. Clear and search by the code instead. | Searching by the full customer **name** returns "No customer percentage rows yet. Try removing a filter or clearing them all." (no match). Searching by the customer **code** correctly returns the matching row. This matches the search box's own placeholder label ("Search by customer code or item type"), which scopes search to code/item-type only — not customer name. |
| TC:9  | Verify duplicate Customer + Item Type is rejected                          | 1. Create a row for Customer X + Item Type "Information Technology" (as in TC:3).<br>2. Attempt to create a second row for the **same** Customer X + same Item Type "Information Technology" (with different percentage values). | Second "Create" attempt is blocked with a generic red toast "Could not create the row" — no specific "duplicate" wording is given, and the Add Row dialog remains open with the entered values intact so the user can change Item Type/Category and retry. |
| TC:10 | Verify negative percentage values are rejected                             | 1. Click "Add Row", pick a Customer + Item Type.<br>2. Enter `-5` into "Cutticket %".<br>3. Click "Create".                                                                          | Browser-native validation blocks submission with the tooltip "Value must be greater than or equal to 0." directly under the field — confirmed this is a real `min="0"` constraint on the `<input type="number">`, not just a soft hint. |
| TC:11 | Verify percentage values over 100 are rejected                             | 1. Click "Add Row", pick a Customer + Item Type.<br>2. Enter `150` into "Cutticket %".<br>3. Click "Create".                                                                         | Browser-native validation blocks submission with the tooltip "Value must be less than or equal to 100." — confirms a real `max="100"` constraint. **This is correct, intentional validation, not a bug** — do not assume percentage fields allow values over 100%. |
| TC:12 | Verify decimal precision is capped at 2 decimal places                     | 1. Click "Add Row", pick a Customer + Item Type.<br>2. Enter `12.34567` into "Cutticket %".<br>3. Click "Create".                                                                    | Browser-native validation blocks submission with "Please enter a valid value. The two nearest valid values are 12.34 and 12.35." — confirms a real `step="0.01"` constraint limiting input to 2 decimal places. |
| TC:13 | Verify `0` is a valid value for all four percentage fields                 | 1. Click "Add Row", pick a Customer + Item Type.<br>2. Enter `0` into all four percentage fields.<br>3. Click "Create".                                                              | Row is created successfully with toast "Row created" — `0` is a valid edge value, not rejected by the `min="0"` constraint (it's inclusive). |
| TC:14 | Verify Item Category picker is scoped to the picked Item Type              | 1. Click "Add Row" and pick Item Type "Raw Material" (code RM).<br>2. Click the Item Category field.                                                                                | A "Select Item Category" dialog opens with the note "Categories shown are scoped to the picked Item Type (Stock Type)." and lists only RM-stock-type categories (FAB/Fabric, ILN/Inter Lining, LIN/Lining, PKT/Pocketing, ZFA/FABRIC — 5 of 5) — confirms real cascading filtering, not a flat list of all categories. |
| TC:15 | Verify Export CSV                                                          | 1. Click the "Export CSV" toolbar icon.                                                                                                                                              | A file download triggers with suggested filename **`customer-consumption-percentages.csv`** — confirmed live via Playwright's `download` event. |

## Notes for whoever picks this up next

**This is the one of the three System Management "Currency/Percentage"
screens that genuinely supports Create/Edit/Delete** for the seeded
`master-data` test user — contrast with Currency Rate and Currency Rate
Buyer, both confirmed read-only for the same role (see their own
testcase files). "Add Row" opens a modal dialog (not inline grid editing
despite the grid-like list), titled "Add Row" / "Edit Row" depending on
context, with fields Customer\* (searchable picker), Item Type\*
(searchable picker), Item Category (optional, cascades off Item Type),
and four percentage number inputs (Cutticket %, Need Sheet %, Cost Sheet
Internal %, Cost Sheet Buyer %) — all optional with real `min=0 / max=100
/ step=0.01` HTML5 constraints confirmed live (see TC:10–TC:13).

**Genuine UI quirk, confirmed live and reproducible — flag before relying
on it:** after a successful Save changes (TC:5) or Delete (TC:6), the
in-session grid list (and even a freshly re-opened Edit dialog for the
*same* row, in the *same* page session) can continue showing the
**pre-mutation** value/row until the page is fully reloaded. The success
toast ("Row updated" / "Row deleted") fires correctly and the mutation
**is** genuinely persisted server-side — confirmed by a hard page reload
+ re-search showing the correct post-mutation state every time — but the
client-side list/dialog cache does not appear to invalidate itself
automatically after a mutation within the same session. This is worth a
bug report to the team (stale cache after mutate, not a data-loss bug)
and worth noting in any automated test: **don't assert on the in-page
grid immediately after Save/Delete without a reload or an explicit
Refresh click** — assert after reloading instead, as this file's own
TC:5/TC:6 do.

**Toast text, confirmed live, exact strings (note: no trailing periods,
unlike Departments'/Sites' "... created."/"... updated." convention
documented in `agent-notes/master-data-module.md`):**
- Create success: `Row created`
- Edit success: `Row updated`
- Delete success: `Row deleted`
- Duplicate-create failure: `Could not create the row` (generic, not
  duplicate-specific wording)

**Percentage field validation is correct and intentional, not a bug.**
Negative values, values over 100, and more than 2 decimal places are all
genuinely blocked by native HTML5 `min`/`max`/`step` constraints on the
`<input type="number">` elements (confirmed via the browser's own native
validation tooltips, e.g. "Value must be less than or equal to 100.") —
there is **no** server round-trip needed to reject these, and there is
**no** gap allowing a percentage to be saved above 100% or below 0%.
Worth calling out explicitly since the task brief for this exploration
specifically asked to verify this wasn't a silent gap (as Sites'
Country/Timezone fields are — see `agent-notes/master-data-module.md`) —
here, unlike that case, the validation genuinely holds.

**Search box scope, confirmed live:** the single search input filters by
**Customer code or Item Type** only (matches its own placeholder text
literally) — searching by a customer's full display **name** returns zero
results even though a matching row exists. Not a bug, just a narrower
scope than might be assumed from seeing "Customer" as a column header.

**Customer picker** is the same "Select Customer" dialog (1009 customers,
21 pages, searchable by code/name/prefix/country/email) also used by
Currency Rate Buyer's "Rate Details" tab — see that file's Notes for the
shared-component observation.

**Locator traps, confirmed live, both need exact/scoped locators:**
- `getByPlaceholder(/pick an item type/i)` matches **both** the Item Type
  field (placeholder "Click to pick an item type…") and the Item Category
  field (placeholder "Pick an Item Type first…", before an Item Type is
  chosen) — use `getByRole('textbox', { name: 'Pick item type', exact:
  true })` / `{ name: 'Pick item category', exact: true }` instead (both
  have clean, distinct `aria-label`s).
- The dialog's delete icon and footer "Close" button both have an
  accessible name of "Close"/overlapping roles in a naive query — scope
  by `title` attribute (`Delete <Customer> · <ItemType>` vs. plain
  `Close`) or by position instead.
- Field `id`s are clean and stable if you need a fast non-ambiguous hook:
  `#cutticket`, `#needSheet`, `#costSheetInternal`, `#costSheetBuyer`.

**Not covered in this pass:** bulk-select/bulk-delete via the row
checkboxes (checkboxes exist in the grid but no bulk action bar was
exercised); the "Filters" rule-builder icon (only the plain search box
and Add Row dialog were exercised); the three layout-mode icons (No
split/Vertical split/Horizontal split); behavior of Item Category when an
Item Type with **zero** categories is picked (only Item Types with
existing categories were tried); exact server-side default when the four
percentage fields are left blank (TC:3) — assumed to be 0 based on how
existing blank-category rows render, not independently confirmed via a
raw API response.
