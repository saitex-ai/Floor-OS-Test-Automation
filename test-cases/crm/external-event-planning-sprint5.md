# CRM — External Event Planning (Sprint 5)

- **User Story / Test-case set:** [CRM -Sprint -5 - External Event Planning](https://app.clickup.com/t/z941abyq77) (user story: [External Event Planning](https://app.clickup.com/t/86eye4du0))
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Automated in:** [`tests/regression/crm/36-external-event-planning.spec.ts`](../../tests/regression/crm/36-external-event-planning.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts) (Planning tab section)

## Functional requirements (from the ClickUp set, checked against dev)

- FR-01: The user reaches External Event Details through SSO → Floor OS → CRM, and it opens on the Planning tab.
- FR-02: Header shows title, event ID, status and "Event: External Event · <type> · <date> · <venue>"; System section is read-only.
- FR-03: An Owner drop-down lists CRM users and saves the selection. **Not on dev.**
- FR-04–FR-08: AI artifacts: External Event Summary, Participant Summary, Visitor Summary, Sales Potential Report, Participation Plan. **Only the first three are on dev**, plus External Event Schedule and Contact Details.
- FR-10: Register Online is shown only when an online registration exists, and opens it in a new tab.
- FR-11: External Event's Contact Details are shown, or hidden when there are none.
- FR-12/FR-13: To Attend (Planning only) changes the status, persists, notifies managers and is logged.
- An elapsed Planning event shows "Planning · Elapsed" and a banner. An "Other" (manual) event has an Overview tab instead of Planning.

## Test cases

| #     | Test case                                                                 | Expected result (short)                                               | ClickUp                                      | Automated    | Dev result (2026-10-15)                                                                     |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| TC:1  | Verify Navigation to External Event Details via SSO                       | No separate CRM login; Details opens on Planning                      | [link](https://app.clickup.com/t/z941abyq7a) | ✅           | ✅ pass                                                                                     |
| TC:2  | Verify External Event Header Details                                      | Title, event ID, status, Event line; read-only System section         | [link](https://app.clickup.com/t/z941abyq7c) | ✅           | ✅ pass with a BUG step: no event ID shown                                                  |
| TC:3  | Verify Event Value for Each Event Type                                    | Header and System Event value match the List, per type                | [link](https://app.clickup.com/t/z941abyq7d) | ✅           | ⏭️ fixme: Trade Fair/Fashion Show/Exhibition verified; no Sales Summit event on dev         |
| TC:4  | Verify Owner Drop-down List                                               | Owner drop-down lists users, selection persists                       | [link](https://app.clickup.com/t/z941abyq7e) | ✅           | ⏭️ fixme: no Owner control on dev, confirm scope                                            |
| TC:5  | Verify AI-Generated Planning Artifacts Are Displayed                      | All 5 AI artifacts + Schedule + Contact Details shown with content    | [link](https://app.clickup.com/t/z941abyq7f) | ✅           | ⏭️ fixme: 5 sections verified; Sales Potential Report and Participation Plan absent         |
| TC:6  | Verify AI Artifacts Match the Selected Event                              | Each event shows its own AI content                                   | [link](https://app.clickup.com/t/z941abyq7h) | ✅           | ✅ pass                                                                                     |
| TC:7  | Verify Register Online When Online Registration Exists                    | Button + "Online registration exists — <site>"; new tab; confirmation | [link](https://app.clickup.com/t/z941abyq7j) | ✅           | ✅ pass with a BUG step: no "Redirected…" confirmation                                      |
| TC:8  | Verify Register Online Is Hidden When No Online Registration Exists       | No button/note; rest of the tab works                                 | [link](https://app.clickup.com/t/z941abyq7r) | ✅           | ✅ pass                                                                                     |
| TC:9  | Verify External Event Contact Details Are Displayed                       | Contact details shown for the event                                   | [link](https://app.clickup.com/t/z941abyq7u) | ✅           | ✅ pass                                                                                     |
| TC:10 | Verify Contact Details Section Is Hidden When No Contact Details Exist    | Section hidden; To Attend still works                                 | [link](https://app.clickup.com/t/z941abyq7v) | ✅           | ✅ pass with a BUG step: section shown with a placeholder; To Attend part not run           |
| TC:11 | Verify Marking an External Event as To Attend                             | Confirmation; status → To Attend; Mark Attended + Not Attending       | [link](https://app.clickup.com/t/z941abyq7w) | ⏭️           | ⏭️ fixme: no Planning event this suite can change (see Notes)                               |
| TC:12 | Verify To Attend Status Is Reflected in the External Events List          | Listed under To Attend; counts +1/-1                                  | [link](https://app.clickup.com/t/z941abyq7x) | ✅ (partial) | ⏭️ fixme after the read-only checks (count = rows, all To Attend, none in Planning)         |
| TC:13 | Verify To Attend Status Persists                                          | To Attend survives reload/re-login; Updated On/By                     | [link](https://app.clickup.com/t/z941abyq7y) | ✅ (partial) | ✅ pass, read-only on an existing To Attend event                                           |
| TC:14 | Verify Manager Notification and Audit Trail on To Attend                  | Manager in-app + email notification; audit log                        | [link](https://app.clickup.com/t/z941abyq7z) | ⏭️           | ⏭️ fixme: needs a To Attend transition and a mailbox; no audit log on dev                   |
| TC:15 | Verify AI Artifact Generation Failure Handling                            | Failed artifact shows a message; rest works                           | [link](https://app.clickup.com/t/z941abyq81) | ✅           | ✅ pass (the To Attend click is not run)                                                    |
| TC:16 | Verify To Attend Is Not Offered for Events Not in Planning                | To Attend/Attended/Not Attending events show the right buttons/notes  | [link](https://app.clickup.com/t/z941abyq83) | ✅           | ✅ pass                                                                                     |
| TC:17 | Verify Elapsed External Event Behaviour                                   | "Planning · Elapsed", banner, Elapsed tab; To Attend rule             | [link](https://app.clickup.com/t/z941abyq84) | ✅           | ✅ pass: dev blocks it (no status buttons)                                                  |
| TC:18 | Verify Access Is Restricted Without SSO Session or External Events Rights | No session → SSO login, no data; no rights → menu/URL denied          | [link](https://app.clickup.com/t/z941abyq85) | ✅ (partial) | ⏭️ fixme after the no-session checks pass; restricted user not in `.env`                    |
| TC:19 | Verify Double-Click on To Attend Updates Once                             | Single update/confirmation/notification                               | [link](https://app.clickup.com/t/z941abyq86) | ⏭️           | ⏭️ fixme: no Planning event this suite can change                                           |
| TC:21 | Verify Planning Tab Content for an "Other" Type Event                     | Overview tab, fields + System, no AI artifacts; status buttons work   | [link](https://app.clickup.com/t/z941abyq88) | ✅           | ✅ pass (creates its own manual event; it has no status buttons because it's born Attended) |

## Notes

- **No To Attend transition can be tested on dev.** The Planning tab holds only
  "Planning · Elapsed" AI events, which offer no status buttons. A manual
  "Create Event" is always saved as type "Other", status "Attended". This suite
  never changes AI or seeded events, so TC:11/14/19 are fixme. TC:12/13/15/10
  run their read-only parts against existing events.
- **Event types on dev:** Trade Fair, Exhibition, Fashion Show (AI) and Other (manual). There is no Sales Summit event.
- **Failed AI artifacts** keep their card and show "Unfortunately, no relevant
  information is available for the <section> online." This is also why the
  Contact Details section is never hidden (TC:10).
- **Header vs System status:** an elapsed event shows "Planning · Elapsed" in
  the header and "Elapsed" in the System section.
- Seeded data has duplicate titles (two "Kingpins Amsterdam", one To Attend and
  one Attended), so the helpers pick events by List tab and Type column, not by title.

## Discrepancies to confirm with the team (asserted as `BUG:` steps)

1. TC:2: no event ID (e.g. EV-2026-019) appears anywhere on the Details screen.
2. TC:7: clicking Register Online opens the link but shows no "Redirected to the event's online registration page" confirmation.
3. TC:10: when there are no contact details, the Contact Details section shows a placeholder message instead of being hidden (AC-08).

**TC:20 removed (2026-10-15):** "Verify Opening an External Event That Does Not Exist" was dropped from this set as a duplicate. An unknown event ID shows a load error with no back link, which is expected: CRM screens don't provide back links.
