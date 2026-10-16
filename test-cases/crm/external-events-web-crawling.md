# CRM — Build External Events List with Web Crawling (Sprint 5)

- **User Story / Test-case set:** [CRM -Sprint -5 -Build External Events List with Web Crawling](https://app.clickup.com/t/z941abx7f2)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Automated in:** [`tests/regression/crm/33-external-events-web-crawling.spec.ts`](../../tests/regression/crm/33-external-events-web-crawling.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts) (shared with the Sprint 3/4 External Events suites, `externalEventsPage` fixture)

## Functional requirements (derived from the ClickUp TCs and confirmed against dev)

- FR-1: With no search or filter, the list shows every event the user can see: the All tab is active and the grid total ("Showing 1 to 25 of N") equals the All tab count.
- FR-2: Free-text search filters live (debounced), partial and case-insensitive, across Event title, Type and the Schedule/venue text.
- FR-3: The Filters panel (Type and Country dropdowns, explicit Apply) combines with the status tabs. Applied filters show as removable chips, and the status-tab badges re-scope to the filter.
- FR-4: Clicking a column header sorts ascending, and clicking again sorts descending. The sort cycles asc/desc and never goes back to unsorted.
- FR-5: Configure columns lets you hide, show and drag-reorder columns ("Event" is locked first). The layout applies right away and is kept after a refresh.
- FR-6: Three layouts (No split, Vertical split with a list and preview, Horizontal split with a table and preview) keep the search, filters, status tab and row selection when you switch between them.
- FR-7: A search with no matches shows an empty state ("No events found") and the screen does not crash.

## Test cases

| #    | Test case                            | Steps                                                                                                               | Expected result                                                                                               | ClickUp                                      | Automated | Verified on dev |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | --------------- |
| TC:1 | Default List Load                    | 1. Open the list with no search or filter.                                                                          | Screen loads; All tab active; grid total = All count; first page fully populated.                             | [link](https://app.clickup.com/t/z941abx7fj) | ✅        | ✅ passing      |
| TC:2 | Free-Text Search                     | 1. Search a partial, lower-cased fragment of a real event title.<br>2. Search a Type value.<br>3. Clear the search. | Only matching rows remain (total drops); clearing restores the full total.                                    | [link](https://app.clickup.com/t/z941abx7fk) | ✅        | ✅ passing      |
| TC:3 | Filtering by Type and Status         | 1. Attended tab.<br>2. Filters → Type = first row's type → Apply.<br>3. Switch to All.<br>4. Remove the Type chip.  | Rows match both criteria; All tab broadens to type-only; removing the chip restores the totals.               | [link](https://app.clickup.com/t/z941abx7fm) | ✅        | ✅ passing      |
| TC:4 | Column Sorting                       | 1. Click the "Event" header.<br>2. Click it again.                                                                  | Ascending, then descending, re-sorted right away. **BUG:** the sort icon does not show direction (see Notes). | [link](https://app.clickup.com/t/z941abx7fn) | ✅        | ✅ passing      |
| TC:5 | Column Configuration and Persistence | 1. Configure columns.<br>2. Hide Created By, show Leads, drag Schedule above Type → Apply.<br>3. Refresh.           | New layout applies right away and is the same after the refresh. Cleanup: Reset to default.                   | [link](https://app.clickup.com/t/z941abx7fp) | ✅        | ✅ passing      |
| TC:6 | Alternate List Layout Switching      | 1. Attended tab + Type filter + search + tick a row.<br>2. Vertical split → Horizontal split → No split.            | Layout changes; search, filter chip, tab, total and the ticked row are kept in every layout.                  | [link](https://app.clickup.com/t/z941abx7fr) | ✅        | ✅ passing      |
| TC:7 | Search with Zero Matching Results    | 1. Search `XYZ-999-NOT-REAL`.<br>2. Clear it.                                                                       | "No events found" empty state, 0 rows, no page errors; clearing restores the list.                            | [link](https://app.clickup.com/t/z941abx7g7) | ✅        | ✅ passing      |

All 7 pass against dev (`TEST_ENV=dev`, `--workers=1`, 2026-10-15).

## Notes for whoever picks this up next

**Corrections to the ClickUp text, checked directly against dev:**

- The ClickUp examples do not exist in this app. There is no "Webinar" type: the real types are Exhibition, Fashion Show, Other, Sales Summit and Trade Fair. There is no "Scheduled" status: status filtering is the status tabs. There is no "Start Date" column: it is "Schedule". The tests read real values from the live grid, so they do not depend on seed content.
- Search does **not** match an event's id ("reference ID" in TC:2), Status or Created By. It only matches title, type and schedule/venue text.
- The "Schedule" column is already the default ascending order, so its first click shows no visible change. TC:4 uses "Event" to show the asc → desc toggle clearly.
- The empty-state copy is generic: "No events found" / "Try removing a filter or clearing them all." It is not search-specific like the ClickUp example, but it is a clear, friendly empty state.

**Sort indicator (TC:4): not a bug.** The header shows the same two-headed `arrow-up-down` icon for ascending and descending, only highlighted when active. The team accepted this as-is (2026-10-15); the test checks that the rows are sorted correctly in both directions.

**Persistence is per browser, not per user.** Column visibility and order, sort and layout are all stored in `localStorage["crm-events-list-prefs-v1"]`. Nothing is saved on the server. As a result:

- Refreshing keeps them (TC:5 checks this). Logging out and back in **in the same browser** should keep them too, unless logout clears localStorage. That path is not automated: a real logout/login here would invalidate the shared `.auth` session that other specs use.
- A different browser or device starts from defaults. If product meant "per user", this is a gap.
- Each Playwright test gets a fresh browser context, so these preferences never leak between tests or suites. TC:5 and TC:6 still restore defaults at the end ("Reset to default" / "No split").

**Locator traps:**

- The Filters toggle is renamed "Filters (1 applied)" once a filter is active.
- Two buttons are named "Type": the Filters panel dropdown and the Type column's sort button. Only the dropdown has `aria-expanded` (`filterTypeButton`).
- Drag-and-drop in the Columns dialog needs a real pointer sequence (a small move to start the drag, then travel) plus a short settle before Apply. Clicking Apply mid-animation left the dialog open.
