# CRM — View Key Meeting Notes (Sprint 2)

- **User Story:** [View Key Meeting Notes](https://app.clickup.com/t/86eyja0fp) — as a CRM user, I want to review
  and maintain a generated Key Meeting Notes record for a Customer, so that
  a structured, reliable summary of what was discussed and agreed is
  preserved and available to anyone who needs it later.
- **Test-case set:** [CRM- Sprint -2- view key meeting notes](https://app.clickup.com/t/z941abtcg1)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/15-view-key-meeting-notes.spec.ts`](../../tests/regression/crm/15-view-key-meeting-notes.spec.ts)
- **Page object:** [`src/pages/crm/key-meeting-notes.page.ts`](../../src/pages/crm/key-meeting-notes.page.ts) (shared
  with generate-key-meeting-notes.md and notify-key-meeting-notes.md — same screen, three user stories)

**Update (2026-09-22):** ran against a local `tilt up` stack. Confirmed the
Customer Details screen's **Communication tab is currently an unbuilt
scaffold** on this environment ("Tab content — not built yet.") — see
generate-key-meeting-notes.md's Update note for the full explanation. Since
every test here first has to generate a record through that same tab
(`createKeyMeetingNotesRecord()`), all 4 TCs currently skip via the same
`test.skip()` guard in `KeyMeetingNotesPage.openGenerateFromCustomerDetail()`.
Re-run once the Communication tab actually ships a screen.

## Functional requirements (from the User Story)

- Prerequisites: user provisioned with a CRM role granting read/write
  access to Key Meeting Notes; a Key Meeting Notes record has already been
  generated against a Customer.
- The detail screen must present the notes broken into clearly labelled
  sections (e.g. agenda, discussion points, action items).
- Action items must be distinguishable from general discussion content and
  must capture an owner where applicable.
- The record must display its source (the interaction it was generated
  from) and system fields (created/updated timestamps and users).
- The record must be retrievable from the associated Customer's
  Communication history.

## Test cases

| #    | Test case                                                                                                                                                | Steps                                                                                                                                 | Expected result                                                                                                                      | ClickUp                                      | Automated | Verified locally |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------- | ---------------- |
| TC:1 | Verify list rendering of generated Key Meeting Notes under Customer Communication history                                                                | 1. Generate a Key Meeting Notes record for a Customer.<br>2. Open that Customer's Communication history.                              | An entry for the generated Key Meeting Notes record is listed in the Communication history.                                          | [link](https://app.clickup.com/t/z941abtw34) | ✅        | ❌ not yet run   |
| TC:2 | Verify navigation and structured section rendering on Key Meeting Notes detail screen (pre-generated Key Meeting Notes)                                  | 1. From the Communication history, click a Key Meeting Notes entry.                                                                   | The detail screen opens, presenting its sections (agenda/summary, discussion points, action items) in a structured, labelled layout. | [link](https://app.clickup.com/t/z941abtw3g) | ✅        | ❌ not yet run   |
| TC:3 | Verify visual distinction of Action Items and owner assignment display (on the detail screen of a record containing action items and discussion content) | 1. Open a Key Meeting Notes detail screen whose record has both action items and general discussion content.<br>2. Inspect each.      | Action items are visibly distinguished from general discussion content and show an owner where applicable.                           | [link](https://app.clickup.com/t/z941abtw3h) | ✅        | ❌ not yet run   |
| TC:4 | Verify source interaction linkage and system fields metadata (on the detail screen of a record opened from Communication history)                        | 1. Open a Key Meeting Notes detail screen from Communication history.<br>2. Check the source interaction reference and system fields. | The source interaction matches the interaction the notes were generated from; Created On/By and Updated On/By are shown.             | [link](https://app.clickup.com/t/z941abtw3j) | ✅        | ❌ not yet run   |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story describes
the same underlying record as `generate-key-meeting-notes.md` — its detail
screen and the Communication-history entry that opens it. Everything in
`key-meeting-notes.locators.ts` / `key-meeting-notes.page.ts` is a
best-guess, **not confirmed against a real running screen**. Specific
assumptions made for this story:

- The Key Meeting Notes "detail screen" itself (distinct from the
  Communication-history list) is modeled as its own dialog
  (`detailDialog`), opened by clicking a history entry — not a separate
  route. This mirrors how every other Sprint-2 detail-ish view in this
  codebase (Log a Communication, Activate/Deactivate reason + confirm
  dialogs) is modeled as a dialog rather than a dedicated page. This is the
  single most likely thing to need rework once seen live — the real screen
  may well be a full route (e.g.
  `/crm/customers/{id}/key-meeting-notes/{notesId}`) instead.
- "System fields" (Created On/By, Updated On/By) are located with a
  generic `systemField(label)` text lookup, the same shape
  `customer-detail.locators.ts`'s `fieldContainer()` uses for its own
  "{Label} • {value}" rows — unconfirmed whether Key Meeting Notes renders
  its system fields the same way.
- Action-item "owner" is modeled as a text badge matching `Owner: {name}`
  (`actionItemOwner()`) — a guess at the label format; the ClickUp text
  only says an owner must be captured "where applicable", not how it's
  displayed.
- Action items themselves are modeled as `role="listitem"` elements
  (`actionItem()`) — unconfirmed shape.

Before trusting a pass/fail from `15-view-key-meeting-notes.spec.ts`, run
it against a live `tilt up` stack or dev, fix locators (and very possibly
the dialog-vs-route assumption above) to match what's actually rendered,
and update this note the way `create-contact.md` and `create-customer.md`
were updated after their own first live runs.
