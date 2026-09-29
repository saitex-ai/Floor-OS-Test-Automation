# CRM — Create External Event [created by user manually] (Sprint 4)

- **User Story / Test-case set:** [CRM-Sprint-4-Create External Event [created by user manually]](https://app.clickup.com/t/z941abvbkm)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/28-create-external-event.spec.ts`](../../tests/regression/crm/28-create-external-event.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: A "Create Event" action on the External Events List screen navigates to a dedicated Create External Event form.
- FR-2: The form requires Title, Venue, Date, About, and a full Feedback Form (SAITEX Attendees, Score, Number of Leads, "What went well?", "What could have been better?", "Attend next editions?") before it can be submitted.
- FR-3: Submitting a valid form persists the event with a unique system-generated reference and navigates to its own Details screen.
- FR-4: Submitting with mandatory fields blank blocks the save and flags each offending field individually.
- FR-5: Cancel discards all entered data and returns to the List screen without saving anything.
- FR-6: SAITEX Attendees is selected from a picker populated with SAITEX employees.

## Test cases

| #    | Test case                                                | Steps                                                                                                          | Expected result                                                                                     | ClickUp                                      | Automated | Verified locally |
| ---- | ----------------------------------------------------------| ---------------------------------------------------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------| --------------------------------------------- | --------- | ----------------- |
| TC:1 | Verify successful manual creation of an External Event    | 1. Fill Title/Venue/Date/About + the full Feedback Form.<br>2. Click Submit.                                    | The record persists with a unique reference; the user lands directly on the new event's Details screen. | [link](https://app.clickup.com/t/z941abvbkt) | ✅        | ✅ passing        |
| TC:2 | Prevent submission with blank mandatory fields             | 1. Leave every mandatory field blank.<br>2. Click Submit.                                                       | Save is blocked; every offending field is individually flagged; the user stays on the form.          | [link](https://app.clickup.com/t/z941abvbkv) | ✅        | ✅ passing        |
| TC:3 | Verify Cancel action functionality                         | 1. Click Cancel.                                                                                                 | Creation is safely aborted; entered data is discarded; the user is redirected away without saving.    | [link](https://app.clickup.com/t/z941abvbkx) | ✅        | ✅ passing        |
| TC:4 | Verify Successful Navigation via "Create Event" Action      | 1. Click the Create Event button/CTA on the list screen.                                                        | Transitions smoothly to the Create External Event form (Title/Venue/Date fields visible).            | [link](https://app.clickup.com/t/z941abvbkz) | ✅        | ✅ passing        |
| TC:5 | Verify Selecting an Attendee                                | 1. Open the SAITEX Attendees picker.<br>2. Select a valid attendee.                                             | The selected attendee populates the field (see Notes — the "search" premise is corrected).            | [link](https://app.clickup.com/t/z941abvbm1) | ✅        | ✅ passing        |

All 5 TCs confirmed passing, against a live `tilt up` local stack (2026-09-25).

## Notes for whoever picks this up next

**Corrections to the original ClickUp text, confirmed directly against the running app:**

- TC:2's actual validation is a mix, not a uniform "Required" everywhere:
  Title/Venue/Date/About/Score/"What went well?"/"What could have been
  better?"/"Attend next editions?" show a plain **"Required"** error (8
  total) — but **Number of Leads shows its "Numeric" format hint
  instead**, and SAITEX Attendees shows its own **"Select at least one
  attendee"** text. `requiredFieldErrors()` counts exactly the 8 plain
  "Required" errors; the other two are asserted separately.
- TC:5's ClickUp text describes a "type a name to search" attendee
  picker. Confirmed directly this doesn't exist: the SAITEX Attendees
  popup is a plain, **unsearchable `listbox` of exactly 5 fixed
  employees** (Alice Planner, Banupriya Palanivel, CRM Manager, SamuelRaj
  Suresh, Sathish Nagarajan) — typing into it does nothing, there's no
  search/filter input anywhere in the popup. Automated as "select a valid
  attendee from the list" instead of "search then select."
- Cancel navigates straight back to `/crm/events` (the List screen) with
  no confirmation prompt — confirmed directly by typing into the Title
  field, clicking Cancel, and confirming the event never appears in the
  list afterward.

Before trusting a pass/fail from `28-create-external-event.spec.ts` on a
different environment, re-confirm the 5-employee SAITEX Attendees roster
(TC:5 hardcodes "Alice Planner") and update this note the same way
`create-contact.md` and `create-customer.md` were updated after their own
first live runs.
