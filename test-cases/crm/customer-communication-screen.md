# CRM — Customer Communication screen (Sprint 4)

- **User Story / Test-case set:** [CRM-Sprint-4-Customer Communication screen](https://app.clickup.com/t/z941abvmq9)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/27-customer-communication-screen.spec.ts`](../../tests/regression/crm/27-customer-communication-screen.spec.ts)
- **Locators:** [`src/locators/crm/customer-communication.locators.ts`](../../src/locators/crm/customer-communication.locators.ts)
- **Page object:** [`src/pages/crm/customer-communication.page.ts`](../../src/pages/crm/customer-communication.page.ts)
- **Fixture:** `customerCommunicationPage` in [`src/fixtures/crm.fixtures.ts`](../../src/fixtures/crm.fixtures.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: The Communication tab on Customer Details is a tri-tab container — Logged Communications, Key Meeting Notes, Emails, in that order — each with a live record-count badge.
- FR-2: Each sub-tab lists its records newest-first.
- FR-3: Clicking a logged communication or key meeting note opens a full detail view with a way back to the list.
- FR-4: From a logged communication's detail view, Notify Internally sends a real internal notification.
- FR-5: An empty sub-tab renders an explanatory empty state, not a blank/broken screen.
- FR-6: The Key Meeting Notes badge count updates immediately after a real generation completes, with no manual refresh.
- FR-7: Timestamps render consistently across the three sub-tabs.
- FR-8 (not attestable in this environment — see Notes): the Emails sub-tab should filter to only the logged-in user's own correspondence (From/To/CC).

## Test cases

| #    | Test case                                                     | Steps                                                                                                        | Expected result                                                                                                 | ClickUp                                      | Automated          | Verified locally |
| ---- | ---------------------------------------------------------------| --------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------- | ------------------ |
| TC:1 | Verify sub-tabs order, counts, and newest-first sorting         | 1. Inspect the Communication tab's sub-tab order/badges.<br>2. Log two communications.<br>3. Re-check.        | The three sub-tabs render in order with accurate counts; the newest entry sorts to the top.                    | [link](https://app.clickup.com/t/z941abvzvc) | ✅                  | ✅ passing         |
| TC:2 | Verify email list filtering for user involvement                | 1. Open the Emails sub-tab as the logged-in user.                                                             | Only emails involving the logged-in user (From/To/CC) are shown.                                               | [link](https://app.clickup.com/t/z941abvzvd) | ⚠️ `test.fixme()`  | ⏭️ environment blocker (see Notes) |
| TC:3 | Verify detail view, back navigation, and internal notifications | 1. Open a logged communication's detail view.<br>2. Navigate back.<br>3. Re-open and send an internal notify. | Detail view opens with a way back; the notification dispatches (partial — see Notes on audit-history claim).  | [link](https://app.clickup.com/t/z941abvzve) | ✅ (partial, see Notes) | ✅ passing         |
| TC:4 | Verify sub-tab empty state rendering                             | 1. Open each empty sub-tab.                                                                                   | An explanatory empty state renders for each, including Emails' real environment-wide message (see Notes).     | [link](https://app.clickup.com/t/z941abvzvg) | ✅                  | ✅ passing         |
| TC:5 | Verify exclusion of non-participatory emails                    | 1. Compare two users' visibility of the same Emails sub-tab.                                                  | Emails with no participation from the viewing user are omitted.                                                | [link](https://app.clickup.com/t/z941abvzvh) | ⚠️ `test.fixme()`  | ⏭️ environment blocker (see Notes) |
| TC:6 | Verify Real-Time Badge Count Updates                             | 1. Note the Key Meeting Notes badge (0).<br>2. Generate a real note.<br>3. Return to the tab view.            | The badge updates to 1 immediately, no manual refresh.                                                          | [link](https://app.clickup.com/t/z941abvzw1) | ✅                  | ✅ passing         |
| TC:7 | Verify Timestamp Formatting Consistency                          | 1. Inspect timestamps across all three sub-tabs and their detail views.                                       | Consistent formatting throughout (corrected — see Notes for a real, confirmed inconsistency this TC surfaced). | [link](https://app.clickup.com/t/z941abw00n) | ✅ (documents a real inconsistency, see Notes) | ✅ passing |
| TC:8 | Verify Context Retention During Sub-Tab Navigation                | 1. Open Log a Communication and dirty it.<br>2. Attempt to switch sub-tabs.<br>3. Cancel, then switch.        | The sub-tab strip is unreachable while the dialog is open; after cancelling, navigation and context both work. | [link](https://app.clickup.com/t/z941abw00z) | ✅                  | ✅ passing         |

6/8 TCs confirmed passing for real (2 `test.fixme()`'d for a genuine,
confirmed environment blocker — see Notes), against a live `tilt up`
local stack (2026-09-25).

## Notes for whoever picks this up next

**This screen is the same "Communication" tab three Sprint-2 page objects
already partially covered** (`LogCommunicationPage`, `KeyMeetingNotesPage`,
`CommunicationsEmailPage`), now consolidated into one cohesive tri-tab
container. Confirmed live against the running app: those three sibling
page objects' own 2026-09-22 "Tab content — not built yet." / unbuilt
scaffold comments are **stale** — the tab is real, built, and is exactly
these three flows composed under one sub-tab strip. `CustomerCommunicationPage`
does not re-implement logging a communication, generating Key Meeting
Notes, or the New Email modal — it composes those already-confirmed page
objects directly (`.logCommunication`, `.keyMeetingNotes`, `.email`) and
only owns what's specific to the sub-tab container itself (order, badges,
sorting, empty states, detail-view navigation, context retention).

**TC:2/TC:5 are a genuine, confirmed environment blocker, not an
automation gap.** This environment has **no Outlook integration
configured at all** — the Emails sub-tab always renders *"Outlook is not
set up on this environment, so emails cannot be shown."* instead of any
list, for every Customer, regardless of record count. There is no New
Email send-and-receive loop anywhere in this framework, so it isn't
possible to produce even one real, visible email to check From/To/CC
participation against, let alone two with differing participant sets. A
second CRM identity does exist for other tests (`CRM_EXECUTIVE_*` in
`.env`) but is irrelevant here — the blocker is the missing Outlook
integration itself, not the lack of a second logged-in user.

**TC:3 is real but partial.** The notification dispatch itself is
verified (a real toast). There is **no dedicated audit/history UI section
anywhere on this screen** to independently read the event back from, so
"the event records properly in the Customer's audit history" (the
ClickUp text's fuller claim) is not independently attestable — the
dispatch toast is the only CRM-observable proxy this suite can check.

**TC:7 surfaced a genuine, confirmed timestamp-formatting inconsistency —
documented explicitly, not silently asserted as "consistent."** On the
very same Logged-Communication detail view: the "Date" field uses
`DD-MM-YYYY`, but "Created On" uses a **different** format,
`YYYY-MM-DD HH:mm`. Key Meeting Notes' own list row and detail timestamp
are internally consistent with each other (`DD-MM-YYYY HH:mm`), but that
differs from both Logged Communications formats. The Emails sub-tab
renders no timestamps at all in this environment (no Outlook integration
— see TC:2/TC:4), so it's excluded from this check rather than silently
skipped. This is real, confirmed inconsistent application behavior, worth
flagging to product/dev — same "honesty over false passes" discipline as
the compound Planning/Elapsed status discovery in
`22-external-events-list.spec.ts`.

**TC:8's "unsaved data" guard is a hard block, not a soft warning.**
Confirmed directly: with Log a Communication open and dirtied, the
sub-tab strip is genuinely unreachable (a real modal overlay), not merely
a discard-confirmation prompt shown after the fact.

TC:6/TC:7 both include a real Key Meeting Notes generation against a
local AI model (confirmed 7–17s+ per call in this exploration) — both use
`test.slow()` for that reason, the same constraint already documented on
`KeyMeetingNotesPage.generateDraft()`.

Before trusting a pass/fail from `27-customer-communication-screen.spec.ts`
on a different environment, first check whether Outlook integration has
been configured there (if so, TC:2/TC:5 become genuinely testable and
should be un-fixme'd) and update this note the same way `create-contact.md`
and `create-customer.md` were updated after their own first live runs.
