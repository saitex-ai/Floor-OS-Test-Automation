# CRM — Log a Communication (Sprint 2)

- **User Story:** [Log a communication](https://app.clickup.com/t/86eye4dtd) — this user story covers the
  manual logging of communications (calls, meetings, discussions) held with a
  Customer or Contact. The user reaches the CRM through SSO via Floor OS,
  navigates to the Communication section of the Customer/Contact Details
  screen, and invokes the Communication Logging screen via the "Log a
  Communication" button. The user captures medium, date and time, title,
  reason, communicator, and minutes of meeting (MOM), then saves — the
  communication is stored against that Customer/Contact record.
- **Test-case set:** [CRM - Sprint 2 - Log a communication](https://app.clickup.com/t/z941abtafh)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/13-log-a-communication.spec.ts`](../../tests/regression/crm/13-log-a-communication.spec.ts)
- **Page object:** [`src/pages/crm/log-communication.page.ts`](../../src/pages/crm/log-communication.page.ts)

**Update (2026-09-22):** ran against a local `tilt up` stack. Confirmed the
Customer Details screen's **Communication tab is currently an unbuilt
scaffold** on this environment ("Tab content — not built yet." /
"Scaffold placeholder — no screen built yet.") — not a locator guess gone
wrong, a genuine environment/product gap. `LogCommunicationPage.openFromCustomerDetail()`
now detects this placeholder right after switching tabs and `test.skip()`s
every TC with a clear reason instead of timing out. All 8 TCs currently
skip for this reason. Re-run once the Communication tab actually ships a
screen.

## Functional requirements (from the User Story)

- FR-1.1: "Log a Communication" button in the Communication section.
- FR-1.2: Clicking it displays the Communication Logging screen.
- FR-1.3: Screen fields: Communication Medium (dropdown), Date and Time
  (slider controls), Communication Title (free text), Communication Reason
  (dropdown), Communicator (dropdown), MOM (free text).
- FR-1.4: Dropdowns populated from configured master/reference data.
- FR-1.5: Save button present.
- FR-1.6: Save persists the record against the selected Customer/Contact.
- FR-1.7: Saved communication retrievable from the Communication section.

## Test cases

| #    | Test case                                                           | Steps                                                                                                       | Expected result                                                                                            | ClickUp                                      | Automated | Verified locally |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------- |
| TC-1 | Verify display of "Log a Communication" screen and components       | 1. Open a Customer/Contact Details screen.<br>2. In the Communication section, click "Log a Communication". | Logging screen opens showing Medium, Date/Time, Title, Reason, Communicator, MOM fields and a Save button. | [link](https://app.clickup.com/t/z941abtafn) | ✅        | ❌ not yet run   |
| TC-2 | Verify dropdown options population from Master Data                 | 1. Open the Logging screen.<br>2. Open the Medium, Reason, and Communicator dropdowns.                      | Each dropdown lists the options configured in master/reference data.                                       | [link](https://app.clickup.com/t/z941abtafp) | ✅        | ❌ not yet run   |
| TC-3 | Verify successful saving and audit stamping of logged communication | 1. Fill all fields with valid values.<br>2. Click Save.                                                     | Record saves; created-by user and created date/time are stamped on the record.                             | [link](https://app.clickup.com/t/z941abtafq) | ✅        | ❌ not yet run   |
| TC-4 | Verify retrieval and display of saved communication log             | 1. Save a communication (TC-3).<br>2. Return to the Communication section.                                  | The saved communication appears in the Communication section's list with its captured details.             | [link](https://app.clickup.com/t/z941abtafr) | ✅        | ❌ not yet run   |
| TC-5 | Verify Save button functionality and database persistence           | 1. Fill all mandatory fields.<br>2. Click Save.                                                             | Save succeeds and the record persists (confirmed by re-opening the Communication section / reloading).     | [link](https://app.clickup.com/t/z941abtaft) | ✅        | ❌ not yet run   |
| TC-6 | Verify Date and Time adjustment via slider controls                 | 1. Open the Logging screen.<br>2. Adjust the Date slider and the Time slider.                               | The Date and Time fields reflect the adjusted slider values.                                               | [link](https://app.clickup.com/t/z941abtafu) | ✅        | ❌ not yet run   |
| TC-7 | Validation / Negative — Verify mandatory field validation on Save   | 1. Open the Logging screen.<br>2. Leave one or more mandatory fields blank.<br>3. Click Save.               | Save is blocked; the offending mandatory field(s) are flagged.                                             | [link](https://app.clickup.com/t/z941abtafv) | ✅        | ❌ not yet run   |
| TC-8 | Verify Cancel / Close action without saving                         | 1. Open the Logging screen and enter some values.<br>2. Click Cancel/Close instead of Save.                 | The screen closes; nothing is persisted; no entry appears in the Communication section.                    | [link](https://app.clickup.com/t/z941abtag4) | ✅        | ❌ not yet run   |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story's screen
(Customer/Contact Details → Communication section → "Log a Communication")
doesn't exist yet as automated CRM coverage in this repo (only
Create/Activate/Deactivate Customer and Create/Edit Contact are confirmed
so far — see `customer-detail.md`/`create-contact.md`). Everything in
`log-communication.locators.ts` / `log-communication.page.ts` is a
best-guess derived from this ClickUp text and this framework's established
UI patterns (combobox popups, `[data-sonner-toast]` toasts, dialog-scoped
buttons), **not confirmed against a real running screen**. In particular:

- The entry point is assumed to be a button labeled exactly "Log a
  Communication" inside a "Communication" section on the existing
  `CustomerDetailPage` route (`/crm/customers/{uuid}`) — unconfirmed
  whether that section exists yet, and unconfirmed for the Contact Details
  equivalent.
- "Date and Time — slider controls" is an unusual pattern for entering a
  date/time (most UIs use a picker) — implemented here as a best guess
  (`role=slider` elements adjusted via arrow-key presses). This is the
  single most likely thing to need rework once seen live.
- Field labels (Communication Medium/Title/Reason/Communicator/MOM) are
  taken verbatim from the ClickUp FR text; real accessible names may
  differ once confirmed.

Before trusting a pass/fail from `13-log-a-communication.spec.ts`, run it
against a live `tilt up` stack or dev, fix locators to match what's
actually rendered, and update this note the way `create-contact.md` and
`create-customer.md` were updated after their own first live runs.
