# Master Data — Sites

The "Site Master" screen under Master Data > System Management
(`/master-data/system-management/sites`). Covers creating, editing,
listing/searching, and validating a Site record. No automation exists for
this module yet, so this file uses the simple 4-column format (no
ClickUp/Automated/Verified columns).

| #    | Test case                                                               | Steps                                                                                                                                                              | Expected result                                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify successful creation with all fields filled                        | 1. Go to Sites > New site.<br>2. Fill Site code, Site name.<br>3. Select Country and Timezone.<br>4. Toggle Active to "Yes".<br>5. Add a "Links to other systems" entry.<br>6. Click "Create site". | Toast "Site created." appears; redirected to the Sites list; the new row shows the chosen Country/Timezone, Active status, and the link value instead of "Not set"/"No links...". |
| TC:2 | Verify successful creation with only required fields                     | 1. Go to New site.<br>2. Fill Site code, Site name, Country, and Timezone only (leave Active untouched, skip Links).<br>3. Click "Create site".                     | Toast "Site created." appears; new row visible with Active = Inactive (the switch's real default — see Notes) and "No links to other systems".                                     |
| TC:3 | Verify successful edit of an existing site                               | 1. Open the Sites list, search for a known site, click its row (opens a read-only detail view).<br>2. Click "Edit site".<br>3. Change the Site name and toggle Active on, click "Save changes". | Toast "Site updated." appears; the detail/list view reflects the new name and Active status.                                                                                       |
| TC:4 | Verify list search by Site code and by Site name                         | 1. Open the Sites list.<br>2. Search by a known site's code.<br>3. Clear and search by its name instead.                                                            | Both searches narrow the table to only the matching row(s).                                                                                                                         |
| TC:5 | Verify validation when all required fields are left blank                | 1. Go to New site.<br>2. Leave Site code, Site name, Country, and Timezone all empty.<br>3. Click "Create site".                                                    | Save is blocked; inline "Required" errors appear under **all four** fields (Site code, Site name, Country, Timezone) — no toast, no navigation.                                    |
| TC:6 | Verify duplicate Site code is blocked                                     | 1. Create a site with a given code.<br>2. Attempt to create a second site using the exact same code (different name).<br>3. Click "Create site".                   | Save is blocked; a toast/error reads exactly "A site with this code already exists. Use a different code." — the page stays on the New site form, no second record is created. Confirmed via a real duplicate-code attempt. |
| TC:7 | Verify Cancel discards changes                                            | 1. Open New site.<br>2. Fill in a Site code (and optionally other fields).<br>3. Click "Cancel".                                                                    | No record is created; user is returned to the Sites list.                                                                                                                           |
| TC:8 | Verify Active switch's real default on create                            | 1. Open New site.<br>2. Without touching the "Active" switch, fill the required fields and save.                                                                    | The switch's `aria-checked` is `false` before any interaction, and the saved site shows status **Inactive** — confirmed live. (Historical note: earlier documentation claimed a default of "Yes" — not accurate on current dev.) |
| TC:9 | Verify special/unicode characters are accepted within the real length caps | 1. Open New site.<br>2. Enter a code with symbols/unicode within 24 characters and a name with symbols/unicode within 96 characters.<br>3. Fill Country/Timezone and save. | No character-set restriction is enforced — the record saves successfully with toast "Site created." **Correction (2026-10-07, found while automating):** Sites enforces the exact same real, server-side length caps as Departments — Site code **1–24 characters**, Site name **1–96 characters** — confirmed by actually exceeding it: the form blocks submission and shows inline "1–24 characters" / "1–96 characters" text. No HTML `maxlength` attribute exists, which is as far as the original exploration checked. |
| TC:10 | Verify the "Legal entities at this site" section is absent — **flag for the team** | 1. Open New site.<br>2. Look for an "Add entity" / "Legal entities at this site" section (previously documented as present, same shape as Departments' facility rows). | No such section or "Add entity" button exists anywhere on the current Create Site form — confirmed by both page text and a direct `getByRole('button', {name: 'Add entity'})` lookup (0 matches). This contradicts `agent-notes/master-data-module.md`'s 2026-09-24 description and leaves `SiteFormLocators.addEntityButton` pointing at a UI element that no longer exists. Confirm with the team whether this was an intentional removal before updating the page object. |
| TC:11 | Verify creating a site with Links to other systems left empty             | 1. Fill Site code, Site name, Country, Timezone.<br>2. Leave "Links to other systems" empty.<br>3. Save.                                                             | Saves successfully; the create form itself shows "No links to other systems" as its empty-state copy, but the **list row's** Links column renders literally **"None"** (confirmed live 2026-10-07 from the row's own text — don't assert the form's empty-state copy against the list). |
| TC:12 | Verify Country/Timezone combobox selection works for a non-default value  | 1. Open New site, fill Site code/name.<br>2. Pick a Country other than Vietnam (e.g. Australia) and a matching Timezone.<br>3. Save.                                 | Saves successfully; the list/detail view reflects the specifically chosen Country/Timezone values, not just the "happy path" Vietnam/Ho_Chi_Minh default used elsewhere.            |

## Notes for whoever picks this up next

**Carried over from `agent-notes/master-data-module.md`** (2026-09-24, still
accurate): the list heading, "New site" button casing, table columns, the
real toast text pattern ("Site created." with trailing period), and the
dev OIDC redirect timing quirk on `gotoAuthenticated()`.

**Superseded by live verification done for this file (2026-10-06)** — two
of the agent-notes' own headline findings about Sites are now out of date:
- **The previously-reported bug is fixed.** `agent-notes/master-data-module.md`
  and historical `TC-CS-07` both documented Country/Timezone as "not
  actually required despite looking required" (filed as
  [a ClickUp bug](https://app.clickup.com/t/z941abwhv2)). That is **no
  longer true** — confirmed live by submitting an empty form and seeing
  real "Required" errors under all four fields, matching the fix already
  reflected in `site-form.page.ts`/`.locators.ts` (commit `cf748fd`,
  2026-10-02, "Site: Country and Timezone are now enforced"). **Do not
  write a test asserting Country/Timezone are optional** — that assertion
  would now fail.
- **New finding, not previously documented:** the "Legal entities at this
  site" section described in agent-notes (an "Add entity" button, "exactly-
  one-primary" pattern) does not exist anywhere on the current Create Site
  form — confirmed by direct locator lookup (see TC:10). Worth raising
  with the team: either this was deliberately removed, or it's a real
  regression; either way the existing `SiteFormLocators.addEntityButton`
  now points at nothing.
- **New finding:** the "Active" switch defaults to **off/Inactive** on a
  new site, not "Yes" as agent-notes states — same pattern confirmed for
  Departments (see `departments-testcases.md`).
- **New finding, confirmed live:** duplicate Site codes **are** blocked,
  with the exact error "A site with this code already exists. Use a
  different code." This is the opposite of Departments' behavior (see
  `departments-testcases.md` TC:9), where duplicate codes are silently
  accepted — a genuine cross-module inconsistency worth flagging, since
  both forms show the same "Codes must be unique." helper text.
- Edit success toast is **"Site updated."** (confirmed live, previously
  undocumented).
- **Corrected while automating (2026-10-07):** TC:9's original wording (a
  250-character name "no cap, unverified end-to-end") was incomplete —
  there IS a real, server-enforced length cap, the same 1–24/1–96 split
  as Departments (see `departments-testcases.md`'s equivalent correction).
  Also corrected TC:11: the list row's Links column renders "None", not
  the form's "No links to other systems" empty-state copy — those are two
  different pieces of UI text, easy to conflate.

**Not covered in this pass**: pagination/large-dataset list behavior,
and any Links-to-other-systems field-level format validation (e.g. the
SAP plant code hint text implies a format but none was tested).

**Automated 2026-10-07** in
[`tests/regression/master-data/03-sites.spec.ts`](../../../tests/regression/master-data/03-sites.spec.ts),
one `test()` per row above (TC:1–TC:12), all passing against dev.
