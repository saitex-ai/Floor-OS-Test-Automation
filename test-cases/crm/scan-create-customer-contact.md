# CRM — Scan&Create Customer/Contact (Sprint 2)

- **User Story:** [Scan&Create Customer/Contact](https://app.clickup.com/t/86eye4dtv) — as a CRM user
  (Owner / Manager / Executive), I want to upload a file or capture a photo
  and scan it so that the system pre-populates Customer and Contact fields,
  allowing me to review, edit, and save both records in a single flow.
- **Test-case set:** [CRM - Sprint 2 - Scan&Create Customer/Contact](https://app.clickup.com/t/z941abt9dj)
- **Source:** ClickUp ("Test Cases and Runs" list, PI-1 - CRM folder), pulled 2026-09-22
- **Automated in:** [`tests/regression/crm/20-scan-create-customer-contact.spec.ts`](../../tests/regression/crm/20-scan-create-customer-contact.spec.ts)
- **Page object:** [`src/pages/crm/scan-create.page.ts`](../../src/pages/crm/scan-create.page.ts)

## Functional requirements (from the User Story)

- FR-1: Upload file and capture-photo provisions on the Scan&Create screen.
- FR-2: User uploads/captures a file/photo, then clicks Start Scan.
- FR-3: Post-scan Contact Profile section — value-populated fields, entry
  provisions, and a dropdown to select/link a Customer.
- FR-4: Post-scan Customer Profile/Customer Management sections —
  value-populated fields plus dropdowns: CRM Stage, Origin Type, Origin,
  Buyer, Owner, Business Process, Assignee.
- FR-5: All value-populated fields after scan remain editable.
- FR-6: A single Save action validates and creates the Customer/Contact.
- FR-7: Data-type errors thrown as highlights on the respective fields.
- FR-8: Cancel button sits on the left side of Save.
- FR-9: System field `Creation Method = "CRM Scan&Create"`.
- FR-10: Same mandatory/conditional business rules as manual creation apply
  (mandatory fields; Assignee mandatory if Business Process exists;
  Referred By mandatory if Origin Type = Referral; one Contact -> one
  Customer).

## Test cases

| #    | Test case                                                                    | Steps                                                                                                                                                              | Expected result                                                                                                                                                                                 | ClickUp                                      | Automated | Verified locally      |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | --------------------- |
| TC:1 | Verify Scan&Create screen access and provisions                              | 1. Navigate to CRM Home/Customers/Contacts.<br>2. Click "Scan&Create".                                                                                             | Scan&Create screen displays, showing a file-upload provision and a photo-capture provision, plus a "Start Scan" action.                                                                         | [link](https://app.clickup.com/t/z941abt9ea) | ✅        | ❌ not yet run        |
| TC:2 | Verify document scan processing and post-scan section population             | 1. Upload a file (or capture a photo).<br>2. Click "Start Scan".                                                                                                   | Contact Profile, Customer Profile, and Customer Management sections display, each with fields showing scanned values and the FR-4 dropdowns present.                                            | [link](https://app.clickup.com/t/z941abt9eb) | ✅        | ❌ blocked (see note) |
| TC:3 | Verify post-scan value-populated field editability                           | 1. Complete a scan (TC:2).<br>2. Edit one or more populated fields/dropdowns in each section.                                                                      | Every previously scan-populated field/dropdown accepts the edit and reflects the new value.                                                                                                     | [link](https://app.clickup.com/t/z941abt9ec) | ✅        | ❌ blocked (see note) |
| TC:4 | Verify successful Customer and Contact creation with system Creation Method  | 1. Complete a scan (TC:2), fill/confirm all mandatory fields.<br>2. Click Save.                                                                                    | Customer and Contact are created in a single Save; the system field Creation Method reads "CRM Scan&Create"; Status defaults to Active.                                                         | [link](https://app.clickup.com/t/z941abt9ee) | ✅        | ❌ blocked (see note) |
| TC:5 | Verify invalid data-type handling, error highlighting, and re-validation     | 1. Complete a scan (TC:2).<br>2. Enter an invalid value into a data-typed field (e.g. malformed email/URL).<br>3. Click Save.<br>4. Correct the value and re-save. | Save is blocked; the offending field is highlighted with an inline error; after correction, Save succeeds and the records are created.                                                          | [link](https://app.clickup.com/t/z941abt9ef) | ✅        | ❌ blocked (see note) |
| TC:6 | Verify post-creation system & email notifications to Owner and Assignee      | 1. Complete TC:4 with an Owner set (and a Business Process + Assignee, if applicable).<br>2. Open the Notification Bell.                                           | A system notification for the new Customer appears under the Notification Bell for the Owner (and Assignee, if a Business Process was assigned). Email delivery cannot be verified from the UI. | [link](https://app.clickup.com/t/z941abt9eg) | ✅        | ❌ blocked (see note) |
| TC:7 | Verify Customer reflection and Business Process sync across Floor OS modules | 1. Complete TC:4.<br>2. Check the Customer's presence/state in other Floor OS modules (e.g. the module the assigned Business Process belongs to).                  | The Customer and its synced Business Process are reflected consistently in the other module(s).                                                                                                 | [link](https://app.clickup.com/t/z941abt9eh) | ⛔        | ⛔ out of scope       |
| TC:8 | Verify Contact linking to a Customer via dropdown with 1:1 association       | 1. Complete a scan (TC:2).<br>2. In the Contact Profile section's Customer dropdown, select/confirm the linked Customer.<br>3. Save.                               | The Contact links to exactly one Customer via the dropdown; no multi-select / multi-customer linkage is possible.                                                                               | [link](https://app.clickup.com/t/z941abt9ge) | ✅        | ❌ blocked (see note) |
| TC:9 | Verify Cancel button position and flow abort functionality                   | 1. Open the Scan&Create screen.<br>2. Observe the Cancel/Save button pair.<br>3. Click Cancel.                                                                     | Cancel sits to the left of Save; clicking it aborts the flow with nothing saved, returning the user to the Customers list.                                                                      | [link](https://app.clickup.com/t/z941abt9gf) | ✅        | ❌ not yet run        |

## Notes for whoever picks this up next

**Not yet live-probed against the running app.** This user story's screen
(entry point on CRM Home/Customers/Contacts -> Scan&Create screen -> post-scan
Contact Profile / Customer Profile / Customer Management sections) doesn't
exist yet as automated CRM coverage in this repo. Everything in
`scan-create.locators.ts` / `scan-create.page.ts` is a best-guess derived
from this ClickUp text and this framework's established UI patterns
(combobox popups, `[data-sonner-toast]` toasts, dialog-scoped buttons, the
shell's Notifications banner button), the same way
`log-communication.locators.ts`/`.page.ts` and
`key-meeting-notes.locators.ts`/`.page.ts` started out before their own
first live runs. See those files' class docs for the full list of
assumptions (section scoping via `<section>` elements, the flat
CRM-Stage/Origin-Type/Origin/Buyer/Owner/Business-Process/Assignee dropdown
shape, etc.).

**Two limitations specific to this story, both explained here plainly per
this task's instructions:**

1. **No sample scan file exists in this repo.** A repo-wide search for one
   (`find . -iname "*.pdf" -o -iname "*sample*"`, excluding
   `node_modules`/`.git`) returned nothing. `scan-create.page.ts` exports
   `SAMPLE_SCAN_FILE_PATH = 'test-data/crm/sample-business-card.pdf'` as the
   single, consistently-referenced path every call site expects — but no
   file is checked in at that path, and this task deliberately does not
   invent one, since a silently-fabricated fixture would let a test "pass"
   without ever proving anything. **A real sample business-card/form image
   or PDF needs to be added at `test-data/crm/sample-business-card.pdf`
   before TC:2 through TC:6 and TC:8 can run for real.**
2. **There is no live scan/OCR backend reachable from this environment**,
   so even with a sample file present, nothing here can predict WHAT the
   scan would populate a field with. Every assertion in
   `scan-create.page.ts` that touches post-scan data
   (`expectInputsPopulated()`, `expectCombosPopulated()`) checks that a
   field became non-empty / a dropdown moved off its placeholder, and
   never asserts a specific scanned value — intentionally, per this
   task's brief.

Because of both of the above, TC:2 through TC:6 and TC:8 are `test.fixme()`'d
in `20-scan-create-customer-contact.spec.ts` with an explicit reason citing
the missing sample file and OCR backend — only TC:1 (screen/provisions
visible, no scan required) and TC:9 (Cancel button position + abort, which
this page object assumes is present on the screen before any scan happens)
are written to actually execute. TC:7 is separately `test.fixme()`'d for a
different reason: verifying a Customer's reflection into other Floor OS
modules and their Business-Process sync needs those OTHER modules' own page
objects/fixtures (Fabric Mill, Costing, Planning, ...), which are out of
scope for the CRM QA's own files — the same way cross-cutting,
other-module concerns are flagged as out of scope elsewhere in this repo.

Once a real sample file and a live OCR-capable environment are both
available, re-derive every locator in `scan-create.locators.ts` via
`ariaSnapshot()` against the real screen (section DOM shape, exact dropdown
labels, whether Business Process/Assignee are flat dropdowns or a
repeatable row like `create-customer.page.ts`'s
`addBusinessProcessWithAssignee()`, and where the Creation Method system
field actually renders), un-fixme the affected tests, and update this note
the way `create-customer.md` and `create-contact.md` were updated after
their own first live runs.
