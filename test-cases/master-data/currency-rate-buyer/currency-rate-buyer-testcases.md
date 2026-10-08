# Master Data — Currency Rate Buyer

The "Currency Rate Buyer" screen under Master Data > System Management
(`/master-data/system-management/currency-rate-buyer`). Holds
customer-specific FX rate overrides ("Customer-specific FX rates. Override
the global currency rate for a given buyer.", per the screen's own
subtitle) — the per-customer counterpart to the global Currency Rate
screen. No automation or documentation exists for this module yet, so
this file uses the simple 4-column format (no ClickUp/Automated/Verified
columns).

**Important, confirmed live:** same as Currency Rate, this screen is
**read-only** for the seeded `master-data` test user — no "New"/"Add"
button on either tab, and a direct `page.goto('/master-data/system-management/currency-rate-buyer/new')`
returns the app's own "Not Found" page. **Correction (automation pass,
2026-10-06):** an earlier pass of this file claimed no buyer-specific
override data was seeded anywhere in dev — that was wrong, just an
unlucky choice of test customers. **Customer "ACME Apparel" (code
`CTC0000002`) has 13 real seeded buyer-rate-override rows** (5 currencies
× 3 effective dates: 5/1/2026, 3/1/2026, 1/1/2026), confirmed live. Use
ACME Apparel as the known-good positive-path customer for Load tests; a
fresh `AutoTest_Customer_*`/`PW ...`-prefixed throwaway customer will
correctly hit the empty state instead, since those have no overrides.

| #     | Test case                                                                  | Steps                                                                                                                                                                         | Expected result                                                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | Verify screen layout and both tabs load                                   | 1. Navigate to Master Data > System Management > Currency Rate Buyer.                                                                                                        | Heading "Currency Rate Buyer" and subtitle "Customer-specific FX rates. Override the global currency rate for a given buyer." are shown. Two tabs: "Rate Details" (default) and "Currency Rate List". |
| TC:2  | Verify no Create/New entry point exists for this role                     | 1. Inspect all visible buttons/icons on both tabs.<br>2. Try navigating directly to `/master-data/system-management/currency-rate-buyer/new`.                                | No "New"/"Add" button exists on either tab; the direct `/new` URL renders the generic "Not Found" page. |
| TC:3  | Verify "Rate Details" tab requires three fields, not two                  | 1. Open "Rate Details".<br>2. Observe the filter bar.                                                                                                                         | Three required fields are shown (all marked `*`): **To Currency**, **Effective Date**, and **Customer** — one more than the plain Currency Rate screen's two, since a buyer-rate lookup is always scoped to a specific customer. |
| TC:4  | Verify "Load" stays disabled until Customer is also picked                | 1. Pick "To Currency" = USD and leave "Effective Date" at today.<br>2. Leave "Customer" unpicked.<br>3. Observe "Load".                                                      | "Load" remains disabled with only 2 of 3 required fields filled — confirmed Customer is enforced as a real third required filter, not decorative. |
| TC:5  | Verify the Customer picker is the shared searchable "Select Customer" dialog | 1. Click the "Click to pick a customer..." field.                                                                                                                             | A "Select Customer" dialog opens showing a paginated grid (1009 customers, 21 pages) with a top search box "Search by code, name, prefix, country, or email...", filterable per-column — the same component used by Customer Percentage's "Add Row" dialog. |
| TC:6  | Verify Load with all 3 fields filled but no override data seeded for that customer | 1. Pick To Currency = USD, Effective Date = today, and a fresh throwaway/AutoTest Customer (no overrides seeded).<br>2. Click "Load".                                         | Grid shows the empty state with the exact text "No buyer rates found for the picked Customer / To Currency / Effective Date." |
| TC:6b | Verify Load with all 3 fields filled returns real rows for a customer that HAS seeded overrides | 1. Pick To Currency = USD, Effective Date = today (or any date on/after 5/1/2026), and Customer = "ACME Apparel" (`CTC0000002`).<br>2. Click "Load".                          | Grid returns real buyer-override rows (confirmed live: 5 From Currencies × latest effective date ≤ picked date) with non-empty Rate/Mult-Div/Reciprocal values — proves the positive Load path, not just the empty-state path. |
| TC:7  | Verify "Currency Rate List" tab is gated behind picking a Customer first  | 1. Without having picked a Customer in "Rate Details", switch directly to "Currency Rate List".                                                                              | The filter bar's "Customer" field shows placeholder "Pick a customer in Rate Details first" and is `readonly` (blocks typing, but is NOT a real HTML `disabled` attribute — confirmed via automation: `toBeDisabled()` fails against it, `readonly` is the accurate check), and the grid shows "Pick a customer in the Rate Details tab to load buyer rates here." / "Records will appear here once they are added." |
| TC:8  | Verify toolbar icons (Export CSV etc.) are absent even once real data is loaded | 1. Load ACME Apparel's buyer rates (TC:6b), confirming real rows exist.<br>2. Switch to "Currency Rate List" and inspect the toolbar area above its grid.                        | No Filters/Export CSV/Configure columns/Toggle cell filters/Best-fit columns icons are rendered at all on this tab — **confirmed absent even with 13 real rows loaded**, not merely hidden in the pre-filter empty state. Genuine, permanent difference from the plain Currency Rate screen's "Currency Rate Details" tab, which always shows this toolbar. |
| TC:9  | Verify "Currency Rate List" tab's extra filters once a Customer is loaded | 1. Load ACME Apparel in "Rate Details" (TC:6b).<br>2. Switch to "Currency Rate List".                                                                                          | The filter bar now shows Customer (pre-filled "CTC0000002 — ACME Apparel"), From Currency, From Date, To Currency, To Date, Clear, Refresh — one more filter dimension than the plain Currency Rate screen's "Currency Rate Details" tab. The grid itself shows all 13 of ACME's seeded rows (no date/currency filter applied yet). |
| TC:10 | Verify tab naming is NOT identical to the plain Currency Rate screen's second tab | 1. Compare this screen's second tab label with Currency Rate's second tab label.                                                                                             | This screen's second tab is "**Currency Rate List**", not "Currency Rate Details" (the label used on the plain Currency Rate screen) — a genuine per-screen naming inconsistency, not a typo on either side; don't assume shared copy across the two screens. |
| TC:11 | Verify the "Clear" button on "Rate Details" resets all three filters      | 1. Fill To Currency, Effective Date, and Customer.<br>2. Click "Clear".                                                                                                       | All three fields reset to their empty/placeholder state ("Pick a currency...", default date, "Click to pick a customer...") and the grid returns to the pre-Load empty state. |
| TC:12 | Verify Customer search inside the picker narrows results                 | 1. Open the Customer picker.<br>2. Type a known customer's name fragment into the top search box.                                                                             | The 1009-row grid filters down to matching customers only, confirming the search box (distinct from the per-column header filters) works across code/name/prefix/country/email as labelled. |

## Notes for whoever picks this up next

**Read-only for this role, same as Currency Rate** — confirmed the same way:
no Add/New button on either tab, and a direct `/new` route 404s to the
shell's generic "Not Found" page. If a future role turns out to have write
access, re-verify and add Create/Edit/Delete cases — don't assume this file
is complete forever.

**One more required filter than Currency Rate, confirmed live:** "Rate
Details" here needs **To Currency + Effective Date + Customer** (3 fields,
all marked `*`), vs. plain Currency Rate's 2 fields. "Load" stays disabled
until all three are filled.

**Buyer-specific override data IS seeded in dev — for specific customers
only, confirmed live.** "ACME Apparel" (`CTC0000002`) has 13 real rows
(INR/JPY/EUR/GBP/USD × 5/1/2026, 3/1/2026, 1/1/2026). Fresh/throwaway
customers (e.g. `AutoTest_Customer_*`) have none, correctly hitting the
empty state. Use ACME Apparel for positive-path Load tests and a fresh
throwaway customer for empty-state tests — don't assume either shape
applies universally without picking the right customer first.

**Customer picker reuses the same "Select Customer" dialog component as
Customer Percentage's "Add Row"** (1009 customers, 21 pages, same column
set: Customer Code/Prefix ID/Customer Name/Country ID/Address.../Active
Flag/...). Worth building one shared page-object helper for "pick a
customer via the Select Customer dialog" rather than duplicating it per
module, since it appears on at least these two screens.

**Genuine UI inconsistency vs. Currency Rate's naming**, confirmed live:
this screen's second tab is "Currency Rate List", not "Currency Rate
Details" — same general shape (a full grid with From/To Currency and date
filters) but a different label. Flag this if asked to standardize copy
across the two screens; it doesn't look like a typo, just inconsistent
naming per-screen (same pattern as Departments "New department" vs.
Employees "New Employee" documented in `agent-notes/master-data-module.md`).

**Locator note:** unlike plain Currency Rate, this screen's two tab names
("Rate Details" / "Currency Rate List") don't share a substring collision,
so `exact: true` isn't strictly required here — but use it anyway for
consistency with the Currency Rate screen's own locators.

**Not covered in this pass:** Export CSV / column sort / column config on
the "Currency Rate List" tab remain untested beyond confirming the icons
don't exist at all (TC:8) — there's nothing to click. Whether any
customer besides ACME Apparel has seeded overrides wasn't exhaustively
checked.
