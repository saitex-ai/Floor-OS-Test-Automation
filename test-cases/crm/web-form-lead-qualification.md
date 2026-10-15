# CRM — [Origin Type = Web Form] Lead Qualification (Sprint 5)

- **User Story:** [[Origin Type = Web Form] Lead Qualification](https://app.clickup.com/t/86eye4dta)
- **Test-case set:** [CRM -Sprint -5 - [Origin Type = Web Form] Lead Qualification](https://app.clickup.com/t/z941abytdu)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Automated in:** [`tests/regression/crm/35-web-form-lead-qualification.spec.ts`](../../tests/regression/crm/35-web-form-lead-qualification.spec.ts)
- **Locators:** [`src/locators/crm/lead-qualification.locators.ts`](../../src/locators/crm/lead-qualification.locators.ts) (extended)
- **Page object:** [`src/pages/crm/lead-qualification.page.ts`](../../src/pages/crm/lead-qualification.page.ts) (extended)

## How this suite gets its Web Form Leads

The test web form (`https://unusual-dev-store.myshopify.com/pages/contact`) is
password-protected and the password isn't available to automation, so the
suite **can't make a new submission**. Instead:

- **Display TCs** run **read-only** against existing Web Form Leads on dev
  created by real form ingestion (`createdBy: "web-ingest"`). The "what was
  submitted" oracle is the tab's own `GET /api/crm/customers/:id/lead-qualification`
  read (the request the UI makes to render the tab), which returns the stored
  `webFormSubmissions[].formData` and `submittedAt`.
- **TCs that write** (save/edit a review, convert) run on a Web Form Lead the
  suite **creates itself** through Create Customer (Origin Type "Web Form",
  Origin "Contact Us Form"). Such a lead has no form card and no AI dossier.
- The **submission-dependent halves** of TC:1, TC:3, TC:6, TC:19 and TC:20 are
  separate `test.fixme()` tests with the same ClickUp link.

Existing leads used, all read-only (picked 2026-10-15):

| Key                    | Customer                  | Why                                                                                                    |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `allFields`            | Denim Co304               | Contact Us Form, Lead, all 5 fields + message                                                          |
| `allFieldsOther`       | test9k                    | Second all-fields Contact Us lead (different company/subject) for TC:20                                |
| `noPhone`              | woodpickerjeans           | Contact Us Form, no Phone                                                                              |
| `emailOnly`            | tech6k                    | Sign Up Form, Email only (no Name/Company/Phone/Subject/Message)                                       |
| `twoSubmissions`       | Denim Co202               | Two stored submissions on one lead                                                                     |
| `convertedWithForm`    | picker                    | Ingested Contact Us lead already converted to Qualified Lead, 1 review                                 |
| `convertedWithDossier` | Asiam                     | Web Form origin, Qualified Lead, seeded AI dossier with enhanced pointers                              |
| `formAndDossier`       | ACME Apparel              | Web Form origin with a form card **and** a seeded dossier **and** stored social posts (Customer stage) |
| `leadWithDossier`      | Highland Apparel Partners | Web Form origin, Lead stage, seeded AI dossier (no form card)                                          |

## Functional requirements (from the story / ClickUp TCs, checked against dev)

- FR-1: A Web Form Lead's Lead Qualification tab shows the submitted form as the first card, titled with the form type and marked "Origin".
- FR-2: The card shows the submission source and date/time, every filled field exactly as submitted, omits blank fields, and shows the full message separately.
- FR-3: The submitted form content is read-only.
- FR-4: AI sections (Contact Info first) are generated from the submission; no social-media origin sections appear.
- FR-5: AI pointers can be refined with the AI Chatbot's markup tool and are marked as enhanced.
- FR-6: Manager's Review and Score: mandatory-field validation, save, list, edit.
- FR-7: Convert to Qualified Lead is blocked until a review exists, then converts the Lead; past Lead the screen is read-only.
- FR-8: The submitter gets an acknowledgement email that is traceable from the Lead.
- FR-9: Each submission creates its own Lead with its own form card.

## Test cases

| #     | Test case                                                              | Expected result (ClickUp)                                                             | ClickUp                                      | Automated                                                 | Dev result (2026-10-15)                                                                                            |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| TC:1  | Web Form Lead Opens with the Submitted Form as the First Card          | Lead created with Origin Type Web Form; form is the first card, above all AI sections | [link](https://app.clickup.com/t/z941abytdw) | ✅ on existing leads + fixme (new submission)             | ✅ passing (existing); fixme: store password                                                                       |
| TC:2  | Form Card Names the Form Type and Is Marked as Origin                  | Title = form type; "Origin" badge                                                     | [link](https://app.clickup.com/t/z941abytdx) | ✅                                                        | ✅ passing (Contact Us Form and Sign Up Form)                                                                      |
| TC:3  | Submission Source and Date Are Shown on the Form Card                  | Source site + submission date/time, matching the submission                           | [link](https://app.clickup.com/t/z941abytdy) | ✅ vs stored `submittedAt` + fixme (vs own submission)    | ✅ passing; source always reads "saitex.com" (see Notes)                                                           |
| TC:4  | All Submitted Fields Are Shown As Submitted                            | Name, Company's Name, Email, Phone, Subject each exactly as submitted                 | [link](https://app.clickup.com/t/z941abytdz) | ✅ (existing all-fields submission)                       | ✅ passing                                                                                                         |
| TC:5  | Blank Submitted Fields Are Omitted from the Form Card                  | Only filled fields shown; no empty rows / "—" / placeholders                          | [link](https://app.clickup.com/t/z941abyte0) | ✅                                                        | ✅ passing                                                                                                         |
| TC:6  | Full Message Is Shown Separately and Not Truncated                     | Own Message area; full text; special characters correct                               | [link](https://app.clickup.com/t/z941abyte1) | ✅ (existing message) + fixme (long/special-char message) | ✅ passing; no long/special-char message exists on dev                                                             |
| TC:7  | Form Card Renders Correctly Without a Message or Phone Number          | No empty Message area, no blank Phone row                                             | [link](https://app.clickup.com/t/z941abyte2) | ✅                                                        | ✅ passing                                                                                                         |
| TC:8  | Submitted Form Content Is Read-Only                                    | No edit icon; nothing editable; unchanged after reload                                | [link](https://app.clickup.com/t/z941abyte9) | ✅                                                        | ✅ passing (every field has a "System field" lock icon)                                                            |
| TC:9  | Contact Info AI Section Is Present for a Web Form Lead                 | Contact Info is the first AI section                                                  | [link](https://app.clickup.com/t/z941abytea) | ✅ incl. BUG step                                         | ✅ on seeded dossiers; **BUG**: genuine submissions have no dossier at all                                         |
| TC:10 | AI Qualification Sections Are Generated from the Submitted Form        | 6 sections incl. Compatibility + Sales Pitch Recommendation, reflecting the form      | [link](https://app.clickup.com/t/z941abyteb) | ✅ incl. BUG steps                                        | 5 sections render; **BUG**: no Sales Pitch Recommendation, "Business Compatibility Report"; no dossier from a form |
| TC:11 | No Social Media Origin Sections Appear on a Web Form Lead              | No Posts / social sections; only the form card as origin                              | [link](https://app.clickup.com/t/z941abytec) | ✅                                                        | ✅ passing (even where social posts are stored)                                                                    |
| TC:12 | An AI Pointer Can Be Refined with the AI Chatbot Markup Tool           | Pointer refined, marked enhanced, persists after reload                               | [link](https://app.clickup.com/t/z941abyted) | ✅ non-writing part + fixme (apply + persist)             | ✅ chatbot/markup reachable, enhanced marker exists; fixme: no safe lead with a dossier                            |
| TC:13 | Manager's Review and Score Mandatory Field Validation                  | Nothing saved; four field errors                                                      | [link](https://app.clickup.com/t/z941abytee) | ✅ (own Web Form lead)                                    | ✅ passing; score error wording differs                                                                            |
| TC:14 | A Saved Manager's Review Is Listed with Its Details                    | "Manager's review and score saved"; form clears; row with details; survives reload    | [link](https://app.clickup.com/t/z941abytef) | ✅ (own Web Form lead) incl. BUG step                     | ✅ row + reload; **BUG**: no confirmation message                                                                  |
| TC:15 | An Existing Manager's Review Can Be Edited                             | Updated text/score, "Review updated", refreshed timestamp; empty review blocked       | [link](https://app.clickup.com/t/z941abytej) | ✅ (own Web Form lead) incl. BUG step                     | ✅ edit + timestamp + empty blocked; **BUG**: no "Review updated"                                                  |
| TC:16 | Conversion Is Blocked Until a Manager's Review and Score Exists        | Convert disabled with the reason; click does nothing                                  | [link](https://app.clickup.com/t/z941abytek) | ✅ (own Web Form lead)                                    | ✅ passing                                                                                                         |
| TC:17 | A Web Form Lead Converts to a Qualified Lead After a Review            | Convert enables; stage → Qualified Lead on Lead and in list; form card unchanged      | [link](https://app.clickup.com/t/z941abytem) | ✅ (own Web Form lead)                                    | ✅ passing (form-card part checked in TC:18)                                                                       |
| TC:18 | Qualification Screen Is Read-Only After the Lead Leaves the Lead Stage | All readable; no inputs; no review edit; AI Chatbot unavailable; no Convert           | [link](https://app.clickup.com/t/z941abytep) | ✅ incl. BUG step                                         | ✅ inputs/edit/Convert gone; **BUG**: AI Chatbot + Revert still live                                               |
| TC:19 | Acknowledgement Email Is Sent and Traceable from the Lead              | Submitter receives the email; it's traceable from the Lead                            | [link](https://app.clickup.com/t/z941abyteq) | ✅ BUG step + fixme (inbox)                               | **BUG**: Communication > Emails is empty; fixme: store password + mailbox                                          |
| TC:20 | Each Web Form Submission Creates Its Own Lead with Its Own Form Card   | Each Lead shows only its own card                                                     | [link](https://app.clickup.com/t/z941abyter) | ✅ on two existing leads + fixme (two new submissions)    | ✅ passing; repeat submissions from one company share a lead (see Notes)                                           |

Last full dev run (2026-10-15, `--workers=1`): 20 passed, 6 fixme (plus the crm auth setup), 3.0 min.

## Notes for whoever picks this up next

**Bugs / gaps found on dev (asserted as real behaviour in `BUG:` steps):**

1. **Genuine Web Form submissions get no AI dossier.** Every `web-ingest`
   Lead returns `dossier: null` and the tab shows "No dossier for this account
   yet … That integration is pending". Only leads seeded by `ai-lead-engine`
   (2026-09-18 and 2026-10-12 batches) have AI sections. So "Contact Info
   describes the submitter" (TC:9) and "sections are generated from the
   submitted form" (TC:10) can't hold for a real submission.
2. **Section list differs from the story (TC:10).** Dev renders Contact Info,
   Customer Info, Customer's Financial Standpoint, Customer's Product Range and
   **Business Compatibility Report**. There's **no "Sales Pitch
   Recommendation"** card, even though the dossier payload carries `pitch`
   pointers. This matches the prototype, not the story — confirm with the team.
3. **No confirmation after saving or editing a review (TC:14/15).** Neither
   "Manager's review and score saved" nor "Review updated" appears (polled
   for 4 s). The form does clear and the timestamp does refresh.
4. **Converted records still expose AI editing (TC:18).** On a Qualified Lead
   (Asiam) the AI Chatbot opens with the Markup tool and an editable prompt,
   and enhanced pointers keep enabled "Revert to the previous wording" buttons.
   The review form, Save, review edit and Convert are correctly gone.
5. **Acknowledgement email not traceable from the Lead (TC:19).** For an
   ingested Web Form Lead, Communication > Emails shows "No unread emails
   involving this customer." Whether the email is sent at all needs the
   store password and a mailbox.

**Wording differences (asserted with dev's wording):**

- Score error: "Score out of 10 is required" (ClickUp: "Score (1–10) required").
- Empty edit: "A review and a score are both required" (ClickUp: "Review is required").
- Convert tooltip: "At least one Manager's Review and Score must exist." (ClickUp: "At least 1 …").

**Other observations:**

- **Source line:** every ingested card reads "Submitted via saitex.com", while
  the ClickUp test form lives on `unusual-dev-store.myshopify.com`. Can't tell
  from here whether that's a configured site label or wrong — confirm.
- **Repeat submissions (TC:20):** submissions from the same company/domain are
  attached to one existing Lead (`webFormSubmissions` has 2–4 entries), and the
  card shows **only the latest** one. Earlier submissions aren't visible
  anywhere on the tab. TC:20's premise (different companies) needs two new
  submissions.
- **Tab after conversion:** unlike `26-lead-qualification-screen.spec.ts`'s
  TC:3 finding for manually-created leads, Web Form records past Lead
  (Qualified Lead, Customer) still show the Lead Qualification tab, read-only.
- The review row shows the selected Manager, department, score and "Saved
  <timestamp>"; there's no separate author. Manager notifications (TC:14)
  aren't checked.
- Leads created by Create Customer with Origin Type "Web Form" have no form
  card and no dossier, so TC:17's "form card unchanged after conversion" is
  checked on an already-converted ingested lead (TC:18) instead.
- The display TCs depend on the listed existing leads staying as they are.
  If one is converted or deleted, pick a replacement from the Customers list
  (Origin = Web Form, Created By blank = ingested) and update `WEB_FORM_LEADS`.
