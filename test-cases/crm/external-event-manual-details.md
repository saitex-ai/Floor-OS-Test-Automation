# CRM — External Events [created by user manually] Details screen (Sprint 4)

- **User Story / Test-case set:** [CRM-Sprint-4-External Events [created by user manually] Details screen](https://app.clickup.com/t/z941abvg17)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/29-external-event-manual-details.spec.ts`](../../tests/regression/crm/29-external-event-manual-details.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: A manually-created event's Details screen has an Overview tab showing its core fields (Title/Venue/Date/About) and a System section (Status, Created/Updated On/By).
- FR-2: A manually-created event is persisted directly at status Attended, with its Feedback Form tab already showing the data submitted at creation time, read-only.
- FR-3: The Leads tab offers "Scan & Create" and "Create Customer" actions to capture a lead-derived Customer record, pre-linked to the originating event.
- FR-4 (blocked — see Notes): A Customer created from the Leads tab should appear in that event's "Leads from this event" list and increment its Leads (N) count.

## Test cases

| #    | Test case                                                       | Steps                                                                                     | Expected result                                                                                              | ClickUp                                      | Automated                | Verified locally |
| ---- | -----------------------------------------------------------------| --------------------------------------------------------------------------------------------| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------- | ------------------ |
| TC:1 | Verify Overview Tab Display                                      | 1. Open a manually-created event.<br>2. Inspect the Overview tab.                            | Core event details and System fields (created/updated timestamps + acting user) render accurately.           | [link](https://app.clickup.com/t/z941abvg1e) | ✅                        | ✅ passing         |
| TC:2 | Verify Status Update to "Attended" Unlocks Tabs                  | 1. (Corrected — see Notes) Verify a freshly-created manual event's state.                    | The event is already Attended, with Feedback Form/Leads immediately reachable — no lock/unlock transition exists for this creation path. | [link](https://app.clickup.com/t/z941abvg1f) | ✅ (corrected, see Notes) | ✅ passing         |
| TC:3 | Verify Feedback Form Completion                                   | 1. Click the Feedback Form tab.                                                              | The feedback submitted at creation renders correctly and is already saved (read-only — see Notes).            | [link](https://app.clickup.com/t/z941abvg1g) | ✅ (corrected, see Notes) | ✅ passing         |
| TC:4 | Verify Customer Creation from Leads Tab                           | 1. Open the Leads tab.<br>2. Click Create Customer.<br>3. Fill in customer details and save. | A new Customer record is generated and associated with this event, appearing in its linked lead list.        | [link](https://app.clickup.com/t/z941abvg1w) | ⚠️ `test.fixme()`         | ❌ blocked (see Notes) |
| TC:5 | Verify Audit History Tracking                                     | 1. Navigate to the audit/history trail section of the event.                                 | Every status change, edit, or feedback submission is logged with timestamp and acting user (partial — see Notes). | [link](https://app.clickup.com/t/z941abvg1x) | ✅ (partial, see Notes)   | ✅ passing         |
| TC:6 | Prevent Access to Feedback and Leads When Un-Attended              | 1. Open an un-attended event's Details screen.<br>2. Attempt to access Feedback Form/Leads.  | Feedback completion and lead creation are blocked, with an explanatory message.                                | [link](https://app.clickup.com/t/z941abvg1y) | ⚠️ `test.fixme()`         | ⏭️ unreachable state (see Notes) |

4/6 TCs confirmed passing for real (TC:2/TC:3 rewritten to test the
corrected, real behavior rather than the original premise), against a
live `tilt up` local stack (2026-09-25).

## Notes for whoever picks this up next

**The single most important correction, driving nearly every TC here:** a
manually-created External Event has **no "Planning" tab at all** and is
persisted **directly at status "Attended"** — confirmed directly, because
the Create External Event form itself requires the full Feedback Form
(SAITEX Attendees/Score/Number of Leads/"What went well?"/"What could
have been better?"/"Attend next editions?") before it can even submit
(see `create-external-event.md`). There is consequently **no reachable
"un-attended manually-created event" state anywhere in this app**. The
Planning → decision → Attended lifecycle this ClickUp story's TC:2/TC:6
describe only exists for **AI-discovered** events — already covered, for
real, by `23-external-event-details.spec.ts`'s TC:1 (locked tabs) and
TC:2/TC:3 (the real To Attend → Attended transition).

- **TC:2** is rewritten to verify the real, confirmed end state instead
  of a transition that can't happen for this creation path: right after
  creation, Feedback Form already shows "Saved" and Leads already shows
  its real empty state — nothing is ever locked to unlock.
- **TC:3** is rewritten similarly: there is **no "Edit" affordance
  anywhere on the Feedback Form tab** for a manually-created event
  (confirmed by enumerating every button on that tab) — the data
  submitted at creation is immediately rendered read-only. This tests
  that read-only rendering is correct, not a fill-then-save flow that
  doesn't exist here.
- **TC:6** is `test.fixme()`'d outright: there's no un-attended
  manually-created event to open in the first place. Not a gap in this
  suite — the state itself doesn't exist in this app for this creation
  path.

**TC:4 — a genuine, confirmed app bug, not a locator/automation gap.**
The Leads tab's "Scan & Create"/"Create Customer" actions render as real
`<a href>` **links** (role `link`, not `button` — worth flagging as a
Playwright locator trap for anyone touching this screen next), each
correctly deep-linking to `/crm/customers/new`/`/crm/customers/scan` with
`eventId`/`eventName`/`eventType` query params. Opening "Create Customer"
this way correctly pre-locks **CRM Stage → "Lead"** and **Origin Type →
"External Event"** — but the still-**mandatory "Origin" combobox is ALSO
permanently disabled**, with no visible way to populate or unlock it
(confirmed directly: waited 3s, inspected its `disabled` state, no
loading/async-fill ever resolves it). Since Origin is required but can
never be set, **Save can never succeed through this entry point** in this
environment. The test opens the link and confirms it's reachable, then
`test.fixme()`s the actual save with this bug spelled out in the reason —
re-enable once Origin is fixed to either auto-fill from the event context
or become genuinely selectable.

**TC:5 is partial, honest coverage.** This screen has **no separate
audit-trail/history tab or per-change log anywhere** — confirmed by
enumerating the tab bar (Overview/Feedback Form/Leads only). The closest
real equivalent is the Overview tab's "System" section: a single Created
On/By + Updated On/By pair, not the granular "every status change, edit,
or feedback submission individually logged" trail the ClickUp text
describes. The test asserts the real, CRM-observable fields (Created/
Updated On/By) rather than a change-log that doesn't exist on this
screen.

**A text-casing trap worth flagging for whoever explores this UI next:**
reading this screen's "System" section labels via a real headless
Playwright run shows Title Case ("Created On", "Number of Leads") — an
earlier manual exploration via a plain Node script mis-read them as
ALL CAPS, which turned out to be a CSS `text-transform` rendering
difference between how that script's `.innerText()` call resolved styles
and how Playwright's own test runner does. Always confirm exact casing
through the actual `npx playwright test` run, not just an ad hoc script,
before hardcoding a string assertion.

Before trusting a pass/fail from `29-external-event-manual-details.spec.ts`
on a different environment, first check whether the TC:4 Origin-field bug
has been fixed (if so, un-`fixme` it and complete the real save-and-verify
flow) and update this note the same way `create-contact.md` and
`create-customer.md` were updated after their own first live runs.
