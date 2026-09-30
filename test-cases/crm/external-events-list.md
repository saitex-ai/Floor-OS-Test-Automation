# CRM — External Events List screen (Sprint 3)

- **User Story / Test-case set:** [CRM-Sprint-3-External Events List screen](https://app.clickup.com/t/z941abu9fa)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/22-external-events-list.spec.ts`](../../tests/regression/crm/22-external-events-list.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: The External Events List screen is reachable from the CRM workspace navigation and shows status tabs (All/Planning/To Attend/Attended, plus Not Attending/Elapsed behind an overflow "+2 more" menu) and a free-text search box.
- FR-2: Selecting a status tab filters the grid to events in that status.
- FR-3: The grid supports sortable columns, including an "AI Relevance" column — hidden by default, must be enabled via "Configure columns" before it can be sorted.
- FR-4: Clicking a row opens that event's Details screen.
- FR-5: Free-text search filters the grid live (debounced) against visible row fields (e.g. venue); a query matching nothing shows an empty state instead of erroring.
- FR-6: A decided event (To Attend/Attended) whose schedule has passed keeps its decided status — it does not silently flip to "Elapsed".
- FR-7: The status tab counts are internally consistent: an event can be simultaneously undecided ("Planning") and past its own schedule ("Elapsed"), rendering as compound status "Planning · Elapsed" — such an event counts toward both tabs.

## Test cases

| #    | Test case                                                        | Steps                                                                                                              | Expected result                                                                                                 | ClickUp                                      | Automated | Verified locally |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------| --------------------------------------------- | --------- | ----------------- |
| TC:1 | Navigate to External Events                                       | 1. Open the External Events module from the CRM workspace nav.                                                     | The list screen loads with status tabs and search visible.                                                     | [link](https://app.clickup.com/t/z941abu9fb) | ✅        | ✅ passing        |
| TC:2 | End-to-End User Journey (Planning, Sorting, and Detail View)       | 1. Select the Planning tab.<br>2. Enable and sort by AI Relevance (descending).<br>3. Open the top-scored row.      | The Planning tab filters correctly; AI Relevance sorts; clicking the top row opens its Details screen.         | [link](https://app.clickup.com/t/z941abu9fc) | ✅        | ✅ passing        |
| TC:3 | Combined Status Tabs and Free-Text Search                         | 1. Select the To Attend tab.<br>2. Search a venue keyword present in seed data ("Amsterdam").                       | The grid shows only rows matching both the tab and the keyword.                                                 | [link](https://app.clickup.com/t/z941abu9fd) | ✅        | ✅ passing        |
| TC:4 | Free-Text Search with Non-Existent Criteria                       | 1. Search a keyword with no matches.                                                                                | The table shows an empty state; no crash.                                                                       | [link](https://app.clickup.com/t/z941abu9fe) | ✅        | ✅ passing        |
| TC:5 | Status Preservation for Decided Events Past End Date               | 1. Select the Attended tab.<br>2. Inspect rows whose schedule has already passed.                                   | Decided (Attended) events past their end date keep their decided status, never flip to "Elapsed".              | [link](https://app.clickup.com/t/z941abu9fg) | ✅        | ✅ passing        |
| TC:6 | All Status Tabs Count Validation                                   | 1. Read the count on every status tab (All, Planning, To Attend, Attended, Not Attending, Elapsed).                 | The individual tab counts reconcile with the All tab total (see Notes for the compound-status correction).     | [link](https://app.clickup.com/t/z941abu9fh) | ✅        | ✅ passing        |

All 6 TCs confirmed passing, both sequentially (`--workers=1`) and in Playwright's default parallel mode, against a live `tilt up` local stack (2026-09-25).

## Notes for whoever picks this up next

**Corrections to the original ClickUp text, confirmed directly against the running app:**

- Only 4 of the 6 status tabs render as top-level buttons (All/Planning/To
  Attend/Attended) — Not Attending and Elapsed sit behind a "+2 more"
  overflow menu, not as their own tabs.
- "AI Relevance" (and "Leads") are real, sortable columns but are **hidden
  by default** — they must be toggled on via "Configure columns" before
  TC:2's sort step means anything.
- TC:3's ClickUp text guessed "Paris" as a search keyword; real seed data
  has no Paris venue by that name. Used "Amsterdam" instead (a real
  Kingpins Amsterdam event at "Westergasfabriek, Amsterdam" exists in this
  environment's seed data).
- The live search filter is **debounced** — reading the grid immediately
  after `.fill()` can catch a stale, unfiltered result. `search()` now
  bakes in a settle wait.
- `selectStatusTab()`/`selectOverflowStatusTab()` also bake in a settle
  wait after the click — the grid re-renders with a short delay after a
  tab switch, and reading rows immediately can catch it mid-transition
  (confirmed the hard way while debugging `23-external-event-details.spec.ts`'s
  `findFreshPlanningEvent()`, which shares this page object).

**TC:6 — a genuine business-logic discovery, not a locator bug.** The
naive assumption that the 5 non-"All" status tabs partition the data
cleanly (`planning + toAttend + attended + notAttending + elapsed === all`)
is **false**: an event can be simultaneously undecided ("Planning") and
past its own schedule ("Elapsed"), rendering as a compound status
"Planning · Elapsed" in both the tab counts and the row itself. Such an
event counts toward **both** the Planning tab and the Elapsed tab, so the
naive sum always over-counts by the number of such compound events. The
test computes that overlap directly (re-selecting the Planning tab and
counting rows whose text contains "Elapsed") and asserts
`planning + toAttend + attended + notAttending + elapsed - overlap === all`,
which does reconcile. This is real, confirmed application behavior, not a
test-data quirk — worth flagging to product/dev if the tab counts are
meant to be read as a clean partition anywhere else in the app.

Before trusting a pass/fail from `22-external-events-list.spec.ts` on a
different environment, re-run it against that environment (seed data,
especially the exact venue/keyword TC:3 searches for, may differ) and
update this note the same way `create-contact.md` and `create-customer.md`
were updated after their own first live runs.
