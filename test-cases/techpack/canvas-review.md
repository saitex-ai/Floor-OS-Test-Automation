# Techpack — Canvas Review

- **User Story:** As a Techpack user, after creating a techpack (via Classic or AI Mode), I want
  to review its extracted/entered fields alongside the source document, approve or comment on
  individual fields, and move it through its approval lifecycle (Draft → Open → Approved), so the
  record is verified before it's relied on downstream.
- **Test-case set:** not yet created in ClickUp (no ClickUp task exists for this story at time of
  writing — the "ClickUp" column below is left blank rather than filled with placeholder links).
- **Automated in:** [`tests/regression/techpack/04-canvas-review.spec.ts`](../../tests/regression/techpack/04-canvas-review.spec.ts)
- **Page object:** [`src/pages/techpack/canvas.page.ts`](../../src/pages/techpack/canvas.page.ts)

Per team direction, to be verified against both dev.flooros.app and the local `tilt up` stack —
see [`techpack-list.md`](./techpack-list.md) for the shared environment notes (auth-gate
timeouts, `--workers=1`, etc.) that apply here too. The fixture for every case below is a
freshly-created techpack (via `CreateTechpackPage`, the same approach `techpack-list.md`'s TC:10
and `create-techpack-classic.md` already use) — not a legacy seed record, since seed records have
their own known detail-view load-reliability issues (see `environment-notes.md`).

| #     | Test case                                                                                              | Steps                                                                                                                                                                                              | Expected result                                                                                                                                                                                                                                                                                                                                    | ClickUp                                            | Automated | Verified (uat)                                                                                                                                                                                                                                                                                                                                                                                                           | Verified (dev)          | Verified (local)                                    |
| ----- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------------------------- |
| TC:1  | Verify the canvas layout right after creating a techpack                                               | 1. Create a techpack (Classic form).                                                                                                                                                               | The canvas opens: toolbar (Back, status pill, File/Standard viewer toggle, page nav, zoom, Add Pin, Open comments tab, Hide resolved, Enter fullscreen, Functions, Reports, Copy as New, Force release), and a right-hand panel with Techpack Details/Comments/History tabs, Techpack Details showing Details/Headers/Uploads/Operations sections. | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:2  | Verify the Details section's lifecycle metadata for a fresh techpack                                   | 1. Open a freshly-created techpack's canvas.<br>2. Inspect the Details section.                                                                                                                    | Techpack Code matches the one just created; Rev = "Rev 0"; Lock Status = "UNLOCKED"; Status is a valid pre-Approved value ("Draft" or "Open" — see notes); Approved Date and Approver both show "—".                                                                                                                                               | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:3  | Verify the Headers section lists every filled identity field with approval status                      | 1. Open a freshly-created techpack's canvas.<br>2. Inspect the Headers section.                                                                                                                    | All fields filled at creation (Techpack Type, Customer, Season, Style, Fabric, Wash, Product Type) are listed, each with an Approved/Pending status icon.                                                                                                                                                                                          | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:4  | Verify the Uploads section lists the uploaded techpack document                                        | 1. Open a freshly-created techpack's canvas (created with a PDF attached).<br>2. Inspect the Uploads section.                                                                                      | The uploaded file's name is listed, tagged "TECHPACK".                                                                                                                                                                                                                                                                                             | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:5  | Verify the Operations section mirrors what was set at creation                                         | 1. Open a freshly-created techpack's canvas.<br>2. Inspect the Operations table.                                                                                                                   | EMBROIDRY/PRINTING/EMBOSSING/WASHTYPE rows are shown with the values entered at creation (see notes on why this doesn't assert a fixed row count or a disabled/read-only state).                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:6  | Verify posting a comment on a field                                                                    | 1. Open a freshly-created techpack's canvas.<br>2. Click a field's Comments icon.<br>3. Type and submit a comment.                                                                                 | An inline comment input appears below the field on click; after clicking the "Send comment" button, the comment is visible attached to that field.                                                                                                                                                                                                 | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:7  | Verify a posted field comment appears in the aggregated Comments tab                                   | 1. Post a comment on a field (TC:6).<br>2. Switch to the Comments tab.                                                                                                                             | The Comments tab lists the comment just posted, with the field it was posted on.                                                                                                                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:8  | Verify the Comments tab's empty state before any comment exists                                        | 1. Open a freshly-created techpack's canvas (no comments posted yet).<br>2. Switch to the Comments tab.                                                                                            | "No comments yet — Drop a pin on the canvas or comment on an extracted field." is shown.                                                                                                                                                                                                                                                           | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:9  | Verify the Functions menu reflects the Draft→Open→Approved lifecycle gating                            | 1. Open a freshly-created techpack's canvas.<br>2. Open the Functions menu.                                                                                                                        | The menu lists at least one of "Move to Open"/"Approve" (whichever applies to this record's current sub-state — see notes), plus "Create new Techpack Rev" and "Lock techpack" showing their "Available once this revision is Approved"/"Only an Approved techpack can be locked" gating text.                                                     | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:10 | Verify the Reports menu's Techpack Report is gated on Approved status                                  | 1. Open a freshly-created (Draft, unapproved) techpack's canvas.<br>2. Open the Reports menu.                                                                                                      | "Techpack Report (PDF / CSV)" is shown as available only once this revision is Approved, and is disabled at Draft status.                                                                                                                                                                                                                          | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:11 | Verify "Copy as New" opens the Classic form pre-filled from the existing techpack                      | 1. Open a techpack's canvas.<br>2. Click "Copy as New".                                                                                                                                            | Navigates to the Classic New Techpack form (`/techpacks/new?from=<code>`) — not an instant duplicate; the source techpack's fields are available to review/edit before an actual "Create techpack".                                                                                                                                                | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:12 | Verify the History tab is reachable                                                                    | 1. Open a freshly-created techpack's canvas.<br>2. Switch to the History tab.                                                                                                                      | The tab switches successfully (content itself may be empty for a record with no lifecycle events yet — see notes).                                                                                                                                                                                                                                 | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:13 | Verify adding a pin annotation drops a marker on the canvas and surfaces in the Comments tab           | 1. Open a freshly-created techpack's canvas.<br>2. Click "Add Pin".<br>3. Click a point on the document viewer.<br>4. Type a note in the "New annotation on page N" dialog and click Submit.       | A numbered annotation marker appears on the document at the clicked point (an "Annotation overlay" region gains a "N Annotation by \<author\>" control); the note also appears in the aggregated Comments tab, whose own tab name grows a count badge ("Comments" → "Comments (1)").                                                               | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:14 | Verify "Cancel Pin" exits placement mode without creating an annotation                                | 1. Click "Add Pin" (button becomes "Cancel Pin").<br>2. Click "Cancel Pin" without clicking the document.                                                                                          | The toolbar button reverts cleanly to "Add Pin"; no annotation is created (Comments tab still shows its empty state).                                                                                                                                                                                                                              | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:15 | Verify "Re-extract" and "Ask about this techpack" do not appear on a Classic-created techpack's canvas | 1. Open a freshly-created (Classic form) techpack's canvas.<br>2. Inspect the full toolbar.                                                                                                        | Neither "Re-extract" nor "Ask about this techpack" appears anywhere on the page.                                                                                                                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-09-29)                                                                                                                                                                                                                                                                                                                                                                                                     | ✅ passing (2026-09-08) | ✅ passing                                          |
| TC:16 | Verify "Re-extract" and "Ask about this techpack" appear on an AI-Mode-created techpack's canvas       | 1. Create a techpack via AI Mode (upload a real sample PDF, fill the 8 required fields, "Create draft").<br>2. Open its canvas.                                                                    | Both "Re-extract" and "Ask about this techpack" are visible in the toolbar — confirming these two actions are AI-Mode-exclusive, not seed-data-only (see notes).                                                                                                                                                                                   | —                                                  | ✅        | ✅ pass (2026-10-01, after dev fix; WPA-60323517 sign-off PDF)                                                                                                                                                                                                                                                                                                                                                           | ✅ passing (2026-09-08) | ⏭️ skips (copilot backend down locally — see notes) |
| TC:17 | Verify an invalid canvas ID shows a proper "not found" page, not an empty canvas                       | 1. Navigate directly to `/techpacks/canvas/not-a-uuid` (malformed).<br>2. Navigate directly to `/techpacks/canvas/11111111-2222-3333-4444-555555555555` (well-formed but nonexistent).             | Both show "Canvas not found — No techpack file matches this link. It may have been deleted, or the URL is wrong." with a "← Back to techpacks" button — not an empty/blank canvas with a developer hint.                                                                                                                                           | [z941abxb80](https://app.clickup.com/t/z941abxb80) | ✅        | ✅ **pass (2026-09-29, re-confirmed via automated regression 2026-09-30)** — previously-reported bug confirmed fixed; `04-canvas-review.spec.ts` TC:17 passes cleanly (2 consecutive clean runs), see notes                                                                                                                                                                                                              | 🔲 not yet run          | 🔲 not yet run                                      |
| TC:18 | Verify the toolbar's "Open comments tab" icon actually switches the sidebar to the Comments tab        | 1. Open a techpack's canvas.<br>2. Click the "History" tab.<br>3. Click the toolbar's "Open comments tab" (speech-bubble) icon.                                                                    | The sidebar switches to the Comments tab (`aria-selected` moves from History to Comments).                                                                                                                                                                                                                                                         | [z941abxb8f](https://app.clickup.com/t/z941abxb8f) | ✅        | ✅ **pass (2026-09-30)** — the 2026-09-29 no-op finding no longer reproduces: the icon now correctly switches the sidebar to Comments, confirmed both by direct live re-checks and by `04-canvas-review.spec.ts` TC:18 passing cleanly (2 consecutive clean runs). Flag z941abxb8f for re-triage/closure — see notes                                                                                                     | 🔲 not yet run          | 🔲 not yet run                                      |
| TC:19 | Verify the "Force release" flow and its resulting banner                                               | 1. Open a techpack's canvas.<br>2. Click "Force release".<br>3. In the confirmation dialog, fill "Reason" and type `RELEASE` into the "Type RELEASE to confirm" field.<br>4. Click "Release lock". | The "Release lock" button stays disabled until both the Reason and the literal "RELEASE" confirmation text are filled; confirming shows a banner reading "Canvas lock force-released by \<the releasing user's name\>".                                                                                                                            | [z941abxb3u](https://app.clickup.com/t/z941abxb3u) | ✅        | ✅ **pass (2026-09-30)** — flow/gating confirmed as described, AND the 2026-09-29 raw-UUID banner finding no longer reproduces: the banner now shows the real resolved name ("Canvas lock force-released by Alice Planner."), confirmed across 4+ independent live checks plus `04-canvas-review.spec.ts` TC:19 passing cleanly (2 consecutive clean runs). Flag z941abwh0u/z941abxb3u for re-triage/closure — see notes | 🔲 not yet run          | 🔲 not yet run                                      |
| TC:20 | Verify a techpack's own creator can approve their own submission ("self-approval")                     | 1. Open a techpack you created yourself, already at Status "Open" with every Headers field approved.<br>2. Open "Functions" > "Approve".<br>3. Confirm in the dialog.                              | The app either blocks this (maker-checker separation) or allows it — record what's actually observed.                                                                                                                                                                                                                                              | [z941abxb7p](https://app.clickup.com/t/z941abxb7p) | ✅        | ✅ **pass — confirmed: allowed (2026-09-29, re-confirmed via automated regression 2026-09-30)** — self-approval succeeds, Status becomes "Approved" and Approver == Creator; `04-canvas-review.spec.ts` TC:20 passes cleanly (2 consecutive clean runs), see notes                                                                                                                                                       | 🔲 not yet run          | 🔲 not yet run                                      |

## Notes for whoever picks this up next

Last updated 2026-09-07. All 12 cases confirmed passing on both dev and local (dev went down for
about 10 minutes mid-session — a real `502`, not a test issue, see `environment-notes.md` — and a
final clean run confirmed everything once it came back).

**This suite needs a generous creation timeout — 300s, matching `create-techpack.spec.ts`'s own
TC:8 budget.** Even 180s wasn't always enough: the Classic-form create flow's Season-retry loop
(re-picking a random Customer up to 8 times until one has a Season) can occasionally run long on
a slow dev day, on top of the list's own up-to-90s load wait.

**The "Techpack canvas" H1 is real in the accessible tree but renders at effectively zero visible
width in this layout** — confirmed live: `toBeVisible()` reported "hidden" on every poll across a
full 30s window while the rest of the page was fully loaded and interactive. Use the "Techpack
Details" tab as the "has this loaded" signal instead (`CanvasPage.expectLoaded()` does this).

**The canvas' real lifecycle is Draft → Open → Approved, gated by per-field approval — confirmed
via the Functions menu's own disabled-reason text, not guessed:**

```
Move to Open            — Pending approval: Season
Approve                 — Available after the techpack is moved to Open
Create new Techpack Rev — Available once this revision is Approved
Lock techpack           — Only an Approved techpack can be locked
```

So "Move to Open" is blocked until every Headers field is individually approved; "Approve" (of
the whole revision) only becomes available once it's Open; only an Approved revision can spawn a
new Rev or be locked. The Reports menu's "Techpack Report (PDF / CSV)" is separately gated on
Approved status too.

**Open question, still not explained: how many Headers fields end up "Pending" varies per
creation, and it does NOT reliably predict the record's Status.** The first techpack explored
(`TP202609-000016`) showed 6 of 7 fields "Approved" and Season "Pending", with Status "Draft" —
which led to an early (wrong) assumption that "Draft" always means "at least one field pending"
and "Open" always means "none pending". Live evidence directly contradicted this twice: one
freshly-created techpack showed 0 pending fields yet Status "Draft"; another showed a pending
field yet Status "Open". Whatever actually drives Status at this stage isn't understood — TC:2
and TC:9 were rewritten to stop predicting it (TC:2 just checks Status is a valid value; TC:9
only asserts the gating text for the two menu items whose "Approved"-gated wording is stage-
independent for any fresh record). Don't reintroduce a pending-count-based prediction without
new live evidence backing it — this is the same category of mistake as the earlier Season
cascading-dropdown assumption, just not yet root-caused. (This is also why TC:9 accepts either
"Move to Open" or "Approve" as the listed early-lifecycle action, rather than assuming "Move to
Open" is always present.)

**Related discovery: the Operations table itself can have far more than its original 4 rows once
a techpack is fully approved.** A techpack that started fully-approved (Status "Open", 7/7 Headers
approved) showed **34** "Active" checkboxes in Operations instead of the expected 4 — reproduced
twice, both times specifically on an already-Open record; a Draft record's Operations table only
ever showed the original 4. This looks like the Operations section becoming editable (more
service types selectable) once a techpack reaches Open, not a test bug — confirmed it's genuinely
the _same_ table (not a mis-scoped locator picking up something unrelated) by filtering
specifically for rows containing "EMBROIDRY" and "WASHTYPE" and still seeing 34 results. TC:5 was
redesigned accordingly: it only checks that the 4 originally-entered rows are present and show
their data, without asserting a fixed total row count or that all checkboxes are disabled — both
of those turned out not to be reliably true. Worth a dedicated test once Canvas Review covers
actually progressing a record to Open (see "Scope boundary" below) — e.g. does Operations become
genuinely editable then, and can you add a 5th service type at that point?

**Per-field commenting is inline, not a separate modal**: clicking a field's speech-bubble
"Comments" icon reveals an "Add a comment on this field…" text input directly below that field's
row. Note the placeholder text's trailing ellipsis may be a single `…` glyph rather than three
literal periods — match on a shorter substring (e.g. `'Add a comment on this field'`) to avoid a
silent locator mismatch either way.

**Submitting a field comment is a dedicated icon-only "Send comment" button, not Enter.**
Pressing Enter in the textarea only inserts a newline — confirmed two ways: a strict-mode error
dump showed the textarea's own value ending in a literal newline character after pressing Enter,
and a targeted DOM dump found a `button[aria-label="Send comment"]` sitting right next to the
input (icon-only, no visible text, so it's easy to miss without inspecting `aria-label`s
directly). An earlier version of `postFieldComment()` used Enter and appeared to work — its own
verification check was a false positive, matching the still-unsent, still-populated textarea
rather than an actually-persisted comment; the real bug only surfaced when a _later_ step (the
Comments tab) expected to see that comment and didn't. `CanvasPage.postFieldComment()` now clicks
the real button and waits for the comment to actually render before returning.

**The Comments tab aggregates comments from two sources**: per-field comments (as above) and
canvas pins ("Add Pin" in the toolbar, not yet explored in depth). Its empty state reads "No
comments yet — Drop a pin on the canvas or comment on an extracted field."

**"Copy as New" does not instantly duplicate the record.** Clicking it navigates to
`/techpacks/new?from=<sourceCode>` — the Classic create form, presumably pre-filled from the
source techpack, still requiring an actual "Create techpack" click to produce a new record. This
is safe to test freely (no side effect from the click itself) but "Create techpack" from that
pre-filled state hasn't been tried yet — worth confirming whether the duplicate-identity check
(same as `create-techpack-classic.md`'s TC:8) fires here too, since copying a techpack's own
Customer/Season/Style/Fabric/Wash would trivially collide with the source itself unless the form
changes at least one of those fields for you.

**Update 2026-09-29 — "Copy as New" silently overwrites an unrelated in-progress Classic form, and
its own pre-fill then leaks into later, supposedly-fresh "New Techpack" opens in the same browser
session.** ClickUp [z941abxb2m](https://app.clickup.com/t/z941abxb2m). Confirmed via
local exploration evidence (not committed) /
`2026-09-29-item5b-scroll-operations.spec.ts` (and an earlier, un-ticketed pass at the same repro,
`bug2-repro.spec.ts`) — real, reproducible, not a one-off:

1. Open the Classic form, pick a Customer, upload a PDF, and type something into Description —
   footer reads "1 of 7 fields filled · techpack document attached". Navigate away **without**
   submitting (discarding the confirmation modal, so the draft is only ever held in the form's own
   client-side state, never saved).
2. Open a _different_, already-existing techpack's canvas and click "Copy as New". This overwrites
   the abandoned draft above with the copied techpack's own Techpack Type + Customer — footer now
   reads "3 of 7 fields filled · **techpack document needed**" (the earlier Description text and
   the uploaded PDF are both gone, no warning shown either way).
3. Navigate away from _that_ screen too, then open "New Techpack" > "Classic" again — a
   supposedly brand-new, blank create form. In the same browser session, it **still shows the same
   Copy-as-New pre-fill** ("3 of 7 fields filled", Techpack Type and Customer already set) instead
   of a genuinely empty form.
4. While in this leaked/pre-filled state, the Operations table's Value spinbuttons (EMBROIDRY/
   PRINTING/EMBOSSING) show a literal **"0"** rather than being empty. This is specific to the
   leaked state, not a new universal default — a genuinely fresh browser context (no shared
   session/local state) opened the same "New Techpack" form with truly empty Value inputs and "0
   of 7 fields filled".

Net effect: this form is not as stateless as `create-techpack-classic.md`'s TC:2 assumes ("Leave
every field empty" → "0 of 7 fields filled") — that's still true for a genuinely fresh
navigation/session, but **not** for a long-lived browser session where "Copy as New" was used
earlier; a real user clicking around without reloading the tab could easily lose in-progress work
this way, or be confused by leftover pre-filled values on what they think is a blank new form.
Not yet root-caused to a specific storage mechanism (looks like some form of client-side/in-memory
draft state, not server-persisted, since a fresh Playwright browser context did not reproduce
step 3's leak) — worth a real look from the dev side rather than guessing further here.

**The PDF viewer can take a genuinely long time to render a real, large techpack PDF — this is
timing, not a stuck/broken state.** Using the same `sample-techpack.pdf` fixture as the AI Mode
suite (a real 33-page techpack, ~5.4MB), several exploration passes showed only a loading spinner
in the viewer pane for 30-90s+ before it eventually rendered the actual first page. Any canvas
test that depends on the PDF viewer itself (not just the surrounding panel/toolbar, which loads
independently and quickly) should budget a generous wait, matching this app's established
"dev cold-start is slow" pattern elsewhere (see `environment-notes.md`) rather than assuming a
short timeout is enough.

**History tab showed no content and no visible empty-state text on a brand-new, no-actions-yet
Draft** — unlike the Comments tab's explicit "No comments yet" message. Not yet confirmed whether
this is the tab's real empty state (silently blank) or it just needed more time to load; worth
checking again once a techpack has actually been moved through Open/Approved to see real history
entries appear, rather than concluding the tab is broken from one blank observation.

**Scope boundary, deliberate**: TC:1-12 never clicked "Move to Open", "Approve", or "Lock
techpack" — they only read the Functions/Reports menus' item text and gating state. **Update
2026-09-29: TC:20 above closes part of this gap** — "Approve" has now actually been clicked for
real (on a disposable techpack, `TP202609-000008`, reused for this specific purpose rather than
created fresh — see that TC's own notes), confirming a real approval succeeds and updates Status/
Approver. "Move to Open" and "Lock techpack" are still never clicked — genuinely progressing a
record through the full Draft/Open → Approved → Locked path (and what the Headers section, History
tab, and Reports menu look like at each later stage) remains real, not-yet-covered ground. Likely
not reversible via the UI once Approved/Locked (matching "Create new Techpack Rev" being the
documented way forward from Approved, not an "unapprove" action), so keep any future
lifecycle-progressing test's own techpack isolated to that test rather than reused across cases —
unless it's deliberately a disposable/throwaway record kept around for exactly this kind of
destructive repro, as TC:19/TC:20 did.

## Update 2026-09-25 — UAT added; AI-Mode canvas tabs reconfirmed, Classic canvas not re-driven this session

Per the user's direction, **UAT is now the primary verification target**; added a "Verified
(uat)" column above (all still "not yet run" — this session only explored, it didn't execute
this doc's automated spec against uat). dev/local marks are left as an accurate historical record
of 2026-09-08.

**What _was_ directly reconfirmed live this session, on a real AI-Mode-created Draft record on
uat**: the canvas's 3 tabs are `Extracted Data`, `Comments`, `History` — matching this repo's
existing understanding of the AI-Mode canvas shape. **Zero "BOM" text anywhere on that canvas**
(checked directly) — worth flagging since the Techpack QA's working notes (pre-2026-09-25)
described "Materials & Trims BOM"/"Packaging & Labels BOM" as Extracted Data sub-categories; that
description may be stale now that BOM has been split into its own dedicated top-level module (see
the BOM module's own notes) — re-check against a record whose extraction actually completed with
material data before concluding either way, this session's one sampled record may simply not have
had any.

**What was _not_ re-driven this session: this doc's own primary subject, a Classic-created
techpack's canvas** (the "Techpack Details" tab with Details/Headers/Uploads/Operations
sections). The record inspected live this session was an existing AI-Mode-shaped Draft, not a
freshly Classic-created one — none of TC:1-16's specific assertions were re-verified against
current uat. Treat this doc's existing content as still the best available account of the Classic
canvas, not yet contradicted, but also not yet re-confirmed post-2026-09-25.

## Update 2026-09-29 — Full suite run for real against uat; TC:1-15 clean, TC:16 fails on its own AI-Mode precondition

Run as part of expanding the Techpack regression suite's comprehensive coverage (per the user's
direction — see `create-techpack-ai-mode.md`'s own "Update 2026-09-29" for the fuller context).
**TC:1-15 all pass cleanly against uat** (each creating its own fresh techpack via the Classic
form, per this suite's existing design) — the Classic-canvas content this doc documents is
re-confirmed current, not just historical.

**TC:16 fails — but not on its own actual assertion.** Its setup step creates a techpack via AI
Mode (needed so the canvas belongs to an AI-Mode-created record, the only way to check
"Re-extract"/"Ask about this techpack" render). That setup calls the same
`AiModeCopilotPage.waitForExtractionOutcome()` this session's AI Mode suite rewrote — and on this
run, extraction never resolved into any of the three known states (ready/stuck/blocked) within
the full 75s budget at all, timing out mid-race instead. This is the same underlying AI Mode
reliability problem `create-techpack-ai-mode.md` documents in more depth (that suite hit two
_different_ symptoms of "Create draft" not working — a silent reset and an explicit failure
message — this is arguably a third: extraction itself not settling into a legible state at all on
this particular run). Not re-attempted further this session; revisit once AI Mode's underlying
issue is fixed, at which point this precondition should reliably succeed again.

## Update 2026-09-29, continued — 4 new TCs mined from live punch-list exploration (TC:17-20)

Same broader session (see `create-techpack-classic.md`'s own matching update, and
the Techpack QA's working note' "9 new bugs/clarifications" entry) — a batch of specific items
the user asked to be reproduced live on uat, each with a screenshot, most already filed to
ClickUp. Full raw evidence: local exploration evidence (not committed),
`-item2-comments-icon.spec.ts`, `-item5-copy-as-new.spec.ts`, `-item5b-scroll-operations.spec.ts`,
`-item6b-item7-disposable-techpack.spec.ts` and their matching screenshots.

**TC:17 (invalid canvas ID) — genuinely good news, and a ticket that can likely be closed.** The
originally-reported bug ("invalid canvas id opens an empty canvas with a developer hint instead of
an error") does **not** reproduce anymore: both a malformed ID (`not-a-uuid`) and a well-formed but
nonexistent UUID now show a proper "Canvas not found" page. No screenshot was attached to the
ClickUp ticket this session specifically _because_ attaching one to a "still broken" ticket would
misrepresent something that's actually fixed — this needs the user/ticket owner to re-triage and
close z941abxb80 rather than this doc silently marking it resolved.

**TC:18 (Open comments tab icon) — a real, small, reproducible bug.** Selected History, clicked
the toolbar's speech-bubble "Open comments tab" icon, and the sidebar's `aria-selected` state never
moved off History — confirmed via both the tab's own ARIA state and a screenshot showing "History"
still bold/underlined post-click. Whatever this icon is wired to do, it isn't switching tabs.

**TC:19 (Force release) — the flow itself works as designed; the bug is cosmetic but real.** The
confirmation dialog genuinely gates on two independent conditions (a typed Reason, and literally
typing the word "RELEASE") before "Release lock" enables — neither one alone is enough, confirmed
live. Once confirmed, the resulting banner ("Canvas lock force-released by
`217754ed-5b13-430a-a1fc-b36a32e3f243`") shows a **raw backend user UUID instead of a resolved
name**, even though the exact same page's own Techpack Details panel correctly shows "Alice
Planner" as Creator right next to it — so this isn't a page-wide resolution failure, just this one
banner. **This is the same exact UUID already found unresolved in the Export CSV bug**
(`techpack-list.md`'s new TC:19) — worth flagging that connection explicitly when triaging either
ticket: either this is one genuinely broken/orphaned user record with no reverse-lookup anywhere on
the backend, or the lock-release banner and the CSV export share one resolution path the on-screen
Details panel doesn't use. Only reproduced as a self-triggered release (alice force-releasing her
own just-created record's own lock). **Per the user (2026-09-30): there is no business rule
restricting who can force-release whose lock** — any user can force-release any lock, confirmed
intended, not a permission gap. No negative-permission test case is needed for this; the UUID
display bug above is the only real finding here.

**TC:20 (self-approval) — a confirmed, unambiguous finding, not a guess.** Reused the same
disposable techpack as TC:19 (`TP202609-000008`, Creator "Alice Planner", already Status "Open"
with all 7 Headers approved). Functions > Approve > confirm succeeded cleanly: a "Techpack
TP202609-000008 approved" toast appeared, Status flipped to "Approved", and the Approver field was
set to **the same user as Creator** ("Alice Planner" both). So: **this role has no maker-checker
separation enforced at the UI level** — a user can create and approve the same techpack. **Per the
user (2026-09-30): this is intended — self-approval is allowed by design**, not a gap. Not tested
with a lower-privilege role (e.g. `bob`/"Qc-lead") to see whether the "Approve" menu item is even
offered to a non-Admin role in the first place — worth a dedicated permission-gating pass (see
`validation-rules.md` for the same question settled on that screen: no gate found for `bob` there
either, confirmed live on dev 2026-10-01).

**"Disposable techpack" is this session's own testing shorthand, not a real product feature or
status** — worth being explicit about this so it's never mistaken for app terminology. It just
means: one throwaway techpack (`TP202609-000008`), created once via the Classic form specifically
to be reused across TC:19 and TC:20's destructive/repeated actions (force-release, approve)
instead of leaving multiple junk records behind. It's left in the environment in **Approved**
status with Creator = Approver = "Alice Planner" — safe to reuse again for similar destructive
canvas-action testing, or to ignore; just don't mistake it for real seed data if it turns up in a
future list query.

## Update 2026-09-30 — TC:17-20 automated into `04-canvas-review.spec.ts`; TWO of the four 2026-09-29 findings no longer reproduce

Automated all four cases per the user's direction. New locators/methods added to
`CanvasLocators`/`CanvasPage`: `canvasNotFoundHeading`/`canvasNotFoundMessage` +
`gotoCanvasById()`/`expectNotFoundForInvalidId()` (TC:17); reused the existing
`historyTab`/`commentsTab`/`openCommentsTabButton` locators (TC:18); `forceReleaseDialog` +
Reason/"Type RELEASE to confirm" inputs + Cancel/"Release lock" buttons + `forceReleaseBanner` +
`forceRelease()` (TC:19); `approveDialog` + its confirm checkbox/button + `approveTechpack()`
(TC:20, reusing the existing `clickFunctionsMenuItemIfEnabled()` for the Functions-menu part).
TC:19/TC:20 share one fresh techpack created by TC:19 (a `test.describe.serial` block, `let
techpackCode` handed off between them) — the same "disposable techpack" reasoning as this doc's own
2026-09-29 notes above, just created fresh this session rather than reusing the now-Approved
`TP202609-000008`, since TC:20 needs a record that hasn't been approved yet to actually exercise the
approval action for real.

**Live re-verification (not just re-running the 2026-09-29 exploration scripts) found TWO of the
four original findings no longer reproduce — both flagged for ticket re-triage/closure, same as
TC:17's own already-flagged z941abxb80:**

- **TC:18's "Open comments tab" no-op (z941abxb8f) — now fixed.** Re-checked live 3 independent
  times outside the real spec (plus the spec itself passing twice in a row): clicking the icon while
  the sidebar is on History now correctly switches `aria-selected` to Comments every time. This
  directly contradicts the 2026-09-29 finding above — don't assume that note is still current.
- **TC:19's raw-UUID force-release banner (z941abwh0u / z941abxb3u) — now fixed.** Re-checked live
  4+ independent times: the banner now reads "Canvas lock force-released by Alice Planner." — a
  real resolved name, not `217754ed-5b13-430a-a1fc-b36a32e3f243`. The dialog gating itself (both
  Reason and literal "RELEASE" required) is unchanged and still confirmed correct.

**A real, separate transient backend error surfaced while testing Force Release, distinct from the
UUID bug**: clicking "Release lock" can respond with "Could not release. Try again or refresh the
page." inside the still-open dialog (fields stay filled) instead of releasing — not every attempt,
and simply clicking "Release lock" again resolved it live every time it was hit. `CanvasPage
.forceRelease()` now retries up to 3 times on this specific error before giving up.

**A debugging dead end worth recording so it isn't repeated**: TC:17's first automated version
failed repeatedly against uat, and was initially misdiagnosed as hitting a real, separate,
already-documented intermittent access-service degradation (`environment-notes.md`'s "Access
restricted" pattern) flashing briefly right after navigation. That theory was wrong — a failure
screenshot showed "Canvas not found" rendered correctly on screen at the exact moment the assertion
timed out. The real bug was this doc's own `canvasNotFoundHeading` locator using
`getByRole('heading', ...)`, when a real `ariaSnapshot()` dump showed "Canvas not found" renders as
a plain paragraph, not a heading role. Fixed by matching on the text instead. No retry/race logic
was needed once that was fixed — `expectNotFoundForInvalidId()` is now a single patient wait.

**Real, clean, per-TC results against uat (2026-09-30, 2 consecutive full clean runs of all four
via `TEST_ENV=uat npx playwright test --project=techpack -g "TC:17|TC:18|TC:19|TC:20"
tests/regression/techpack/04-canvas-review.spec.ts`)**: **TC:17 pass, TC:18 pass, TC:19 pass, TC:20
pass** — all four are real, understood passes of currently-correct/intended behavior, not weakened
assertions and not crashes/timeouts from test code.
