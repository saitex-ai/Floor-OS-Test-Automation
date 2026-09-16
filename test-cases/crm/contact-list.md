# CRM — Contact List (Sprint 1)

- **Test-case set:** [CRM - Sprint 1 - Contact list screen](https://app.clickup.com/t/90181912927/86eyr7a7w)
- **Source:** ClickUp, read-only import
- **Automated in:** [`tests/crm/contact-list.spec.ts`](../../tests/crm/contact-list.spec.ts)
- **Page object:** [`src/pages/crm/contact-list.page.ts`](../../src/pages/crm/contact-list.page.ts)

| #     | Test case                                                             | Steps                                              | Expected result                                               | ClickUp                                                  | Automated                                                            |
| ----- | --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| TC:1  | Verify default Contact List screen loading and data display           | Open Contact List.                                 | The list loads with contact data and the expected controls.   | [link](https://app.clickup.com/t/90181912927/86eyr7c2g)  | ✅                                                                   |
| TC:2  | Verify search by linked Customer name                                 | Search using a linked Customer name.               | Matching contacts are displayed.                              | [link](https://app.clickup.com/t/90181912927/z941abt524) | ⚠️ blocked — no seed data                                            |
| TC:3  | Verify search by Contact key identifying fields                       | Search by supported identifying fields.            | Matching contacts are displayed accurately.                   | [link](https://app.clickup.com/t/90181912927/z941abt525) | ⚠️ blocked — no seed data                                            |
| TC:4  | Verify filtering by Linked and Unlinked status tabs                   | Switch between Linked and Unlinked tabs.           | Only contacts in the selected relationship state are shown.   | [link](https://app.clickup.com/t/90181912927/z941abt526) | ✅ (tab-switching only — see notes)                                  |
| TC:5  | Verify filtering by active/inactive status and custom attribute rules | Apply status and custom-attribute filters.         | Results match all selected rules.                             | [link](https://app.clickup.com/t/90181912927/z941abt527) | ✅ (controls only — see notes)                                       |
| TC:6  | Verify column sorting and session persistence                         | Sort a column, leave and return to the list.       | Sort order is applied and persists for the session.           | [link](https://app.clickup.com/t/90181912927/z941abt528) | ✅ (click only — see notes)                                          |
| TC:7  | Verify column customization and cross-session persistence             | Hide or reorder columns, then start a new session. | The chosen column configuration is retained.                  | [link](https://app.clickup.com/t/90181912927/z941abt529) | ✅                                                                   |
| TC:8  | Verify alternate list layouts                                         | Switch between Table, Split, and Stacked layouts.  | Each layout renders correctly and preserves the data context. | [link](https://app.clickup.com/t/90181912927/z941abt52b) | ✅                                                                   |
| TC:9  | Verify row selection navigates to Contact Details                     | Select a contact row.                              | The Contact Details screen opens for that contact.            | [link](https://app.clickup.com/t/90181912927/z941abt52h) | ⚠️ blocked — no seed data                                            |
| TC:10 | Verify linked Customer navigation                                     | Select a linked Customer from a contact row.       | The Customer Details screen opens for that Customer.          | [link](https://app.clickup.com/t/90181912927/z941abt52j) | ⚠️ blocked — no seed data                                            |
| TC:11 | Verify inline editing on Contact Details                              | Edit supported contact fields inline.              | Changes validate and save successfully.                       | [link](https://app.clickup.com/t/90181912927/z941abt52k) | ⏭️ skipped — needs a Contact Details page object (doesn't exist yet) |
| TC:12 | Verify permanent "+ Create Contact" action                            | Use the Create Contact action from the list.       | The Create Contact flow opens from the list.                  | [link](https://app.clickup.com/t/90181912927/z941abt52m) | ✅                                                                   |

## Notes for whoever picks this up next

**Confirmed on 2026-09-16, both local and dev: zero contacts exist**
("All 0" / "Linked 0" / "Unlinked 0" on both environments). Everything
that needs a real row — search matches (TC:2, TC:3), row-click navigation
(TC:9), linked-Customer navigation (TC:10), and by extension inline
editing (TC:11, which needs to reach Contact Details via a real row
first) — is blocked on seed data, not a code issue. The interaction code
(`searchFor`, `selectContactRow`, `selectLinkedCustomer`) is written
against the real DOM structure but untested against actual results.

Two things confirmed non-obvious while building this:

- The layout switcher's real labels are **"No split" / "Vertical split" /
  "Horizontal split"** — not "Table / Split / Stacked" as this doc's
  steps loosely describe them (kept the original ClickUp wording above;
  the page object and spec use the real labels).
- The "Contact Name" column header has **no `aria-sort` attribute at
  all** (not even `"none"`) — this table doesn't expose sort state via
  ARIA. TC:6 currently only confirms the sort control is clickable and
  the page survives a reload; verifying sort order actually persists
  needs both real rows and a confirmed way to read the sort state back
  (a `data-*` attribute, localStorage key, or visible icon are the
  likely candidates — check with the frontend team once there's data).
- TC:7 (column hide + reload persistence) **did** verify cleanly — hiding
  the Phone column and reloading kept it hidden.
