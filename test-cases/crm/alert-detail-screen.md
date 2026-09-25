# CRM — Alert Detail Screen (Sprint 3)

- **User Story / Test-case set:** [CRM-Sprint-3-Alert Detail Screen](https://app.clickup.com/t/z941abv3qr)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/24-alert-detail-screen.spec.ts`](../../tests/regression/crm/24-alert-detail-screen.spec.ts)
- **Locators:** [`src/locators/crm/alerts.locators.ts`](../../src/locators/crm/alerts.locators.ts)
- **Page object:** [`src/pages/crm/alerts.page.ts`](../../src/pages/crm/alerts.page.ts)
- **Fixture:** `alertsPage` in [`src/fixtures/crm.fixtures.ts`](../../src/fixtures/crm.fixtures.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: An Alert's Checked/Unchecked status is a simple, reversible toggle.
- FR-2: "Email Alert Internally" and "Email Alert to Customer" open a composition dialog that hands off to Outlook ("Redirect to Outlook"), rather than sending directly.
- FR-3: The Internal sharing dialog requires at least one recipient in "To" before the Outlook handoff is allowed.
- FR-4: Deleting an Alert requires a confirmation step before it is removed.
- FR-5: The Official Source link opens the regulatory source page in a new tab.
- FR-6 (not automated — see Notes): Customer sharing should only offer active Customers in its picker.

## Test cases

| #    | Test case                                                | Steps                                                                                         | Expected result                                                                                          | ClickUp                                      | Automated                | Verified locally |
| ---- | ---------------------------------------------------------| ----------------------------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------- | ------------------ |
| TC:2 | Verify "Uncheck" functionality                            | 1. Open an Alert (starts Checked).<br>2. Click Uncheck.<br>3. Verify status badge.             | Status badge flips to "Unchecked".                                                                       | [link](https://app.clickup.com/t/z941abv3tz) | ✅                        | ✅ passing         |
| TC:3 | Verify Internal Alert Sharing                              | 1. Click "Email Alert Internally".<br>2. Complete the handoff.                                 | An internal email is composed/sent.                                                                       | [link](https://app.clickup.com/t/z941abv3u0) | ⏭️ `test.fixme()`         | ⏭️ skipped in ClickUp / boundary (see Notes) |
| TC:4 | Verify Customer Alert Sharing                              | 1. Click "Email Alert to Customer".<br>2. Complete the handoff.                                | A customer-facing email is composed/sent.                                                                 | [link](https://app.clickup.com/t/z941abv3u1) | ⏭️ `test.fixme()`         | ⏭️ skipped in ClickUp / boundary (see Notes) |
| TC:5 | Verify Alert Deletion with Confirmation                    | 1. Click the delete (trash) icon.<br>2. Observe the confirmation gate.                         | A real confirmation dialog appears before anything is deleted.                                            | [link](https://app.clickup.com/t/z941abv3u2) | ✅ (stops at confirm gate, see Notes) | ✅ passing         |
| TC:6 | Verify Official Source Link Navigation                     | 1. Click the Official Source URL.                                                              | Opens the regulatory source page in a new tab.                                                             | [link](https://app.clickup.com/t/z941abv3u3) | ✅                        | ✅ passing         |
| TC:7 | Prevent Internal Share without Recipients                  | 1. Open "Email Alert Internally".<br>2. Leave "To" blank.<br>3. Attempt Redirect to Outlook.   | Blocked with a "Select at least one user email ID" validation error.                                      | [link](https://app.clickup.com/t/z941abv3u4) | ✅                        | ✅ passing         |
| TC:8 | Restrict Customer Share to Inactive Customers               | 1. Open "Email Alert to Customer".<br>2. Inspect the Customer picker.                          | Only active Customers are selectable.                                                                      | [link](https://app.clickup.com/t/z941abv7fp) | ⏭️ `test.fixme()`         | ⏭️ skipped in ClickUp / boundary (see Notes) |

5/8 TCs confirmed passing for real (TC:1 does not exist in ClickUp — this
story starts numbering at TC:2). Confirmed both sequentially
(`--workers=1`) and in Playwright's default parallel mode, against a live
`tilt up` local stack (2026-09-25).

## Notes for whoever picks this up next

**Corrections to the original ClickUp text, confirmed directly against
the running app:**

- There is **no "Create Alert" button anywhere in the UI** — Alerts are
  entirely AI/system-generated (regulatory-compliance alerts, with
  AI-generated Regulations/Impact-on-SAITEX/Official-Source sections).
  This environment's seed pool is a **fixed, non-replenishable set of 6
  alerts**. TC:5 (delete) deliberately never clicks the real Confirm
  button — see below.
- The delete confirmation dialog reads **"Delete this Alert?"** with a
  plain Cancel/Confirm button pair — not a "type the alert name to
  confirm" step as the ClickUp text's phrasing implied.
- "Email Alert Internally"/"Email Alert to Customer" are the same
  "Redirect to Outlook" handoff pattern already confirmed elsewhere in
  this app (Communications Email, Key Meeting Notes' Notify Internally):
  From is the logged-in user (read-only), To/CC are comboboxes, and
  there's no direct in-app Send.
- The Official Source URL renders as a real `link`, not a button —
  targeted via `a[href^="http"]` (last match) since there's no reliable
  scoped container around the "Official Source" heading.

**TC:5 (Delete) is deliberately never completed to a real delete.** With
no "Create Alert" path anywhere in the UI, this environment's 6-alert
pool cannot be replenished — actually confirming a delete would
permanently and irreversibly shrink it for every other Alert test, with
no way to restore it. The test opens the delete dialog, confirms the
real confirmation gate appears and is correctly worded, then clicks
Cancel. Treat its "✅" as "the confirmation gate itself is verified", not
"delete was exercised end to end".

**TC:3/TC:4/TC:8 are marked `test.fixme()`, matching ClickUp's own skip
status**, for the same Outlook-handoff boundary already established
elsewhere in this suite (`19-view-logged-communications.spec.ts`,
`20-notify-key-meeting-notes.spec.ts`): whether a real email actually
dispatches, or which Customers populate the Customer-sharing picker,
isn't attestable from a Playwright suite that has no control over
Outlook or a seeded "known-inactive Customer" to check TC:8 against.
TC:7 (blank-recipient validation on the Internal dialog) **is** real and
run, since that's CRM-side-observable — the block happens before any
handoff is attempted.

**A skip-cascade bug, found and fixed this session:** the shared
`openFirstAlert()` helper originally called `alertsPage.openList()` and
immediately checked `rows.count() === 0` with no wait for the table to
actually load, causing a false "no seeded Alerts" skip on every real TC
(only ~2–2.5s in, too fast for a genuine empty-pool check given 6 real
alerts exist). Fixed by waiting for the page heading, then for the first
row to actually become visible (with a real timeout), before deciding
whether to skip.

Before trusting a pass/fail from `24-alert-detail-screen.spec.ts` on a
different environment, confirm the seed pool still has alerts (this
story has no way to create more) and update this note the same way
`create-contact.md` and `create-customer.md` were updated after their own
first live runs.
