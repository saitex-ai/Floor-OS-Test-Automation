# Master Data — Employees

The "Employees" screen (nav label "Employees & Skills") under Master Data >
System Management (`/master-data/system-management/employees`). Covers
creating, editing, listing/searching, and validating an Employee record.
Unlike Departments/Sites, there's no dedicated `/new` route — "New
Employee" opens the create form on the same list URL. No automation
exists for this module yet, so this file uses the simple 4-column format
(no ClickUp/Automated/Verified columns).

| #    | Test case                                                               | Steps                                                                                                                                                                | Expected result                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify successful creation with all fields filled                        | 1. Go to Employees > New Employee.<br>2. Fill Full Name.<br>3. Pick a Department from the picker dialog.<br>4. Fill Reports To, Email, Phone.<br>5. Pick a Maintained by value.<br>6. Toggle Active, add a system link.<br>7. Click "Create employee". | Toast "Employee created" (no trailing period) appears; redirected to the Employees list; new row shows the Department, an auto-generated Employee Number, and the chosen Maintained By value. |
| TC:2 | Verify successful creation with only required fields                     | 1. Go to New Employee.<br>2. Fill only Full Name, pick a Department, and pick a Maintained by value (leave Reports To/Email/Phone/Links blank, leave Active untouched). <br>3. Click "Create employee".       | Toast "Employee created" appears; Employee Number is auto-assigned; Active shows "Yes" by default (see Notes — this default differs from Departments/Sites).                             |
| TC:3 | Verify successful edit of an existing employee                           | 1. Open the Employees list, search for a known employee, click its row (opens a read-only detail view).<br>2. Click "Edit employee".<br>3. Change Full Name and toggle Active off, click "Save changes". | Toast "Employee updated" (no trailing period) appears; detail/list reflects the new name and Inactive status.                                                                             |
| TC:4 | Verify list search by employee name                                      | 1. Open the Employees list.<br>2. Search by a known employee's full name.                                                                                           | The table narrows to only the matching row(s).                                                                                                                                           |
| TC:5 | Verify the Department picker's search/filter works                       | 1. Open New Employee.<br>2. Click the Department combobox (opens a dialog, not a plain dropdown).<br>3. Type a partial department name (e.g. "Sewing") into the dialog's "Search" box. | The dialog's option list (rendered as plain `button`s, not `role=option`) narrows from the full set down to only the matching department(s) — confirmed live (16 options → 1 matching "Sewing" after typing). |
| TC:6 | Verify validation when all required fields are left blank                | 1. Go to New Employee.<br>2. Leave Full Name, Department, and Maintained by all unset.<br>3. Click "Create employee".                                                | Save is blocked; inline "Required" errors appear under Full Name, Department, and Maintained by. Employee Number shows as disabled/"Auto-generated" and never errors (it's system-assigned, not user input). |
| TC:7 | Verify Cancel discards changes                                            | 1. Open New Employee.<br>2. Fill in a Full Name (and optionally other fields).<br>3. Click "Cancel".                                                                 | No record is created; user is returned to the Employees list.                                                                                                                             |
| TC:8 | Verify "Maintained by" is required with no default — **historical bug confirmed fixed/changed** | 1. Open New Employee.<br>2. Fill Full Name and pick a Department.<br>3. Leave "Maintained by" on its default "Select…".<br>4. Click "Create employee".              | Save is blocked; an inline "Required" error appears under "Maintained by". The field shows **"Select…"**, not a pre-selected value — see Notes, this contradicts a previously-filed bug about this field defaulting to "IE-Assessed". |
| TC:9 | Verify optional fields can be left blank                                 | 1. Fill Full Name, Department, Maintained by.<br>2. Leave Reports To, Email, and Phone blank.<br>3. Save.                                                             | Saves successfully with toast "Employee created" — none of these three fields block the save when empty.                                                                                 |
| TC:10 | Verify special/unicode characters are accepted in Full Name              | 1. Open New Employee.<br>2. Enter a Full Name containing symbols/unicode (moderate length, well under any cap).<br>3. Fill the other required fields and save.       | No character-set restriction observed on Full Name; saves successfully with toast "Employee created". **Correction (2026-10-07, found while automating):** Full Name is NOT unlimited — a ~300+ character name is rejected, but with a generic failure toast ("Could not create employee") rather than Departments'/Sites' inline "N–M characters" hint, so the exact numeric cap wasn't pinned down. Don't assume an arbitrarily long Full Name is safe to use in a test. |
| TC:11 | Verify duplicate Full Name is allowed                                     | 1. Create an employee with a given Full Name.<br>2. Create a second, separate employee using the exact same Full Name.<br>3. Click "Create employee" both times.     | Both saves succeed with toast "Employee created" each time — confirmed live. Employee Number (auto-generated, unique per record) is the real identifier here, not Full Name, so no duplicate-name validation exists (nor should one be assumed). |
| TC:12 | Verify Active switch's real default on create — **differs from Departments/Sites** | 1. Open New Employee.<br>2. Without touching the "Active" switch, fill the required fields and save.                                                                | The switch's `aria-checked` is `true` before any interaction — the new employee saves as **Active = Yes** by default. This is the opposite of Departments' and Sites' confirmed off-by-default behavior — a genuine cross-module inconsistency worth flagging. |

## Notes for whoever picks this up next

**Carried over from `agent-notes/master-data-module.md`** (2026-09-24, still
accurate): the list heading/tabs (All/From HR System/IE-Assessed), the
"New Employee" capital-E button casing, the table columns, Employee Number
being fully auto-assigned/disabled, the Department field being a real
live-sourced searchable picker (dialog of plain `button`s, not
`role=option` — confirmed again live for this file, see TC:5), the
"Maintained by" picker sharing that same dialog shape with options
"HR system (synchronised)" / "By hand", and the dev OIDC redirect timing
quirk.

**Superseded by live verification done for this file (2026-10-06)** — the
single headline finding in agent-notes about Employees is now out of date:
- **The previously-documented bug ("Maintained by" defaulting to
  "IE-Assessed", filed as a known pre-existing gap) is no longer
  reproducible.** On the current dev build, "Maintained by" shows
  **"Select…"** with no default at all, and is now enforced as a required
  field (inline "Required" error on empty submit) — matching the change
  already reflected in `employee-form.page.ts`'s own comment ("'Maintained
  by' became required with no default on dev, confirmed 2026-10-01",
  commit `cf748fd`, 2026-10-02). Don't write a test asserting the old
  IE-Assessed-default behavior — it no longer exists. See TC:8.
- **New finding, not previously documented:** the "Active" switch on a new
  Employee defaults to **on/Active = Yes** (`aria-checked="true"`) — this
  is the opposite of what was just confirmed for Departments and Sites
  (both default off/Inactive in this same verification pass). All three
  modules show the same generic "Active" switch and the same "Retired,
  never deleted..." style helper copy, but their real default states are
  not consistent with each other. Worth flagging to the team as either
  intentional (employees should probably default active, departments/
  sites more cautiously don't) or an inconsistency to resolve.
- **New finding:** duplicate Full Name is allowed (confirmed via two real
  creates) — expected, since Employee Number is the real unique
  identifier, but worth stating explicitly so nobody later assumes name
  uniqueness is enforced.
- Create/update toasts for Employees consistently have **no trailing
  period** ("Employee created" / "Employee updated") — unlike Departments'
  and Sites' toasts, which both use a trailing period. This was already
  noted for the create toast in agent-notes; confirmed here that the same
  no-period style applies to the update toast too.
- The static "Codes must be unique. Everything is effective-dated from
  today." hint text appears at the top of the New Employee form even
  though Employees has no user-entered code field (Employee Number is
  auto-assigned) — likely shared boilerplate copy across all three Master
  Data create forms rather than something written specifically for this
  screen. Not a functional bug, just worth noting if it looks confusing
  in a screenshot/walkthrough.

**Found and fixed while automating (2026-10-07):**
- Email's and Phone's real accessible names are **"Work e-mail"** and
  **"Work telephone"**, not the plain "Email"/"Phone" their field
  descriptions here might suggest — a `getByRole('textbox', { name:
  'Email' })`-style lookup hangs forever (0 matches). Fixed in
  `EmployeeFormLocators`.
- Full Name is not unlimited (see TC:10's correction above).
- The Department picker's live search (TC:5) is genuinely racy under a
  busy dev environment: the dialog's own initial unfiltered fetch can
  resolve *after* a search's filtered fetch and silently revert the list
  back to unfiltered, while the typed text stays visibly sitting in the
  search box the whole time — easy to misread as "nothing happened"
  rather than "it happened and then got reverted". `EmployeeFormPage`'s
  `searchDepartmentPicker()` now retries the fill itself (not just a
  read) until the options genuinely match, instead of filling once and
  hoping no later response clobbers it.

**Not covered in this pass**: retiring an employee and confirming
referencing behavior ("a retired row still resolves for everything that
references it"), Reports To picker behavior in depth (it's the same
dialog shape, not separately exercised here), and Email/Phone format
validation (none was observed to be enforced, but not exhaustively
tested with malformed input).

**Automated 2026-10-07** in
[`tests/regression/master-data/04-employees.spec.ts`](../../../tests/regression/master-data/04-employees.spec.ts),
one `test()` per row above (TC:1–TC:12), all passing against dev.
