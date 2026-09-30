# CRM — Qualified Lead -> Prospect (Sprint 2)

- **User Story:** [Qualified Lead -> Prospect](https://app.clickup.com/t/86eye4dtg) — as an Owner, I want a
  Qualified Lead to be automatically converted to a Prospect in the CRM when
  the first-ever Sample Request is created for that lead in Floor OS, and to
  be notified in-app and by email, so that lead lifecycle progression is
  captured in real time without manual status updates.
- **Test-case set:** [CRM-Sprint-2-Qualified Lead -> Prospect](https://app.clickup.com/t/z941abtajf)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/18-qualified-lead-to-prospect.spec.ts`](../../tests/regression/crm/18-qualified-lead-to-prospect.spec.ts)
- **Page object:** [`src/pages/crm/qualified-lead-to-prospect.page.ts`](../../src/pages/crm/qualified-lead-to-prospect.page.ts)

## Functional requirements (from the User Story)

- FR-1: When the first-ever Sample Request is created for a Qualified Lead
  in Floor OS, the system shall automatically convert that Qualified Lead
  to a Prospect in the CRM.
- FR-2: Upon conversion, the system shall generate a system notification
  for the Owner.
- FR-3: Upon conversion, the system shall send an email notification to
  the Owner.
- FR-4: On click of the CRM system notification, redirect the Owner to the
  Customer Details screen.
- FR-5: On click of the hyperlink in the email notification, redirect the
  Owner to the Customer Details screen.
- FR-6: Conversion triggers only on the first Sample Request; subsequent
  Sample Requests do not re-trigger conversion or duplicate notifications.

## Test cases

| #    | Test case                                                                                           | Steps                                                                                                                  | Expected result                                                                               | ClickUp                                      | Automated                      | Verified locally       |
| ---- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------ | ---------------------- |
| TC:1 | Verify automatic conversion of Qualified Lead to Prospect upon first Sample Request creation        | 1. Have a Qualified Lead with no prior Sample Requests.<br>2. Create the first-ever Sample Request for it in Floor OS. | The record auto-converts to Prospect in CRM.                                                  | [link](https://app.clickup.com/t/z941abtajg) | ⚠️ best-effort, `test.fixme()` | ❌ blocked (see Notes) |
| TC:2 | Verify generation of in-app system and email notifications to Lead Owner                            | 1. Trigger the conversion (TC:1).<br>2. Check for an in-app system notification and an email for the Owner.            | A system notification exists for the Owner; an email notification has been sent to the Owner. | [link](https://app.clickup.com/t/z941abtajh) | ⚠️ best-effort, `test.fixme()` | ❌ blocked (see Notes) |
| TC:3 | Verify redirection to Customer Details screen via CRM system notification                           | 1. Trigger the conversion.<br>2. Click the resulting CRM system notification.                                          | The Owner is redirected to the Customer Details screen for that record.                       | [link](https://app.clickup.com/t/z941abtajj) | ✅ (partial, see Notes)        | ✅ passing (partial)   |
| TC:4 | Verify redirection to Customer Details screen via email notification hyperlink                      | 1. Trigger the conversion.<br>2. Click the hyperlink in the resulting email notification.                              | The Owner is redirected to the Customer Details screen for that record.                       | [link](https://app.clickup.com/t/z941abtajk) | ⏭️ `test.skip()`               | ⏭️ skipped in ClickUp  |
| TC:5 | Verify negative/edge behavior on subsequent Sample Requests (no duplicate conversion/notifications) | 1. Convert a Lead to Prospect via a first Sample Request.<br>2. Create a second Sample Request for the same record.    | No re-conversion occurs; no duplicate notification is generated.                              | [link](https://app.clickup.com/t/z941abtajm) | ⚠️ best-effort, `test.fixme()` | ❌ blocked (see Notes) |
| TC:6 | Verify system behavior when Sample Request creation fails or is cancelled in Floor OS               | 1. Attempt to create a Sample Request for a Qualified Lead.<br>2. Cause it to fail or cancel it before it completes.   | No conversion occurs and no notification is generated for the incomplete/failed attempt.      | [link](https://app.clickup.com/t/z941abtcgb) | ⚠️ best-effort, `test.fixme()` | ❌ blocked (see Notes) |

## Notes for whoever picks this up next

**Update (2026-09-22):** ran against a local `tilt up` stack (logged in as
`alice`). Two things confirmed and fixed:

- `crmStage: 'Prospect'` **is** a real CRM Stage combobox option (a
  Customer created via `CreateCustomerPage` with that value round-tripped
  correctly) — only `'Qualified Lead'` remains unconfirmed.
- The CRM Stage field row renders exactly like every other
  Profile/Management field: one text node `"CRM Stage • Prospect"` (a
  bullet separator, not whitespace) — `expectCrmStage()` now scopes to
  `crmStageRow()` and asserts with `toContainText()` instead of a
  whole-page regex.
- The notification popover carries **no** `dialog`/`menu` role at all —
  its content (`"Inbox"`, `"Notification actions"`,
  `"Notification preferences"` buttons, `"No notifications yet."` text)
  sits flat in the accessibility tree. `notificationPanel` now locates the
  `"Notification preferences"` button as its open/visible marker instead.

With both fixes, TC:3 passes for real (its documented "partial" scope
still applies — see below). TC:1/2/5/6 remain fixme'd for the reason
below; they were skipped, not run, since they still need the cross-module
trigger.

**This story's trigger lives outside CRM, and that's the whole blocker.**
Unlike every other CRM Sprint-2 story so far, the event that's supposed to
be verified here — creating the first-ever Sample Request for a Qualified
Lead — happens in Floor OS's **Sample Request** module, not CRM. CRM only
receives the _result_: the status flip to Prospect, an in-app notification,
an email, and a redirect on click. This framework is deliberately built so
one QA owns one module end to end (`tests/<module>/`, `src/pages/<module>/`,
`src/fixtures/<module>.fixtures.ts` — see ONBOARDING.md), so there is no
Sample-Request-creation page object anywhere in this repo for CRM QA to call,
and none is wired into `src/fixtures/crm.fixtures.ts`. Concretely, that
means TC:1, TC:2, TC:5, and TC:6 all need a real Sample Request to be
created (or deliberately failed/cancelled, or created a second time) before
anything meaningful can be asserted, and this spec has no way to do that.

Rather than force a false pass by skipping the trigger and asserting
against nothing (or against data that was never really converted), each of
those four is written as best-effort CRM-side automation — it seeds a
Customer at the relevant CRM Stage via `CreateCustomerPage` and checks what
CRM alone can observe (the CRM Stage field, the notification bell/panel) —
but is marked `test.fixme(true, '<reason>')` with the cross-module gap
spelled out in the reason string, the same honesty pattern used for TC:10
in `11-create-contact.spec.ts` (marked fail/unconfirmed rather than forced
to a false pass). Unblocking them needs one of:

- A cross-module fixture (a Sample-Request-creation page object/API helper
  shared with whichever QA owns that module), or
- A pre-seeded test Lead-with-Sample-Request already sitting on the target
  environment, so CRM QA can at least verify the _result_ state without
  performing the trigger itself.

TC:3 is written as a real (non-`fixme`) test, but only partially covers its
own ClickUp text: since a Prospect-stage Customer already existing is a
valid CRM-only precondition, it seeds one directly via `CreateCustomerPage`
(`crmStage: 'Prospect'`, standing in for the record's state right after a
real conversion) and verifies the two CRM-side pieces this module can
observe on its own — the Customer Details screen (the redirect's
destination) correctly renders CRM Stage: Prospect, and the notification
bell/panel opens. It does **not** confirm that clicking a genuine
conversion-generated notification performs the redirect end to end — that
still needs the cross-module trigger described above. Treat its "✅" as
"real CRM-side coverage of what's reachable without the trigger", not "full
TC:3 coverage".

TC:4 is already marked **skip** in ClickUp, reflected here and in the spec
via `test.skip(true, 'Marked skip in ClickUp')` rather than the cross-module
`test.fixme()` reasoning used for the others — a deliberate distinction (a
product decision to not test this path yet, not a framework limitation).

Also unconfirmed, independent of the cross-module gap:

- Whether "Qualified Lead" is the literal CRM Stage combobox option text
  (`'Prospect'` is now confirmed — see the Update above).
- The notification panel's _contents_ once it actually has a real
  notification in it — only its empty state ("No notifications yet.") has
  been observed so far, since nothing here can fire a real conversion.
  `notificationEntry()` searches the whole page rather than a scoped
  container until a real entry has been seen to re-scope against.
- Email notification delivery/hyperlink (FR-3/FR-5) can't be automated at
  all from this Playwright spec as-is — there's no email-inbox fixture in
  this framework. Needs a mailbox-testing tool (e.g. Mailosaur/Mailtrap API)
  wired in separately, which is also why TC:4 is a reasonable one to have
  already been marked skip in ClickUp.

Before trusting a pass/fail from `18-qualified-lead-to-prospect.spec.ts`,
run it against a live `tilt up` stack or dev, fix locators to match what's
actually rendered, and update this note the way `create-contact.md` and
`create-customer.md` were updated after their own first live runs.
