# Master Data — Sample Request Creation

- **Module:** Master Data > System Management > Sample Request Creation
- **Route:** `/master-data/system-management/sample-request-creation`
- **Source:** First-pass live exploration against dev (`https://dev.flooros.app`), 2026-10-06 — no prior
  code or docs existed for this screen. Nothing here is carried over from notes; every row below was
  confirmed directly against the running app (see "Notes for whoever picks this up next").

This is **not** a simple code+name master. Per the screen's own subtitle ("Create sample requests — the
SR code is generated automatically; pick a customer and one of its seasons"), it's a workflow-style
record: an auto-generated SR Code, a Name, a Customer, a Season genuinely filtered to that Customer's
own seasons, a Company, and an optional "Costing required" flag that notifies the Costing Manager. Each
request also carries a Draft/Posted status (see Notes — the list's own Status column is confirmed
broken/always-blank, but the status concept is real and drives field locking in the Edit modal).

| #     | Test case                                                                  | Steps                                                                                                                                                                             | Expected result                                                                                                                                                                                  |
| ----- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Sample Request Creation list layout                                | 1. Navigate to Master Data > System Management > Sample Request Creation.                                                                                                        | Heading "Sample Request Creation" with subtitle "Create sample requests — the SR code is generated automatically; pick a customer and one of its seasons." Table columns: SR Code, Sample Request Name, Customer, Season, Company, Status. |
| TC:2  | Verify successful create with all fields (incl. Costing required)         | 1. Click "Create New".<br>2. Enter a unique Sample Request Name.<br>3. Select a Customer.<br>4. Select one of that Customer's Seasons.<br>5. Select a Company.<br>6. Toggle "Costing required for this request" on.<br>7. Click "Save". | Modal closes; toast reads exactly **"Sample request created."**; new row appears with an auto-generated SR Code (e.g. `SRC0000xxx`) and the entered Name/Customer/Season/Company.                |
| TC:3  | Verify successful create with required fields only (Costing off)          | 1. Click "Create New".<br>2. Fill Name, Customer, Season, Company only; leave "Costing required" off (default).<br>3. Click "Save".                                              | Record created; toast "Sample request created."; request is created in Draft status (see Notes — not visible in the list's Status column, but confirmed via the Edit modal's lock message).      |
| TC:4  | Verify Season options are genuinely filtered by the selected Customer     | 1. Click "Create New".<br>2. Select Customer "ACME Apparel".<br>3. Open the Season combobox and note the options.<br>4. Change Customer to "Acme Textiles".<br>5. Re-open Season. | Season list differs per customer — confirmed live: ACME Apparel shows 9 seasons, Acme Textiles shows only 2 ("FW26 Fall/Winter 2026", "SS26 Spring/Summer 2026"). Changing Customer also resets the Season field back to its "Search seasons..." placeholder, clearing any prior selection. |
| TC:5  | Verify Season field is disabled/empty until a Customer is chosen          | 1. Click "Create New".<br>2. Without selecting a Customer, inspect the Season field.                                                                                             | Season combobox shows placeholder "Search seasons..." with a helper line "Select a customer first." underneath, and cannot be usefully interacted with until a Customer is selected.             |
| TC:6  | Verify successful edit of a Draft request's Name                          | 1. Click a Draft request's row to open "Edit Sample Request".<br>2. Change the Sample Request Name.<br>3. Click "Save changes".                                                  | Toast reads exactly **"Sample request updated."**; list reflects the new Name.                                                                                                                    |
| TC:7  | Verify Customer/Season/Company are locked while a request is Draft        | 1. Open a Draft request's Edit modal.<br>2. Inspect the Customer, Season, and Company fields.                                                                                     | All three are rendered as plain disabled text fields (showing only the stored code, e.g. `CTC0000002`), not editable comboboxes, with the helper text "Customer, Season & Company are locked for a draft request." Request ID field also shows "The Request ID cannot be changed." |
| TC:8  | Verify "Post" action and its effect on field locking                      | 1. Open a Draft request's Edit modal.<br>2. Click the "Post <SR code>" icon button in the header (no confirmation dialog).<br>3. Re-open the same request's Edit modal.           | The request becomes **Posted**. Counterintuitively, Posting **unlocks** Customer/Season/Company (they become full comboboxes showing name + code, e.g. "ACME Apparel / CTC0000002") with the helper text now reading "This request is Posted — Customer, Season & Company can be changed." The header icon itself flips from "Post <code>" to "Open <code>" (a reverse toggle back to Draft). |
| TC:9  | Verify deleting a Sample Request                                          | 1. Open a request's Edit modal.<br>2. Click the "Delete <SR code>" icon button.<br>3. Confirm the delete.                                                                         | Toast reads exactly **"Sample request(s) deleted."** (note the "(s)" even for a single record); the request no longer appears in the list or search.                                             |
| TC:10 | Verify Cancel on the Create modal discards changes                        | 1. Click "Create New".<br>2. Fill in a Name (and optionally other fields).<br>3. Click "Cancel".                                                                                  | Modal closes with no record created — confirmed by searching for the entered name afterward and getting no results.                                                                              |
| TC:11 | Verify Save is blocked until all four required fields are filled         | 1. Click "Create New".<br>2. Fill only the Name.<br>3. Observe "Save".<br>4. Add Customer only; observe "Save".<br>5. Add Season; observe "Save".<br>6. Add Company; observe "Save". | "Save" stays **disabled** (not a toast/inline-error block) at every step until Name, Customer, Season, and Company are all filled — only then does it become enabled. This module blocks submission by disabling the button rather than showing "Required" errors after a failed submit. |
| TC:12 | Verify duplicate Sample Request Name is allowed                           | 1. Create a Sample Request named "X" for Customer A.<br>2. Create a second, separate Sample Request also named "X" (different or same Customer/Season/Company).                  | Both save successfully with their own distinct auto-generated SR Codes — Name uniqueness is **not** enforced. Confirmed live: two requests with the identical name coexisted in the list.         |
| TC:13 | Verify list/search by SR code, name, customer, or season                 | 1. In "Search by SR code, name, customer, season…", type a known Sample Request Name (or SR code/customer code/season code).                                                     | Table filters live to matching rows only; an unmatched search term shows an empty result set.                                                                                                    |
| TC:14 | Verify Sample Request Name max length and special characters             | 1. Click "Create New".<br>2. Enter a Name containing special characters (e.g. `TC-SampleReq !@#$%^&*()`), fill the other required fields, Save.                                  | Record saves successfully with the special-character Name preserved exactly as typed. `name` input has `maxlength=200`.                                                                          |

## Notes for whoever picks this up next

All of the following were confirmed live against dev on 2026-10-06, nothing assumed:

- **The list's Status column is confirmed broken/always-blank.** Every row — including the seeded ones
  and a freshly created throwaway record, checked again after a 10+ second wait to rule out a slow load
  — renders an empty, text-less gray pill in the Status column. This is **not** just a loading skeleton
  (the skeleton only shows on first paint; after it resolves, the badge is still blank). That a real
  status concept exists underneath is proven by the **Edit modal**, which explicitly says "Customer,
  Season & Company are locked for a draft request" / "This request is Posted — Customer, Season &
  Company can be changed" depending on state — so Draft/Posted are real, tracked statuses that the list
  UI simply fails to render. Worth filing as a bug rather than re-discovering it.
- **Posting reverses the expected lock direction.** Intuitively you'd expect "Draft" to be the editable
  state and "Posted" to be the locked/final one. It's the opposite here: **Draft locks** Customer/Season/
  Company (shown as plain disabled text), and **clicking "Post" unlocks** them (they become live,
  changeable comboboxes). The header icon itself toggles between "Post <code>" (when Draft) and "Open
  <code>" (when Posted) — "Open" was not exercised to confirm it reverts back to Draft, but the label
  strongly implies a two-way toggle. Worth a dedicated test once confirmed either way.
- **Season genuinely filters per Customer** (not just gated) — confirmed by comparing two different
  customers' Season dropdowns and seeing completely different option sets (9 vs. 2), and by watching the
  Season field reset to its placeholder when the Customer selection changes.
- **Company is a single flat list, not filtered by anything** — confirmed live: it showed 80+ companies
  regardless of which Customer was selected, no scoping observed.
- **The Costing toggle ("Costing required for this request") has no visible effect confirmed** beyond
  its own description ("The Costing Manager is notified so costing work can begin") — toast text and
  create behavior were identical with it on vs. off in this session's testing; it does **not** appear as
  an editable field in the Edit modal at all (only Name/Customer/Season/Company are editable there), so
  there's no way found to toggle it after creation.
- **Exact toast strings** (read directly from the toast region): Create → "Sample request created."
  (with a period), Update → "Sample request updated." (with a period), Delete → "Sample request(s)
  deleted." (with the literal "(s)" and a period) — note these **do** carry trailing periods, unlike
  Techpack Type's toasts in the sibling module, which don't. Don't assume a shared convention across
  Master Data screens; confirmed per-screen as `agent-notes/master-data-module.md` already warns.
  The "Post" action's own toast was not reliably captured in this session (array came back empty) —
  worth re-confirming with a longer wait before relying on it in automation.
- **Save-button-disabled is the actual blocking mechanism for missing required fields** here, not a
  "Required" inline message shown after a failed submit attempt (contrast with Techpack Type, which
  does show inline "Required" text after clicking Create with blank fields). Don't copy that assertion
  pattern over from the Techpack Type spec — this screen's negative-required-field test has to assert on
  the disabled state of "Save", not on post-submit error text.
- **Data prerequisite**: at least one Customer with 2+ distinct Seasons configured (ACME Apparel /
  `CTC0000002` had 9 — used for TC:4) and a second Customer with a different, smaller season set (Acme
  Textiles — 2 seasons) to make the per-customer filtering test meaningful.
- The dev OIDC redirect/"Sign in" gate quirk documented in `agent-notes/master-data-module.md` applies
  here too.
- Not yet covered / out of scope for this pass: the "1 season request awaiting approval — or create
  another" link seen in the Season combobox's footer (implies a season-request-approval sub-workflow,
  not explored), bulk select/export-CSV/configure-columns toolbar buttons, and confirming what "Open"
  actually does when clicked on a Posted request.
