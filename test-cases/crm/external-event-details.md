# CRM — External Event Details screen (Sprint 3)

- **User Story / Test-case set:** [CRM-Sprint-3-External Event Details screen](https://app.clickup.com/t/z941abup9x)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-09-25
- **Automated in:** [`tests/regression/crm/23-external-event-details.spec.ts`](../../tests/regression/crm/23-external-event-details.spec.ts)
- **Locators:** [`src/locators/crm/external-events.locators.ts`](../../src/locators/crm/external-events.locators.ts)
- **Page object:** [`src/pages/crm/external-events.page.ts`](../../src/pages/crm/external-events.page.ts)

## Functional requirements (derived from the ClickUp TCs and confirmed against the running app)

- FR-1: An undecided ("Planning") External Event's Feedback Form and Leads tabs are gated until the event's status becomes Attended.
- FR-2: From a Planning event, the user can decide "To Attend", transitioning status to "To Attend" and exposing a "Mark Attended" action.
- FR-3: Marking an event Attended unlocks the Feedback Form and Leads tabs.
- FR-4: Submitting the Feedback Form on an Attended event stores the feedback and makes the Leads tab reachable for lead capture.
- FR-5: A Planning event's "Register Online" link opens the external registration URL in a new tab.
- FR-6: Declining an event ("Not Attending") requires at least one reason chip and a detailed-reason text field; submitting with either blank is blocked with a validation error.
- FR-7: Cancelling the decline flow discards the entered reason and leaves the event's status unchanged (still Planning).
- FR-8: An undecided event whose schedule passes without a decision automatically transitions to an "Elapsed" state (compound "Planning · Elapsed" while still undecided) — needs a real date-jump to verify (see TC:8).

## Test cases

| #    | Test case                                                          | Steps                                                                                                                 | Expected result                                                                                          | ClickUp                                      | Automated                | Verified locally                    |
| ---- | -------------------------------------------------------------------| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------- | ------------------------------------- |
| TC:1 | Verification of Initial Tab State for Planning Events               | 1. Open a genuinely undecided (not elapsed) Planning event.                                                          | Feedback Form and Leads tabs are gated (see Notes — not HTML-disabled, content-gated instead).           | [link](https://app.clickup.com/t/z941abuqpf) | ✅                        | ✅ passing (pool-dependent, see Notes) |
| TC:2 | Verify Successful Lifecycle Transition to "To Attend"                | 1. Open a fresh Planning event.<br>2. Click "To Attend".                                                              | Status updates to "To Attend"; "Mark Attended" becomes available.                                        | [link](https://app.clickup.com/t/z941abuqpg) | ✅                        | ✅ passing (pool-dependent, see Notes) |
| TC:3 | Verify Transition to "Attended" and Unlocking Restricted Tabs        | 1. Decide To Attend on a fresh Planning event.<br>2. Click "Mark Attended".                                           | Status transitions to Attended; Feedback Form and Leads tabs unlock.                                     | [link](https://app.clickup.com/t/z941abuqph) | ✅                        | ⏭️ skipped this run (pool exhausted)  |
| TC:4 | Verify Submission of Feedback Form and Lead Capture                  | 1. Attend a fresh Planning event.<br>2. Fill and submit the Feedback Form.<br>3. Open the Leads tab.                  | Feedback is stored (toast); Leads tab is reachable to reflect the capture.                                | [link](https://app.clickup.com/t/z941abuqpj) | ✅ (partial, see Notes)  | ⏭️ skipped this run (pool exhausted)  |
| TC:5 | Verify External Registration Link Redirection                        | 1. Open a fresh Planning event.<br>2. Click "Register Online".                                                        | Registration URL opens in a new browser tab.                                                              | [link](https://app.clickup.com/t/z941abuqpk) | ✅                        | ✅ passing (pool-dependent, see Notes) |
| TC:6 | Verify Decline Event Validation (Mandatory Reason Check)              | 1. Open a fresh Planning event.<br>2. Open "Not Attending".<br>3. Click Proceed with both fields blank.               | Blocked with both "Select at least one reason" and "Detailed reason is required" validation errors.      | [link](https://app.clickup.com/t/z941abuqpq) | ✅                        | ✅ passing (pool-dependent, see Notes) |
| TC:7 | Verify Cancellation of Decline Flow                                   | 1. Open a fresh Planning event.<br>2. Fill a decline reason and detail.<br>3. Click Cancel instead of Proceed.        | Dialog closes; event status stays Planning (no decline applied).                                          | [link](https://app.clickup.com/t/z941abv3gt) | ✅                        | ✅ passing (pool-dependent, see Notes) |
| TC:8 | Verify Automatic Expiration to Elapsed Status                        | 1. Have an undecided event whose schedule passes without a decision.                                                  | Status automatically transitions to (Planning ·) Elapsed.                                                 | [link](https://app.clickup.com/t/z941abv7fp) | ⏭️ `test.fixme()`        | ⏭️ skipped in ClickUp                 |

## Notes for whoever picks this up next

**Two genuine, confirmed corrections to the original automation, found by
actually running this spec against a live `tilt up` stack (2026-09-25):**

1. **Feedback Form/Leads tabs are never HTML-`disabled`.** The tab buttons
   are always clickable regardless of decision state —
   `toBeDisabled()`/`toBeEnabled()` always read `false`/`true` and are a
   no-op assertion either way. The real lock mechanism is **content
   gating**: clicking a locked tab on an undecided event shows
   `"The Feedback Form opens once this event's status is Attended."` (and
   the equivalent text for Leads) instead of the real form/list.
   `expectFeedbackAndLeadsLocked()`/`expectFeedbackAndLeadsUnlocked()`
   (`external-events.page.ts`) now assert on that gate text instead of the
   `disabled` attribute — the original TC:1/TC:3 automation was silently
   passing/no-op'ing on the wrong locator strategy before this fix.
2. **An already-Elapsed Planning event has no decision affordances at
   all** — no "To Attend", "Not Attending", or "Register Online". Worse,
   it also **unlocks Feedback Form/Leads early** (there's no more decision
   to gate, since the window to decide has passed) even though it was
   never actually Attended. TC:1/5/6/7 originally opened "whichever
   Planning row is first" via `openFirstRow()`, which non-deterministically
   landed on an elapsed row and produced false results (e.g. TC:1
   "confirming" unlocked tabs on an elapsed event, which happens to be
   true for the wrong reason). All 7 real TCs now go through
   `findFreshPlanningEvent()` (a genuinely undecided, not-elapsed event),
   not just the mutating ones.

**The fixed, non-replenishable Planning seed pool — read before re-running
this spec.** The Planning → decision lifecycle only applies to
AI-discovered events ("Generated by AI" tag); an event created manually
via "Create Event" (Sprint 4) saves straight to Attended with no decision
to make, so there is **no UI path to create a fresh Planning event**. This
environment's pool started at 3 Planning-tab events this session, 2
already elapsed — leaving exactly **one** genuinely fresh event
("Denim Days Festival NYC"). TC:2/3/4 each permanently consume one fresh
event by deciding it (even on a later assertion failure — the decision
itself is what mutates state, not the test's pass/fail). To verify every
TC for real against that single remaining event before it was gone, the
non-mutating TCs (1, 5, 6, 7 — opening an event, or a decline flow that
ends in Cancel, doesn't change its status) were run first and confirmed
passing, then the mutating ones (2, 3, 4) last: TC:2 passed for real and
consumed the last fresh event, after which TC:3/TC:4 correctly
`test.skip()`'d (pool exhausted) rather than failing or hanging — this is
expected, correct behavior per `findFreshPlanningEvent()`'s contract, not
a bug. A subsequent full run of this spec will show TC:1/2/3/4/5/6/7 all
skipping until the environment's Planning pool is reseeded — that's the
environment being genuinely out of fresh data, not a regression.

TC:4 additionally hands off lead capture to the same
Scan&Create/Create Customer flow already owned by `scan-create.page.ts`/
`create-customer.page.ts` elsewhere in this suite — it verifies the
Feedback Form save and that the Leads tab is reachable, not a second full
customer-creation run end to end.

TC:8 is marked `test.fixme()`, matching its **skip** status in ClickUp —
it needs a real server-time jump past an event's end date, which this
Playwright framework cannot simulate.

Before trusting a pass/fail from `23-external-event-details.spec.ts` on a
different environment or after time has passed, check the Planning tab's
current pool state first (`findFreshPlanningEvent()` returning `null` for
every TC is the pool being empty, not a regression) and update this note
the same way `create-contact.md` and `create-customer.md` were updated
after their own first live runs.
