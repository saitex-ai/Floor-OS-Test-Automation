# CRM — Lead Qualification screen (Sprint 4)

- **User Story / Test-case set:** [CRM-Sprint-4-Lead Qualification screen](https://app.clickup.com/t/z941abvd5t)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/26-lead-qualification-screen.spec.ts`](../../tests/regression/crm/26-lead-qualification-screen.spec.ts)
- **Locators:** [`src/locators/crm/lead-qualification.locators.ts`](../../src/locators/crm/lead-qualification.locators.ts)
- **Page object:** [`src/pages/crm/lead-qualification.page.ts`](../../src/pages/crm/lead-qualification.page.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: A Lead's Lead Qualification tab lets a Manager save a department review (Department, Manager, Score, Review text); saved reviews render as a list of rows.
- FR-2: The Convert Lead to Qualified Lead action unlocks once at least one department review has been saved.
- FR-3: Converting flips the Customer's CRM Stage from Lead to Qualified Lead while keeping review records intact for audit.
- FR-4: The Lead Qualification tab does not exist at all once a Customer's CRM Stage has moved past Lead.
- FR-5: Saving a department review with required fields blank is blocked with inline validation.
- FR-6: With zero saved reviews, Convert stays disabled with an explanatory tooltip.
- FR-7: An Executive-role user cannot convert a Lead — the Convert action is replaced with a Manager-only restriction note.

## Test cases

| #    | Test case                                                        | Steps                                                                                                    | Expected result                                                                                                   | ClickUp                                      | Automated                | Verified locally |
| ---- | ------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | -------------------------- | ------------------ |
| TC:1 | Verify successful saving and updating of a Department Review       | 1. Save a department review.<br>2. Edit that same review via its row's "Edit review" button.             | The review persists as a row; editing updates it in place — exactly one review per department, no duplicate.      | [link](https://app.clickup.com/t/z941abvd70) | ✅                        | ✅ passing         |
| TC:2 | Verify successful lead conversion by a Manager                     | 1. Save one department review.<br>2. Click Convert Lead to Qualified Lead.                               | CRM Stage flips Lead → Qualified Lead; review records stay intact (partial — see Notes).                          | [link](https://app.clickup.com/t/z941abvd72) | ✅ (partial, see Notes)  | ✅ passing         |
| TC:3 | Verify empty state for historic-data accounts                      | 1. Open the Lead Qualification tab of a past-Lead account.<br>2. Open it for a fresh, zero-review Lead.  | A clean, explanatory empty state — not broken/blank cards (see Notes — the "historic-data account" premise is corrected). | [link](https://app.clickup.com/t/z941abvd73) | ✅ (corrected, see Notes) | ✅ passing         |
| TC:4 | Prevent saving department review with missing fields                | 1. Leave every field blank.<br>2. Click Save.                                                            | Inline validation errors appear, blocking save and highlighting the offending fields.                              | [link](https://app.clickup.com/t/z941abvd74) | ✅                        | ✅ passing         |
| TC:5 | Prevent lead conversion when reviews are incomplete                 | 1. Inspect the Convert bar with zero reviews.<br>2. Attempt Convert.                                     | Convert stays disabled, with a real hover tooltip explaining the requirement (corrected wording — see Notes).      | [link](https://app.clickup.com/t/z941abvd77) | ✅ (corrected, see Notes) | ✅ passing         |
| TC:6 | Restrict conversion access for Executive role                       | 1. Log in as a seeded Executive user.<br>2. Open a Lead's Lead Qualification tab.                        | Convert is locked with an explicit Manager-only restriction note.                                                  | [link](https://app.clickup.com/t/z941abvjym) | ✅                        | ✅ passing         |

All 6 TCs confirmed passing for real, against a live `tilt up` local stack (2026-09-25).

## Notes for whoever picks this up next

**Corrections to the original ClickUp text, confirmed directly against the running app:**

- **Convert enables after the FIRST saved department review, for ANY one
  department** — not after all four ("Convert bar" chips), a finding
  already established before this story (`smoke-recent.spec.ts`) and
  reused here for TC:2/TC:5.
- **The Manager combobox is NOT filtered by Department.** TC:1's "select
  a manager filtered to that department" step doesn't hold — the same 5
  managers appear regardless of which department is selected.
- **Resubmitting the top-of-form fields for an already-reviewed
  department creates a SECOND, duplicate row**, not an in-place update.
  The real edit path is a saved row's own "Edit review" button.
- **The Lead Qualification tab is entirely ABSENT, not locked/gated,
  once CRM Stage has moved past "Lead"** — confirmed for both Qualified
  Lead and Prospect (`tabButton` has a real DOM count of 0, not merely
  hidden or disabled). TC:3's literal premise ("navigate to the tab of a
  historic-data account") is therefore unreachable — the tab simply isn't
  there to navigate to. The one genuinely reachable empty state is a
  fresh, zero-review Lead, which is what the test actually exercises.
- **TC:5's disabled-Convert tooltip is real** (a genuine hover-triggered
  `role=tooltip`), but reads **"At least one Manager's Review and Score
  must exist."** — not ClickUp's "all four department reviews are
  required," consistent with the one-review-unlocks-Convert finding.
- **TC:6 (Executive role):** the Convert button doesn't render at all for
  the seeded Executive user (`fayaz.ahmad`, via `CRM_EXECUTIVE_USER_LOCAL`/
  `CRM_EXECUTIVE_PASSWORD_LOCAL` in `.env`) — replaced by explicit text:
  *"Conversion is limited to Managers. You can read the dossier and add
  reviews, but not convert this lead."* Verified with a genuinely fresh,
  unauthenticated browser context logged in as that second identity (same
  pattern as `smoke-recent.spec.ts`'s "Login functionality" test), not
  the default cached Manager-ish session.

**TC:2 is real but partial, honestly scoped.** It covers everything CRM
genuinely shows: the stage flip and review records surviving conversion.
It does **not** assert three claims from the ClickUp text — a stage-log
entry naming actor/timestamp/trigger, a broadcast notification, or a
green completion banner naming the conversion date and acting user — all
three were actively checked for (full-page text dumps immediately after
conversion and polled for several seconds after, across the Lead
Qualification tab, the Customer's Overview tab, and the shell's
notification panel) and **none were observed anywhere** in this
environment. Same "real CRM-side coverage, documented partial" pattern as
TC:3 in `qualified-lead-to-prospect.md`. Treat this TC's "✅" as the real,
CRM-observable slice, not full ClickUp-text coverage — worth flagging to
product/dev if those three behaviors are actually expected to exist.

Before trusting a pass/fail from `26-lead-qualification-screen.spec.ts` on
a different environment, re-confirm the Executive test identity still
exists and update this note the same way `create-contact.md` and
`create-customer.md` were updated after their own first live runs.
