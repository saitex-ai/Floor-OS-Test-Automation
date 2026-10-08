# Master Data — Company Master

The "Company Master" screen under Master Data > System Management
(`/master-data/system-management/company`). Covers creating, editing,
listing/searching, and deactivating/reactivating a Company — the
company / legal-entity root every other per-factory master record
(Customers, Sites, Departments, etc.) traces back to. No automation
exists for this module yet, so this file uses the simple 4-column
format (no ClickUp/Automated/Verified columns).

| #     | Test case                                                                  | Steps                                                                                                                                                                                                                                  | Expected result                                                                                                                                                                                                                     |
| ----- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify successful creation with all fields filled                           | 1. Go to Company Master > New Company.<br>2. Fill Company Code, Prefix Code, Company Name, Address.<br>3. Select Country of Operation, Primary Currency, Secondary Currency.<br>4. Fill Tax Registration Number, Telephone, Fax, Scrap %, Image/Document/FR/GPRO Path.<br>5. Leave Active and Master Data Approval Required on their defaults.<br>6. Click "Create". | Toast "Company created." appears; redirected to the Company Master list; the new row shows the entered Company Code, Company Name, Prefix Code, Primary Currency, and Status "Active".                                          |
| TC:2  | Verify successful creation with only required fields                        | 1. Go to New Company.<br>2. Fill only Company Code, Prefix Code, Company Name, Address, Primary Currency, Secondary Currency (skip every other field).<br>3. Click "Create".                                                          | Toast "Company created." appears; new row visible on the list with Status "Active" (the "Active" checkbox defaults checked and was left untouched).                                                                              |
| TC:3  | Verify successful edit of an existing company                              | 1. Open the Company Master list, search for a known company, click its row (opens directly into the Edit Company form — there is no separate read-only detail view).<br>2. Change the Company Name.<br>3. Click "Save changes".       | Toast "Company updated." appears; the list reflects the new Company Name.                                                                                                                                                         |
| TC:4  | Verify list search by Company Code and by Company Name                      | 1. Open the Company Master list.<br>2. Search by a known company's Company Code.<br>3. Clear and search by its Company Name instead.                                                                                                   | Both searches narrow the table to only the matching row(s); the search box placeholder itself documents the supported fields ("Search by code, name, prefix…").                                                                 |
| TC:5  | Verify All / Active / Inactive tab filters on the list                      | 1. Open the Company Master list.<br>2. Click the "Active" tab, then the "Inactive" tab, then back to "All".                                                                                                                             | Each tab filters the table to only companies of that status; each tab's live count in its own label matches the number of rows shown.                                                                                            |
| TC:6  | Verify validation when all required fields are left blank                   | 1. Go to New Company.<br>2. Leave every field empty.<br>3. Click "Create".                                                                                                                                                              | Save is blocked; inline "Required" errors appear under all six required fields at once — Company Code, Prefix Code, Company Name, Address, Primary Currency, Secondary Currency — no toast, no navigation.                      |
| TC:7  | Verify Country of Operation, Tax Registration Number etc. are genuinely optional | 1. Go to New Company.<br>2. Fill only the six required fields (Company Code, Prefix Code, Company Name, Address, Primary Currency, Secondary Currency) — leave Country of Operation on "—" and every other optional field blank.<br>3. Click "Create". | Save succeeds with toast "Company created." — confirms Country of Operation, Tax Registration Number, Telephone, Fax, Scrap %, and all four Path fields are genuinely optional, not just visually so.                           |
| TC:8  | Verify duplicate Company Code handling                                      | 1. Create a company with a given Company Code.<br>2. Attempt to create a second company reusing the **exact same** Company Code (different name/other fields).<br>3. Click "Create".                                                   | Second save is blocked with a generic toast "Failed to create company." — no field-level inline error pinpoints the duplicate; the user is left on the Create form with their entered data intact to retry with a different code. |
| TC:9  | Verify Cancel discards changes on create                                    | 1. Open New Company and fill in several fields (e.g. Company Code, Company Name).<br>2. Click "Cancel".                                                                                                                                 | No record is created; user is returned to the Company Master list; the list's total count is unchanged.                                                                                                                          |
| TC:10 | Verify Company Code and Prefix Code max length (edge)                       | 1. Open New Company.<br>2. Type more than 5 characters into Company Code.<br>3. Type more than 5 characters into Prefix Code.                                                                                                           | Both fields silently stop accepting input at **5 characters** — confirmed live via `inputValue()` after typing 12 characters into each; there is no inline "too long" error, the field simply truncates at the cap.             |
| TC:11 | Verify special/unicode characters in Company Name (edge)                    | 1. Open New Company.<br>2. Enter a Company Name containing symbols, HTML-like text and unicode (e.g. `Test & Co. <script>alert(1)</script> / "quote" 日本語`), fill the remaining required fields, and save.                           | The full string is accepted into the field with no client-side character-set restriction or length cap; confirm on save whether it renders safely (escaped) in the list, not executed.                                          |
| TC:12 | Verify Deactivate action and its real effect                                | 1. Open an Active company's Edit screen.<br>2. Click the "Deactivate" button at the top of the form (not the "Active" checkbox inside the form).<br>3. Observe the list.                                                               | Toast "Company deactivated." appears; redirected to the list; the company's Status column now shows "Inactive" and the "Inactive" tab count increases by one.                                                                    |
| TC:13 | Verify reactivating a deactivated company — **known trap, confirmed live**  | 1. Open an Inactive company's Edit screen.<br>2. Observe the top action button's label.<br>3. Check the "Active" checkbox inside the Basic Information group and click "Save changes".                                                 | **The top action button still reads "Deactivate", even though the company is already Inactive — it never flips to "Activate".** Clicking it again just re-fires "Company deactivated." with no state change. The only confirmed way to reactivate is to check the in-form "Active" checkbox and click "Save changes" (toast "Company updated."), which does flip the Status back to "Active" on the list. |
| TC:14 | Verify Primary Currency / Secondary Currency dropdown options               | 1. Open New Company.<br>2. Open the Primary Currency combobox.                                                                                                                                                                           | A plain Radix listbox opens immediately (no typing needed) with options: CNY, EUR, GBP, HKD, INR, JPY, KRW, SGD, USD, VND (each shown as "CODE — Full name"). Secondary Currency offers the same list.                           |

## Notes for whoever picks this up next

All findings below were confirmed live against `https://dev.flooros.app` on
2026-10-06 using a real authenticated session (`.auth/master-data.json`) and
throwaway records prefixed `TC-Company-...` — this module had **zero**
existing documentation or automation in this repo before this file.

- **List**: heading "Company Master" (`level=1`), tabs All/Active/Inactive
  (each with a live count), search ("Search by code, name, prefix…"),
  Filters/Refresh/Export CSV/Toggle cell filters/Configure columns/Best-fit
  columns, 3 layout modes, a "New Company" button (capital C — yet another
  per-screen casing variant; Departments/Sites use lowercase "New
  department"/"New site", Employees uses "New Employee" — there is no
  consistent convention across Master Data screens, confirmed again here).
  Table columns: Company Code, Company Name, Prefix Code, Primary Currency,
  Status.
- **Update (2026-10-07, found while automating TC:1):** the Image Path /
  Document Path / FR Path / GPRO Path fields are optional (confirmed
  correctly above) but, once filled, enforce a **Windows-style path
  format** — a URL-style value like `/images/pw-md` is rejected inline
  with "Image Path must be a valid path (e.g. `C:\Images\`)" (and the
  equivalent message per field), blocking Create. Not caught during the
  original manual exploration since that pass only confirmed these fields
  could be *left blank*, never tried filling one in. Use a value like
  `C:\Images\PWMD\` instead for any test that fills these fields.
- **Create form** fields, exactly as marked live with `*`: Company Code\*,
  Prefix Code\*, Company Name\*, Address\*, Country of Operation, Tax
  Registration Number, Active (checkbox, defaults checked), Telephone, Fax,
  Primary Currency\*, Secondary Currency\*, Scrap % (spinbutton), Master
  Data Approval Required (switch, defaults checked — see below), Image
  Path, Document Path, FR Path, GPRO Path. **Unlike Sites' Country/Timezone
  trap, the six starred fields here are genuinely required** — submitting
  empty shows inline "Required" under all six simultaneously, confirmed
  live, no gap between what looks required and what's enforced.
- **Clicking a row opens straight into the Edit Company form** — there is
  no separate read-only detail view (same shape as Customer Master, see
  that module's own file). The URL pattern is
  `?create=true` for new, `?edit=<CompanyCode>` for edit (both on the same
  base route, confirmed live — no dedicated `/new` or `/<id>` sub-route
  like Departments/Sites use).
- **Confirmed-live constraint, not documented anywhere before this file:
  Company Code and Prefix Code are capped at exactly 5 characters.** Typing
  longer values truncates silently — no inline "too long" error, no
  `maxlength` feedback beyond the cap simply refusing further input.
  Confirmed by filling 12-character strings into each and reading
  `inputValue()` back (`"ABCDE"` both times). Company Name and Address have
  no such cap (tested with 20+ character and special-character strings).
- **Duplicate Company Code is blocked, but with only a generic toast.**
  Confirmed by reusing the same 5-character code twice: the first create
  succeeds ("Company created."), the second fails with toast "Failed to
  create company." — no inline field-level indication of *why* it failed.
  Contrast with Customer Season Master's much more specific "That season
  code already exists for this customer." (see that module's file) — this
  app is inconsistent in how clearly it surfaces duplicate-key failures
  across Master Data screens, worth flagging to the team.
- **Exact success toast text, confirmed live:**
  - Create: `Company created.`
  - Edit/Save: `Company updated.`
  - Deactivate: `Company deactivated.`
  (All three carry a trailing period — consistent with Departments/Sites'
  own toasts per `agent-notes/master-data-module.md`.)
- **Real bug, confirmed live via a full round-trip (deactivate → re-open →
  observe → reactivate → re-open → observe):** the "Deactivate" quick-action
  button at the top of the Edit Company screen **never relabels to
  "Activate"** once the company is already Inactive. Clicking it again on
  an already-inactive record just re-fires the same deactivate toast with
  no actual state change. The only way to bring a company back to Active,
  confirmed working, is to check the in-form "Active" checkbox (which does
  correctly read `unchecked` on an Inactive company) and click "Save
  changes" — that produces "Company updated." and the list correctly shows
  "Active" again. This is a genuinely surprising/bug-like UX gap: there is
  no obvious "Activate" affordance anywhere on the screen for an already-
  inactive record.
- **"Master Data Approval Required"** is a company-level switch (defaults
  checked) whose own helper text says new master values raised under this
  company are saved as Draft pending an approver. This is very likely the
  mechanism behind Customer Master's and Customer Season Master's own
  Draft/Approved/Rejected workflow (see those two files) — not verified
  end-to-end in this session (would require creating a second Company with
  this switch off and then creating Customers/Seasons under it specifically
  to compare), flagged here for whoever picks up the approval-workflow
  angle next.
- Same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement
  as every other Master Data screen (see `agent-notes/master-data-module.md`).
  A plain `page.goto()` lands on the "Welcome to FloorOS" gate even with a
  valid `storageState` — only clicking "Sign in" (or racing it against the
  banner's Notifications button, as `BasePage.gotoAuthenticated()` does)
  actually redeems the session.
- **Not covered in this pass**: Filters button's rule-builder UI, Export
  CSV content, Configure columns/Best-fit columns, the 3 layout modes
  (No split/Vertical/Horizontal), row-level checkboxes/bulk actions, and
  exhaustive validation of Scrap %'s numeric bounds or the Image/Document/
  FR/GPRO Path fields' format (if any).
