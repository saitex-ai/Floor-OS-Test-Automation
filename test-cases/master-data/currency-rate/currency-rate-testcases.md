# Master Data — Currency Rate

The "Currency Rate" screen under Master Data > System Management
(`/master-data/system-management/currency-rate`). Holds the global FX
reference rates between currency pairs ("Used by all tenants as the
default conversion rate", per the screen's own subtitle). No automation
or documentation exists for this module yet, so this file uses the simple
4-column format (no ClickUp/Automated/Verified columns).

**Important, confirmed live:** for the seeded `master-data` test user
(Alice Planner, Admin role), this screen is **read-only** — there is no
"New"/"Add" button anywhere on either tab, no row-level edit/delete
affordance, and a direct `page.goto('/master-data/system-management/currency-rate/new')`
returns the app's own "Not Found" page. The test cases below therefore
cover the List/Filter/Load/Export behavior that genuinely exists, not a
CRUD flow — do not write Create/Edit/Delete cases for this screen without
re-confirming against a different role first (see Notes).

| #     | Test case                                                                 | Steps                                                                                                                                                                       | Expected result                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify screen layout and both tabs load                                  | 1. Navigate to Master Data > System Management > Currency Rate.                                                                                                             | Heading "Currency Rate" and subtitle "Global FX reference rates between currency pairs. Used by all tenants as the default conversion rate." are shown. Two tabs are present: "Rate Details" (selected by default) and "Currency Rate Details". |
| TC:2  | Verify no Create/New entry point exists for this role                    | 1. On either tab, inspect all visible buttons/icons.<br>2. Additionally try navigating directly to `/master-data/system-management/currency-rate/new`.                      | No "New"/"Add" button exists on either tab; the direct `/new` URL renders the app's generic "Not Found" page, not a create form. |
| TC:3  | Verify "Rate Details" tab's Load button is disabled until both required filters are filled | 1. Open the "Rate Details" tab.<br>2. Leave "To Currency" and "Effective Date" at their defaults (currency unset, date defaults to today).<br>3. Observe the "Load" button. | "Load" is rendered disabled (not clickable) because "To Currency" is required and unset — confirmed by Playwright reporting the element as `disabled`, not merely unfocused. |
| TC:4  | Verify "Rate Details" tab — Load with a currency that has a seeded rate on/before today | 1. Select "To Currency" = USD.<br>2. Leave "Effective Date" at today's date (a date **after** the latest seeded rate date).<br>3. Click "Load".                             | "Load" becomes enabled once To Currency is picked. The grid returns one row per From Currency (CNY, EUR, GBP, HKD, INR, JPY, KRW, SGD, VND), each showing the **latest rate effective on or before** the picked date (5/1/2026 in the seeded data) — not an exact-date match. This confirms the Effective Date filter is an "as of" lookup, not a strict equality filter. |
| TC:5  | Verify "Rate Details" tab — Load with a date before any seeded rate      | 1. Select "To Currency" = USD.<br>2. Set "Effective Date" to a date well before any seeded rate (e.g. Dec 1, 2020).<br>3. Click "Load".                                     | Grid shows the empty state with the exact text "No rates found for the picked To Currency / Effective Date." |
| TC:6  | Verify "Currency Rate Details" tab shows the full rate list              | 1. Switch to the "Currency Rate Details" tab.                                                                                                                                | A filter bar (From Currency, To Currency, From Date, To Date, Clear, Refresh) and a data grid load, with columns From Currency, Effective Date, Rate, Mult/Div, Reciprocal, showing all seeded currency-pair rows (e.g. CNY→USD, EUR→INR, EUR→USD, GBP→INR, GBP→USD, all dated 5/1/2026). |
| TC:7  | Verify column sort on "Currency Rate Details" tab                        | 1. On the "Currency Rate Details" tab, click the "Rate" column header's sort control.                                                                                        | Rows re-order by Rate ascending, then descending on a second click — confirmed via the sort icon's `↑↓` toggle state. |
| TC:8  | Verify Export CSV on "Currency Rate Details" tab                         | 1. On the "Currency Rate Details" tab, click the "Export CSV" toolbar icon.                                                                                                  | A file download is triggered with suggested filename **`currency-rates.csv`** — confirmed live via Playwright's `download` event. |
| TC:9  | Verify "Configure columns" panel lists exactly the 6 real columns        | 1. Click the "Configure columns" toolbar icon.                                                                                                                               | A "Columns" panel opens listing exactly From Currency, To Currency, Effective Date, Mult/Div, Rate, Reciprocal (6/6) with Show all/Hide all/Reset to default/Apply controls — no hidden Actions or edit column exists. |
| TC:10 | Verify Clear button resets the "Currency Rate Details" filter bar        | 1. Set a From Currency and a From Date filter.<br>2. Click "Clear".                                                                                                           | All four filter fields (From/To Currency, From/To Date) reset to their "All ..." / empty placeholders and the grid reloads unfiltered. |
| TC:11 | Verify tab accessible-name locator trap                                  | 1. Attempt to locate the "Rate Details" tab with a substring-matching accessible-name query.                                                                                 | `getByRole('tab', { name: 'Rate Details' })` (default substring match) matches **both** tabs, because "Currency Rate Details" also contains the substring "Rate Details" — a strict-mode violation. Every tab locator on this screen needs `exact: true`. |
| TC:12 | Verify "Rate Details" tab date picker boundaries are otherwise unrestricted | 1. Open the Effective Date calendar.<br>2. Navigate back several years (e.g. to December 2020) and pick a day.                                                               | The date picker allows navigating to arbitrary past dates with no apparent minimum-date restriction; the chosen date is accepted and Load runs normally (returning the "No rates found..." empty state from TC:5, not a validation error). |

## Notes for whoever picks this up next

**This screen is read-only for the `master-data` seeded test user.** Confirmed
live, not assumed: neither tab exposes a "New"/"Add Row" button (contrast with
Customer Percentage's "Add Row" in the same System Management group), no row
in the "Currency Rate Details" grid responds to click/double-click with an
edit affordance, and `page.goto()` straight to `/currency-rate/new` renders
the shell's generic "Not Found" page rather than a 403/permission screen —
so this isn't a permissions wall on an otherwise-real route, the route simply
doesn't exist for this screen. If a future role turns out to have write
access (e.g. a global/platform-admin role distinct from this tenant's
`master-data` user), re-verify and add Create/Edit/Delete cases then — don't
assume this file is complete forever.

**Two tabs, two different filter shapes, confirmed live:**
- **"Rate Details"** — a single-row lookup: pick **To Currency** (required,
  plain Radix combobox, options CNY/EUR/GBP/HKD/INR/JPY/KRW/SGD/USD/VND) and
  **Effective Date** (required, defaults to today), then click "Load". This
  is an "as of" lookup, not an exact-date filter — see TC:4. "Load" is
  rendered `disabled` until both fields are filled (not just inert on
  click), which is worth asserting directly rather than clicking-and-
  checking-for-an-error.
- **"Currency Rate Details"** — a normal filterable/sortable/exportable grid
  (From Currency, To Currency, From Date, To Date filters; Filters/Export
  CSV/Toggle cell filters/Configure columns/Best-fit columns/Expand
  toolbar) showing every seeded row at once. Same general toolbar shape as
  Departments/Sites/Employees' list screens (see
  `agent-notes/master-data-module.md`), confirming this is a shared grid
  component across Master Data.

**Locator trap, confirmed live:** `getByRole('tab', { name: 'Rate Details' })`
without `exact: true` matches both tabs (strict-mode violation), because
"Currency Rate Details" contains "Rate Details" as a substring. Same shape
of trap as the combobox accessible-name collisions documented in
`agent-notes/master-data-module.md` for Departments — recurring pattern in
this app, now confirmed on tab names too, not just comboboxes.

**Exact strings confirmed live (not assumed):**
- Empty-state text on "Rate Details" before any Load: "Pick a To Currency
  and Effective Date, then click Load." / "Records will appear here once
  they are added."
- Empty-state text after a Load with no matching rate: "No rates found for
  the picked To Currency / Effective Date."
- Export CSV filename on the "Currency Rate Details" tab: `currency-rates.csv`.

**Not covered in this pass:** whether a different (non-`master-data`) role
has write access to this screen; behavior of the "Filters" rule-builder
icon (only the simple filter bar was exercised); the "Toggle cell filters"
and "Best-fit columns" icons (present but not functionally exercised);
pagination behavior beyond the single page of ~9 seeded rows currently in
dev.
