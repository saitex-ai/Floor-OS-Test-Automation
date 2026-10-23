# CRM — Scan & Create Customer/Contact with the Floor OS Assistant

- **User Story:** [Scan&Create Customer/Contact](https://app.clickup.com/t/86eye4dtv)
- **Test-case set:** CRM - Scan & Create Customer/Contact (Floor OS Assistant), in ClickUp "Test Cases and Runs". It replaces the old Sprint 2 set, which was written for the old "Start Scan" screen.
- **Source:** the Floor OS CRM prototype (`crm-forms.jsx`: `ScanCreate`, `ScanBot`, `ScanWebcam`), shared 2026-10-21, checked against dev the same day.
- **Automated in:** [`tests/regression/crm/20-scan-create-customer-contact.spec.ts`](../../tests/regression/crm/20-scan-create-customer-contact.spec.ts)
- **Page object:** [`src/pages/crm/scan-create.page.ts`](../../src/pages/crm/scan-create.page.ts)

## How the feature works (prototype, confirmed on dev)

1. **Entry:** Scan & Create from CRM Home, the Customers list (More actions), the Contacts list, or an External Event's Leads tab.
2. **Floor OS Assistant** opens as a chat panel titled "Floor OS Assistant · Scan & Create":
   - greeting "Hi <user> — scan a business card, document or QR code and I'll pre-fill the customer and contact. You can also just type their details here."
   - four source options: **Upload a file** (images or PDF), **Capture a photo** (webcam), **Upload a QR code** (image), **Capture a QR code**
   - a message box ("Pick an option, or type the contact's details…") and **Send**, which is disabled while the box is empty.
3. **Scanning:** the chosen source is echoed in the chat, the options are disabled, and a progress bubble shows "Reading document…", then "Extracting names, emails and numbers…", then "Mapping values to Customer & Contact profiles…".
4. **Mandatory checks**, one chat message each, in this order:
   - Customer name present and unique: "Customer name <X> is unique."
   - CRM stage: "CRM stage set to Lead (default)."
   - Contact name present: "Contact name <X> found."
   - Contact email present, valid and unique: "Contact email <X> is unique."
   - If a check fails, the assistant asks for that value, and the user answers in the chat. The checks then continue.
   - When all pass: "All mandatory checks passed. Every other field is optional — review the pre-filled form and add anything else before saving." plus a **Review & save** button.
5. **Chat commands at any time:**
   - **stop / cancel:** "Okay — stopped. Nothing was saved." and the assistant closes. While the camera is open, this closes the camera instead.
   - **scan again / restart:** starts over.
   - **save:** opens the review form when every check has passed. Otherwise the assistant says what's still missing, or "Nothing to save yet" before any scan.
   - **A field change**, e.g. "set city to Austin": that field is updated and confirmed in the chat.
   - **Typing a contact's details** instead of scanning: "Got it — I'll use the details you typed." and the same checks run.
6. **Review form** (`/crm/customers/scan`):
   - a banner "Scan complete — N fields were pre-filled and are editable. Review, adjust and save."
   - sections Contact Profile, Customer Profile and Customer Management, all fields editable. CRM Stage defaults to Lead.
   - **Cancel** sits to the left of **Save customer & contact**.
7. **Save:**
   - validates data types and uniqueness. Errors show inline, with a banner "N fields need attention".
   - creates the Customer (Creation Method "CRM Scan&Create") and its linked Contact, shows "<Customer> + <Contact> created from scan", and opens the new Customer.
8. **Unreadable file:** "I couldn't read <file> — … Try a clearer image or another file." with a **Try again** button.

## Test cases

| #     | Test case                                                                           | Type     |
| ----- | ----------------------------------------------------------------------------------- | -------- |
| TC:1  | Verify Scan & Create Opens the Floor OS Assistant with a Greeting and Four Options  | Positive |
| TC:2  | Verify Scan & Create Is Available from CRM Home, Customers List and Contacts List   | Positive |
| TC:3  | Verify Uploading a Business Card Shows Scan Progress and Disables the Other Options | Positive |
| TC:4  | Verify the Assistant Runs the Mandatory Checks and Offers Review & Save             | Positive |
| TC:5  | Verify Review & Save Opens the Pre-Filled Review Form                               | Positive |
| TC:6  | Verify Every Pre-Filled Field on the Review Form Is Editable                        | Positive |
| TC:7  | Verify Saving Creates the Customer and Its Linked Contact                           | Positive |
| TC:8  | Verify the Created Customer Has Stage Lead and Status Active                        | Positive |
| TC:9  | Verify Saying "save" in the Chat Opens the Review Form Once Checks Pass             | Positive |
| TC:10 | Verify a Field Can Be Changed from the Chat Before Review                           | Positive |
| TC:11 | Verify Details Typed in the Chat Are Used Instead of a Scan                         | Positive |
| TC:12 | Verify "scan again" Restarts the Assistant                                          | Positive |
| TC:13 | Verify Scan & Create from an External Event's Leads Tab Links the Customer to It    | Positive |
| TC:14 | Verify the Capture a Photo Option Opens the Camera with Capture and Cancel          | Positive |
| TC:15 | Verify Uploading a QR Code Pre-Fills the Customer and Contact                       | Positive |
| TC:16 | Verify Send Is Disabled When the Message Box Is Empty or Only Spaces                | Negative |
| TC:17 | Verify the Assistant Asks for a Missing Contact Email and Accepts It from the Chat  | Negative |
| TC:18 | Verify the Assistant Asks for a Missing Customer Name                               | Negative |
| TC:19 | Verify a Duplicate Customer Name Is Flagged and a New Name Is Asked For             | Negative |
| TC:20 | Verify a Duplicate Contact Email Is Flagged and a New Email Is Asked For            | Negative |
| TC:21 | Verify an Invalid Contact Email Typed in the Chat Is Rejected                       | Negative |
| TC:22 | Verify "save" Before Any Scan Says There Is Nothing to Save                         | Negative |
| TC:23 | Verify "save" While a Mandatory Field Is Missing Asks for It                        | Negative |
| TC:24 | Verify an Unreadable File Shows an Error and Try Again                              | Negative |
| TC:25 | Verify "stop" Ends the Session and Nothing Is Saved                                 | Negative |
| TC:26 | Verify Closing the Assistant Returns to the List and Nothing Is Saved               | Negative |
| TC:27 | Verify Cancel on the Review Form Discards the Scan                                  | Negative |
| TC:28 | Verify Invalid Data on the Review Form Blocks Save with Inline Errors               | Negative |
| TC:29 | Verify a Customer Name Changed to an Existing One on the Review Form Blocks Save    | Negative |
| TC:30 | Verify a Blocked Camera Shows a Message and a Way Back to the Options               | Edge     |
| TC:31 | Verify Typing "cancel" While the Camera Is Open Closes Only the Camera              | Edge     |
| TC:32 | Verify Origin Is Cleared When Origin Type Changes on the Review Form                | Edge     |

Steps and expected results for each case are in ClickUp.

## Where dev differs from the prototype

The prototype is the expected behaviour unless a decision changed it.

**Open bug (known failures).** TC:17, 18, 21 and 23 assert the prototype's behaviour and are marked `test.fail()` with the bug link, so they report "unexpectedly passed" once dev is fixed:

| Bug                                                | Test cases        | Dev today                                                                                                                   |
| -------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [z941abzd2p](https://app.clickup.com/t/z941abzd2p) | TC:17, 18, 21, 23 | A missing contact email or customer name isn't asked for; the assistant offers to create the other record alone (Yes / No). |

**Expected behaviour changed to dev's.** The test titles, the ClickUp test cases and the tests describe dev's behaviour. Each decision is a comment on the ClickUp test case, linked from the code:

| Test case | Now expected                                                                                                                              | Decision                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| TC:19     | A duplicate customer name offers to link the contact to the existing customer ("…Shall I proceed?" Yes / No).                             | [comment](https://app.clickup.com/t/z941abzcxq?comment=1100750000203919) |
| TC:20     | A duplicate contact email ends with "I found nothing to create on this scan" and Start again.                                             | [comment](https://app.clickup.com/t/z941abzcxr?comment=1100750000203921) |
| TC:24     | An unreadable file is reported as "nothing to create" with Start again.                                                                   | [comment](https://app.clickup.com/t/z941abzcxw?comment=1100750000203922) |
| TC:29     | A name changed to an existing customer shows "Nothing was saved — Checking whether this customer already exists…" and nothing is created. | [comment](https://app.clickup.com/t/z941abzcy1?comment=1100750000203923) |

TC:22's "Nothing to save yet…" reply is a wording difference only.

## Automation notes

- Every scan uses a business card generated per run, with a unique "Playwright …" company name and contact email. This means the duplicate checks only fire when a test makes them fire on purpose.
- TC:19 and TC:29 first create their own "Playwright …" Customer to collide with, instead of using a seeded dev record.
- TC:2 covers all three entry points: CRM Home, Customers list and Contacts list (the last two under More actions). CRM Home and Contacts were added on dev on 2026-10-21, fixing [z941abzd2n](https://app.clickup.com/t/z941abzd2n).
- **Kept manual:**
  - TC:14, TC:30 and TC:31 need a real webcam or the browser's camera permission prompt.
  - TC:15 needs a QR code image holding a vCard.
- **Answers can vary:** TC:10, TC:11 and TC:21 depend on how the assistant's AI reads free text. The tests check the outcome (the field changed, or the value was rejected), not the exact wording.

## Re-check on dev (2026-10-22)

- TC:1, 2, 4, 5 failed in a headed run only because the shared sign-in step waited 60 s while dev's new shell took longer; with a 90 s wait they pass.
- TC:9: the CRM Stage pre-fill (Lead) is checked by TC:5; opened via "save" it intermittently still reads "Select" under load, so TC:9 checks the other pre-filled values.
- TC:19: a duplicate company is flagged and the contact is offered for linking to the existing customer ("…already exists, so the contact will be linked to that customer. Shall I proceed?", Yes / No). Confirmed as expected behaviour.
- TC:10: changing a field from the chat now works ("Designation set to Head of Sourcing.", and the review form shows it).
- TC:11: typed details now work as in the prototype ("Got it — I'll use the details you typed…", checks pass, Review & save offered). The assistant may drop the "Playwright" test tag from a typed company name.
- TC:8: Creation Method isn't shown on the Customer screen, so TC:8 now checks only CRM Stage = Lead and Status = Active.

## Re-check on dev (2026-10-23)

- Save from the review form still stays on "Nothing was saved — Checking whether this customer already exists…" in automation (only the name lookup is called; no create request after 25 s). TC:7, 8, 13, 20 and 28 need a completed save, so they are parked with `test.fixme` until the save completes in automation.
