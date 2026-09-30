# CRM — Notify Internally about a Logged Communication (Sprint 4)

- **User Story / Test-case set:** [CRM Sprint 4 — Notify Internally about a Logged Communication](https://app.clickup.com/t/z941abvcwb)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25. Already marked "pass" in ClickUp — that status tracks ClickUp's own process, not this repo's automation, which didn't exist for 4 of the 5 TCs before this pass (TC:1 had a smoke-level happy-path cousin only).
- **Automated in:** [`tests/regression/crm/25-notify-internally-logged-communication.spec.ts`](../../tests/regression/crm/25-notify-internally-logged-communication.spec.ts)
- **Locators:** [`src/locators/crm/log-communication.locators.ts`](../../src/locators/crm/log-communication.locators.ts) (shared with `log-a-communication.md`, Sprint 2 — same screen, two user stories)
- **Page object:** [`src/pages/crm/log-communication.page.ts`](../../src/pages/crm/log-communication.page.ts)
- **Fixture:** `logCommunicationPage` in [`src/fixtures/crm.fixtures.ts`](../../src/fixtures/crm.fixtures.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: A logged communication's own Details screen has a "Notify Internally" button that opens a dialog with two multi-select comboboxes, Managers and Executives, both scoped to fixed internal-directory lists.
- FR-2: Sending requires at least one selected recipient (Manager or Executive) — a zero-recipient Send is blocked with an inline validation error and dispatches nothing.
- FR-3: A successful Send shows a confirmation naming the recipients actually dispatched to (see Notes — it does NOT name the Customer, the communication, or the acting user, despite ClickUp's expected result).
- FR-4 (not attestable here — see Notes): an email notification is also dispatched to the same recipients.
- FR-5: The logged communication's own detail-view URL is a real, stable deep link — navigating to it directly opens that specific record, with no manual tab-clicking needed.
- FR-6 (not automated — see Notes): no audit-history feature exists anywhere on this screen in this environment.
- FR-7: The recipient pickers cannot be used to query or select anything outside the fixed internal directory — no external/customer address can even be typed in and matched.

## Test cases

| #    | Test case                                                             | Steps                                                                                                                                                          | Expected result                                                                                                                                                                                | ClickUp                                      | Automated                | Verified locally                    |
| ---- | ----------------------------------------------------------------------| -----------------------------------------------------------------------------------------------------------------------------------------------------------  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------- | ------------------------------------ |
| TC:1 | Verify automatic internal notifications on logging a communication    | 1. Open a Customer's Communication tab.<br>2. Log/open a communication.<br>3. Select valid Managers/Executives.<br>4. Click Send notifications.               | System dispatches an in-app + email notification to all selected recipients, correctly naming the Customer, communication title/type, and acting user.                                       | [link](https://app.clickup.com/t/z941abvcwh) | ✅ (partial, see Notes)   | ✅ passing (partial)                 |
| TC:2 | Verify deep link navigation                                            | 1. Open the notification panel or email inbox.<br>2. Click the embedded deep link (e.g. to Logged Communication "LC-2026-0012").                              | The app routes directly to the specific logged communication detail view, no manual searching.                                                                                                | [link](https://app.clickup.com/t/z941abvcwx) | ✅ (URL proxy, see Notes) | ✅ passing (partial)                 |
| TC:3 | Verify audit history logging                                           | 1. Navigate to the audit history/trail section of the logged communication.<br>2. Review recent entries.                                                      | An audit log entry details the notification event, timestamp, and notified recipients.                                                                                                       | [link](https://app.clickup.com/t/z941abvcx9) | ⏭️ `test.fixme()`        | ❌ feature does not exist (see Notes)|
| TC:4 | Prevent notification dispatch with zero recipients selected            | 1. Leave both Managers and Executives empty.<br>2. Attempt to click Send notifications.                                                                        | The system blocks the send and shows a validation error; no notification is dispatched.                                                                                                       | [link](https://app.clickup.com/t/z941abvcxn) | ✅                        | ✅ passing                           |
| TC:5 | Verify restriction preventing external distribution                    | 1. Open the "Notify Internally" modal.<br>2. Check whether external/customer domains or non-internal users can be queried or selected.                        | The recipient picker is strictly restricted to internal Managers/Executives, barring external stakeholders entirely.                                                                          | [link](https://app.clickup.com/t/z941abvcza) | ✅                        | ✅ passing                           |

4/5 TCs confirmed passing for real (TC:3 has no automatable feature to run
against). Confirmed both sequentially (`--workers=1`) and in Playwright's
default parallel mode, against a live local app at http://localhost:3100
(2026-09-25).

## Notes for whoever picks this up next

**Corrections/discoveries, confirmed directly against the running app
(2026-09-25):**

- **The Executives combobox is a real, working peer of Managers**, not a
  stub — same typeahead multi-select shape, its own fixed option list
  (this environment: Anjali Krishnakumar, Ansari Seiybu, CRM Executive,
  Fayaz Ahmad, Rajarajan Velmurugan, Yesuraju Kommanapalli vs. Managers'
  Alice Planner, Banupriya Palanivel, CRM Manager, SamuelRaj Suresh,
  Sathish Nagarajan).
- **Zero-recipient validation is real**: attempting Send with both fields
  empty shows the inline text "Select at least one Manager or Executive"
  inside the dialog, blocks the send (no toast fires), and leaves the
  dialog open.
- **A real Send's toast reads "Notifications sent — `<name>`, `<name>`,
  ..."** — it lists only the recipients actually dispatched to. It does
  **not** mention the Customer's name, the communication's title/type, or
  the acting user, despite TC:1's own expected result text. TC:1 is
  written to assert what the toast genuinely contains rather than a false
  match against the fuller ClickUp text — this is a real product gap
  worth someone on the product side seeing, not an automation shortfall.
- **The in-app notifications bell/panel never receives an entry for this
  action.** Confirmed directly, three ways: the panel read "No
  notifications yet." immediately before Send, immediately after a real
  Send, and again after a full page reload — even with the logged-in
  acting user themselves selected as one of the recipients (so if
  anyone's Inbox should have gotten an entry, it would have been theirs).
  The only in-app signal this feature produces at all, in this
  environment, is the transient toast. This means TC:2's literal "open
  the notification panel ... click its embedded link" step has nothing
  real to click here.
- **TC:2 is automated as a URL-deep-link proxy instead.** The logged
  communication's own detail-view URL
  (`/crm/customers/{id}?tab=comm&sub=logged&comm={communicationId}`) *is*
  a real, working deep link — confirmed a fresh direct navigation to it
  (simulating what clicking an embedded link would do) lands exactly on
  that one record, with no manual tab-clicking. That's the CRM-observable
  half of "the deep link works"; there is currently no real notification
  entry or email-inbox integration in this framework to click a link
  *from*, so that part is honestly out of scope rather than faked.
- **TC:3 (audit history) is `test.fixme()`'d — there is no such feature
  in this environment.** Confirmed by taking a full `ariaSnapshot()` of a
  logged communication's own detail screen and enumerating every button's
  accessible name: the screen shows only Communication
  Title/Reason/Medium/Timezone/Date/Communicator/Created On/Created
  By/MOM plus the Notify Internally button — no tab, section, or icon
  leads to anything resembling an audit trail. This is a genuine product
  gap, not a locator miss.
- **TC:5 — the recipient pickers cannot even be used to query external
  contacts, let alone select one.** Typing a bare external-looking domain
  ("gmail.com") or a full non-directory email address
  ("external.customer@acme-textiles.com") into either combobox returns
  zero matching options, and neither combobox offers any "add"/"create
  new"/free-text affordance to force one in regardless. So this TC's real
  answer is "there's no way to even try", confirmed rather than assumed.
- **Email dispatch (part of TC:1's expected result) is not independently
  verifiable from this Playwright suite** — there is no test-mailbox/
  inbox integration in this framework, the same documented gap already
  called out in `test-cases/crm/view-logged-communications.md` and
  `test-cases/crm/notify-key-meeting-notes.md`. TC:1 automates and
  asserts only the in-app-observable half for real.
- **A real locator/interaction bug found and fixed in
  `LogCommunicationPage.selectNotifyManager()`.** Its previous
  popup-closing mechanism (clicking the Notify Internally dialog's own
  heading) is not reliable once a *second* combobox's popup has also been
  opened in the same dialog session — confirmed directly: doing
  Managers-then-Executives that way threw a real Playwright timeout, the
  Executives popup's own option list rendered low enough to intercept the
  click meant for the heading. Switched both `selectNotifyManager()` and
  the new `selectNotifyExecutive()` to close via `Escape` instead —
  confirmed directly (twice) that Escape closes the popup while leaving
  the pick intact, contradicting an older code comment on this method
  that claimed Escape clears the selection. Re-ran
  `tests/smoke/crm/smoke-recent.spec.ts`'s own Notify Internally test
  after this change to confirm the single-Manager smoke-test shape it
  already depends on still passes.

Before trusting a pass/fail from
`25-notify-internally-logged-communication.spec.ts` on a different
environment, re-confirm the Managers/Executives seed lists are still
populated (an empty directory would make TC:1/TC:4/TC:5 misleading) and
re-check whether an audit-history feature has since shipped (TC:3 can
move off `test.fixme()` the moment it has somewhere real to look).
