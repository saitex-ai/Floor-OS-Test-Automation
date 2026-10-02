# Techpack — New Techpack (Classic)

- **User Story:** As a Techpack user, I want to create a new techpack by filling in a manual
  form — identification, production details, service operations, and the source document — so I
  have an alternative to the AI-extraction flow when I'd rather enter everything myself.
- **Test-case set:** not yet created in ClickUp (no ClickUp task exists for this story at time of
  writing — the "ClickUp" column below is left blank rather than filled with placeholder links).
- **Automated in:** [`tests/regression/techpack/02-create-techpack-classic.spec.ts`](../../tests/regression/techpack/02-create-techpack-classic.spec.ts)
- **Page object:** [`src/pages/techpack/create-techpack.page.ts`](../../src/pages/techpack/create-techpack.page.ts)

Per team direction, verified against both dev.flooros.app and the local `tilt up` stack — see
[`techpack-list.md`](./techpack-list.md) for the shared environment notes (auth-gate timeouts,
`--workers=1`, etc.) that apply here too.

**Real UAT run, 2026-09-25 (`TEST_ENV=uat npm run test:techpack -- --workers=1
02-create-techpack-classic.spec.ts`)** — per-TC ledger: **TC:1, TC:2, TC:4, TC:5 pass** (don't
need to select a field value). **TC:3, TC:6, TC:7, TC:8 all fail — same single root cause each
time**: the "Techpack Type" combobox has zero real options on uat (`0 techpack types` / `No
techpack types match.`, confirmed via screenshot), so `fillAllRequiredWithRandomAvailable()`
cannot select a value for a required field and times out. **This is a UAT-specific master-data
gap, not a code/test defect** — the identical flow passes cleanly on dev (confirmed via a live
`TC:3` run there the same session). See the Techpack QA's environment notes for the full
cross-environment evidence trail. **No fresh techpack can currently be created on UAT via this
form at all** until that master data is seeded — this blocks every downstream flow that needs a
freshly-created techpack on UAT (Canvas Review's fixture, BOM's Create-BOM flow, etc.).

**Update 2026-09-28 — fully resolved, all 8/8 pass on uat now.** Techpack Type had real data by
this session (unclear if it was actually fixed, or just never independently isolated from the
Customer gap below — see the Techpack QA's environment note' own caveat on this). TC:7/TC:8
still failed, now blocked on **Customer** ("0 customers" / "No customers match.") — the same
class of gap, a different field. **The user created a real test customer on uat live** to unblock
it, and a re-run afterward passed **9/9 (all 8 cases + setup)**, including a genuine end-to-end
techpack creation (TC:7) and the full duplicate-identity flow (TC:8). **TC:8 also needed a real
fix, not just a re-run**: the "Techpack already exists" modal's own UI has changed — it no longer
shows a "View existing" + disabled "Create new revision" button pair, just the Techpack Code,
"Latest Revision: Rev N · <Status>", an informational "Approve revision N of <code> before
branching a new revision." line, and a single **"Open"** button. `create-techpack.locators.ts`
and this spec were both updated to match (`viewExistingButton` → `openExistingButton`;
`createNewRevisionButton`'s disabled-check is now conditional on the button actually existing,
since it doesn't render in this state at all). Whether a real "Create new revision" button ever
appears once the existing revision **is** Approved isn't confirmed — re-check before assuming
either way if that scenario comes up.

**A second, separate fix the same day: TC:8's own re-selection logic had a real, data-dependent
collision bug, not a product bug.** To re-create the exact same identity for the duplicate check,
TC:8 rebuilt each field's match pattern from only the _first line_ of the originally-picked
option's `innerText`, anchored to the start of the name (to dodge an earlier, different collision
— dev's data has codes like "ASFAFS" containing a shorter code like "AFS" as a substring). That
itself broke a different way, hit live on uat: `innerText`'s line breaks reflect an option's own
_visual_ wrapping, not its semantic structure — a two-word code ("PHOTO SHOOT") can render across
two visual lines, so `.split('\n')[0]` alone captured just `"PHOTO"`. Anchored only to "start of
name," that fragment matched _two_ genuinely different real options that both start with
"PHOTO" — a real strict-mode "resolved to 2 elements" failure, not a flake. **Fixed by
normalizing the entire captured value (collapsing every whitespace run, including embedded
newlines, to one space) and anchoring to the full string (`^...$`) instead of just its first
line/token** — confirmed stable across 3 repeat runs with 3 different random identities, not just
one lucky pass.

| #    | Test case                                                                                               | Steps                                                                                                                                                                                                                                                                                                                                                                                              | Expected result                                                                                                                                                                                                                                                                                                                                                                                                 | ClickUp                                            | Automated | Verified (uat)                                                                                              | Verified (dev) | Verified (local) |
| ---- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- | -------------- | ---------------- |
| TC:1 | Verify navigation and layout of the Classic New Techpack form                                           | 1. From the Techpacks list, open "New Techpack" > "Classic".                                                                                                                                                                                                                                                                                                                                       | The form opens showing Identification, Production, Lifecycle, Operations, and Documents sections.                                                                                                                                                                                                                                                                                                               | —                                                  | ✅        | ✅ passing (2026-09-25, full `ariaSnapshot()` reconfirm)                                                    | ✅ passing     | ✅ passing       |
| TC:2 | Verify "Create techpack" is disabled until all mandatory fields are filled                              | 1. Open the Classic form.<br>2. Leave every field empty.                                                                                                                                                                                                                                                                                                                                           | "Create techpack" is disabled; footer reads "0 of 7 fields filled".                                                                                                                                                                                                                                                                                                                                             | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:3 | Verify each required field selection increments the fields-filled counter                               | 1. Pick a Techpack Type.<br>2. Pick a Style.                                                                                                                                                                                                                                                                                                                                                       | Footer counter reads "1 of 7" then "2 of 7" as each field is picked.                                                                                                                                                                                                                                                                                                                                            | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:4 | Verify the techpack document upload only accepts PDF                                                    | 1. Check the file input's accept filter.<br>2. Upload a PDF.                                                                                                                                                                                                                                                                                                                                       | The input is restricted to PDF (`application/pdf`/`.pdf`); a valid PDF is accepted and its name shown.                                                                                                                                                                                                                                                                                                          | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:5 | Verify the Operations table lists the four default service rows                                         | 1. Open the Classic form and inspect the Operations table.                                                                                                                                                                                                                                                                                                                                         | EMBROIDRY, PRINTING, EMBOSSING, and WASHTYPE rows are present; WASHTYPE's "Active" checkbox is locked on. Reconfirmed live on uat 2026-09-25.                                                                                                                                                                                                                                                                   | —                                                  | ✅        | ✅ passing (2026-09-25)                                                                                     | ✅ passing     | ✅ passing       |
| TC:6 | Verify Cancel discards the draft and returns to the Techpacks list                                      | 1. Fill in a field.<br>2. Click Cancel.<br>3. On the "Discard changes?" prompt, click "Discard & leave".                                                                                                                                                                                                                                                                                           | The form closes without saving; back on the Techpacks list.                                                                                                                                                                                                                                                                                                                                                     | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:7 | Verify successful creation with all required fields and a techpack document                             | 1. Fill all 7 required fields (Customer before Season — see notes).<br>2. Upload a techpack PDF.<br>3. Click "Create techpack".                                                                                                                                                                                                                                                                    | Footer reads "Ready to create" before submit; on submit the app navigates straight to the new techpack's own detail/canvas view, showing its real Techpack Code.                                                                                                                                                                                                                                                | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:8 | Verify the duplicate-identity "Techpack already exists" modal                                           | 1. Create a techpack with a given Customer/Season/Style/Fabric/Wash combination.<br>2. Attempt to create another techpack with the exact same combination.                                                                                                                                                                                                                                         | A "Techpack already exists" modal names the matching fields, the existing Techpack Code, and its Latest Revision + Status; an informational line explains the existing revision must be Approved before branching a new one; a single "Open" button opens it successfully. (Corrected 2026-09-28 — see notes; the modal no longer shows a separate "View existing"/disabled "Create new revision" button pair.) | —                                                  | ✅        | ✅ passing (2026-09-28, re-confirmed 2026-09-29)                                                            | ✅ passing     | ✅ passing       |
| TC:9 | Verify the "Add new value" dialog on a required combobox enforces the same length limit the server does | 1. Open the Techpack Type combobox and search a code that doesn't exist (a string >20 characters, e.g. 25 chars).<br>2. Click "Add new value"; fill Code and Name with that same long code/a matching name.<br>3. Click "Add" — observe it succeeds and the new value auto-selects into the field.<br>4. Fill the remaining 6 required fields, upload a techpack PDF, and click "Create techpack". | The "Add techpack type" dialog should reject or truncate a code over the server's real limit before it can be saved as master data.                                                                                                                                                                                                                                                                             | [z941abxb20](https://app.clickup.com/t/z941abxb20) | ✅        | ❌ **FAIL — bug reproduces exactly as documented (2026-09-30, real automated run against uat)** — see notes | 🔲 not yet run | 🔲 not yet run   |

## Notes for whoever picks this up next

As of 2026-09-07, all 8 cases pass against both dev.flooros.app and the local stack
(`npm run test:techpack:dev` / `npm run test:techpack`).

**Season is a dependent (cascading) field — it is not, and was never, missing reference data.**
An earlier pass through this file wrongly concluded Season had no seed data on either
environment, based on checking Season's dropdown in isolation before any Customer was selected.
The user (with a developer's help) caught this: **Season has no options until a Customer is
selected first** — it's scoped to that customer. Checked properly (select a Customer, then open
Season), real values are there on both environments. `CreateTechpackPage.fillDetails()` /
`fillAllRequiredWithRandomAvailable()` already select Customer before Season for exactly this
reason — don't reorder that, and don't conclude Season is "empty" from checking it before a
Customer is picked. Also worth knowing: not every Customer has at least one Season (confirmed:
picking one at random can land on a customer with 0 seasons) — `fillAllRequiredWithRandomAvailable()`
retries with a different random Customer when that happens, up to 8 tries.

**"First available option" is not a safe way to pick values for a create that must actually
succeed.** Customer + Season + Style + Fabric + Wash together are a real uniqueness key
server-side (see TC:8) — always picking the same "first" option in that combobox collides with
whatever a previous run already created. `selectFirstAvailableOption()`/
`fillAllRequiredWithFirstAvailable()` are still fine for tests that don't care about uniqueness
(TC:2, TC:3, TC:6), but TC:7/TC:8 use `selectRandomAvailableOption()`/
`fillAllRequiredWithRandomAvailable()` instead.

**dev's shared reference data includes at least one invalid entry.** Hit a raw JSON
schema-validation error on submit — `techpackTypeCode` exceeding the server's 20-character limit
— from a garbage Techpack Type value (40+ characters) that some other tester or automated run
added via the combobox's own "Add new value" affordance, which apparently doesn't enforce the
same length limit the server does. `CreateTechpackPage.createExpectingResult()` treats this as a
transient/data-quality issue, not a test failure: if neither success nor the duplicate modal
appears within its window, it re-picks a fresh random identity and retries (up to 5 attempts)
rather than failing on what is really someone else's bad data.

**The duplicate-identity rule (TC:8), found through this Classic form directly:** clicking
"Create techpack" on a Customer/Season/Style/Fabric/Wash combination that already exists opens a
**pre-save confirmation modal** (not a hard error) — "Techpack already exists: A techpack with
this combination of Customer, Season, Style, Fabric and Wash has already been created," showing
the existing Techpack Code and its latest revision/status, with "View existing" and "Create new
revision" (the latter disabled until that existing revision is approved). Techpack Type and
Product Type are **not** part of this identity. This is the same shape as CRM's duplicate-
detection modal for Customers. Note: an equivalent rule was also hit once via the AI-mode canvas's
"Open Techpack" finalize action, as a hard `409 DUPLICATE_SIX_TUPLE` error rather than a pre-save
modal — worth reconciling once the AI-mode/canvas feature area is built out, to confirm whether
that's the same rule surfaced two different ways, or something genuinely different (that earlier
error message didn't enumerate its matching fields the way this modal does).

**Route shape differs between environments**, same as `techpack-list.md`'s TC:10 note: local's
post-create URL is `/techpacks/{id}`, dev's is `/techpacks/canvas/{id}`.
`expectCreatedSuccessfully()` accepts either.

## Update 2026-09-25 — UAT added, form reconfirmed structurally unchanged

Per the user's direction, **UAT is now the primary verification target**; added a "Verified
(uat)" column above. Unlike the List and AI Mode screens (see their own 2026-09-25 update notes),
**this form itself showed no real changes** — a full live `ariaSnapshot()` dump on uat matched
this doc's existing description exactly: same 5 sections, same 7 required combobox fields, same
EMBROIDRY/PRINTING/EMBOSSING/WASHTYPE Operations table, same "N of 7 fields filled"/"Ready to
create" footer text. Only TC:1 and TC:5 (layout/Operations table) were actually re-driven live
this session (marked ✅ above with today's date) — TC:2-4/6-8 involve actually filling/submitting
the form, which wasn't done against uat's shared data this pass; they remain "not yet run" for
uat specifically, not "failing" or "regressed."

## Update 2026-09-29 — Full suite re-run for real against uat, 8/8 clean

All 8 cases (TC:1-8, including TC:7/TC:8's real submit/duplicate-identity flow) run for real
against uat as part of broadening this session's Techpack regression coverage. Clean pass across
the board, no changes needed — the above note about TC:2-4/6-8 being layout-only checks is now
superseded for uat specifically.

## Update 2026-09-29, continued — "Add new value" dialog confirmed to have no length validation; a raw JSON error toast on Create (TC:9, new)

This session's own earlier note above ("dev's shared reference data includes at least one
invalid entry... added via the combobox's own 'Add new value' affordance, which apparently
doesn't enforce the same length limit the server does") was an _inference_ from finding one bad
value already sitting in dev's shared data. This update deliberately reproduces the mechanism
itself, live on uat (evidence: local exploration evidence (not committed),
`bug1-explore2.spec.ts`, `bug1-repro.spec.ts`, and their screenshots, ClickUp
[z941abxb20](https://app.clickup.com/t/z941abxb20)):

1. Searching the Techpack Type combobox for a 25-character code that doesn't exist shows "No
   techpack types match." with an "Add new value" affordance right there in the listbox (alongside
   "N techpack types" / "Browse all in table").
2. The resulting "Add techpack type" dialog's own **Code** field has no visible max-length
   constraint or character counter — a placeholder of `PROD` (4 chars) is the only hint at an
   expected length, but the dialog happily accepts and saves a real 25-character code with **no
   error, no truncation, no warning**. Clicking "Add" succeeds outright: a "Techpack type
   `PWTEST0928LOWERCASE25ABCX` added" toast appears and the new value is auto-selected into the
   Techpack Type field.
3. Only once you fill out the _entire rest of the form_ (all 7 fields + PDF, footer reading "Ready
   to create") and click "Create techpack" does the real backend limit finally get enforced — and
   when it does, the failure is surfaced as a **raw, unformatted JSON array dumped directly into a
   toast**, not a human-readable message:
   ```
   [{"instancePath":"/techpackTypeCode","schemaPath":"#/properties/techpackTypeCode/maxLength","keyword":"maxLength","params":{"limit":20},"message":"must NOT have more than 20 characters"}]
   ```

Two separate, real problems, not one: (a) the "Add new value" dialog should validate against the
same 20-character limit the server enforces, so a bad value can never be saved as master data in
the first place — right now it silently creates a **permanently unusable** Techpack Type entry
(anyone who later picks it from the list will always fail at Create, with no indication why until
they hit the same raw error); and (b) even when the server-side check does fire, its raw AJV/JSON
Schema error should never reach the user as-is — it needs a friendly message translation layer.
Not yet checked whether this same gap (dialog accepts, server rejects with raw JSON) exists on the
other 7 combobox fields that also offer "Add new value" (Style/Customer/Fabric/Season/Wash/Product
Type/Sample Request) — only Techpack Type was tried.

**Cross-reference**: `canvas-review.md`'s own "Copy as New" notes (TC:11) document a separate,
unrelated Classic-form state bug found the same session — worth reading together since both touch
this form's own state handling, but they are two independent findings.

## Update 2026-09-30 — TC:9 automated and re-confirmed live against uat, real FAIL, both halves of the bug reproduce exactly as documented

Automated in `02-create-techpack-classic.spec.ts` (`CreateTechpackPage.addNewTechpackTypeValueExpectingResult()`,
`createOnceExpectingResult()`, and new locators on `CreateTechpackLocators` for the "Add techpack
type" dialog and the raw-JSON-error toast — `[data-sonner-toast]`, same convention CRM already uses).
Run for real against uat (`TEST_ENV=uat npx playwright test --project=techpack -g "TC:9"
02-create-techpack-classic.spec.ts`), **4 consecutive times, identical real result each time**:

1. Search the Techpack Type combobox for a fresh, timestamp-based 25-character code (guaranteed not
   to already exist) — "No techpack types match." + "Add new value" both appear, as before.
2. Fill Code/Name in the "Add techpack type" dialog and click "Add" — **the dialog still has no
   client-side length check**: it closes immediately and the full 25-character code auto-selects
   into the Techpack Type field (confirmed via a real wait on the field's own content, not a race —
   an earlier draft of this test read the field too early and wrongly saw the pre-selection
   placeholder; waiting on the field's text actually changing fixed this).
3. Filling the remaining 6 required fields, uploading a real fixture PDF (`sample-techpack.pdf`),
   and clicking "Create techpack" **still surfaces the exact same raw, unformatted AJV/JSON-Schema
   array in a toast** as 2026-09-29's original repro, byte-for-byte the same shape:
   `[{"instancePath":"/techpackTypeCode",...,"keyword":"maxLength","params":{"limit":20},"message":"must NOT have more than 20 characters"}]`.

**Result: real, understood FAIL** — the test asserts the correct/desired behavior (the dialog
should reject or truncate the over-length code) and fails cleanly with a descriptive message naming
the actual outcome (`"raw-json-error"`) and linking back to
[z941abxb20](https://app.clickup.com/t/z941abxb20), not a crash or timeout. Both halves of the bug
from the 2026-09-29 write-up above are still live, unchanged, one day later. `sample-techpack.pdf`
(not `sample-techpack-2.pdf`) was used deliberately — this Classic-form create flow has no
file-content dedup check (that's an AI-Mode-only behavior, see `create-techpack-ai-mode.md`), and
this same file is already reused this way by `04-canvas-review.spec.ts`/`05-multi-user-presence.spec.ts`
without issue.

## Update 2026-10-01 — TC:9 no longer adds junk master data

Earlier runs of TC:9 clicked "Add" every time, leaving a new permanently-invalid 25-character
Techpack Type in uat (7 `PWTC9…` codes accumulated). Other suites' random Techpack Type picks then
landed on one of them about 1 time in 7, so their Create failed (seen in Canvas Review TC:11/TC:12).
TC:9 now fills the dialog and checks it **without clicking Add**, then tests the server-side half
by selecting the one existing invalid value, `PWTEST0928LOWERCASE25ABCX` — keep that value in uat.
`CreateTechpackPage.selectRandomAvailableOption()` now skips Techpack Type codes over 20 characters.
Re-run 2026-10-01: TC:9 still **fails on both halves** (dialog keeps 25 characters, `maxlength=30`,
Add enabled; Create shows the raw AJV JSON toast). uat has 10 over-length Techpack Types to clean
up: the 8 `PW…` ones above plus `BUYER REFERENCE SAMPLES` and `0YO7TI67R8GKTD6TUYDYK6RLYF6RKU`.
