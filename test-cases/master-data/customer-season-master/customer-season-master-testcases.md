# Master Data — Customer Season Master

The "Customer Season Master" screen under Master Data > System Management
(`/master-data/system-management/seasons`). Covers creating, editing,
deactivating, and deleting a Season — a season (e.g. "SS25") defined
per-Customer. Unlike Company Master and Customer Master, both Create and
Edit open as a **modal dialog** on top of the list, not a separate page/
route. No automation exists for this module yet, so this file uses the
simple 4-column format (no ClickUp/Automated/Verified columns).

| #     | Test case                                                                  | Steps                                                                                                                                                                                                                    | Expected result                                                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                           | 1. Go to Customer Season Master > New Season.<br>2. Click "Pick a customer", search the grid (e.g. by Customer Code), and select a customer.<br>3. Fill Season Code and Description.<br>4. Leave Active on its default.<br>5. Click "Create". | Toast "Season <code> created." appears (e.g. "Season TCS463781 created."); the dialog closes back to the list; the new row shows the Season Code, Description, the selected Customer's Code/Name, and Status "Approved".     |
| TC:2  | Verify the Customer picker dialog and its per-column filters                | 1. Open New Season and click "Pick a customer".<br>2. Use the picker's own "Search" box (searches code/name/prefix/country/email) and/or the individual per-column filter boxes (Customer Code, Prefix ID, Customer Name, Country ID, etc.). | The "Select Customer" grid dialog narrows to matching customers as you type; selecting a row populates the parent form's "Customer" field as "`<Code> — <Name>`" and closes the picker; an unmatched search shows "No customers found." / "No matches". |
| TC:3  | Verify successful edit of an existing season                                | 1. Open the Customer Season Master list, search for a known season, click its row (opens the "Edit Season" dialog).<br>2. Change the Description.<br>3. Click "Save changes".                                           | Toast "Season updated" appears (**no trailing period** — confirmed live, see Notes); the list reflects the new Description.                                                                                                   |
| TC:4  | Verify Customer and Season Code become locked once saved                    | 1. Open an existing season in Edit.<br>2. Inspect the "Pick a customer" field/button and the "Season Code" textbox.                                                                                                      | Both are disabled in Edit mode — the Customer link and Season Code are immutable after creation; only Description and Active remain editable.                                                                                 |
| TC:5  | Verify list search by Season Code, Description, and Customer                | 1. Open the Customer Season Master list.<br>2. Search by a known season's Season Code.<br>3. Clear and search by its Description.<br>4. Clear and search by the linked Customer's name.                                   | Each search narrows the table to the matching row(s), matching the search box's own placeholder ("Search by season code, description, or customer…").                                                                        |
| TC:6  | Verify status tab filters, and that counts scope to an active search        | 1. Open the list with no search term active; note the All/Draft/Approved/Inactive/Rejected counts.<br>2. Type a search term that matches exactly one season.<br>3. Re-check the tab counts.                              | With no search, tab counts reflect the whole table. **With a search term active, the tab counts re-scope to only the filtered rows** (e.g. "All 1") — confirmed live; don't assume these counts are always global.           |
| TC:7  | Verify validation when all required fields are left blank                   | 1. Go to New Season.<br>2. Leave Customer, Season Code, and Description all empty.<br>3. Click "Create".                                                                                                                 | Save is blocked; inline "Required" errors appear simultaneously under all three required fields — the "Pick a customer" field is also marked `[invalid]` — no toast, no navigation.                                          |
| TC:8  | Verify duplicate Season Code for the **same** Customer is blocked, with a specific message | 1. Create a season with a given Season Code for Customer A.<br>2. Attempt to create a second season with the **exact same** Season Code for the **same** Customer A.<br>3. Click "Create".                              | Second save is blocked with toast **"That season code already exists for this customer."** — a specific, friendly duplicate message, in contrast to Company Master's generic "Failed to create company." for its own duplicate-code case. |
| TC:9  | Verify the same Season Code is allowed across **different** customers       | 1. Create a season with a given Season Code for Customer A.<br>2. Create a season with the **same** Season Code for a **different** Customer B.                                                                         | Both saves succeed — the uniqueness constraint on Season Code is scoped per-customer, not global, confirmed by the TC:8 error message's own wording ("...for this customer").                                                |
| TC:10 | Verify Cancel ("Close") discards changes on create                          | 1. Open New Season and fill in Season Code/Description (without picking a customer).<br>2. Click "Close".                                                                                                               | The dialog closes with no record created; the list's total count is unchanged.                                                                                                                                                 |
| TC:11 | Verify Deactivate action and the same reactivation trap seen elsewhere      | 1. Open an Active season's Edit dialog and click "Deactivate `<code>`".<br>2. Observe the resulting toast and the row's Status.                                                                                          | Toast "Season deactivated" appears (no trailing period); Status becomes "Inactive" and the Inactive tab count increases by one. (Re-opening to check whether the button also fails to relabel to "Activate", as it does on Company/Customer Master, was not explicitly re-verified for this module — treat as likely but unconfirmed here.) |
| TC:12 | Verify Delete action and its confirmation dialog — unique to this module    | 1. Open a season's Edit dialog.<br>2. Click "Delete `<code>`".<br>3. On the confirmation `alertdialog` ("Delete `<code>`? This permanently deletes `<code>`. This action cannot be undone."), click "Cancel" first, then re-open and click "Delete" to confirm. | Clicking "Cancel" on the confirmation closes it with the season untouched. Clicking "Delete" and confirming removes the record entirely — toast **"Season deleted."** (with a trailing period, unlike the Update/Deactivate toasts) — and the season no longer appears in any search. **Delete does not exist on Company Master or Customer Master** — confirmed by their own Edit screens only exposing "Deactivate", no "Delete". |
| TC:13 | Verify Season Code has no max-length cap (edge)                             | 1. Open New Season.<br>2. Type a 20-character string into Season Code.                                                                                                                                                   | The full 20-character string is accepted with no truncation (confirmed live via `inputValue()`) — unlike Company Master's Company Code/Prefix Code, which hard-cap at 5 characters.                                          |
| TC:14 | Verify the Customer field cannot be free-typed — picker-only (edge)         | 1. Open New Season.<br>2. Attempt to click directly into the "Pick a customer" textbox and type a customer name.                                                                                                        | The textbox only accepts interaction via its paired "Pick a customer" button, which opens the full "Select Customer" grid dialog — there is no free-text/typeahead entry directly into the field itself.                     |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-06 using a real authenticated session (`.auth/master-data.json`) and
throwaway records prefixed `TC-Season-...` linked to throwaway `TC-Customer-
...` records — this module had **zero** existing documentation or
automation in this repo before this file.

- **List**: heading "Customer Season Master" (`level=1`), status tabs All /
  Draft / Approved / Inactive / Rejected (each with a live count — same
  model as Customer Master), search ("Search by season code, description,
  or customer…"), Filters/Refresh/Export CSV/Toggle cell filters/Configure
  columns/Best-fit columns, 3 layout modes, a "New Season" button. Table
  columns: Season Code, Description, Customer Code, Customer Name, Status.
  Same "Masters needing review" / "Rejected — needs revision" dashboard
  regions as Customer Master sit above the table.
- **Structurally different from Company Master and Customer Master: Create
  and Edit are both modal dialogs**, not a route/page change — confirmed
  live by watching `page.url()` stay on the plain `/seasons` URL throughout
  create/edit/close, unlike Company/Customer Master's `?create=true` /
  `?edit=<code>` query-param pattern. The dialog can also be "Maximize"d.
- **Create form** fields, exactly as marked live with `*`: Customer\*
  (via a "Pick a customer" lookup button only, not free text), Season
  Code\* (placeholder "SS25"), Description\* (placeholder "Spring/Summer
  2025"), Active (checkbox, defaults checked). **All three starred fields
  are genuinely required** — submitting empty shows inline "Required"
  under all three simultaneously (the Customer field is also flagged
  `[invalid]`), confirmed live.
- **The "Pick a customer" lookup opens a full "Select Customer" grid
  dialog** sourced from the live Customer Master data (1000+ real rows at
  time of writing) with its own top-level "Search" box plus a dedicated
  filter textbox per column (Customer Code, Prefix ID, Customer Name,
  Country ID, Address Line1, Active Flag [a tri-state filter *button*, not
  a textbox], Address Line2, City, Contact Person, Email, Fax, Payment
  Method, Phone1, Phone2, Postal Code, State, Terms ID, Web Site). This is
  a different, richer picker shape than Employees' cmdk-style command
  palette noted in `agent-notes/master-data-module.md` — worth knowing
  before assuming all "live-sourced" lookups in this app share one shape.
- **Edit dialog exposes two top action buttons Company/Customer Master
  don't have: "Deactivate `<code>`" and "Delete `<code>`".** Delete opens a
  real confirmation `alertdialog` ("Delete `<code>`? This permanently
  deletes `<code>`. This action cannot be undone.") with Cancel/Delete —
  confirmed both paths live (Cancel leaves the record untouched; Delete
  removes it and it no longer appears in any search). Neither Company
  Master nor Customer Master offers a Delete action anywhere in this
  session's testing — Deactivate is their only lifecycle action.
- **Customer and Season Code lock immediately after the first save** —
  both render as disabled in the Edit dialog; only Description and Active
  stay editable. This is stricter than Customer Master (only Customer Code
  and Prefix ID lock; most other fields stay editable) and Company Master
  (only Company Code locks).
- **Exact success toast text, confirmed live — notably inconsistent within
  this one module:**
  - Create: `Season <CODE> created.` (trailing period, code interpolated —
    e.g. `Season TCS463781 created.`)
  - Edit/Save: `Season updated` (**no trailing period**)
  - Deactivate: `Season deactivated` (**no trailing period**)
  - Delete: `Season deleted.` (trailing period again)
  This create/delete-have-periods-but-update/deactivate-don't split was
  confirmed by reading each toast's exact text directly off the
  Notifications region, not by eye — don't assume a single toast-text
  pattern covers all four actions when writing assertions.
- **Duplicate-prevention is scoped per-customer and has a clear, specific
  message**: reusing a Season Code for the *same* customer is blocked with
  "That season code already exists for this customer."; reusing the same
  Season Code for a *different* customer succeeds. Contrast with Company
  Master's generic, non-specific "Failed to create company." for its own
  duplicate case — this module gives QA/users a much clearer signal.
- **Tab counts re-scope to an active search filter** — e.g. with "All 879"
  showing normally, typing a search term that matches one row changes the
  visible label to "All 1" (and Draft/Approved/etc. drop to 0 except
  whichever status the matched row actually has). Confirmed live; don't
  treat the tab counts as a fixed total independent of the search box.
- Clicking the Status column's own badge (rendered as a `button`, e.g.
  `button "Inactive"`) in a list row was tried directly and did **not**
  appear to toggle status or open anything on its own — treat row-opening
  as working via a click anywhere else on the row, not that specific badge.
  Not deeply investigated; flagged as an observation only.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see
  `agent-notes/master-data-module.md`).
- **Not covered in this pass**: the Draft/Approved/Rejected Master Approval
  workflow itself (Review/Reject/Make active/Acknowledge & withdraw),
  whether the Deactivate button here suffers the same "never relabels to
  Activate" bug confirmed on Company Master and Customer Master (strongly
  suspected given the shared component pattern, but not independently
  re-verified for Seasons in this session), Filters rule-builder UI, Export
  CSV content, and the Active Flag tri-state filter button inside the
  Customer picker grid.
