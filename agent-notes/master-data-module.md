# Master Data module

First entry in this file — started 2026-09-24 while building Departments smoke coverage. See
`agent-notes/environment-notes.md` for the module's real route confirmation
(`/master-data`, "System Management" group) and the "don't confuse this with Planning's own
same-named Master Data submenu" warning — not repeated here.

`MASTER_DATA_USER_DEV`/`_PASSWORD_DEV` (and `_LOCAL` variants) were unset in `.env` until this
session — filled in with the org-wide `alice`/`password` admin convention, same as Planning and
Techpack use. Confirmed working live (the `master-data-setup` auth project passes). Until this was
filled in, `npm run test:*:master-data*` could never actually have run — `moduleCredentials()`
throws on a missing required env var, no fallback.

## Departments (`/master-data/system-management/departments`)

The "Department Master" screen under System Management. Confirmed live 2026-09-24 while building
one smoke test case (Create Department only — see `tests/smoke/master-data/master-data.smoke.spec.ts`).

- **List**: heading "Departments", tabs All/Internal/External (each with a live count), search
  ("Search departments…"), Filters/Refresh/Export CSV/Toggle cell filters/Configure
  columns/Best-fit columns, 3 layout modes, a "New department" button. Table columns: Code,
  Department, Department type, Sites, Default calendar, Capacity unit, Setup confirmed, Links to
  other systems, Status. Same general shape as Techpack's list screen (rule-builder Filters, inline
  "Toggle cell filters", 3 layout modes) — looks like a shared grid component across modules.
- **Create form** (`New department` → `/master-data/system-management/departments/new`): fields are
  Department code (textbox, placeholder "SEW"), Department name (textbox, placeholder "Sewing"),
  Department type (combobox, defaults "Internal"), Default working calendar (combobox, defaults
  "Select…"), Capacity measured in (combobox, defaults "Line"), Active (switch, defaults
  checked/"Yes"), an "Operates at" site-rows section, and an optional "Links to other systems"
  section (e.g. `sap_cost_center` — confirmed optional, several real rows show "None").
- **Two required fields that are NOT obvious from a first read of the form**, both confirmed live by
  actually attempting a save and reading the real blocking error:
  1. **At least one "Operates at" site row** — "Add site" reveals Site (combobox, required, defaults
     "Select…"), Role at this site (combobox, defaults "Primary (home site)" — already correct for
     a single-site happy path, no need to touch), Calendar at this site (combobox, defaults "Inherit
     default"). Zero rows blocks save with toast "At least one site is required."
  2. **Default working calendar** — left on its default "Select…", submitting shows an inline
     `alert: Required` right under the field instead of a toast. Easy to miss if you only test with
     a calendar already selected.
- **Locator trap, confirmed live**: `getByRole('combobox', { name: 'Site' })` (default substring
  match) also matches "Role at this site" and "Calendar at this site" — all three are separate
  Radix `select-trigger` buttons on the same row. Every combobox on this form needs `exact: true`.
  Same shape of trap as Techpack's `getByRole('combobox', { name: 'Site' })` issue noted in
  `environment-notes.md`'s Departments section (line ~178) — a recurring pattern in this app's forms
  generally, worth checking for on any new form before assuming a name-based locator is unique.
- **Success signal**: real toast text is exactly "Department created." — confirmed via a genuine
  live create (department count went 33 → 34, new row visible on the list after redirect back to
  it). Comboboxes here are plain Radix selects (click trigger → `listbox` of `option`s appears
  immediately), not cmdk search-comboboxes like Techpack's AI Mode fields — no need to type into
  them first.
- **The dev OIDC redirect timing quirk applies here too** (see `environment-notes.md` line ~55-60):
  after `gotoAuthenticated()`, the app can take 15-18s to client-side-route to the real target path.
  A fixed short `waitForTimeout` before asserting on this screen will flake — wait for the real URL
  (`page.waitForURL(...)`) or a real heading instead.

## Employees (`/master-data/system-management/employees`)

Nav label "Employees & Skills," heading on the screen itself is just "Employees" (matches
`environment-notes.md`'s earlier route confirmation). Confirmed live 2026-09-24 while building one
smoke test case (Create Employee only — see `tests/smoke/master-data/master-data.smoke.spec.ts`).

- **List**: heading "Employees", tabs All/From HR System/IE-Assessed (each with a live count —
  same "Maintained by" split as `TC-LE-13` describes elsewhere in this repo's history), a "New
  Employee" button (capital E — differs from Departments' "New department", worth double-checking
  exact casing on any future module rather than assuming a shared convention). Table columns:
  Employee Number, Name, Department, Reports To, Email, Phone, Maintained By, Status.
- **Create form** ("New Employee" → same `/employees` URL, no dedicated `/new` route unlike
  Departments — confirmed by watching `page.url()` stay put through the whole flow): Employee
  Number (disabled, "Auto-generated" — fully system-assigned, confirmed matches this repo's
  historical TC-CE-01..03 finding), **Full Name \*** (required), **Department \*** (required),
  Reports To (optional), Email (optional), Phone (optional), Maintained by (combobox — already
  defaults to "IE-Assessed" selected, a known pre-existing gap already filed as a bug elsewhere in
  this repo's history, not something to "fix" by re-selecting it), Active (switch, defaults
  checked/"Yes"), optional "Links to other systems".
- **Department is NOT a plain Radix select like Departments' own fields** — it's a real, live,
  searchable, paginated combobox sourced from the actual Departments master (28+ real departments,
  including throwaway `PW...`-coded ones created by this session's own Departments smoke test —
  confirms the live-sourcing is genuine, not a cached/stale list). Clicking it opens a `dialog`
  (cmdk-style command palette: a "Search…" textbox + a "Load more" pagination button + department
  options rendered as **plain `button`s**, e.g. `button "Cutting CUT"` — no `role=listbox`/`option`
  at all, which is why a `getByRole('option')` locator finds nothing and just hangs). Same
  command-palette shape as Techpack's AI-mode pick-a-value fields, but buttons instead of `option`s
  is the one real structural difference — worth checking for on any other "live-sourced" combobox
  in this app before assuming ARIA listbox semantics apply.
- **Success signal**: real toast text is exactly "Employee created" — **no trailing period**,
  unlike Departments' "Department created." (confirmed by reading the notification region's own
  aria snapshot directly, not by eye). Small but a genuine locator-breaking difference if copy-paste
  from the Departments toast assertion without checking.
- The same dev OIDC redirect timing quirk and `gotoAuthenticated()` requirement apply here too (see
  the Departments section above and `environment-notes.md`).

## Not yet covered

Everything except Create Department and Create Employee: Edit Department (including the site-row
add/remove/primary-swap validations — "Exactly one site must be primary" / a generic "Failed to
update department." on the two-primaries case, per historical notes elsewhere in this repo that
describe the *same* real screen even though they predate this file), List Department, Edit
Employee, List Employee, retiring a
department, and every other Master Data screen (Site Master, Employees & Skills, Company/Customer/
Vendor Master, GMT Inseam/Waist Master, Size/Color Master, Unit of Measure, Currency Rate, Customer
Percentage, Techpack Type, Sample Request Creation, Inventory Item Management). Scope for this
session was deliberately just the one smoke case, per direct instruction.

**Ownership note**: `CODEOWNERS` assigns Master Data to `@sathishnagarajanQAlead`, not the QA who
built this (`@RKsaitex`, who owns Planning + Techpack). Confirmed directly with them 2026-09-24 that
Master Data is being treated as a shared module for this work and `CODEOWNERS` was deliberately left
unchanged — don't "fix" that assignment without asking again.
