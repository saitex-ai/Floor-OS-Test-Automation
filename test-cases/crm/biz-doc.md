# CRM — Biz Doc (Sprint 2)

- **User Story:** [Biz Docs](https://app.clickup.com/t/86eye4dtf) — as an Owner, Manager, or Executive, I want to
  access the five Biz Docs — Sample Requests, Tech Packs, Sample Orders,
  Quotes, and Purchase Orders — from the CRM Home screen or the Customer
  Details screen, so that I can view the list of each document type and
  drill down into the details of any individual document. A purely
  read-only viewing journey: no data is created or modified anywhere in
  it.
- **Test-case set:** [CRM - Sprint 2 - Biz Doc](https://app.clickup.com/t/z941abt9c1)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/21-biz-doc.spec.ts`](../../tests/regression/crm/21-biz-doc.spec.ts)
- **Page object:** [`src/pages/crm/biz-doc.page.ts`](../../src/pages/crm/biz-doc.page.ts)

## Functional requirements (from the User Story)

- FR-1: Five Biz Docs icons (Sample Requests, Tech Packs, Sample Orders,
  Quotes, Purchase Orders) on CRM Home and Customer Details screens.
- FR-2–FR-6: Clicking each icon displays that document type's List
  screen with its records (one FR per doc type, same pattern for all
  five).
- FR-7: Clicking a record on any List screen redirects to that record's
  Details screen.
- FR-8: Entry only via SSO → Floor OS → CRM for Owner/Manager/Executive
  roles.

## Test cases

| #    | Test case                                                                                | Steps                                                                                                                                                           | Expected result                                                                                                          | ClickUp                                      | Automated | Verified locally |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------- | ---------------- |
| TC:1 | Verify visibility of five Biz Docs icons on CRM Home and Customer Details screens        | 1. Open CRM Home.<br>2. Assert all five icons are visible.<br>3. Open an existing Customer's Details screen.<br>4. Assert all five icons are visible there too. | All five icons (Sample Requests, Tech Packs, Sample Orders, Quotes, Purchase Orders) are visible on both screens.        | [link](https://app.clickup.com/t/z941abt9cj) | ✅        | ❌ not yet run   |
| TC:2 | Verify navigation from icons to corresponding List screens (CRM Home & Customer Details) | 1. From CRM Home, click each of the five icons in turn.<br>2. Repeat from an existing Customer's Details screen.                                                | Each icon click displays that document type's List screen, from both entry points.                                       | [link](https://app.clickup.com/t/z941abt9cm) | ✅        | ❌ not yet run   |
| TC:3 | Verify record selection and drill-down to Details screen for all Biz Doc types           | 1. Open each doc type's List screen in turn.<br>2. If it has at least one record, click the first record.                                                       | Clicking a record redirects to that record's Details screen. A doc type with zero seeded records is skipped, not failed. | [link](https://app.clickup.com/t/z941abt9cn) | ✅        | ❌ not yet run   |
| TC:4 | Verify read-only nature of Biz Docs viewing journey                                      | 1. Open a doc type's List screen (and its Details screen, if a record exists).<br>2. Assert no Create/Edit/Delete/Save/Update control is present.               | No data-modifying control is exposed anywhere in this journey — viewing only.                                            | [link](https://app.clickup.com/t/z941abt9cq) | ✅        | ❌ not yet run   |
| TC:5 | Verify Role-Based Access Control (RBAC) negative test for unauthorized roles             | 1. Authenticate as a user without the Owner/Manager/Executive role.<br>2. Attempt the Biz Docs journey.                                                         | Access is not granted.                                                                                                   | [link](https://app.clickup.com/t/z941abt9cr) | 🚫 skip   | 🚫 skip          |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** Everything in
`biz-doc.locators.ts` / `biz-doc.page.ts` is a best-guess derived from
this ClickUp text and this framework's established UI patterns
(icon-as-button, ARIA table lists, `role=heading` detail screens), the
same way `log-communication.locators.ts`/`log-communication.page.ts` and
`contacts-tab.locators.ts`/`contacts-tab.page.ts` started out before
their first live run. In particular the five icons' exact roles/labels,
the List screens' record-row shape, and the Details screens' route
segments are all unconfirmed — see the class docs on
`BizDocLocators`/`BizDocPage` for the full list of open questions.

**Seed-data limitation (affects TC:2/TC:3/TC:4).** All five Biz Doc
entity types — Sample Requests, Tech Packs, Sample Orders, Quotes,
Purchase Orders — are created and owned by OTHER floorOS modules
upstream; CRM is purely a read-only consumer/viewer here. This framework
has no way to guarantee a Customer with at least one record of each type
exists in a fresh environment. Rather than assert a hardcoded row
exists, `21-biz-doc.spec.ts` checks `bizDocPage.hasAnyRecords()` before
attempting the "click a record" step per doc type and calls
`test.skip(true, ...)` with a clear reason for whichever doc type's List
screen is legitimately empty, instead of failing or guessing at seed
data. TC:4's read-only check on a Details screen is skipped the same way
if no record exists to drill into.

**Second-role-credential limitation (TC:5).** AC-4/TC:5 calls for a
negative RBAC test with a user who does NOT hold the Owner/Manager/
Executive role. `src/config/env.ts`'s `moduleCredentials()` reads exactly
one `<PREFIX>_USER_<LOCAL|DEV>` / `<PREFIX>_PASSWORD_<LOCAL|DEV>` pair
per module per environment — this framework has no second, non-Owner/
Manager/Executive CRM test user configured to authenticate as. TC:5 was
already marked **skip** in ClickUp independently of this, and
`21-biz-doc.spec.ts` uses `test.skip(true, ...)` citing both reasons
(ClickUp's own skip status, and the missing credential) rather than
guessing at a fake unauthorized session.

**Four-vs-five wording discrepancy (TC:3).** ClickUp's own TC:3 title
reads "...drill-down to Details screen for all **four** Biz Doc types",
even though the User Story's FR-2–FR-6 and AC-2/AC-3 describe **five**
(Sample Requests, Tech Packs, Sample Orders, Quotes, Purchase Orders).
This is reproduced verbatim above rather than silently corrected.
`21-biz-doc.spec.ts` implements the drill-down check for all five doc
types it can reasonably loop over — a superset of what TC:3's title
literally says — since nothing in the FRs/ACs singles out a fourth doc
type to exclude, and ClickUp doesn't specify which four were meant.
