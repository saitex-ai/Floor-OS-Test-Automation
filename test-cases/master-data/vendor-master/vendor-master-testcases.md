# Master Data — Vendor Master

- **Route:** `/master-data/system-management/vendors` (System Management group)
- **Description:** "Manage suppliers of raw materials, accessories, packaging, and services for your
  factory." First test-case documentation for this screen — no prior code or docs existed for it in
  this repo. Everything below was confirmed live against `https://dev.flooros.app` on 2026-10-06
  (`master-data` test user), nothing carried over from other modules' notes.

The screen has an approval-style workflow shape: list tabs for **All / Draft / Approved / Inactive /
Rejected**, each with a live count, plus a per-row **Status** column/button. See the Notes section —
in practice, new vendors land directly in **Approved**, not **Draft**, so the Draft/Rejected lanes
could not be exercised from this UI.

| #     | Test case                                                               | Steps                                                                                                                                                              | Expected result                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Vendor Master list layout                                        | 1. Navigate to Master Data > System Management > Vendor Master.                                                                                                   | Heading "Vendor Master" loads with tabs All/Draft/Approved/Inactive/Rejected (each with a live count), a "Search by code, name, contact, email…" box, Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit columns, 3 layout modes, and a "New Vendor" button. Table columns: Vendor Code, Vendor Name, City, Country, Currency, Status. |
| TC:2  | Verify successful vendor creation with all required fields              | 1. Click "New Vendor".<br>2. Fill Prefix ID, Vendor Name, Currency (picker), Credit Terms, Payment Method, Address Line 1, City, Country.<br>3. Click "Create".    | Vendor is saved with an auto-generated code (e.g. `VDC0000025`); drawer closes back to the list; toast reads exactly **"Vendor {CODE} created."** (the vendor code is interpolated into the message); the new row appears with status "Approved". |
| TC:3  | Verify validation when all required fields are left blank               | 1. Click "New Vendor".<br>2. Leave the form fully blank.<br>3. Click "Create".                                                                                    | Save is blocked; an inline "Required" paragraph appears under each of: Prefix ID, Vendor Name, Currency, Credit Terms, Payment Method, Address Line 1, City, Country. Drawer stays open. |
| TC:4  | Verify required-field validation — one row per field                   | For each of Prefix ID, Vendor Name, Currency, Credit Terms, Payment Method, Address Line 1, City, Country: fill every other required field but leave this one blank, then click "Create". | Save is blocked each time; the specific blank field shows an inline "Required" message; no vendor is created.                                                                        |
| TC:5  | Verify optional fields can be skipped on create                        | 1. Fill only the 8 confirmed-required fields (Prefix ID, Vendor Name, Currency, Credit Terms, Payment Method, Address Line 1, City, Country).<br>2. Leave Registered Name, Account Reference Number, Vendor Class ID, Address Line 2, State/Province, Postal Code, Phone 1/2, Fax, Email, Website, Supplier MOQ, Categories, and Image untouched.<br>3. Click "Create". | Vendor saves successfully with the same "Vendor {CODE} created." toast; optional fields are left empty on the record. |
| TC:6  | Verify successful vendor edit                                          | 1. Double-click an existing vendor's row to open "Edit Vendor".<br>2. Change Vendor Name (or another editable field).<br>3. Click "Save changes".                 | Toast reads exactly **"Vendor updated."**; the list reflects the new value after the drawer closes.                                                                                   |
| TC:7  | Verify Prefix ID is locked on edit                                     | 1. Open "Edit Vendor" for an existing vendor.                                                                                                                     | The "Prefix ID" textbox is rendered **disabled** — it can only be set at creation, not changed afterward (confirmed live, matches Vendor Code which is always auto-generated/disabled). |
| TC:8  | Verify Cancel discards changes on Create                               | 1. Click "New Vendor".<br>2. Type a Vendor Name.<br>3. Click "Cancel".                                                                                            | Drawer closes, no vendor is created (list's "All" count is unchanged), user returns to the list.                                                                                      |
| TC:9  | Verify Cancel discards changes on Edit                                 | 1. Open "Edit Vendor" on an existing record.<br>2. Change the Vendor Name.<br>3. Click "Cancel".<br>4. Reopen the same record's Edit view.                        | The name reverts to its original, unsaved value — the edit was discarded, not persisted.                                                                                              |
| TC:10 | Verify duplicate Vendor Name handling                                  | 1. Click "New Vendor".<br>2. Fill all required fields, using the exact Vendor Name of an existing vendor (e.g. "Arvind Mills Ltd.").<br>3. Click "Create".        | Save is blocked; toast reads **"Failed to create vendor."** — a generic failure message that does **not** explain the real cause (see Notes — this is a real UX gap, not a missing test). |
| TC:11 | Verify Status change flow — Approved to Inactive                       | 1. On the list, click the "Approved" status button/chip on a row.<br>2. Select "Change to Inactive" from the menu.<br>3. In the "Change record status?" confirmation dialog, click "Set to Inactive". | A confirmation dialog appears first ("This record will be set to Inactive."); after confirming, toast reads **"Vendor status updated."** and the row's status becomes "Inactive".      |
| TC:12 | Verify Status change flow — Inactive back to Approved                  | 1. On an Inactive vendor's row, click the "Inactive" status button.<br>2. Only menu option is "Change to Approved" — select it.<br>3. Confirm "Set to Approved" in the dialog. | Vendor reactivates; toast reads "Vendor status updated."; row shows "Approved" again. Confirms only a single, specific forward transition is offered per state (no Draft/Rejected options surface from either Approved or Inactive). |
| TC:13 | Verify Email field format validation                                   | 1. Open "New Vendor", fill all required fields.<br>2. Enter an invalid value (e.g. `not-an-email`) into Email.<br>3. Click "Create".                              | Browser-native HTML5 validation blocks the submit (Email is a real `<input type="email">`) — a native tooltip such as "Please include an '@' in the email address…" appears; there is **no** app-level toast or inline error for this case. |
| TC:14 | Edge: very long Vendor Name produces a silent, unexplained block        | 1. Open "New Vendor", fill all required fields.<br>2. Enter a ~270-character Vendor Name.<br>3. Click "Create".                                                   | Confirmed live: the Create click does **nothing visible** — no toast, no navigation back to the list, no inline error under Vendor Name. The drawer simply stays open with no feedback. Flagged as a real bug candidate (see Notes). |
| TC:15 | Edge: special characters in Vendor Name are accepted client-side        | 1. Open "New Vendor".<br>2. Enter a Vendor Name containing special characters, e.g. `TC-Vendor-!@#$%^&*()_+<>?"'; DROP TABLE--`.                                   | The textbox accepts and retains the full string with no client-side stripping or truncation (field has no `maxlength` attribute). Not pursued through to a real save in this pass.                                                 |

## Notes for whoever picks this up next

**Live environment / auth gotcha (applies to every Master Data sub-module, not just this one):**
`.auth/master-data.json` can go stale between sessions — a plain `page.goto()` with that storage
state landed on the "Welcome to FloorOS" sign-in gate, not the app. Fix: re-run
`TEST_ENV=dev npx playwright test --project=master-data-setup` to refresh the cached session, **and**
always drive navigation through the same gate-vs-authenticated race `BasePage.gotoAuthenticated()`
uses (see `src/pages/base.page.ts`) — a raw `goto()` without that dance just shows the sign-in card.

**Floating "Ask FloorOS AI" button overlaps the sticky Create/Save footer.** Confirmed live: the
chat-assistant button fixed at the bottom-right corner visually sits on top of the drawer's
Create/Save changes button at normal viewport sizes (reproduced even at 1600×1400). A plain
`.click()` on Create/Save times out with "subtree intercepts pointer events," and a `force: true`
click lands on the AI button instead (opens its chat popup) rather than the real button underneath.
Workaround used throughout this session: `scrollIntoViewIfNeeded()` + `.focus()` + `keyboard.press('Enter')`
on the submit button. Worth filing as a real UI bug — a mouse-only user could get stuck here.

**Required fields matched their asterisks exactly here** — unlike Departments/Sites elsewhere in
this repo's Master Data notes (where asterisks were misleading), Vendor Master's 8 starred fields
(Prefix ID, Vendor Name, Currency, Credit Terms, Payment Method, Address Line 1, City, Country) are
all genuinely enforced, confirmed by submitting blank and reading the live "Required" errors.

**Create is a right-side drawer keyed off a query param**, not a dedicated route: "New Vendor" opens
`?create=true` on the same `/vendors` URL; editing opens `?edit={VendorCode}`. Both are reached from
the list, not separate pages — relevant if building page objects/locators later (scope to the
drawer's `main`/`dialog`, there are two `<main>` elements on screen at once).

**Vendors are created directly as "Approved", not "Draft."** Despite the list exposing
Draft/Approved/Inactive/Rejected tabs (all with live counts, implying an approval workflow), every
vendor created through this UI landed straight in "Approved" with no pending/review step. Draft and
Rejected both sit at a permanent 0 count. Either there's an approval workflow this admin role skips,
or Draft/Rejected are unreachable through this screen — worth confirming with the team before
assuming it's a gap.

**Status changes go through the list's per-row Status chip, not the edit drawer.** Clicking the
"Approved"/"Inactive" chip opens a menu with exactly one directional option ("Change to Inactive" or
"Change to Approved"), then a confirmation `alertdialog` ("Change record status?" / "This record
will be set to {Status}."), then toast **"Vendor status updated."** The Edit drawer itself also shows
a "Deactivate" button in its header for an Approved vendor — not fully exercised in this pass; likely
the same flow, worth confirming it produces the same confirmation dialog.

**Duplicate-name handling is a real, confirmed gap.** Submitting a vendor with an exact existing
Vendor Name is blocked, but the toast is the same generic **"Failed to create vendor."** shown for
any server-side failure — it never tells the user it was a duplicate. Contrast with GMT
Inseam/Waist Master (see their own files), which both give a precise "A(n) X with this code already
exists. Use a different code." message. Worth filing as a UX inconsistency.

**Long Vendor Name (TC:14) needs a developer's eyes.** With every other required field valid and a
~270-character name, clicking Create produced zero observable feedback — no toast (success or
failure), no navigation, no inline error, and the field has no `maxlength` to pre-empt it client-side.
Could be a silently-swallowed server validation error, a network failure that isn't surfaced, or a
timing issue our 2.5s wait didn't catch — flagging rather than asserting a root cause, since it
wasn't chased further with network inspection in this pass.

**Data prerequisite:** a throwaway vendor was created and left in the dev data for this pass —
`VDC0000025`, originally created as `TC-Vendor-<timestamp>`, renamed to
`TC-Vendor-Edited-<timestamp>` during the edit test, then switched to Inactive during the status
test. Safe to ignore, delete, or reuse; clearly prefixed per the session's convention.

**Not covered in this pass:** Categories tab (an "Add Item Category" picker, confirmed present but
not exercised end-to-end), Image tab (JPG/PNG upload up to 5MB, confirmed present, not exercised),
Export CSV, Filters panel, column configuration, list search/filtering by Draft/Rejected tabs (both
permanently empty — nothing to search), and the Edit drawer's own "Deactivate" button (status change
was only exercised via the list's row-level Status chip).
