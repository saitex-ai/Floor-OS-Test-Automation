# CRM — View Logged Communications (Sprint 2)

- **User Story:** [View Logged Communications](https://app.clickup.com/t/86eye4dte) — the
  CRM integrates with Microsoft Outlook for email communication with
  Customers/Contacts. From the Communication section of the Customer/Contact
  Details screen, the user can start a "New Email" (Outlook opens a draft
  pre-populated with From/CC/To, ready for composition), view past emails
  chronologically in an "Emails" tab (clicking one opens it in Outlook), and
  receive a system notification when a Customer/Contact sends an incoming
  email (clicking it also opens Outlook).
- **Test-case set:** [CRM-Sprint -2-View Logged Communications](https://app.clickup.com/t/z941abtahf)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/19-view-logged-communications.spec.ts`](../../tests/regression/crm/19-view-logged-communications.spec.ts)
- **Page object:** [`src/pages/crm/communications-email.page.ts`](../../src/pages/crm/communications-email.page.ts)

**Update (2026-09-22):** ran against a local `tilt up` stack. Confirmed the
Customer Details screen's **Communication tab is currently an unbuilt
scaffold** on this environment ("Tab content — not built yet." /
"Scaffold placeholder — no screen built yet.") — not a locator guess gone
wrong, a genuine environment/product gap. `CommunicationsEmailPage.openFromCustomerDetail()`
now detects this placeholder right after switching tabs and `test.skip()`s
every TC with a clear reason instead of timing out. All 7 TCs currently
skip for this reason (on top of the 4 already marked skip in ClickUp).
Re-run once the Communication tab actually ships a screen.

## Functional requirements (from the User Story)

- FR-2.1: "New Email" button in the Communication section of Customer/Contact Details.
- FR-2.2: Clicking it redirects to Outlook with a new email draft.
- FR-2.3: Draft pre-populated: From = logged-in user's email; CC = Owner +
  Assignee emails; To = Customer/Contact email.
- FR-2.4: Draft ready for composing/sending from Outlook.
- FR-2.5: "Emails" tab within the Communication section.
- FR-2.6: Clicking the tab displays emails chronologically per Email Subject.
- FR-2.7: Clicking an email redirects to Outlook to view it.
- FR-2.8: Incoming email from a Customer/Contact triggers a system notification.
- FR-2.9: Clicking the notification redirects to Outlook.

## Test cases

| #    | Test case                                                            | Steps                                                                                       | Expected result                                                                                                                     | ClickUp                                      | Automated | Verified locally      |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | --------------------- |
| TC-1 | Verify "New Email" button display and modal invocation               | 1. Open a Customer's Details screen.<br>2. In the Communication section, click "New Email". | "New Email" button is visible in the Communication section; clicking it invokes the New Email modal.                                | [link](https://app.clickup.com/t/z941abtahm) | ✅        | ❌ not yet run        |
| TC-2 | Verify pre-population of recipient fields and redirection to Outlook | 1. Open the New Email modal.<br>2. Inspect From/CC/To.<br>3. Confirm/compose.               | From/CC/To are pre-populated per FR-2.3; confirming redirects to Outlook (Outlook's own draft content is out of scope — see Notes). | [link](https://app.clickup.com/t/z941abtahn) | ✅        | ❌ not yet run        |
| TC-3 | Verify display and chronological sorting under Emails tab            | 1. Open the Communication section.<br>2. Click the "Emails" tab.                            | Past emails display, ordered chronologically by Email Subject.                                                                      | [link](https://app.clickup.com/t/z941abtahp) | ⏭️        | ⏭️ skipped in ClickUp |
| TC-4 | Verify email list item redirection to Outlook                        | 1. Open the Emails tab.<br>2. Click an email row.                                           | Redirects to Outlook to read the full email.                                                                                        | [link](https://app.clickup.com/t/z941abtahq) | ⏭️        | ⏭️ skipped in ClickUp |
| TC-5 | Verify system notification display upon receiving an incoming email  | 1. Have a Customer/Contact send an email to the logged-in user.                             | A system notification about the received email is shown.                                                                            | [link](https://app.clickup.com/t/z941abtahr) | ⏭️        | ⏭️ skipped in ClickUp |
| TC-6 | Verify notification click redirection to Outlook                     | 1. Receive the notification (TC-5).<br>2. Click it.                                         | Redirects to Outlook.                                                                                                               | [link](https://app.clickup.com/t/z941abtaht) | ⏭️        | ⏭️ skipped in ClickUp |
| TC-7 | Verify Cancel action on New Email modal                              | 1. Open the New Email modal.<br>2. Click Cancel instead of confirming.                      | Modal closes; no redirect to Outlook occurs; nothing is sent/composed.                                                              | [link](https://app.clickup.com/t/z941abtahu) | ✅        | ❌ not yet run        |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story's screen
(Customer/Contact Details → Communication section → "New Email" / "Emails"
tab / notifications) doesn't exist yet as automated CRM coverage in this
repo. Everything in `communications-email.locators.ts` /
`communications-email.page.ts` is a best-guess derived from this ClickUp
text and this framework's established UI patterns, **not confirmed against
a real running screen** — same caveat as `log-a-communication.md`.

**The Outlook-redirect limitation (read this before trusting any pass/fail
here).** Every one of TC-2, TC-4, and TC-6's "expected result" ends with
"redirects to Outlook" — Outlook is a real external application entirely
outside both floorOS and this Playwright framework's control. This
automation:

- **Can** assert the CRM-side-observable parts: that the "New Email"
  button, the "Emails" tab, and (were TC-5/TC-6 not skipped) a system
  notification exist, render, and are clickable; and that the From/CC/To
  fields the CRM itself renders before handoff (FR-2.3) are populated with
  the expected values — that's CRM state, not Outlook's.
- **Cannot** assert anything about Outlook's own UI once the redirect
  happens — no draft body, no "ready to send" state, no confirmation the
  right mailbox opened. None of that is attempted anywhere in this suite.
- **Approximates** "a redirect was attempted" via
  `page.context().waitForEvent('page')`, on the assumption the handoff
  opens Outlook in a new browser tab — a plausible but **unconfirmed**
  shape. If the real implementation instead does a same-tab
  `window.location` redirect, or a plain `mailto:`/deep-link `<a href>`
  Playwright doesn't observe as a new page, `confirmAndAwaitOutlookRedirect()`
  / `openEmailAndAwaitOutlookRedirect()` / `clickNotificationAndAwaitOutlookRedirect()`
  in `communications-email.page.ts` all need reworking to check that
  `href`/navigation instead — each is flagged inline with a TODO.

**TC-1/TC-2/TC-7 structural guess.** TC-1 ("modal invocation") and TC-7
("Cancel action on New Email modal") both imply "New Email" opens an
intermediate modal (a pre-populated From/CC/To preview, with a confirm
action that performs the actual Outlook handoff, and a Cancel that just
closes it) rather than redirecting the instant the button is clicked.
Modeled that way here — rework `communications-email.locators.ts` if the
real screen redirects immediately with no modal at all.

**TC-3/TC-4/TC-5/TC-6 are marked `skip` in ClickUp** — automated as
`test.skip(true, 'Marked skip in ClickUp')` rather than written out fully,
since ClickUp itself says not to run them. Locators/page-object methods for
the Emails tab and the notification flow are still included (`emailsTab`,
`emailRow()`, `notificationsButton`, `notificationItem()`, etc.) for
completeness of the screen, but are exercised only incidentally, not by a
real assertion-bearing test.

Before trusting a pass/fail from `19-view-logged-communications.spec.ts`,
run it against a live `tilt up` stack or dev, fix locators/the modal
assumption to match what's actually rendered, confirm (or replace) the
new-tab redirect proxy, and update this note the same way
`log-a-communication.md` and `create-customer.md` were updated after their
own first live runs.
