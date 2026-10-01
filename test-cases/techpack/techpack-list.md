# Techpack — Techpacks List

- **User Story:** As a Techpack user, I want to see all techpacks in one sortable, filterable
  list — by status, code, customer, or season — so I can find and open the record I need
  without scanning the whole catalogue.
- **Test-case set:** not yet created in ClickUp (no ClickUp task exists for this story at time of
  writing — the "ClickUp" column below is left blank rather than filled with placeholder links).
- **Automated in:** [`tests/regression/techpack/01-techpack-list.spec.ts`](../../tests/regression/techpack/01-techpack-list.spec.ts)
- **Page object:** [`src/pages/techpack/techpack.page.ts`](../../src/pages/techpack/techpack.page.ts)

Per team direction, Techpack test cases are authored and primarily verified against
**dev.flooros.app** (`npm run test:techpack:dev`) — but every spec here is written to pass on
**both** dev and the local `tilt up` stack, and both are checked before a feature area is
considered done. Where a test genuinely can't run the same way on both (e.g. a real data-seeding
gap), it skips with a clear reason on the environment that can't support it, rather than failing
outright or faking a pass — see the notes below and in `create-techpack-classic.md`.

**Real UAT run, 2026-09-25 (`TEST_ENV=uat npm run test:techpack -- --workers=1`)** — per-TC
ledger, not an aggregate: **TC:1-9, 11-16, 18 all pass** (16/18). **TC:10 fails** — root-caused to
a real UAT-specific data gap (the "Techpack Type" master-data list is completely empty on uat,
blocking the fresh-techpack-creation step this case depends on; confirmed NOT a universal bug —
the identical flow passes cleanly on dev — see the Techpack QA's environment note' "Techpack Type
master data is completely empty" section for the full cross-environment evidence). **TC:17 skips**
(data-dependent — needs both a Draft and an Open/Approved row present at run time). Not yet run
against dev/local this pass (existing 2026-09-08 marks for those still stand as history).

| #     | Test case                                                                                                            | Steps                                                                                                                                                                                                      | Expected result                                                                                                                                                                                                                                                                                                                                                                                                                                 | ClickUp                                            | Automated | Verified (uat)                                                                                                                                                                                                                                     | Verified (dev)                                             | Verified (local)        |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| TC:1  | Verify the Techpacks list loads with status tabs and a data grid                                                     | 1. Navigate to the Techpack module.                                                                                                                                                                        | The "TechPacks" heading, the All/Draft/Open/Approved status tabs (each showing a live count), and the data grid are visible.                                                                                                                                                                                                                                                                                                                    | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08, pre-2026-09-25 UI changes)         | ✅ passing (2026-09-08) |
| TC:2  | Verify the "All" tab count equals Draft + Open + Approved                                                            | 1. Read the count on each of the four status tabs.                                                                                                                                                         | All's count equals the sum of Draft, Open, and Approved.                                                                                                                                                                                                                                                                                                                                                                                        | —                                                  | ✅        | ✅ pass (2026-09-29, re-run clean — see notes on the 2026-09-25 spot-check)                                                                                                                                                                        | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:3  | Verify selecting the "Open" status tab filters the grid                                                              | 1. Click the "Open" tab.                                                                                                                                                                                   | Only rows with Status = "Open" are shown; the tab shows as selected (pressed).                                                                                                                                                                                                                                                                                                                                                                  | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:4  | Verify selecting the "Approved" status tab filters the grid                                                          | 1. Click the "Approved" tab.                                                                                                                                                                               | Only rows with Status = "Approved" are shown; the tab shows as selected.                                                                                                                                                                                                                                                                                                                                                                        | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:5  | Verify searching by Techpack Code narrows the grid                                                                   | 1. Type an existing techpack's exact code into the Search box.                                                                                                                                             | The grid narrows to just that row (or rows sharing that code across revisions). Note: a Draft-status code looks like `DRAFT/<ULID>`, an Open/Approved code looks like `TP<YYYYMM>-<seq>` — see notes, pick a real code of either shape live rather than assuming one format.                                                                                                                                                                    | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08, code-format note added 2026-09-25) | ✅ passing (2026-09-08) |
| TC:6  | Verify searching for a non-existent code returns no rows                                                             | 1. Type a code that does not exist into the Search box.                                                                                                                                                    | The grid shows zero rows (no error, no stale rows left over).                                                                                                                                                                                                                                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:7  | Verify the "New Techpack" button's default action opens AI Mode                                                      | 1. Click the main "New Techpack" button (not the chevron).                                                                                                                                                 | Navigates to `/techpacks/new/copilot` — the "Saitex AI" copilot, now showing a 4-step Progress stepper (Upload/Review details/Extract/Open draft) and a direct "Use the manual form" link to Classic, asking to upload a PDF/Excel techpack file (prompt copy now explicitly mentions "design, BOM, POM, anything else" — see notes).                                                                                                           | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08, UI details updated 2026-09-25)     | ✅ passing (2026-09-08) |
| TC:8  | Verify the "New Techpack" dropdown offers both AI Mode and Classic                                                   | 1. Click the chevron next to "New Techpack".                                                                                                                                                               | A menu opens with two options: "AI Mode — Guided by Saitex AI Assistant" and "Classic — Fill in a form manually". Reconfirmed live 2026-09-25 on uat, unchanged.                                                                                                                                                                                                                                                                                | —                                                  | ✅        | ✅ passing (2026-09-25)                                                                                                                                                                                                                            | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:9  | Verify choosing "Classic" from the dropdown opens the manual form                                                    | 1. Click the chevron next to "New Techpack".<br>2. Click "Classic".                                                                                                                                        | Navigates to `/techpacks/new` — the manual Identification/Production/Lifecycle/Operations/Documents form. Reconfirmed structurally unchanged live 2026-09-25 on uat (full `ariaSnapshot()` dump).                                                                                                                                                                                                                                               | —                                                  | ✅        | ✅ passing (2026-09-25)                                                                                                                                                                                                                            | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:10 | Verify opening a techpack row from the list navigates to its canvas                                                  | 1. Create a fresh techpack (setup, via the Classic form).<br>2. Search for it by its real Techpack Code.<br>3. Click its row.                                                                              | Navigates to the techpack's detail/canvas view and it loads cleanly (not stuck on "Opening canvas…", no "Could not load techpack").                                                                                                                                                                                                                                                                                                             | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:11 | Verify the Filters panel's rule builder                                                                              | 1. Click the "Filters" toolbar button.<br>2. Click "+ Add rule".                                                                                                                                           | An inline panel opens ("Filters" / "Rules" / a live "N techpack match" count / "Apply"); "Add rule" reveals an Attribute/operator ("contains")/Value rule row with a delete icon.                                                                                                                                                                                                                                                               | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:12 | Verify "Toggle cell filters" reveals per-column inline filter inputs                                                 | 1. Click the "Toggle cell filters" toolbar button.                                                                                                                                                         | A row of per-column text inputs appears directly under the column headers (e.g. "Filter Techpack Code", "Filter Status Name", ...). Typing into one narrows the grid to matching rows.                                                                                                                                                                                                                                                          | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:13 | Verify Configure columns can hide and re-show a column                                                               | 1. Click "Configure columns".<br>2. Uncheck a non-locked column (e.g. "Rev No") and click "Apply".<br>3. Reopen and re-check it, click "Apply" again.                                                      | The column disappears from the grid header after step 2, and reappears after step 3. "Techpack Code" itself is locked and can't be unchecked.                                                                                                                                                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:14 | Verify the 3 layout modes change the grid's structure                                                                | 1. Click "Vertical split".<br>2. Click "Horizontal split".<br>3. Click "No split".                                                                                                                         | Vertical split shows a two-pane master/detail view (compact record list + a detail panel with an "Open →" button) side by side; Horizontal split shows the same detail panel below the grid instead; No split returns to the plain single grid with no detail panel.                                                                                                                                                                            | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:15 | Verify selecting rows shows a selection bar with "Compare"                                                           | 1. Select one row's checkbox.<br>2. Select a second row's checkbox.<br>3. Click "Clear selection".                                                                                                         | A floating bar shows an "item(s) selected" label and a "Compare" button after each selection (see notes on why the exact count text and Compare's enabled state aren't asserted); "Clear selection" deselects both rows and the bar disappears.                                                                                                                                                                                                 | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:16 | Verify "Export CSV" triggers a real file download                                                                    | 1. Click "Export CSV".                                                                                                                                                                                     | A CSV file download is triggered (suggested filename `techpacks.csv`).                                                                                                                                                                                                                                                                                                                                                                          | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | ✅ passing (2026-09-08)                                    | ✅ passing (2026-09-08) |
| TC:17 | Verify Draft rows use `DRAFT/<code>` format and Open/Approved rows use `TP<YYYYMM>-<seq>` format                     | 1. Read the Techpack Code for a Draft-status row.<br>2. Read it for an Open or Approved row.                                                                                                               | Draft rows show `DRAFT/` followed by a ~13-char code (looks ULID-derived, e.g. `DRAFT/01M2AGAZDJ36`); Open/Approved rows show the older `TP<YYYYMM>-<seq>` sequential format (e.g. `TP202609-000001`). Both formats confirmed live and identically on dev and uat 2026-09-25 — a real, universal app behavior, not an environment quirk (a techpack's code appears to change shape when it transitions from Draft to Open).                     | —                                                  | ✅        | ✅ pass (2026-10-01) — now reads the grid's Mode column (AI → `DRAFT/<code>`, Manual → `TP<YYYYMM>-<seq>`)                                                                                                                                         | 🔲 not yet run                                             | 🔲 not yet run          |
| TC:18 | Verify the current full column set renders (22 headers)                                                              | 1. Read all column headers on the grid.                                                                                                                                                                    | Headers include (order may vary): `Techpack Code, Rev No, Status Name, Techpack Type, Customer Name, Company, Season Name, Style Value Code, Style Value Desc, Fabric Value Code, Fabric Value Desc, Wash Value Code, Wash Value Desc, Product Value Code, Product Value Desc, Remark, Created Date, Creator, Mode, Approved Date, Approver`, plus the row-select column. **Updated 2026-10-01**: `Mode` (AI / Manual) is new since 2026-09-30. | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                               | 🔲 not yet run                                             | 🔲 not yet run          |
| TC:19 | Verify Export CSV's own field values match what the on-screen grid resolves, not raw backend identifiers             | 1. Click "Export CSV".<br>2. Open the downloaded file and compare its Creator/Approver/Customer Name columns against the same rows' on-screen grid values.                                                 | Creator/Approver/Customer Name in the CSV should show the same human-readable values the grid shows (e.g. an email like `alice@floorOS.dev`, a customer name like `SPANX`).                                                                                                                                                                                                                                                                     | [z941abxkuq](https://app.clickup.com/t/z941abxkuq) | ✅        | ❌ **FAIL (2026-09-30, automated, real run)** — Customer Name still reproduces as a raw `CTC0000###` code (real bug, unchanged from 2026-09-29); Creator/Approver did NOT reproduce this run (both matched the grid's "Alice Planner") — see notes | 🔲 not yet run                                             | 🔲 not yet run          |
| TC:20 | Verify switching the shell's language to Vietnamese translates the Techpack module's own chrome, and reverts cleanly | 1. Click the shell header's "Change language" (globe) icon > "Tiếng Việt".<br>2. Inspect the Techpacks list.<br>3. Open a techpack's canvas and inspect its Details panel.<br>4. Switch back to "English". | List heading/status tabs/column headers/search placeholder/"New Techpack" button and the List's own Status values all translate; the canvas translates its labels and status badge. Details-panel **values** (e.g. Status "Open", Lock Status "UNLOCKED") stay in English by design — they come from master data (confirmed with the dev team 2026-10-01). Switching back to English reverts every string.                                      | [z941abxb5r](https://app.clickup.com/t/z941abxb5r) | ✅        | ✅ pass (2026-10-01) — Details values in English are intended, per dev                                                                                                                                                                             | 🔲 not yet run                                             | 🔲 not yet run          |

## Notes for whoever picks this up next

As of 2026-09-07, all 10 cases pass against both dev.flooros.app (`npm run test:techpack:dev`)
and the local stack (`npm run test:techpack`), run one at a time (`--workers=1` — see the
parallelism note below).

**TC:10 was redesigned on 2026-09-07 — read this if the git history shows a much more
complicated version.** The original TC:10 clicked whichever row happened to be first in the
grid, tried up to 10 rows with heavy retry logic, and could take several minutes because
**legacy/seed techpack records intermittently fail to load** (`GET /api/techpacks/{id} -> 404
{"code":"techpack_not_found"}`, or the canvas hangs on "Opening canvas…" indefinitely). The
user's developer confirmed this is a seed-data problem specifically: "any techpack we create can
be opened and viewed." So TC:10 now **creates a fresh techpack first** (reusing
`CreateTechpackPage` from the Create — Classic feature area), then searches the list for it by
its real Techpack Code and clicks that row — genuinely testing "does clicking a row in the list
open its canvas," using guaranteed-good data instead of gambling on which legacy row loads today.
This is both more correct and much faster (under a minute now, vs. up to ~4 minutes before). If
detail-view load failures reappear on genuinely fresh records (not legacy ones), that's a real
regression worth escalating — don't just widen the retry budget again.

**dev.flooros.app is slow to first-render, on a scale the framework's original timeouts didn't
account for.** Two shared, framework-level fixes were needed (not just this file):

- `src/pages/base.page.ts`'s `gotoAuthenticated()` gave the shell's login gate only 5s to appear
  and 20s to clear. On dev that's frequently not enough — bumped to 30s / 45s. This affects every
  module, not just Techpack.
- `playwright.config.ts`'s global `timeout` (30s) and `expect.timeout` (5s) were both tuned for
  the local stack. Bumped to 90s / 15s globally.
- Beyond the shell's own login gate, the Techpack remote itself shows its own "Loading
  Techpacks…" placeholder while its bundle mounts — confirmed via screenshot, this can outlast
  even a 30s wait on a cold browser profile. `TechpackPage.expectLoaded()` gives that specific,
  always-first check 60s.

None of these change behavior for a passing local run (a fast load still resolves as soon as the
condition is true) — they only extend how long a genuinely slow or stuck state gets before
failing.

**Route shape differs between environments.** Local currently routes a clicked row to
`/techpacks/{id}`; dev routes to `/techpacks/canvas/{id}`. Assertions here accept either. Worth
confirming with the team whether this is an intentional version difference (dev running ahead of
local) or something else.

**Run this suite with `--workers=1` against dev.** `fullyParallel: true` plus Playwright's
default worker count (CPU-based, since `workers` is only pinned to 2 under `CI`) launches many
concurrent Chromium instances all hitting dev.flooros.app at once outside CI — that alone was
enough to make 9 of 10 tests fail on pure resource contention, independent of the timeout issue
above. `npm run test:techpack:dev` doesn't pin workers, so pass `-- --workers=1` (or open a
ClickUp/GitHub issue to decide whether the project's default worker count should change) until
this is revisited.

**Config bug fixed in this pass, unrelated to the above:** `src/config/modules.ts` had
`techpack.path: '/techpack'` (singular), which redirects to the App Launcher home, not the
Techpacks list — fixed to `/techpacks` (plural). The pre-existing module smoke test
(`techpack.spec.ts`) was silently pointed at the wrong URL until this fix.

**TC:11-16 added 2026-09-07 — the toolbar's Filters/columns/layout/export/bulk-select controls
were previously catalogued during exploration but never actually turned into test cases, despite
the Techpack QA's working notes wrongly calling this area "fully covered."** The user caught
this by asking directly whether these buttons had been checked. All 6 confirmed passing on both
dev and local as of 2026-09-08 — the List screen is now genuinely, not just apparently, fully
covered. Two real issues surfaced and were fixed along the way (session was briefly paused
mid-debugging by a transient dev-side access-service degradation — see `environment-notes.md` —
that turned out unrelated to 2 of the 3 then-failing cases):

- `columnCheckbox()` originally climbed one ancestor level up from a column's label text to find
  its checkbox, matching all 20 columns' checkboxes at once instead of just one — each checkbox
  actually carries its own unambiguous `aria-label="Toggle <label>"`, used directly instead.
- The layout-mode detail panel's "HEADER" section label visually renders all-caps but is almost
  certainly lowercase text styled with CSS `text-transform: uppercase` (matching its sibling
  labels REVISION/CUSTOMER/SEASON/TYPE/CREATED) — an `exact: true` match on literal uppercase
  "HEADER" found zero DOM matches twice in a row despite the text being clearly visible in the
  failure screenshots each time (the same "visible but zero DOM matches" pattern seen with
  Canvas Review's "Techpack canvas" H1 — worth checking for this class of bug on any other
  visually-uppercase label elsewhere in this app). `detailPanelHeaderLabel()` now matches
  case-insensitively instead.

Findings from live exploration on dev that fed into the test design:

- **"Filters" and "Toggle cell filters" are two distinct controls, easy to confuse.** "Filters"
  (funnel icon) opens an inline rule-builder panel ("Filters" / "Rules" / "+ Add rule" / a live
  "N techpack match" count / "Apply") — clicking "Add rule" reveals an Attribute dropdown, an
  operator dropdown (defaults to "contains"), a Value input, and a delete icon. **"Toggle cell
  filters"** (separate icon, `aria-label="Toggle cell filters"`) is what actually shows a row of
  per-column text inputs directly under the column headers (e.g. "Filter Techpack Code", "Filter
  Status Name") — this is almost certainly what "inline filters" refers to.
- **Configure columns** opens a side panel: a column search box, "Show all"/"Hide all", an "N/N"
  visible count, and a per-column row (checkbox + drag handle + up/down reorder arrows + a "⋮"
  menu). "Techpack Code" is locked ("🔒 locked") and can't be hidden or reordered. Footer has
  "Reset to default" / "Cancel" / "Apply".
- **The 3 layout-mode buttons (No split / Vertical split / Horizontal split) produce genuinely
  different, easily-assertable structures**, not just a visual tweak: No split is the plain
  single grid; Vertical split replaces it with a two-pane view (a compact master list on the left
  — "N RECORDS" + Essential/Detailed toggle — and a detail panel on the right showing the
  selected record's header fields and an "Open →" button); Horizontal split shows that same
  detail panel below the grid instead of beside it.
- **Selecting row checkboxes shows a floating bar** ("N item(s) selected", a "Clear selection"
  button, and a "Compare" button). **Compare stayed disabled with 2 different techpacks
  selected** — it most likely compares revisions of the _same_ techpack (Rev 0 vs Rev 1), not any
  two arbitrary rows, though this wasn't confirmed with real multi-revision data. TC:15
  deliberately doesn't assert when Compare becomes enabled — only that the selection bar and its
  controls appear/disappear correctly — to avoid asserting something not actually verified live.
- **Export CSV triggers a genuine file download** (`suggestedFilename() === 'techpacks.csv'`,
  confirmed via `page.waitForEvent('download')`) — not a fake/no-op button.

## Update 2026-09-25 — UAT added, real UI changes found, regression suite refresh

Per the user's direction: **UAT (`uat.flooros.app`) is now the primary target** (business owners
reported real issues there); the intended workflow is verify UAT first, cross-check dev only if a
case fails, to isolate whether it's UAT-specific or universal. Added a "Verified (uat)" column
above. **None of TC:1-16 have actually been re-run yet this session — this was exploration only**,
confirming the app's current shape via live `ariaSnapshot()` dumps on both dev and uat (not
guessed), not a real test execution pass. Their dev/local "✅ passing" marks are left as an
accurate historical record of 2026-09-08, not re-validated claims for today.

**A real routing bug was found and fixed: `src/config/modules.ts` had `path: '/techpack'`
(singular)** — confirmed live, `gotoAuthenticated('/techpack')` silently lands on the App
Launcher home instead of the Techpacks list. **This is NOT a regression, and this doc's own
"Config bug fixed" note below should not be read as implying one either** — checked via
`git log --follow -p -- src/config/modules.ts` specifically because an earlier draft of this note
called it a "regression that must have reverted," copying another doc's claim at face value; the
real history shows the path has been singular since the very first commit that introduced the
file, never previously plural-then-broken. (This exact wrong-causal-claim mistake was independently
caught via PR review on `pw-hybrid-framework` PR #7 — see the Techpack QA's working note' standing
lesson from it.) Fixed to `/techpacks`. **This would have silently broken every single spec in
this suite** (every one calls `TechpackPage.open()` → `gotoAuthenticated('/techpack')`) — worth
being the first thing checked if every Techpack test ever fails at the same `expectLoaded()` step
again.

**Two real, universal (confirmed on both dev and uat) app changes since 2026-09-08, now reflected
above as TC:17/TC:18 and inline notes on TC:5/TC:7:**

1. Techpack Code format is now status-dependent — `DRAFT/<ULID>` while Draft, the older
   `TP<YYYYMM>-<seq>` once Open/Approved (see TC:17).
2. The list gained a `Company` column and split Style/Fabric/Wash/Product Type into `Value Code`/
   `Value Desc` column pairs (see TC:18) — 21 headers total now.

**One apparent bug turned out to be a false alarm from my own exploration script, not a real
regression — worth recording exactly so it isn't re-investigated for nothing.** An early ad-hoc
locator (`getByRole('button', {name: /^Open/}).first()`) matched the shell banner's own "Open
navigation"/"Open app drawer" buttons before the actual status tab, and read back an empty string
— looked exactly like "the Open tab's live count isn't rendering." Re-checked with the real,
already-scoped `TechpackLocators.openTab` locator directly: 1 match, `"Open\n0"`,
`aria-pressed="false"`, all correct. **Lesson: this app's shell banner has several buttons whose
names start with "Open" — an unscoped `/^Word/` regex against `getByRole('button')` is genuinely
risky here; prefer the framework's own scoped locators over ad-hoc regexes when re-verifying
documented behavior.**

**A real, not-yet-explained discrepancy remains on uat specifically (TC:2's "⚠️" mark above):**
uat's tab counts didn't sum cleanly on a 2026-09-25 spot-check (All 15, Draft 13 + Open 0 +
Approved 1 = 14, one short) — dev's own counts (359 = 125+123+111) summed exactly the same day.
Possibly a real status not surfaced as its own tab (BOM has a documented `Cancelled` state with no
tab — Techpack may have an equivalent), or just uat's very small dataset having one record in an
edge state. Check directly (e.g. "Toggle cell filters" on Status Name) before assuming either a
data anomaly or a genuine product bug.

**A new, dedicated top-level BOM module was found this session — see
the BOM module's own notes.** Not a Techpack sub-section; a real
separate app at `/bom`, referencing Techpack records by code. Out of scope for this specific doc,
mentioned here only because it's the reason this session started digging into the Techpack list at
all.

## Update 2026-09-29 — Full suite re-run for real against uat, 17/18 clean

All 18 cases run for real against uat. 17 pass cleanly (including TC:2's count-sum check, which
this time summed correctly — the 2026-09-25 mismatch note above stands as historical, not
reproduced today). TC:17 alone honestly skips again, same documented reason as before: no
copilot-created (AI-Mode) row happened to be visible in the list at run time to compare code
formats against.

## Update 2026-09-29, continued — Export CSV content correctness (TC:19, new) and a language-switch check (TC:20, new)

Same broader session as `create-techpack-classic.md`'s and `canvas-review.md`'s own matching
"continued" updates — see the Techpack QA's working note' "9 new bugs/clarifications" entry for
the fuller session context. Raw evidence:
local exploration evidence (not committed) +
`2026-09-29-z941abxb3u-techpacks-export.csv` (a real, downloaded 7-row export) for TC:19;
`2026-09-29-item9-vietnamese.spec.ts` + its 3 screenshots for TC:20.

**TC:19 — this doc's existing TC:16 only ever checked that a download fires, never the file's own
contents; this is that missing check, and it found real problems beyond what was already
documented.** the Techpack QA's working notes already flagged Creator/Approver showing raw UUIDs
"inconsistently alongside other rows that DO export correctly" (from an earlier manual sanity
check). This session's own real, 7-row export (ClickUp
[z941abxb3u](https://app.clickup.com/t/z941abxb3u)) shows something slightly different and worth
correcting: **every single one of the 7 rows** has Creator (and Approver, on the one Approved row)
set to the exact same raw backend UUID, `217754ed-5b13-430a-a1fc-b36a32e3f243` — not "inconsistent,"
at least not in this sample. Two further findings, genuinely new, not previously documented
anywhere in this repo:

1. **The "Customer Name" column exports the raw customer _code_, not the resolved name** — every
   row shows a `CTC0000###`-style code (e.g. `CTC0000130`), while the on-screen grid's own
   "Customer Name" column resolves the same records to real names (e.g. "SPANX", confirmed via the
   List screenshot taken the same session). `CTC...` is confirmed to be this app's own customer
   _code_ format, not an alternate name (see the Techpack QA's environment note' "TEST CUSTOMER 1"
   / `CTC0000096` note) — so this is a parallel bug to the Creator/Approver one, on a different
   field, not the same root cause necessarily.
2. **The exported CSV has one column, "Mode" (every sampled row: `MANUAL`), that isn't part of
   the on-screen grid's own 21-header set this doc's TC:18 already enumerated.** The export's
   schema and the grid's configurable-columns schema aren't the same — worth knowing before
   assuming "the CSV is just the visible columns as text."

Not checked: whether Season Name / Style / Fabric / Wash / Product Type values in the export are
genuinely resolved names (they look like plausible real names/codes in the sample, e.g. "SP21",
"BLACK PINTT STRETCH DENIM") or whether the Creator/Approver-style raw-ID bug is really isolated to
just those two fields plus Customer Name — worth a wider check with more/varied rows.

**TC:20 — the Vietnamese-mode ticket (z941abxb5r) says "some strings stay in English"; this
session found one specific, concrete instance of that, not a wholesale translation failure.** The
List screen itself translates thoroughly and correctly (heading "Tài liệu kỹ thuật", tabs "Tất cả/
Bản nháp/Mở/Đã duyệt", column headers, search placeholder, "New Techpack" button all in Vietnamese;
the on-screen Status values in the list — e.g. the "Mở" tab/column value for an Open record — are
themselves translated too). But opening that **same record's own canvas** in the same Vietnamese
session shows its Details panel's "Trạng thái" (Status) **label** translated while the **value**
next to it still reads "Open" in English — a genuine inconsistency within the same session/record,
not just "translation is incomplete" in the abstract. (The canvas's own left-pane inline error,
"Invalid PDF structure.", also stayed in English — lower confidence this counts as a translatable
UI string rather than a raw backend/PDF-parser message, flagging it but not asserting it's a bug.)
Reverting back to English was clean both times this session (confirmed via a final, independent
check in a fresh browser context — no leftover Vietnamese text anywhere). This is a **shared**
`alice` UAT account other suites also use — any future language-switch test must revert before
ending, same as this session's own script did (wrapped in try/finally specifically for that
reason).

## Update 2026-09-30 — TC:19 and TC:20 automated for real, both re-verified live before automating

Per the user's ask: turn the two exploration-only findings above into real `test()` blocks in
`tests/regression/techpack/01-techpack-list.spec.ts`, verified live against uat rather than trusted
blindly from the 2026-09-29 exploration. New page-object support added:
`TechpackPage.rowCellTexts()` (reads a specific row's on-screen cells, matched to the live column
header order by label rather than a hardcoded index) and a new, genuinely shell-level (not
Techpack-specific) `ShellHeaderPage`/`ShellHeaderLocators`
(`src/pages/shell/shell-header.page.ts` / `src/locators/shell/shell-header.locators.ts`) wrapping
the header's "Change language" menu — confirmed live via `ariaSnapshot()` to be a real
`menu "Language"` with `menuitemradio "English"`/`menuitemradio "Tiếng Việt"` options, and that the
button's own accessible name localizes too ("Change language" → "Đổi ngôn ngữ" once already in
Vietnamese mode). No existing shell-chrome page object covered this — only `ShellLoginPage`, which
is pre-auth only — so this is a new file, reusable by any future module's test.

**Live re-verification before automating surfaced 2 real, worth-recording corrections to the
2026-09-29 narrative — neither the doc rows above (now updated) nor the automated assertions
re-assert the stale parts:**

1. **The Creator/Approver raw-backend-UUID bug did NOT reproduce in this session's live re-check —
   a genuine change since 2026-09-29, not assumed.** Two separate full CSV exports (54 and 53 data
   rows) were downloaded and grepped for any UUID-shaped value in the Creator/Approver columns:
   zero matches, every single row showed a real human name ("Alice Planner"). The **Customer
   Name** raw-code bug, by contrast, reproduced on every single row in both exports (`CTC0000###`
   in the CSV vs. the grid's resolved name, e.g. "7 FOR ALL MANKIND"/"PURPLE BRAND"/"EVERLANE") —
   fully confirmed, unchanged. TC:19's automated test reflects this precisely: three separate
   `expect.soft()` checks (Customer Name/Creator/Approver) so each field's real, current result is
   captured on its own rather than one blanket pass/fail — today's real run: Customer Name fails,
   Creator and Approver both pass.
2. **The "Mode" column is no longer CSV-export-only — the on-screen grid now has it too**, confirmed
   via a live `columnheader` count (22 total including the leading checkbox column, i.e. 21 named
   headers now, not the 20 TC:18's own `expected` list still checks for). This directly contradicts
   this doc's own 2026-09-29 note #2 above ("isn't part of the on-screen grid's own 21-header set")
   — that specific discrepancy is resolved (the grid caught up), though the on-screen value ("AI") and
   the CSV value ("AI_UPLOAD") for the same field aren't even textually identical, a minor separate
   nuance not chased further. **TC:18 itself still passes** (its assertion only checks that each of
   its 20 named headers is present via `startsWith`, not an exact total count), but its own doc
   text/expected-list is now one column stale — flagged here for whoever next touches TC:18/that
   test, deliberately not changed as part of this pass (out of scope: only TC:19/TC:20 were
   automated this session).

**TC:20's canvas-side check needed a specific row, not an arbitrary one, to reliably reach the
right canvas shape.** An AI-Mode-created Draft's canvas doesn't expose a plain "Status" field the
same `<li>`-based way a Classic/Manual-created canvas does (see `techpack-module.md`'s own notes on
the two canvases' structurally different right-hand panels) — hit this live as a 30s timeout hunting
for "Trạng thái" on one before switching to picking a row whose "Mode" column reads "Manual"
specifically (scanned up to the first 20 rows on the already-open "Open" tab). Once on the right
canvas shape, the exact 2026-09-29 finding reproduced cleanly and immediately: List's own Status
Name cell for that row correctly read "Mở", the canvas's "Trạng thái" label translated too, but its
value stayed the literal English word "Open" right next to it.

**Real run against uat, 2026-09-30
(`TEST_ENV=uat npx playwright test --project=techpack -g "TC:19|TC:20" tests/regression/techpack/01-techpack-list.spec.ts --workers=1`):**
both TC:19 and TC:20 are genuine, understood, expected Fails — real app bugs, not test defects.
Language was independently confirmed back to English on the shared `alice` uat account immediately
after this run (a fresh, separate check, not just trusting the test's own revert step).
