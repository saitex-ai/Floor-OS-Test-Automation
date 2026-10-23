# CRM — Lead Qualification Chatbot (Sprint 5)

- **User Story:** [Lead Qualification Chatbot](https://app.clickup.com/t/86eye4dt9)
- **Test-case set:** [CRM -Sprint -5 - Lead Qualification Chatbot](https://app.clickup.com/t/z941abytkq)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-22
- **Automated in:** [`tests/regression/crm/38-lead-qualification-chatbot.spec.ts`](../../tests/regression/crm/38-lead-qualification-chatbot.spec.ts)
- **Locators:** [`src/locators/crm/lead-qualification.locators.ts`](../../src/locators/crm/lead-qualification.locators.ts) (extended)
- **Page object:** [`src/pages/crm/lead-qualification.page.ts`](../../src/pages/crm/lead-qualification.page.ts) (extended)

## Data and run rules

- A Lead created by the suite can't get an AI dossier ("Get Dossier" on a
  test-created lead did nothing for 5+ minutes), so every TC that needs
  pointers uses **one seeded Lead with a dossier**:
  `webFormLeads.leadWithDossier` = **Highland Apparel Partners** (stage Lead)
  in `src/data/crm/seed-records.data.json`. Prompts are sent on it.
- **Every pointer a test enhances is reverted** in `afterEach` with "Revert to
  the previous wording", and every AI section is checked to read exactly as it
  did before the test. A failed revert is recorded as a `cleanup failed`
  annotation naming the pointer and fails the test.
- A test that enhances only starts when the Lead has no enhanced pointer;
  otherwise it skips and names the leftover count.
- Nothing else is written: no reviews, no Convert, no stage change.
- **Serial only.** The tests share that Lead, so the spec uses
  `mode: 'serial'`. Don't run it alongside anyone or anything else that
  enhances or reverts pointers on that Lead.
- Dev was slow on 2026-10-22 (35–60 s to render a Customer page, 20–70 s per
  AI reply), so the spec allows 12 min per test (20–30 min for TC:5/10/12) and
  long, commented waits in the page object.

Other records, read-only: `allFields` (Denim Co304, Lead B in TC:19, only its
chatbot is opened) and `convertedWithDossier` (Asiam, Qualified Lead, TC:23).

## How dev works (2026-10-22)

- The floating **Assistant** button opens a panel titled **AI Chatbot** with
  "Markup tool", "Change the assistant's size" and "Close the assistant", the
  hint "Want something improved? Ask directly, or use the markup tool.", the
  opening message "I generated the qualification sections for <Lead>. …", a
  "Prompt the AI Chatbot…" box and **Send** (disabled while empty).
- Markup on: hint "Markup on — choose the line you want to talk about." and a
  ⌖ button on every pointer, labelled with its section name. Picking one turns
  the tool off and shows "<Section>: <pointer>" with "Stop pointing at this
  line" above the prompt, whose placeholder becomes "How should this line
  change?".
- A targeted prompt makes the agent rewrite that line. The page saves it with
  `POST /api/crm/customers/:id/lead-dossier/enhancements` (locator, section,
  previous text, new text, prompt). The pointer then shows "New", "✦ Enhanced"
  and a "Revert to the previous wording" button
  (`POST …/enhancements/revert`).
- While a reply is pending the bubble shows "Working…" / "Writing the answer…",
  and both the prompt and Send are disabled.

## Test cases

| #     | Test case                                                                | Expected result (ClickUp)                                                     | ClickUp                                      | Automated                          | Dev result (2026-10-22)                                                                                                               |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1  | AI Chatbot Opens with an Opening Message Naming the Lead                 | Panel opens; opening message names the Lead; Markup tool, close, prompt, Send | [link](https://app.clickup.com/t/z941abytkr) | ✅                                 | ✅ passing ("Assistant" / "Send" wording)                                                                                             |
| TC:2  | Closing the Chatbot Keeps the Qualification Screen Intact                | Panel closes; sections unchanged; ⌖ controls gone; launcher back              | [link](https://app.clickup.com/t/z941abytkt) | ✅                                 | ✅ screen + sections intact; **BUG**: ⌖ controls stay on every pointer after closing                                                  |
| TC:3  | A General Prompt Is Answered Without Changing Any Content                | Prompt + answer in thread; no pointer changes, none marked ✦                  | [link](https://app.clickup.com/t/z941abytku) | ✅                                 | ✅ passing                                                                                                                            |
| TC:4  | Pressing Enter Sends the Prompt Like the Send Button                     | Sent, input clears, answer follows                                            | [link](https://app.clickup.com/t/z941abytkv) | ✅                                 | ✅ passing                                                                                                                            |
| TC:5  | Messages Appear in Order and the Thread Scrolls to the Latest            | Alternating order, newest at bottom; auto-scroll to new messages              | [link](https://app.clickup.com/t/z941abytkw) | ✅                                 | ✅ passing (scrolls so the newest bubble is in view)                                                                                  |
| TC:6  | Turning the Markup Tool On Shows Target Controls on Every Pointer        | Toggle on, instruction shown, ⌖ on every pointer in every section             | [link](https://app.clickup.com/t/z941abytkx) | ✅                                 | ✅ passing (hint wording differs)                                                                                                     |
| TC:7  | Turning the Markup Tool Off Removes the Target Controls                  | Toggle off, instruction gone, no ⌖                                            | [link](https://app.clickup.com/t/z941abytky) | ✅                                 | ✅ passing                                                                                                                            |
| TC:8  | Selecting a Pointer Attaches It as the Active Target                     | Chip "<Section>: <text>" with clear button; placeholder changes               | [link](https://app.clickup.com/t/z941abytm0) | ✅                                 | ✅ passing (clear-button / placeholder wording differs)                                                                               |
| TC:9  | A Targeted Prompt Refines Only That Pointer and Marks It Enhanced        | Response names the section; pointer refined and ✦; nothing else changes       | [link](https://app.clickup.com/t/z941abytm1) | ✅ (+ revert)                      | ✅ passing; reverted                                                                                                                  |
| TC:10 | Pointers in Every AI Section Can Be Refined                              | Each refinement lands in its own section, ✦; response names the section       | [link](https://app.clickup.com/t/z941abytm2) | ✅ (+ revert)                      | ✅ Contact/Customer/Financial refined + reverted; Product Range / Compatibility targeted only (no revert button — see Notes); partial |
| TC:11 | The Target Is Released After a Prompt Is Sent                            | Chip gone, placeholder back; next prompt doesn't refine again                 | [link](https://app.clickup.com/t/z941abytm3) | ✅ (+ revert)                      | ✅ passing; reverted                                                                                                                  |
| TC:12 | Each Prompt Is Shown in the Thread with the Target It Was Applied To     | In order; targeted prompts show their target, general prompt none             | [link](https://app.clickup.com/t/z941abytm4) | ✅ (+ revert)                      | ✅ passing (long targets shortened with "…"); reverted                                                                                |
| TC:13 | Selecting a Different Pointer Replaces the Target                        | One chip, for B; only B refined                                               | [link](https://app.clickup.com/t/z941abytm5) | ✅ (+ revert)                      | ✅ passing; reverted                                                                                                                  |
| TC:14 | Clearing the Target Makes the Next Prompt General                        | Chip gone, placeholder back; answer only, nothing refined                     | [link](https://app.clickup.com/t/z941abytm6) | ✅                                 | ✅ passing                                                                                                                            |
| TC:15 | Enhanced Pointers Stay in Place After Closing the Chatbot                | Screen intact; refined pointer still ✦                                        | [link](https://app.clickup.com/t/z941abytm8) | ✅ (+ revert)                      | ✅ passing; reverted                                                                                                                  |
| TC:16 | Enhanced Pointers Persist When the Lead Is Reopened                      | Still there and ✦ after reopen / reload / re-login                            | [link](https://app.clickup.com/t/z941abytm9) | ✅ reload + reopen; partial        | ✅ reload + reopen; partial: log out/in not exercised                                                                                 |
| TC:17 | Enhancements Are Recorded with the Prompting User and Prompt Text        | Audit record with user + prompt; original text still available                | [link](https://app.clickup.com/t/z941abytma) | ✅ request carries prompt; partial | ✅ request carries prompt + original; partial: no audit view in UI                                                                    |
| TC:18 | Target Controls Are Keyboard-Reachable with Accessible Labels            | Tab-reachable, labelled; Enter/Space attach the target                        | [link](https://app.clickup.com/t/z941abytmb) | ✅                                 | ✅ passing (labels are the section names)                                                                                             |
| TC:19 | The Conversation Is Kept for the Session on That Lead Only               | Lead A keeps its thread; Lead B starts fresh naming Lead B                    | [link](https://app.clickup.com/t/z941abytmc) | ✅                                 | ✅ passing                                                                                                                            |
| TC:20 | Send Is Unavailable Without a Prompt and Available Once Entered          | Empty/spaces: disabled, nothing sent; text: enabled; deleted: disabled        | [link](https://app.clickup.com/t/z941abytmg) | ✅                                 | ✅ passing (spaces-only keeps Send disabled)                                                                                          |
| TC:21 | A Second Prompt Cannot Be Sent While a Response Is Pending               | Pending state; Send unavailable; one response only                            | [link](https://app.clickup.com/t/z941abytmh) | ✅                                 | ✅ passing ("Working…" / "Writing the answer…")                                                                                       |
| TC:22 | AI Service Failure or Timeout Is Reported and Content Is Unchanged       | Clear failure message in thread; nothing changed; retry works                 | [link](https://app.clickup.com/t/z941abytmj) | ✅ via blocked request             | **BUG**: no failure message in the thread (prompt left with no reply); content unchanged; retry works; reverted                       |
| TC:23 | The Chatbot Is Not Available Once the Lead Is Converted                  | Content readable; chatbot can't open; no ⌖                                    | [link](https://app.clickup.com/t/z941abytmk) | ✅                                 | ✅ no Assistant button and no ⌖ on a Qualified Lead (not a bug either way)                                                            |
| TC:24 | A User Without AI Enhancement Permission Cannot Refine Content           | Chatbot/markup unavailable or refused; nothing changes                        | [link](https://app.clickup.com/t/z941abytmm) | fixme                              | fixme: no user without AI-enhancement permission                                                                                      |
| TC:25 | Closing the Chatbot While a Response Is Pending Leaves Content Unchanged | No error page; either fully refined ✦ or unchanged                            | [link](https://app.clickup.com/t/z941abytmn) | ✅ (+ revert if applied)           | ✅ consistent: on dev the refinement completed after closing, whole pointer refined ✦; reverted                                       |
| TC:26 | Long Prompts and Special Characters Are Handled                          | Shown exactly as typed, no HTML rendering; pointer refined ✦                  | [link](https://app.clickup.com/t/z941abytmp) | ✅ (+ revert)                      | ✅ passing; reverted                                                                                                                  |

Last full dev run (2026-10-23, `--workers=1`, serial, with the crm-setup login): 25 passed, 1 fixme (TC:24), 5.5 min. Afterwards the seeded Lead had no enhanced pointer (`enhancedLocators: []`). On 2026-10-22 (slow dev) the same suite took ~50 min.

## Notes for whoever picks this up next

**Bugs / functional differences found on dev (asserted as dev's current behaviour in `BUG:` steps or noted here):**

1. **⌖ target controls stay after closing the chatbot (TC:2).** Close the
   panel with the Markup tool on and every pointer keeps its ⌖ button.
   ClickUp expects them to disappear.
2. **AI-service failure isn't reported (TC:22).** With the assistant request
   blocked, the prompt sits in the thread with no reply and no error message;
   the input just becomes usable again. Content is unchanged and a retry works.
   (Seen once without blocking, too: a reply to an ordinary prompt never came
   and nothing was shown.)
3. **No revert for Product Range / Compatibility enhancements (TC:10).** An
   enhanced "Most expensive product" line or Compatibility row shows "✦
   Enhanced" but no "Revert to the previous wording" button (bullet rows in
   Contact Info / Customer Info / Financial Standpoint have one). Because the
   seeded dossier is shared, TC:10 only targets (doesn't send) those two
   sections. When tried once on 2026-10-22 both refinements landed correctly;
   they were then restored with the same revert endpoint the button uses
   (`POST …/lead-dossier/enhancements/revert`), since there's no UI control.
4. **No audit view (TC:17).** Nothing on the Lead shows who prompted an
   enhancement or the prompt text; the page's enhancement request does carry
   the prompt and the original wording.
5. **Chatbot on a Qualified Lead (TC:23).** Not shown on dev (Asiam). Team
   rule: chatbot/enhancement on a Qualified Lead is not a bug either way.

**Wording / UI-only differences (asserted with dev's wording, not bugs):**
"Assistant" (ClickUp "Open AI Chatbot"), "Send" ("Send prompt"), "Markup on —
choose the line you want to talk about." ("Markup ON — click ⌖ …"), "Stop
pointing at this line" ("Clear target"), "How should this line change?" ("How
should I enhance this pointer?"), "Working…" / "Writing the answer…"
("Thinking…"), ⌖ labelled with the section name ("Select for AI Chatbot"),
thread target shown with an icon and shortened with "…" when long, Markup tool
switches itself off once a line is picked.

**Other notes:**

- TC:24 needs a CRM user whose role has Lead Qualification but not AI
  enhancement; none is provisioned for automation.
- TC:16's log out / log in is skipped because it would end the saved session
  the suite shares.
- The AI's replies vary run to run. Refinements use "Rewrite this line so it
  starts with 'Note:' and keep every fact." so the change is always visible.
- Dev's shell sometimes took longer than `gotoAuthenticated()`'s fixed 60 s to
  sign in on 2026-10-22, and the `crm-setup` login timed out twice. The spec
  opens records with one retry (`tryOpenAndReadQualificationPatiently`), and
  the 2026-10-22 iteration runs used the saved session (`--no-deps`). On 2026-10-23 dev was fast and the normal login worked.
