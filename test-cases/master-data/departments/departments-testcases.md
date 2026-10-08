# Master Data — Departments

The "Department Master" screen under Master Data > System Management
(`/master-data/system-management/departments`). Covers creating, editing,
listing/searching, and validating a Department record — the unit that
performs work (internal departments, subcontractors, external labs, the
mill). No automation exists for this module yet, so this file uses the
simple 4-column format (no ClickUp/Automated/Verified columns).

| #    | Test case                                                               | Steps                                                                                                                                                                       | Expected result                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify successful creation with all fields filled                        | 1. Go to Departments > New department.<br>2. Fill Department code, Department name.<br>3. Select Department type, Default working calendar, Capacity measured in.<br>4. Add a Facility row ("Add facility" → pick a facility).<br>5. Toggle Active to "Yes".<br>6. Add a "Links to other systems" entry.<br>7. Click "Create department". | Toast "Department created." appears; redirected to the Departments list; the new row shows the chosen facility, Active status, and the link value instead of "None"/"Not in any facility yet". |
| TC:2 | Verify successful creation with only required fields                     | 1. Go to New department.<br>2. Fill only Department code, Department name, and Default working calendar (leave Department type/Capacity measured in on their defaults, leave Active untouched, skip Facility and Links). <br>3. Click "Create department".          | Toast "Department created." appears; new row visible on the list showing "Not in any facility yet" for facility and "None" for links.                                                         |
| TC:3 | Verify successful edit of an existing department                         | 1. Open the Departments list, search for a known department, click its row (opens a read-only detail view).<br>2. Click "Edit department".<br>3. Change the Department name and click "Save changes". | Toast "Department updated." appears; the detail/list view reflects the new name.                                                                                                                |
| TC:4 | Verify list search by Department code and by Department name             | 1. Open the Departments list.<br>2. Type a known department's code into "Search departments…".<br>3. Clear and search its name instead.                                        | Both searches narrow the table to only the matching row(s).                                                                                                                                     |
| TC:5 | Verify Active status toggle reflects in Edit and on the list             | 1. Edit a department and toggle "Active" off, save.<br>2. Re-open it and toggle "Active" on, save.                                                                              | Each save shows "Department updated."; the Status column/detail badge shows "Inactive" then "Active" to match.                                                                                  |
| TC:6 | Verify validation when all required fields are left blank                | 1. Go to New department.<br>2. Leave Department code, Department name, and Default working calendar empty.<br>3. Click "Create department".                                     | Save is blocked; inline "Required" errors appear under Department code, Department name, and Default working calendar — no toast, no navigation.                                              |
| TC:7 | Verify Default working calendar validation specifically                  | 1. Fill Department code and Department name only.<br>2. Leave Default working calendar on "Select…".<br>3. Click "Create department".                                            | Save is blocked; an inline "Required" alert appears directly under the Default working calendar field (this is the one requirement that's easy to miss since the other two fields look optional at a glance). |
| TC:8 | Verify Cancel discards changes                                            | 1. Open New department.<br>2. Fill in a Department code (and optionally other fields).<br>3. Click "Cancel".                                                                      | No record is created; user is returned to the Departments list.                                                                                                                                 |
| TC:9 | Verify duplicate Department code handling — **known bug**                | 1. Create a department with a given code.<br>2. Create a second department using the exact same code (different name).<br>3. Click "Create department" both times.              | **Actual (bug):** both saves succeed with toast "Department created." each time — the form's own "Codes must be unique." hint text is not enforced. The list ends up with two rows sharing the same code. Do not assume this is blocked. |
| TC:10 | Verify Active switch's real default on create                           | 1. Open New department.<br>2. Without touching the "Active" switch, fill the required fields and save.                                                                           | The switch's `aria-checked` is `false` before any interaction, and the saved department shows status **Inactive** — confirmed live. (Historical note: earlier documentation claimed this defaults to "Yes" — that is no longer accurate on dev as of this verification.) |
| TC:11 | Verify special/unicode characters are accepted within the real length caps | 1. Open New department.<br>2. Enter a code containing symbols and unicode within 24 characters (e.g. `PWD-ÄÖÜ日本-123456`) and a name with symbols/unicode within 96 characters.<br>3. Fill the remaining required fields and save. | No character-set restriction is enforced — the record saves successfully with toast "Department created." **Correction (2026-10-07, found while automating):** there IS a real, server-enforced length cap on both fields — Department code **1–24 characters**, Department name **1–96 characters** — confirmed by actually exceeding it: the form blocks submission and shows inline "1–24 characters" / "1–96 characters" text, no toast, no navigation. No HTML `maxlength` attribute exists (that part of the original finding was accurate), the earlier exploration just hadn't pushed long enough to hit the real cap. |
| TC:12 | Verify adding a Facility row                                              | 1. Open New department, fill required fields.<br>2. Click "Add facility", pick a Facility from the dropdown (Role defaults to the single "home facility" option).<br>3. Save. | Department saves successfully; the list/detail view shows the chosen facility instead of "Not in any facility yet." (Facility is optional — not required to save, unlike the old "Operates at" site-row behavior.) |

## Notes for whoever picks this up next

**Carried over from `agent-notes/master-data-module.md`** (2026-09-24, confirmed
still accurate): the list heading, tabs (All/Internal/External with live
counts), table columns, the `exact: true` combobox-locator trap (Site/Role/
Calendar-style fields share overlapping accessible names), and the dev OIDC
redirect timing quirk on `gotoAuthenticated()`.

**Superseded by live verification done for this file (2026-10-06)** — the
agent-notes file and even the page objects' own comments are partly stale
relative to the current dev app:
- The old "at least one 'Operates at' site row is required" finding is
  **no longer true**. That section is now an optional "Facility" row
  ("Add facility", not "Add site") — confirmed live, matches the app
  change already reflected in `department-form.page.ts`/`.locators.ts`
  (commit `cf748fd`, 2026-10-02).
- **New finding, not previously documented anywhere in this repo:** the
  "Active" switch defaults to **off/Inactive** on a brand-new department
  (`aria-checked="false"`), not "Yes" as `agent-notes/master-data-module.md`
  states. Confirmed by creating a real department without touching the
  switch and observing "Inactive" on both the list and detail view.
- **New bug finding:** duplicate Department codes are **not** blocked,
  despite the form displaying "Codes must be unique." as static helper
  text. Confirmed by creating two real departments with the identical
  code — both saved. This is the **opposite** of Sites' behavior (see
  `sites-testcases.md` TC:6), which does enforce code uniqueness with a
  real blocking error — worth flagging to the team as an inconsistency,
  not just a Departments-only gap.
- No `maxlength` attribute exists on Department code or Department name,
  but there IS a real, server-enforced length cap confirmed while building
  automation for this file (2026-10-07): **Department code 1–24
  characters, Department name 1–96 characters** — exceeding either blocks
  submission with an inline "1–24 characters" / "1–96 characters" message
  (no toast, no navigation). TC:11's original wording (a 300-character
  name "accepted with no cap") was wrong — it just hadn't pushed far
  enough to hit the real boundary; corrected above.
- Direct `page.goto()` to a department's edit/detail URL
  (`/departments/<uuid>`) does **not** work reliably from a cold
  navigation — it lands on the app shell's generic launcher page instead.
  Reach a specific department only by navigating the list UI (search →
  click the row → "Edit department"), consistent with this app's known
  SPA client-side-routing quirks noted elsewhere in `agent-notes/`.
- Edit success toast is **"Department updated."** (confirmed live,
  previously undocumented) — follows the same trailing-period convention
  as the create toast ("Department created.").
- No pagination controls were observed on the Departments list with ~58
  rows; all rows appeared to render without pagination. Not exhaustively
  verified (e.g. against a much larger data set), so treat this as an
  observation rather than a confirmed guarantee.

**Not covered in this pass** (out of scope for this session): retiring a
department and verifying it "stops appearing in pickers" elsewhere (e.g.
in the Employees' Department picker or Sites' facility picker), Links to
other systems field-level validation (e.g. `sap_cost_center` format),
and multi-facility rows / primary-facility-swap validation.

**Automated 2026-10-07** in
[`tests/regression/master-data/02-departments.spec.ts`](../../../tests/regression/master-data/02-departments.spec.ts),
one `test()` per row above (TC:1–TC:12), all passing against dev. The
length-cap correction to TC:11 above was discovered while writing that
automation — see the spec's own comments for the exact repro.
