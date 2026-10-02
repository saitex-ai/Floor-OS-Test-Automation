# Techpack — New Techpack (AI Mode)

- **User Story:** As a Techpack user, I want to upload an existing techpack document and have AI
  extract its data automatically, confirming any fields it can't resolve with confidence, so I
  don't have to enter everything by hand.
- **Test-case set:** not yet created in ClickUp (no ClickUp task exists for this story at time of
  writing — the "ClickUp" column below is left blank rather than filled with placeholder links).
- **Automated in:** [`tests/regression/techpack/03-create-techpack-ai-mode.spec.ts`](../../tests/regression/techpack/03-create-techpack-ai-mode.spec.ts)
- **Page object:** [`src/pages/techpack/ai-mode-copilot.page.ts`](../../src/pages/techpack/ai-mode-copilot.page.ts)
- **Fixtures:** genuine, byte-unmodified techpack PDFs at
  [`tests/regression/techpack/fixtures/`](../../tests/regression/techpack/fixtures/):
  `wpa-60323517-sign-off.pdf` (TC:8, and Canvas Review TC:16) and `sample-techpack.pdf`
  (Classic-form creates in the other suites). Keep them unmodified — see the notes below.

Per team direction, verified against both dev.flooros.app and the local `tilt up` stack — see
[`techpack-list.md`](./techpack-list.md) for the shared environment notes that apply here too.
**Locally, the copilot backend itself is currently down** (see notes) — every case here that
needs a draft session to actually start skips locally with a clear reason rather than failing.
**This whole suite must run with a single worker** (`--workers=1`), enforced in-file via
`test.describe.configure({ mode: 'serial' })` — see notes.

| #     | Test case                                                                             | Steps                                                                                              | Expected result                                                                                                                                                                                                                                                                                                                                                            | ClickUp | Automated | Verified (uat)                                                                     | Verified (dev)                                             | Verified (local)                                       |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| TC:1  | Verify the AI Mode landing screen layout                                              | 1. From the Techpacks list, click "New Techpack" (default action).                                 | The copilot upload screen opens: `h1 "New techpack"`, a 4-step "Progress" list (Upload/Review details/Extract/Open draft), a "Use the manual form" link (→ `/techpacks/new`), a greeting ("Hi!"), a PDF/Excel dropzone, "Close" link.                                                                                                                                      | —       | ✅        | ✅ pass (2026-09-29)                                                               | ✅ passing (2026-09-08, heading text corrected 2026-09-25) | ✅ passing (2026-09-08)                                |
| TC:2  | Verify the file input restricts to PDF/Excel                                          | 1. Open AI Mode.<br>2. Check the file input's accept filter.                                       | The input accepts only `.pdf`, `.xlsx`, `.xls` (and their MIME types).                                                                                                                                                                                                                                                                                                     | —       | ✅        | ✅ pass (2026-09-29)                                                               | ✅ passing                                                 | ✅ passing                                             |
| TC:3  | Verify "Close" returns to the Techpacks list                                          | 1. Open AI Mode.<br>2. Click "Close".                                                              | Back on the Techpacks list.                                                                                                                                                                                                                                                                                                                                                | —       | ✅        | ✅ pass (2026-09-29)                                                               | ✅ passing                                                 | ✅ passing                                             |
| TC:4  | Verify uploading a non-PDF/Excel file is rejected                                     | 1. Open AI Mode.<br>2. Upload a `.txt` file.                                                       | **Updated 2026-10-01**: the file is rejected up front with a specific message — `"<file name>" is not a supported file - upload a PDF or Excel (.xlsx, .xls).` — and "Start extraction" never appears. (Before 2026-10-01 this showed a generic "Something went wrong starting the draft session. Please retry." with a Retry button; the dev team has since replaced it.) | —       | ✅        | ✅ pass (2026-10-01, new message)                                                  | ✅ passing                                                 | ✅ passing (same message, different cause — see notes) |
| TC:5  | Verify uploading a valid file surfaces "Start extraction", then the 7 required fields | 1. Open AI Mode.<br>2. Upload a valid PDF.<br>3. Click "Start extraction".                         | The file is listed with "Start extraction" ready (upload no longer auto-starts extraction — 2026-09-29 redesign). Once clicked, a chat panel appears with a "Current step" region listing all **7** required fields (Sample Request is no longer one of them — see notes).                                                                                                 | —       | ✅        | ✅ pass (2026-09-29)                                                               | 🔲 not re-run since redesign                               | ⏭️ skipped (see note)                                  |
| TC:6  | Verify "Create draft" is disabled until all 7 required fields are filled              | 1. Upload a file, reach the "Current step" panel.<br>2. Leave fields empty.                        | "Create draft" is disabled. Filling all **7** required fields enables it, without ever touching Sample Request.                                                                                                                                                                                                                                                            | —       | ✅        | ✅ pass (2026-09-29)                                                               | 🔲 not re-run since redesign                               | ⏭️ skipped (see note)                                  |
| TC:7  | Verify the duplicate-identity check applies in AI Mode too                            | 1. Create a draft with a given identity.<br>2. Attempt another draft with the exact same identity. | A "There's already a techpack — TP..." message appears in the chat (not a modal, unlike the Classic form).                                                                                                                                                                                                                                                                 | —       | ⏭️        | ⏭️ deliberately skipped — blocked on TC:8 (see note)                               | ⏭️ deliberately skipped (see note)                         | ⏭️ deliberately skipped (see note)                     |
| TC:8  | Verify successful draft creation with all required fields filled                      | 1. Fill all 7 required fields with a fresh identity.<br>2. Click "Create draft".                   | The draft is created (navigates away from the blank copilot URL), or — if this exact file was already draft-created in this environment's data — "This file is already in floorOS" with a working "Open" link.                                                                                                                                                             | —       | ✅        | ✅ pass (2026-10-01, after dev fix; WPA-60323517 sign-off PDF, 3 runs) — see notes | ✅ passing pre-redesign (2026-09-08)                       | ⏭️ skipped (see note)                                  |
| TC:9  | Verify "Use the manual form" jumps straight to the Classic form                       | 1. Open AI Mode.<br>2. Click "Use the manual form".                                                | Navigates to `/techpacks/new` — same Classic form as the chevron path.                                                                                                                                                                                                                                                                                                     | —       | ✅        | ✅ pass (2026-09-29)                                                               | 🔲 not yet run                                             | 🔲 not yet run                                         |
| TC:10 | Verify the 4-step Progress stepper is visible on the upload screen                    | 1. Open AI Mode (step 1, "Upload").                                                                | The stepper (Upload/Review details/Extract/Open draft) is visible with all 4 steps listed.                                                                                                                                                                                                                                                                                 | —       | ✅        | ✅ pass (2026-09-29)                                                               | 🔲 not yet run                                             | 🔲 not yet run                                         |

## Notes for whoever picks this up next

Last updated 2026-09-07, after a long debugging pass that fixed several real bugs and settled
TC:7 as a deliberate, documented skip (not a bug to keep chasing).

**Locally, the copilot backend fails to start a draft session on every upload, regardless of
file validity** — but _how long it takes to surface that failure is highly variable_, anywhere
from ~15s to well over 60s across runs. An early version of this suite guessed a fixed timeout
(15s, then 30s) to decide "is this environment blocked", and both guesses were eventually proven
wrong by a run that took longer — the test then ran 90s past the real failure waiting for a
pick-a-value form that was never going to appear. The fix:
`AiModeCopilotPage.waitForExtractionOutcome()` races the error text against the pick-a-value
form's own ready-signals on one shared, generous timeout (75s) and returns whichever appears
first — no more guessing a cutoff. TC:5/6/7/8 all call this once, right after upload, and
`test.skip()` if the result is `'blocked'`.

**TC:4 is the one case that genuinely passes on both environments for coincidentally different
reasons.** On dev, a `.txt` upload is rejected by real file-type validation. Locally, _every_
upload is rejected (the backend is down), so a `.txt` file hits the same visible error purely by
chance, not because file-type validation was exercised. The test only asserts the visible
behavior (the error text + Retry button), which happens to be identical either way — worth
knowing so nobody mistakes this for proof that local's file-type validation works.

**This form's own DOM is internally inconsistent, unlike the Classic form's** (which is
uniform). Most of the 8 fields wrap their `<label>` in an extra `<div>`, putting the trigger
button two ancestor levels up from the label text; Sample Request's label and button are direct
siblings, one level up. `AiModeCopilotPage.fieldTrigger()` uses the XPath
`ancestor::div[.//button][1]` axis (nearest ancestor `div` containing a button anywhere inside
it) instead of a fixed level count, so it works for both — confirmed live via `outerHTML()` on
both shapes, not guessed.

**These 8 fields are cmdk-based (`cmdk-input`/`cmdk-list`) search comboboxes that only render a
default subset of options until you type.** Random selection
(`selectFirstAvailableOption`/`selectRandomAvailableOption`, used by
`fillAllRequiredWithRandomAvailable()`) works fine off that default subset. But _targeting one
specific value_ (`fillDetails()`, used to force a previously-captured identity onto a second
upload) can't rely on the target being in that default list — it might rank well outside it.
`selectComboboxOption()` now always types the target's leading code/token into the combobox's own
`[cmdk-input]` search box first to filter the list down, then clicks the option whose accessible
name starts with that token (anchored as `^token(?:\s|$)` to avoid matching an unrelated option
that merely contains the token as a substring — see `create-techpack-classic.md`'s notes on that
exact issue). Confirmed live via a full `outerHTML()` dump of both the Style # and Season
listboxes: without typing, the target option can simply not be present in what's rendered.

**Sample Request is required here — unlike the Classic form, where it's optional.** Confirmed
live: "Create draft" stayed disabled with all other 7 fields filled, and the chat literally said
"Pick a value for: Sample Request" until it was picked too.

**A fourth extraction outcome exists, alongside the pick-a-value form, a clean success, and the
file-content-dedup message**: "I read the header — a few items aren't in master data yet. Want me
to create them?" with "Yes, create" / "No, I'll pick existing" / "Skip" buttons. This is an LLM
extraction pipeline, so the _same_ uploaded file can land on a different one of these across
separate runs — that's expected non-determinism, not a bug. `waitForPickAValueForm()`
transparently clicks "No, I'll pick existing" if this prompt appears, routing into the same
pick-a-value form either way so tests don't need to care which branch the LLM took. (Its button
text uses a typographic/curly apostrophe, not a plain ASCII one — matching on `/pick existing/i`
sidesteps that character mismatch entirely.)

**File-content dedup is a separate, independent check from the identity check** — re-uploading
byte-identical file content (even from a different test run) surfaces "This file is already in
floorOS as an in-progress draft" with an "Open" link, regardless of what field values you'd pick.
This is why TC:7/TC:8 need **two distinct real fixture files** (`sample-techpack.pdf`,
`sample-techpack-2.pdf`), not one reused twice — and why TC:8 treats either `'created'` or
`'file-exists'` as a passing outcome (`createDraftExpectingResult()`'s return value): once a
fixture's bytes have ever been successfully draft-created in a given environment's data, every
later run against that same environment will legitimately hit `'file-exists'` instead, which is
not a failure — it's the same dedup working as intended. The "Open" control on that card is
rendered as an `<a>` styled like a button (`data-slot="button"`), **not a literal `<button>`
element** — an accessible-role or tag-based locator (both tried first) never matches it. It does
carry a stable `data-testid="open-existing-techpack-link"`, which `openExistingFileLink` now uses
directly.

**Only real, unmodified PDFs get through "Create draft" reliably.** A fully synthetic minimal PDF
(`buildMinimalPdf()` in the spec) is fine for TC:5/TC:6, which only need extraction to start —
but it, and even a real file with a few harmless bytes appended after its own `%%EOF`, both broke
"Create draft" outright ("I couldn't create the draft. Please try again."). Two genuine
techpack PDFs are committed as fixtures specifically because TC:7/TC:8 need "Create draft" to
actually succeed.

**TC:7 is a deliberate, permanent skip (`test.skip(true, ...)`) — not a bug still being chased.**
The design was: create a draft with fixture 1 to establish a real identity, then re-upload
fixture 2 (a different file, to dodge the file-content-dedup check above) and force its
pick-a-value form to that _exact same_ Customer/Season/Style/Fabric/Wash via `fillDetails()`,
expecting "There's already a techpack — TP...". In practice, once every locator bug in the path
was fixed (confirmed via a full accessibility-tree dump showing all 8 fields genuinely set to the
intended values), "Create draft" consistently returned "I couldn't create the draft. Please try
again." instead of ever reaching the duplicate-identity message. This reproduced reliably, not
intermittently, which points at real backend behavior — "Create draft" seems to reject a
confirmed value set that doesn't relate to what the AI actually inferred from _that specific_
upload, before it gets to evaluate the identity-duplicate check at all. Flagged to the user, who
chose to skip this case rather than keep chasing it from the test side. Revisit if: the developer
confirms/changes this behavior, or a way is found to trigger the identity check in AI Mode without
forcing values across files (e.g. re-uploading a file whose techpack was later fully finalized,
not left as an in-progress draft — untried).

**The Customer+Season+Style+Fabric+Wash uniqueness rule from the Classic form
(`create-techpack-classic.md`'s TC:8) applies here too** — confirmed live, hit it by accident
during exploration before this was even a deliberate test case. The UI presentation differs: the
Classic form shows a modal with "View existing"/"Create new revision"; this form appends a plain
chat message ("There's already a techpack — TP...") with no modal and (as far as tested) no
equivalent "open it" action inline — worth double-checking whether one exists once the canvas
review feature area is built out.

**Random field selection, not "first available"** — same rationale as the Classic form:
Customer/Season/Style/Fabric/Wash together are a real uniqueness key, so deterministically
picking the same option every run reliably collides with whatever a previous run already
created. `fillAllRequiredWithRandomAvailable()`/`createDraftExpectingResult()` mirror
`CreateTechpackPage`'s equivalents.

**Season is the same dependent field it is on the Classic form**: no options until Customer is
picked, and not every Customer has a Season — `fillAllRequiredWithRandomAvailable()` retries with
a different random Customer when that happens, same as the Classic form's version. This is also
why TC:7's design (however it's eventually revisited) is safe to force a captured identity's
Customer back onto a second session: step 1 already guarantees that Customer has at least one
Season before locking the identity in.

**This suite must run single-worker (`test.describe.configure({ mode: 'serial' })` plus
`--workers=1`).** TC:7 and TC:8 both drive the copilot as the same stored user; letting Playwright
run them in separate parallel workers (the repo's default `fullyParallel: true`) raced the same
backend copilot session and produced intermittent, hard-to-reproduce "I couldn't create the
draft" failures that had nothing to do with either test's own logic — confirmed by re-running the
exact same code serially and seeing it behave consistently. Same class of requirement as
`techpack-list.md`'s TC:10 `--workers=1` note, for an analogous same-user-concurrency reason.

## Update 2026-09-25 — UAT added, real UI additions found, heading text corrected

Per the user's direction, **UAT is now the primary verification target** (cross-check dev only on
a failure); added a "Verified (uat)" column above. **None of TC:1-8 were re-run this session** —
this was exploration only, confirming the current screen's shape via a full live `ariaSnapshot()`
dump on uat (saved verbatim to
local exploration evidence (not committed) at the time), not a real
execution pass. dev/local "✅ passing" marks are left as an accurate historical record of
2026-09-08.

**TC:1's expected-result text had a real inaccuracy, now corrected**: it claimed a "New Techpack
Copilot" subheading; the live screen's actual `h1` reads `"New techpack"` (lowercase 't'), with no
"Copilot"/"Saitex AI" text visible anywhere on the upload screen itself (that name may still
appear later, once extraction/chat begins — not reconfirmed this session, since no file was
uploaded during this pass to avoid triggering a real draft-session start against uat's shared
data without checking first).

**Two new, genuinely additive UI elements found, not present in this doc's original 2026-09-07
account — added as TC:9/TC:10**: a 4-step "Progress" stepper (Upload/Review details/Extract/Open
draft) and a `link "Use the manual form"` pointing directly at `/techpacks/new`, sitting right on
the upload screen itself — a second path to Classic, in addition to (not instead of) the list's
own chevron → "Classic" menu item that `techpack-list.md` TC:8/TC:9 already cover. Neither has
been driven live yet (TC:9 in particular should be trivial to automate — it's just a link).

**The upload prompt copy also changed, worth knowing though not yet a distinct test case**: now
reads `"Hi! Upload the techpack files (design, BOM, POM, anything else) and I'll start extracting
the data."` — previously (2026-09-04/07) it read `"Hi! Upload the techpack file and I'll start
extracting the data."` (singular "file", no examples). The explicit "BOM" mention lines up with
this session's other main finding — BOM is now a real, separate top-level module
(the BOM module's own notes) — though nothing here confirms whether uploading a BOM-only
document (as opposed to a full techpack) through this same AI Mode flow actually does anything
different; worth a dedicated exploration case if that distinction turns out to matter.

## Update 2026-09-29 — Full chat-based redesign confirmed live on uat; "Create draft" is a real, reproducible bug

Per the user's explicit direction ("add more test cases covering more functionalities even
including the AI create mode (which isn't working right now)... this is a regression suite, it
needs to contain all positive/negative scenarios"), this suite was fully rewritten against the
real live flow on uat, and run for real (not just explored). **The whole page object and locator
file were rewritten from scratch** — `src/pages/techpack/ai-mode-copilot.page.ts` and
`src/locators/techpack/ai-mode-copilot.locators.ts` — the old cmdk-listbox/ancestor-climbing
pattern no longer matches the DOM at all.

**Real, substantial flow redesign, confirmed step-by-step live:**

1. Upload no longer auto-starts extraction. The file appears in a small list with its own
   "Remove <name>" button, alongside a separate **"Start extraction"** button that must be
   clicked explicitly.
2. Clicking it can show a real "still working" state — "Uploading the file and opening the draft
   session…" / "Still waiting on the agent..." with its own "Retry" button. This is a _different_
   state from an invalid file's immediate hard failure (see point 4) — kept as two separate
   locators/outcomes (`stuck` vs `blocked`) since they're genuinely different conditions.
   `waitForExtractionOutcome()` now clicks "Retry" once automatically if it hits this state,
   the way a real user would, before giving up — confirmed this can be the difference between a
   real "still waiting" hiccup and reaching the working form.
3. Once ready, the whole screen becomes a real chat panel (greeting, suggested prompts, the
   uploaded file as a message, an assistant reply) with a separate `region "Current step"` on the
   right holding the actual field-picking UI — a real ARIA landmark now, not nested divs.
4. **The old "Something went wrong starting the draft session. Please retry." text is NOT
   gone** — re-confirmed live via a real `.txt` upload: it still fires immediately for a
   genuinely invalid file, distinct from the "stuck" state a valid-but-slow file can hit.
5. **Sample Request is no longer required** — confirmed live: "Create draft" became enabled after
   filling only the other 7 fields, without ever touching Sample Request. This is a real behavior
   change from the previously-documented "required in AI Mode, unlike Classic" finding.

**"Create draft" is currently broken — confirmed live, twice, via two distinct symptoms, both now
handled as real named outcomes in `createDraftExpectingResult()` rather than being mistaken for
test-code bugs:**

- **Symptom A — silent reset**: with all 7 required fields genuinely filled (confirmed via a full
  field-by-field read-back before clicking), clicking "Create draft" didn't navigate anywhere and
  showed no visible error at all — the entire panel silently reset every field back to "To pick."
- **Symptom B — explicit failure message**: on a separate run (real fixture PDF, fields
  confirmed still filled, not reset), the chat instead posted "I couldn't create the draft.
  Please try again." with a "Regenerate" action. The chat had already shown "✓ Confirmed:
  CTC0000200 · SP24 · IAV0000179" just before this — i.e. the app itself acknowledged the picked
  identity, then failed to act on it.

Both point at the same underlying gap (possibly the already-filed "copilot service temporarily
unavailable" ClickUp bug, or a new symptom of it), not a test-code issue — reproduced with real,
byte-unmodified fixture files and genuinely-filled required fields, not synthetic data. **TC:8 is
now written to assert the _correct_ behavior (`'created'` or `'file-exists'`), which currently
fails for real** — this is deliberate, not a bug in the test: the failure itself is the finding
this regression run exists to surface, and weakening the assertion to match the broken behavior
would hide it.

**TC:7 (duplicate-identity check) stays a deliberate skip**, now for a different, simpler reason
than before: it needs a first successful "Create draft" to establish a real identity to collide
with, and TC:8 confirms that currently never happens. Revisit once TC:8 passes again.

**A real, harness-level bug in this suite itself was found and fixed this session**: the whole
file was originally one `test.describe.configure({ mode: 'serial' })` block. Since this repo's
`playwright.config.ts` runs 2 workers on uat (`fullyParallel: true`), Playwright's own documented
`serial` behavior — skip all remaining tests in the block once one fails — meant TC:8's real
failure was silently cascading into TC:9/TC:10 never running at all (reported as "did not run",
not their own real pass/fail). Fixed by nesting only the copilot-session-sensitive tests (TC:5-8,
which do need to stay serial to avoid racing the same backend session across workers) in their
own `test.describe`, leaving TC:9/TC:10 free to run independently. Worth checking for in any other
suite in this repo that mixes `mode: 'serial'` with an assertion expected to fail.

**Final state, run for real against uat (not just explored) after all of the above fixes**: 9 of
10 real cases pass (TC:1-6, TC:9-10), 1 deliberate skip (TC:7), **1 real, confirmed fail (TC:8) —
this is the genuine "AI Mode create is currently broken" finding**, not a flaky or
environment-infrastructure issue (uat itself is healthy for every other case in this suite and
across the rest of the Techpack module this same session).

## Update 2026-09-30 — Root cause narrowed to extraction itself, not just "Create draft"; devs informed, fix in progress

The user supplied a real, unmodified 32-page production techpack PDF (Country Road Group style
WPA-60323517, "Refined Crease" pant) specifically to re-verify TC:8 after being told the dev team
had fixed the earlier issue. Committed as
`tests/regression/techpack/fixtures/wpa-60323517-sign-off.pdf`, wired into TC:8 in place of the
smaller pre-existing fixture.

**Three separate real runs against uat with this file, three different outcomes** — the
non-determinism itself is the finding, not any single run:

1. Extraction genuinely succeeded and auto-filled several fields with real confidence (Techpack
   type "US BULK BUYER REFERENCE", Customer "CARVE DESIGNS CTC0000178", Style #
   "SUPER SKINNY CRYSTAL LOGO IAV0000277") alongside a **"Header parsing failed"** warning shown
   inline in the "Current step" panel. (This run also exposed a real test-code gap, now fixed —
   `AiModeCopilotPage.fillAllRequiredWithRandomAvailable()` assumed every field always starts
   unfilled and hung forever clicking a "Search customers..." trigger that no longer existed once
   Customer had already been auto-filled. See `fieldIsFilled()`'s doc comment.)
2. A separate run reached "Create draft" cleanly and produced a **third, previously undocumented
   outcome**: a real draft record was created (`Draft 01M3RBQNVR746ZXMKPPW43XZB1`) with a
   completion card reading **"✓ Done (EXTRACTION_FAILED)"** and a working "Open Techpack" link —
   not the earlier silent-reset, but not a clean, correct success either. Now detected as its own
   outcome, `'draft-with-warning'`, in `createDraftExpectingResult()`.
3. A third run had extraction auto-pick different, seemingly-arbitrary fallback values entirely
   (Techpack type "GRADING SIZE SET APPROVAL GSA", Customer "DEFAULT CTC0000126" — a
   suspicious-looking default, not anything in the real document), and that particular Customer
   had **zero valid Seasons in master data**, genuinely blocking the flow before "Create draft"
   is even reachable (there is no way to override an already-filled field in this flow).

**Conclusion, confirmed by the user**: this is not a test flakiness issue — the AI extraction
pipeline itself is unreliable on real, complex production documents (not just the earlier
"Create draft" symptom on simpler fixtures). **The user has informed the dev team directly; a fix
is in progress as of 2026-09-30.** TC:8's assertion is deliberately left asserting the _correct_
behavior (`created`/`file-exists`/`draft-with-warning` all count as "a real, usable techpack
resulted") — it should start passing cleanly once the extraction fix lands, with no test-code
change needed at that point.

## Update 2026-10-01 — dev fix confirmed; TC:8 and Canvas Review TC:16 pass

After the dev team said the AI Mode issue ([z941abx71b](https://app.clickup.com/t/z941abx71b)) was
fixed, TC:8 passed 3 times in a row with `wpa-60323517-sign-off.pdf`, and Canvas Review TC:16 (which
creates an AI-Mode techpack first) passed with the same file. Two test-code fixes were needed:
TC:16 never clicked "Start extraction" (written before the redesign), and
`createDraftExpectingResult()` gave up after 25s, so a slower "This file is already in floorOS"
reply was misread as `silently-reset` — it now waits up to 90s and re-checks every known reply.
**Still reproducing with the older `sample-techpack.pdf`** (2 of 2 runs): extraction offers "a few
items aren't in master data yet", the test picks "No, I'll pick existing", the chat confirms the
identity, then says "I couldn't create the draft. Please try again." Worth raising with the dev team
if that path is expected to work. TC:7 (duplicate identity) is still a placeholder skip — it now
needs a real implementation for the redesigned flow, since drafts can be created again.
