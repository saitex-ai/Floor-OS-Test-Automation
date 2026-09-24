# CRM — Generate Key Meeting Notes (Sprint 2)

- **User Story:** [Generate Key Meeting Notes](https://app.clickup.com/t/86eyja0d9) — as a CRM user, I want to
  generate a structured Key Meeting Notes record from a logged interaction,
  so that discussion points, decisions, and follow-ups are captured
  consistently and remain accessible against the related Customer or
  Contact.
- **Test-case set:** [CRM - Sprint 2 - Generate Key Meeting Notes](https://app.clickup.com/t/z941abtab7)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/14-generate-key-meeting-notes.spec.ts`](../../tests/regression/crm/14-generate-key-meeting-notes.spec.ts)
- **Page object:** [`src/pages/crm/key-meeting-notes.page.ts`](../../src/pages/crm/key-meeting-notes.page.ts) (shared
  with view-key-meeting-notes.md and notify-key-meeting-notes.md — one screen, three user stories, same precedent as
  `customer-detail.page.ts` covering activate/deactivate/edit-contact)

**Update (2026-09-22):** ran against a local `tilt up` stack. Confirmed the
Customer Details screen's **Communication tab is currently an unbuilt
scaffold** on this environment ("Tab content — not built yet." /
"Scaffold placeholder — no screen built yet.") — not a locator guess gone
wrong, a genuine environment/product gap (affects all three Key Meeting
Notes stories, since they all live in this tab). `KeyMeetingNotesPage.openGenerateFromCustomerDetail()`
now detects this placeholder right after switching tabs and `test.skip()`s
every TC with a clear reason instead of timing out. All 7 TCs currently
skip for this reason. Re-run once the Communication tab actually ships a
screen.

## Functional requirements (from the User Story)

- Prerequisites: user provisioned with a CRM role granting Communication
  logging and Key Meeting Notes creation permission; a logged interaction
  (meeting/call) exists to generate notes from, or the user can enter one
  directly.
- Trigger generation from a logged interaction, or start independently.
- Generated notes organized into consistent sections — the Functional
  Requirements text says "summary, discussion points, decisions, action
  items", while TC:3's own title says "(Agenda, Discussion Points, Action
  Items)"; both are treated as possibly-real section labels below since the
  ClickUp text itself is inconsistent.
- User can review/edit before finalizing.
- Mandatory fields validated before save, with every offending field
  flagged.
- Saved notes linked to the correct Customer/Contact, retrievable from
  Communication history.
- Action items identifiable as distinct follow-ups (visibly distinguished
  from general discussion content).
- Creation entry recorded in audit/communication history; configured
  stakeholders notified.

## Test cases

| #    | Test case                                                                                | Steps                                                                                                                 | Expected result                                                                                                                     | ClickUp                                      | Automated | Verified locally |
| ---- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------- |
| TC:1 | Verify opening the "Generate Key Meeting Notes" modal                                    | 1. Open a Customer's Details screen.<br>2. In the Communication section, click "Generate Key Meeting Notes".          | The "Generate Key Meeting Notes" modal opens.                                                                                       | [link](https://app.clickup.com/t/z941abtab8) | ✅        | ❌ not yet run   |
| TC:2 | Verify file upload and readiness state before generation                                 | 1. Open the modal.<br>2. Upload a source file (e.g. a meeting transcript/recording).                                  | The file is accepted and the modal shows a "ready to generate" state.                                                               | [link](https://app.clickup.com/t/z941abtab9) | ✅        | ❌ not yet run   |
| TC:3 | Verify AI generation of structured notes draft (Agenda, Discussion Points, Action Items) | 1. With a source ready, click "Generate".                                                                             | A structured draft is produced with Agenda/Summary, Discussion Points, and Action Items sections populated from the source.         | [link](https://app.clickup.com/t/z941abtaba) | ✅        | ❌ not yet run   |
| TC:4 | Verify Action Items distinction from general discussion content                          | 1. Generate or open a draft containing both discussion content and action items.<br>2. Inspect the rendering of each. | Action items are visibly distinguished (e.g. distinct styling/section) from general discussion content.                             | [link](https://app.clickup.com/t/z941abtabb) | ✅        | ❌ not yet run   |
| TC:5 | Verify mandatory validation during note creation/editing                                 | 1. Open the review/edit screen.<br>2. Clear a mandatory field (e.g. Title).<br>3. Click Save.                         | Save is blocked; the offending field is flagged.                                                                                    | [link](https://app.clickup.com/t/z941abtabd) | ✅        | ❌ not yet run   |
| TC:6 | Verify persistence in Communication tab and audit trail logging                          | 1. Complete and save a Key Meeting Notes record.<br>2. Return to the Communication tab/history.                       | The saved notes appear in the Customer's Communication history; the audit trail shows a creation entry, timestamp, and acting user. | [link](https://app.clickup.com/t/z941abtabf) | ✅        | ❌ not yet run   |
| TC:7 | Verify notification actions ("Notify Internally" & "Notify the Customer")                | 1. Save a Key Meeting Notes record.<br>2. Click "Notify Internally".<br>3. Click "Notify the Customer".               | Each action dispatches a notification to the corresponding recipients.                                                              | [link](https://app.clickup.com/t/z941abtabg) | ✅        | ❌ not yet run   |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story's screen
(Customer Details → Communication section → "Generate Key Meeting Notes")
doesn't exist yet as confirmed CRM coverage in this repo. Everything in
`key-meeting-notes.locators.ts` / `key-meeting-notes.page.ts` is a
best-guess derived from three ClickUp user stories' text (this one, plus
View and Notify — they all describe the same underlying record) and this
framework's established UI patterns (dialog-scoped buttons, combobox
popups, `[data-sonner-toast]` toasts), **not confirmed against a real
running screen**. In particular:

- The entry point is assumed to be a button labeled exactly "Generate Key
  Meeting Notes" inside the same "Communication" section
  `log-communication.locators.ts` already assumes exists on
  `CustomerDetailPage`'s route (`/crm/customers/{uuid}`) — unconfirmed
  whether that section exists yet, and unconfirmed for a Contact Details
  equivalent, and unconfirmed whether generation can also be triggered
  directly from an individual logged-interaction row (the User Story's own
  "start independently" flow).
- The "generation screen" and "review/edit screen" the User Story names
  separately are modeled here as ONE dialog whose content changes
  (upload/ready state → generating → structured draft to review) rather
  than two distinct screens/routes — an assumption, not a confirmed fact.
- Section labels are genuinely ambiguous in the source ClickUp text itself
  (Functional Requirements say "summary, discussion points, decisions,
  action items"; TC:3's title says "Agenda, Discussion Points, Action
  Items") — `summaryOrAgendaSection` tries both; `decisionsSection` exists
  but nothing currently asserts on it, since no TC calls it out
  specifically.
- "Mandatory fields" for TC:5 is modeled against a single assumed "Title"
  field (`notesTitleInput`) since the ClickUp text doesn't enumerate which
  fields on the review/edit screen are actually mandatory.
- TC:3 (AI generation output/timing) is `test.fixme()`'d in the spec —
  asserting anything about actual AI-generated content or how long
  generation takes isn't groundable without seeing the real feature run;
  the page object's `generateDraft()` only waits for _some_ structured
  section to render, which is as far as this can honestly go pre-live-run.

Before trusting a pass/fail from `14-generate-key-meeting-notes.spec.ts`,
run it against a live `tilt up` stack or dev, fix locators to match what's
actually rendered, and update this note the way `create-contact.md` and
`create-customer.md` were updated after their own first live runs.
