# Master Data — Techpack Type

- **Module:** Master Data > System Management > Techpack Type
- **Route:** `/master-data/system-management/techpack-types`
- **Source:** First-pass live exploration against dev (`https://dev.flooros.app`), 2026-10-06 — no prior
  code or docs existed for this screen. Nothing here is carried over from notes; every row below was
  confirmed directly against the running app (see "Notes for whoever picks this up next").

Techpack Type is a small master list (Code + Name + a "skip demand/forecast validation" flag) with an
unusual twist: it also carries a Draft → Approved/Rejected review workflow (visible via tabs and a
"Masters needing review" panel) left over from however this data was seeded — but, confirmed live,
**new records created through the UI bypass that workflow entirely** and save directly as `Approved`
(see Notes).

| #     | Test case                                                               | Steps                                                                                                                                                                       | Expected result                                                                                                                                                                                 |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify Techpack Type list layout and tab counts                         | 1. Navigate to Master Data > System Management > Techpack Type.<br>2. Observe the tabs and table.                                                                         | Page heading "Techpack Type". Tabs All/Draft/Approved/Inactive/Rejected each show a live count. Table columns: Code, Name, No Demand Validation, Status. A "Masters needing review" panel lists Draft rows with Review/Reject/Make active actions. |
| TC:2  | Verify successful create with all fields (incl. "skip demand/forecast validation")                 | 1. Click "New Techpack Type".<br>2. Enter a unique Code and Name.<br>3. Check "Skip demand/forecast validation".<br>4. Click "Create".                                     | Modal closes; toast reads exactly **"Techpack type created"** (no trailing period). New row appears with the entered Code/Name, "No Demand Validation" = **Yes**, Status = **Approved** (not Draft). |
| TC:3  | Verify successful create with required fields only                      | 1. Click "New Techpack Type".<br>2. Enter only a unique Code and Name, leave the checkbox unchecked.<br>3. Click "Create".                                                  | Record created; toast "Techpack type created"; "No Demand Validation" column shows **No**; Status = Approved.                                                                                   |
| TC:4  | Verify successful edit of an existing Techpack Type                     | 1. Click any row in the list to open "Edit Techpack Type".<br>2. Change the Name.<br>3. Click "Save changes".                                                               | Modal closes; toast reads exactly **"Techpack type updated"**; list reflects the new Name immediately.                                                                                          |
| TC:5  | Verify list search by code or name                                      | 1. In "Search by code or name…", type a known Code (or Name).                                                                                                               | Table filters live to only matching rows (confirmed: searching an exact code that doesn't exist shows the empty state "No techpack types yet. Try removing a filter or clearing them all.").    |
| TC:6  | Verify deactivating a Techpack Type                                      | 1. Open an Approved record's Edit modal.<br>2. Click the "Deactivate <code>" icon button in the header (no confirmation prompt).                                            | Status immediately flips to **Inactive**; toast reads exactly **"Techpack type deactivated"**; record moves to the Inactive tab.                                                               |
| TC:7  | Verify deleting a Techpack Type                                         | 1. Open a record's Edit modal.<br>2. Click the "Delete <code>" icon button.<br>3. Confirm on the "Delete <code>? This permanently deletes <code>. This action cannot be undone." dialog. | Toast reads exactly **"Techpack type deleted"**; record no longer appears in any tab or search.                                                                                                 |
| TC:8  | Verify Cancel/Close on the Create modal discards changes                | 1. Click "New Techpack Type".<br>2. Fill in Code and Name.<br>3. Click "Close" (not Create).                                                                                 | Modal closes with no record created — confirmed by searching for the entered name afterward and getting no results.                                                                             |
| TC:9  | Verify mandatory field validation — Code                                 | 1. Click "New Techpack Type".<br>2. Leave Code blank, fill Name.<br>3. Click "Create".                                                                                      | Save is blocked; an inline **"Required"** message appears directly under the Code field.                                                                                                        |
| TC:10 | Verify mandatory field validation — Name                                 | 1. Click "New Techpack Type".<br>2. Leave Name blank, fill Code.<br>3. Click "Create".                                                                                      | Save is blocked; an inline **"Required"** message appears directly under the Name field.                                                                                                        |
| TC:11 | Verify duplicate Code is blocked                                         | 1. Click "New Techpack Type".<br>2. Enter a Code that already exists (e.g. an existing record's code) with any Name.<br>3. Click "Create".                                  | Save is blocked; a toast reads exactly **"That techpack type code already exists."** Record is not created.                                                                                     |
| TC:12 | Verify duplicate Name (different Code) is allowed                       | 1. Create a Techpack Type with Name "X" and Code "A".<br>2. Create a second Techpack Type with the same Name "X" but a different unique Code "B".                           | Both records save successfully — Name uniqueness is **not** enforced, only Code uniqueness is. Both appear in the list as separate rows.                                                        |
| TC:13 | Verify Code is normalized to uppercase and max length (30)              | 1. Click "New Techpack Type".<br>2. Enter a lowercase Code (e.g. `tctt123`) and any Name.<br>3. Click "Create".                                                              | Record saves successfully with the Code **auto-uppercased** on save (confirmed: `tctt123` → `TCTT123` in the list). `code` input has `maxlength=30`.                                            |
| TC:14 | Verify Name accepts special characters and max length (200)             | 1. Click "New Techpack Type".<br>2. Enter a unique Code and a Name containing special characters, e.g. `TC-TechpackType !@#$%^&*()`.<br>3. Click "Create".                  | Record saves successfully; the special-character Name is preserved exactly as typed in the list. `name` input has `maxlength=200`.                                                              |

## Notes for whoever picks this up next

All of the following were confirmed live against dev on 2026-10-06, nothing assumed:

- **New records bypass the Draft/review workflow entirely.** The screen clearly has a Draft → Review →
  Approve/Reject/Make-active workflow (a "Masters needing review" panel with 7 real seeded Draft rows,
  each offering Review/Reject/Make active), but creating a brand-new Techpack Type via "New Techpack
  Type" → "Create" saves it **directly as `Approved`**, not Draft. Confirmed by watching the tab counts
  change on a real create: All 39→40, **Approved 30→31**, Draft stayed at 7. So the Draft/review
  workflow only applies to whatever pre-existing data was seeded that way (or some other, not-yet-found
  creation path) — don't assume a fresh "Create" test needs to go through Review/Approve.
- **The "Review" button opens the same Edit modal**, just with two extra buttons at the bottom:
  "Reject" and "Approve & make active" (confirmed by opening it on a seeded Draft row, `TECHPACK11`,
  and closing without committing — did not actually reject/approve any seeded data to avoid corrupting
  it). The row-level "Reject"/"Make active" shortcuts in the "Masters needing review" panel were not
  exercised to completion for the same reason; worth doing in a dedicated workflow-focused pass with
  throwaway Draft data once a creation path that actually lands in Draft is found.
- **No way back from Inactive found.** The Edit modal's icon button is *always* labeled/behaves as
  "Deactivate <code>" — even when the record is already Inactive, clicking it again just re-fires the
  same action and toast ("Techpack type deactivated") rather than flipping to "Activate". The "Make
  active" shortcut only appears for Draft rows in the review panel, not for already-Inactive rows found
  via search. **This looks like a real gap/bug**: once a record is deactivated this way, there's no
  found path to reactivate it short of possibly the Draft-specific "Make active" action (untested,
  since our throwaway record was never Draft). Worth flagging to the team rather than re-discovering.
- **Exact toast strings** (read directly from the toast region, not guessed): Create → "Techpack type
  created" (no period), Update → "Techpack type updated" (no period), Deactivate → "Techpack type
  deactivated" (no period), Delete → "Techpack type deleted" (no period), duplicate-code error → "That
  techpack type code already exists." (**with** a period — the one exception). Don't copy-paste
  Departments/Sites' trailing-period convention here.
- **Locators**: Code/Name are real `input[name="code"]`/`input[name="name"]`, not comboboxes, so none
  of the combobox-collision traps from `agent-notes/master-data-module.md` apply here. The "Skip
  demand/forecast validation" control is a Radix checkbox whose underlying `<input type="checkbox">` is
  `aria-hidden` — use `getByRole('checkbox', { name: 'Skip demand/forecast validation' })`, not
  `locator('input[type="checkbox"]')` (the latter times out, intercepted by the dialog overlay).
- **Data prerequisite**: none beyond having at least one existing Techpack Type code to use for the
  duplicate-code negative test (TC:11) — plenty exist already (e.g. `PHOTO`, `PROD`-shaped codes).
- The dev OIDC redirect/"Sign in" gate quirk documented in `agent-notes/master-data-module.md` applies
  here too — a fresh `page.goto()` always lands on the "Welcome to FloorOS" gate first and needs the
  `gotoAuthenticated()`-style sign-in click/wait, even with a valid `storageState`.
- Not yet covered / out of scope for this pass: the Draft→Reject and Draft→Approve&make-active
  workflow outcomes (needs a reliable way to create a genuinely Draft record first), bulk
  select/export-CSV/configure-columns toolbar buttons, and the three layout-mode toggle icons.
