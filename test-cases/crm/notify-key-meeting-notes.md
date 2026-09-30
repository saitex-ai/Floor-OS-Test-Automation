# CRM — Notify about a Key Meeting Notes (Sprint 2)

- **User Story:** [Notify about a Key Meeting Notes](https://app.clickup.com/t/86eyja0jg) — as a CRM user, I want
  relevant stakeholders to be automatically notified when Key Meeting Notes
  are generated or updated, so that everyone who needs the outcome of a
  meeting is informed without manual follow-up.
- **Test-case set:** [CRM -Sprint -2 -Notify about a Key Meeting Notes](https://app.clickup.com/t/z941abtcnk)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/16-notify-key-meeting-notes.spec.ts`](../../tests/regression/crm/16-notify-key-meeting-notes.spec.ts)
- **Page object:** [`src/pages/crm/key-meeting-notes.page.ts`](../../src/pages/crm/key-meeting-notes.page.ts) (shared
  with generate-key-meeting-notes.md and view-key-meeting-notes.md — same screen, three user stories)

**Update (2026-09-22):** ran against a local `tilt up` stack. Confirmed the
Customer Details screen's **Communication tab is currently an unbuilt
scaffold** on this environment ("Tab content — not built yet.") — see
generate-key-meeting-notes.md's Update note for the full explanation. Since
every test here first has to generate a record through that same tab
(`createKeyMeetingNotesRecord()`), all 6 TCs currently skip via the same
`test.skip()` guard in `KeyMeetingNotesPage.openGenerateFromCustomerDetail()`
(on top of TC:5/TC:6's own separate `fixme()` reasons, which would still
apply once the tab is built). Re-run once the Communication tab actually
ships a screen.

## Functional requirements (from the User Story)

- Prerequisites: notification recipients (e.g. assignees, Managers) are
  configured for the Customer or Communication; a Key Meeting Notes record
  has been generated or edited.
- Generating a new Key Meeting Notes record must trigger a system and
  email notification to all configured recipients.
- The notification must name the Customer, the meeting/communication, and
  the acting user.
- The notification must include a deep link that navigates directly to the
  Key Meeting Notes record.
- The user must be able to manually trigger a repeat notification for an
  existing Key Meeting Notes record.
- Recipients must be able to distinguish a Key Meeting Notes notification
  from other notification types at a glance.
- A notification event (with timestamp and recipients) must be recorded in
  the record's audit history.

## Test cases

| #    | Test case                                                                                        | Steps                                                                                                                        | Expected result                                                                                                                                                   | ClickUp                                      | Automated | Verified locally |
| ---- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------- |
| TC:1 | Verify automatic dispatch of in-app and email notifications on Key Meeting Notes creation/update | 1. Generate (or edit) a Key Meeting Notes record with recipients configured.<br>2. Save.                                     | An in-app notification is dispatched to configured recipients; an email notification is also sent (not independently verifiable in this environment — see notes). | [link](https://app.clickup.com/t/z941abtg98) | ✅        | ❌ not yet run   |
| TC:2 | Verify deep-link redirection from in-app and email notifications                                 | 1. Open the in-app notifications panel.<br>2. Click the Key Meeting Notes notification's deep link.                          | The correct Key Meeting Notes record opens directly.                                                                                                              | [link](https://app.clickup.com/t/z941abtg99) | ✅        | ❌ not yet run   |
| TC:3 | Verify manual re-triggering of repeat notifications                                              | 1. Open an existing Key Meeting Notes record's detail screen.<br>2. Click "Notify Internally" / "Notify the Customer" again. | The notification is dispatched again to all configured recipients.                                                                                                | [link](https://app.clickup.com/t/z941abtg9a) | ✅        | ❌ not yet run   |
| TC:4 | Verify audit history logging of notification dispatch events                                     | 1. Trigger a notification (automatic or manual).<br>2. Open the record's audit history.                                      | The notification event, timestamp, and recipients are visible in the audit history.                                                                               | [link](https://app.clickup.com/t/z941abtg9c) | ✅        | ❌ not yet run   |
| TC:5 | Verify system behavior when no recipients are configured                                         | 1. Generate/update a Key Meeting Notes record for a Customer/Communication with zero configured recipients.<br>2. Save.      | No notification is dispatched; the UI indicates no recipients are configured (rather than failing silently or erroring).                                          | [link](https://app.clickup.com/t/z941abtg9d) | ❌        | ❌ not yet run   |
| TC:6 | Verify deep-link access security for unauthorized users                                          | 1. As a user without access to the record's Customer, open the notification's deep link directly.                            | Access is denied / the user is redirected — the record does not open for an unauthorized user.                                                                    | [link](https://app.clickup.com/t/z941abtg9f) | ❌        | ❌ not yet run   |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story describes
the same underlying record as `generate-key-meeting-notes.md` and
`view-key-meeting-notes.md`. Everything in `key-meeting-notes.locators.ts`
/ `key-meeting-notes.page.ts` is a best-guess, **not confirmed against a
real running screen**. Specific assumptions and gaps for this story:

- The in-app notifications panel is assumed to open from the shell's
  existing "Notifications" banner button — the same button
  `BasePage.gotoAuthenticated()` already uses as its post-login marker
  (confirmed to exist and be clickable; its _panel content_ is not
  confirmed).
- Email notification dispatch (part of TC:1) is not independently
  verifiable in this environment — there's no test-mailbox/inbox
  integration in this framework. TC:1 is automated for its in-app half
  only; the email half is a documented gap, not a false pass.
- TC:5 and TC:6 are `test.fixme()`'d in the spec, not automated at all:
  - TC:5 needs a Customer/Communication that's specifically configured
    with **zero** notification recipients — there's no confirmed fixture,
    seed data, or admin UI in this repo for arranging that state.
  - TC:6 needs a second, unauthorized user session (a user genuinely
    without access to the record's Customer) to prove access is denied —
    this framework's CRM suite currently authenticates as a single seeded
    test user (see `tests/regression/crm/auth.setup.ts`), so there's no
    second identity to drive this with yet.
- "Notify Internally" / "Notify the Customer" and the audit history block
  are assumed to live on the same detail dialog `view-key-meeting-notes.md`
  describes — unconfirmed.

Before trusting a pass/fail from `16-notify-key-meeting-notes.spec.ts`, run
it against a live `tilt up` stack or dev, fix locators to match what's
actually rendered, and update this note the way `create-contact.md` and
`create-customer.md` were updated after their own first live runs. TC:5/
TC:6 will also need either a second seeded test identity or a documented
way to arrange a zero-recipient Customer before they can move past
`test.fixme()`.
