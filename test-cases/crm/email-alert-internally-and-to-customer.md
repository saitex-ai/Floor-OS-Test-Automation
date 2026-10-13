# CRM — Email an Alert Internally / to Customer

- **User Stories:**
  - As a CRM user, I want to email a regulatory Alert to internal colleagues, so that the relevant SAITEX teams understand the regulation and its impact on SAITEX and can act before the effective date.
  - As a CRM user, I want to email a regulatory Alert to one or more Customers and their Contacts, so that buyers are informed of upcoming regulatory changes affecting their trims and packaging.
- **Scope:** Both email modes launched from the Alert detail view: **Email Alert Internally** and **Email Alert to Customer**.
- **Out of scope:** Sending email from inside the CRM. The composed email is handed off to Outlook, where the user reviews and sends it.
- **Source:** User story and acceptance criteria provided 2026-10-12. The FloorOS App Launcher prototype (claude.ai/design) wasn't accessible when this was written, so exact on-screen labels and layouts still need checking against it. No ClickUp tasks yet.
- **Related:** [`alert-detail-screen.md`](alert-detail-screen.md) (Sprint 3 TC:3/TC:4/TC:7/TC:8 cover parts of this flow at a lower level of detail).
- **Automated in:** not yet.

## Prerequisites

- User is provisioned with a CRM role that grants access to Alerts.
- The internal user directory (CRM managers and executives) and their email IDs are configured.
- The user has a Microsoft Outlook (Office 365) account available in the browser.
- Customer and Contact records are maintained in the CRM, with email as the unique identifier for Contacts.

## Pre-conditions

- User is authenticated and holds an active session.
- User is on the detail view of an existing Alert.
- The Alert holds a title, type, region, published-on and effective-from dates, regulations, impact on SAITEX, and an official source.
- For Email Alert to Customer, at least one active Customer exists.

## Test data needed

| Data                      | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Alert A (fully populated) | Every field filled, including Impact on SAITEX and Official Source                             |
| Customer C1 (active)      | Has its own email and at least 2 Contacts with emails                                          |
| Customer C2 (active)      | No customer email and no Contact emails (should show "No email on file")                       |
| Customer C3 (active)      | Has its own email but no Contacts                                                              |
| Customer C4 (inactive)    | Has an email and Contacts (must never be offered)                                              |
| Shared email              | One address held on two records (e.g. C1's email also stored on a Contact of another Customer) |
| Internal directory        | At least 2 CRM managers and 2 CRM executives with email IDs                                    |

## Test cases

### A. Entry points and popup load (both modes)

#### TC:1 — Verify the email actions are available on the Alert detail view (Positive)

**Test Steps:**

1. Navigate to CRM and open the Alerts list.
2. Open Alert A's detail view.

**Expected Result:**

- "Email Alert Internally" and "Email Alert to Customer" actions are visible and enabled on the Alert detail view.

#### TC:2 — Verify Email Alert Internally opens the internal popup (Positive)

**Test Steps:**

1. Open Alert A's detail view.
2. Click Email Alert Internally.

**Expected Result:**

- The Email Alert Internally popup opens with From, To and Email Body fields (no Cc field).
- Redirect to Outlook and Cancel buttons are shown.

#### TC:3 — Verify Email Alert to Customer opens the customer popup (Positive)

**Test Steps:**

1. Open Alert A's detail view.
2. Click Email Alert to Customer.

**Expected Result:**

- The Email Alert to Customer popup opens with From, To, Cc and Email Body fields.
- Redirect to Outlook and Cancel buttons are shown.

#### TC:4 — Verify From is pre-filled with the logged-in user in the internal popup (Positive)

**Test Steps:**

1. Open Alert A's detail view.
2. Click Email Alert Internally.
3. Check the From field.

**Expected Result:**

- From shows the logged-in user's name and email.

#### TC:5 — Verify From is pre-filled with the logged-in user in the customer popup (Positive)

**Test Steps:**

1. Open Alert A's detail view.
2. Click Email Alert to Customer.
3. Check the From field.

**Expected Result:**

- From shows the logged-in user's name and email.

#### TC:6 — Verify From cannot be edited (Negative)

**Test Steps:**

1. Open either Email Alert popup.
2. Try to click into From and type, clear, or paste a different value.

**Expected Result:**

- From is read-only and its value does not change.

#### TC:7 — Verify From reflects a different logged-in user (Edge)

**Test Steps:**

1. Log out and log in as a second CRM user.
2. Open the same Alert's detail view.
3. Open either Email Alert popup.

**Expected Result:**

- From shows the second user's name and email, not the first user's or a cached value.

#### TC:8 — Verify a user without Alerts access cannot email an Alert (Negative)

**Test Steps:**

1. Log in with a CRM role that does not grant access to Alerts.
2. Try to open the Alerts list, or an Alert's detail URL directly.

**Expected Result:**

- Alerts are not accessible, so neither Email Alert action can be reached.

### B. Email Alert Internally — To recipients

#### TC:9 — Verify To lists internal CRM managers and executives (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert Internally.
2. Open the To field's dropdown.

**Expected Result:**

- The options are the internal directory's CRM managers and executives, each shown with their email ID.

#### TC:10 — Verify a single internal recipient can be selected (Positive)

**Test Steps:**

1. Open Email Alert Internally.
2. Select one user in To.

**Expected Result:**

- The selected user appears as a selected value in To.

#### TC:11 — Verify multiple internal recipients can be selected (Positive)

**Test Steps:**

1. Open Email Alert Internally.
2. Select one CRM manager and one CRM executive in To.

**Expected Result:**

- Both users appear as selected values in To.

#### TC:12 — Verify the internal To list can be searched (Positive)

**Test Steps:**

1. Open Email Alert Internally.
2. Type part of a user's name into To.
3. Clear it and type part of a user's email ID.

**Expected Result:**

- The list filters to matching users for both the name search and the email search.

#### TC:13 — Verify a selected internal recipient can be removed (Positive)

**Test Steps:**

1. Open Email Alert Internally.
2. Select two users in To.
3. Remove one of them.

**Expected Result:**

- Only the remaining user stays selected in To.

#### TC:14 — Prevent internal redirect with no recipient selected (Negative)

**Test Steps:**

1. Open Email Alert Internally.
2. Leave To empty.
3. Click Redirect to Outlook.

**Expected Result:**

- The redirect is blocked and To shows "Select at least one user email ID".
- No Outlook tab opens and the popup stays open.

#### TC:15 — Prevent internal redirect after removing every recipient (Negative)

**Test Steps:**

1. Open Email Alert Internally.
2. Select a user in To, then remove it.
3. Click Redirect to Outlook.

**Expected Result:**

- The redirect is blocked and To shows "Select at least one user email ID".
- No Outlook tab opens.

#### TC:16 — Verify external addresses cannot be added to the internal email (Negative)

**Test Steps:**

1. Open Email Alert Internally.
2. Type an external address (e.g. buyer@acme-textiles.com) into To.
3. Type a Customer or Contact name into To.

**Expected Result:**

- No matching option is offered and no free-text entry is accepted.
- Only internal directory users can be selected.

#### TC:17 — Verify an invalid search in the internal To field (Negative)

**Test Steps:**

1. Open Email Alert Internally.
2. Type "zzzz@@" or other special characters into To.

**Expected Result:**

- "No results" (or equivalent) is shown, nothing is selected, and no error occurs.

#### TC:18 — Verify the same internal user cannot be selected twice (Edge)

**Test Steps:**

1. Open Email Alert Internally.
2. Select a user in To.
3. Search for the same user again.

**Expected Result:**

- The user is shown as already selected (or is not offered again), and To holds the address only once.

#### TC:19 — Verify the validation message clears once a recipient is chosen (Edge)

**Test Steps:**

1. Open Email Alert Internally.
2. Click Redirect to Outlook with To empty, so the validation message appears.
3. Select a user in To.

**Expected Result:**

- "Select at least one user email ID" disappears and Redirect to Outlook is allowed.

#### TC:20 — Verify every internal user can be selected at once (Edge)

**Test Steps:**

1. Open Email Alert Internally.
2. Select every user in the To list.
3. Click Redirect to Outlook.

**Expected Result:**

- All users are selected without layout problems in the popup.
- The Outlook To field contains every selected address.

### C. Email Alert to Customer — To and Cc recipients

#### TC:21 — Verify To lists all active Customers as groups (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert to Customer.
2. Open the To field's dropdown.

**Expected Result:**

- Every active Customer appears as a group heading in the To list.

#### TC:22 — Verify a Customer's own email appears first, followed by its Contacts (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Open To and find Customer C1.

**Expected Result:**

- Under C1, C1's own email is listed first, followed by its Contacts' emails.
- Each entry shows the Customer's or person's name with the email.

#### TC:23 — Verify a Customer with an email but no Contacts (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Open To and find Customer C3.

**Expected Result:**

- C3 is listed with only its own email.

#### TC:24 — Verify Customer and Contact emails can be selected across Customers (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. In To, select C1's email, one of C1's Contacts, and C3's email.

**Expected Result:**

- All three addresses appear as selected values in To.

#### TC:25 — Verify the customer To list can be searched (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Type a Customer name into To.
3. Clear it and type a Contact name.
4. Clear it and type part of an email address.

**Expected Result:**

- The list filters to matching entries for each search, and the Customer grouping is kept.

#### TC:26 — Verify Cc lists CRM managers' emails (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Open the Cc field's dropdown.

**Expected Result:**

- The options are CRM managers, each shown with their email.

#### TC:27 — Verify CRM managers can be added in Cc (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Select at least one recipient in To.
3. Select two CRM managers in Cc.

**Expected Result:**

- Both managers appear as selected values in Cc.

#### TC:28 — Verify Cc is optional (Positive)

**Test Steps:**

1. Open Email Alert to Customer.
2. Select recipients in To and leave Cc empty.
3. Click Redirect to Outlook.

**Expected Result:**

- The redirect succeeds with an empty Cc.

#### TC:29 — Prevent customer redirect with no recipient selected (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. Leave To empty.
3. Click Redirect to Outlook.

**Expected Result:**

- The redirect is blocked and To shows "Select at least one email address".
- No Outlook tab opens and the popup stays open.

#### TC:30 — Prevent customer redirect with only Cc filled (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. Leave To empty and select CRM managers in Cc.
3. Click Redirect to Outlook.

**Expected Result:**

- The redirect is blocked and To shows "Select at least one email address".
- No Outlook tab opens.

#### TC:31 — Verify a Customer with no email on file cannot be selected (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. Open To and find Customer C2.
3. Try to select C2.

**Expected Result:**

- C2 is listed with "No email on file".
- Nothing under C2 can be selected.

#### TC:32 — Verify an inactive Customer is not offered (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. In To, search for inactive Customer C4 by name.
3. Search for C4's email.

**Expected Result:**

- C4 does not appear in either search.

#### TC:33 — Verify an inactive Customer's Contacts are not offered (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. In To, search for one of C4's Contacts by name.
3. Search for that Contact's email.

**Expected Result:**

- The Contact does not appear in either search.

#### TC:34 — Verify Cc does not offer anyone other than CRM managers (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. In Cc, search for a CRM executive.
3. Search for a Customer, then for a Contact.

**Expected Result:**

- None of them are offered. Only CRM managers are listed in Cc.

#### TC:35 — Verify free-text addresses cannot be added to To or Cc (Negative)

**Test Steps:**

1. Open Email Alert to Customer.
2. Type an email address that is not in the CRM into To.
3. Type the same address into Cc.

**Expected Result:**

- No matching option is offered and no free-text entry is accepted in either field.

#### TC:36 — Verify an email held on two records appears only once (Edge)

**Test Steps:**

1. Open Email Alert to Customer.
2. In To, search for the shared email address.

**Expected Result:**

- The address is listed only once.

#### TC:37 — Verify a newly deactivated Customer disappears from the list (Edge)

**Test Steps:**

1. Open Email Alert to Customer and note an active Customer in To.
2. Close the popup and deactivate that Customer.
3. Reopen Email Alert to Customer and search for the Customer.

**Expected Result:**

- The Customer and its Contacts are no longer listed.

#### TC:38 — Verify a reactivated Customer reappears in the list (Edge)

**Test Steps:**

1. Reactivate the Customer deactivated in TC:37.
2. Open Email Alert to Customer and search for the Customer.

**Expected Result:**

- The Customer and its Contacts are listed again.

#### TC:39 — Verify a newly added Contact appears under its Customer (Edge)

**Test Steps:**

1. Add a new Contact with an email to Customer C3.
2. Open Email Alert to Customer and find C3 in To.

**Expected Result:**

- The new Contact's email appears under C3, below C3's own email.

#### TC:40 — Verify the same address selected in both To and Cc (Edge)

**Test Steps:**

1. Use a CRM manager whose email is also stored as a Contact email.
2. Open Email Alert to Customer.
3. Select that address in To and in Cc.
4. Click Redirect to Outlook.

**Expected Result:**

- The behaviour is consistent: either the duplicate selection is prevented, or the address is included only once.
- The Outlook draft does not list the address twice.

#### TC:41 — Verify a Customer with only Contact emails (Edge)

**Test Steps:**

1. Use an active Customer that has no email of its own but has Contacts with emails.
2. Open Email Alert to Customer and find that Customer in To.

**Expected Result:**

- The Customer group shows its Contacts' emails.
- It does not show "No email on file".

#### TC:42 — Verify a large Customer and Contact list (Edge)

**Test Steps:**

1. Use an environment with many active Customers and Contacts.
2. Open Email Alert to Customer.
3. Scroll through the To list and search within it.

**Expected Result:**

- The list loads, scrolls and filters without noticeable lag or missing entries, and the grouping is kept.

### D. Email Body

#### TC:43 — Verify the internal email body is generated from the Alert (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert Internally.
2. Review the Email Body.

**Expected Result:**

- The body shows Alert A's title, type, region, published-on date, effective-from date, regulations, and official source.

#### TC:44 — Verify the internal email body includes "Impact on SAITEX" (Positive)

**Test Steps:**

1. Open Email Alert Internally on Alert A.
2. Review the Email Body.

**Expected Result:**

- The "Impact on SAITEX" section is present and matches Alert A's content.

#### TC:45 — Verify the customer email body is generated from the Alert (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert to Customer.
2. Review the Email Body.

**Expected Result:**

- The body shows Alert A's title, type, region, published-on date, effective-from date, regulations, and official source.

#### TC:46 — Verify the customer email body excludes "Impact on SAITEX" (Negative)

**Test Steps:**

1. Open Email Alert to Customer on Alert A.
2. Search the Email Body for "Impact on SAITEX" and for that section's text.

**Expected Result:**

- Neither the "Impact on SAITEX" heading nor its content is present.

#### TC:47 — Verify the Email Body cannot be edited (Negative)

**Test Steps:**

1. Open either Email Alert popup.
2. Try to type into, delete from, or paste into the Email Body.

**Expected Result:**

- The body is read-only and its content does not change.

#### TC:48 — Verify the body updates when a different Alert is used (Edge)

**Test Steps:**

1. Open either popup on Alert A, then click Cancel.
2. Open a different Alert's detail view.
3. Open the same popup.

**Expected Result:**

- The body shows the second Alert's data, with nothing carried over from Alert A.

#### TC:49 — Verify long and special-character Alert content in the body (Edge)

**Test Steps:**

1. Use an Alert with long regulations text, line breaks, and characters such as &, %, #, quotes, and non-English characters.
2. Open either popup and review the body.

**Expected Result:**

- The body shows all the content in full and readably, with no truncation, stray escape codes, or broken layout.

#### TC:50 — Verify dates are shown consistently in the body (Edge)

**Test Steps:**

1. Note the published-on and effective-from dates on Alert A's detail view.
2. Open either popup and compare the dates in the body.

**Expected Result:**

- Both dates match the detail view in value and format.

#### TC:51 — Verify the official source in the body (Edge)

**Test Steps:**

1. Note the official source URL on Alert A's detail view.
2. Open either popup and check the official source in the body.

**Expected Result:**

- The full URL is shown and matches the one on the Alert detail view.

### E. Redirect to Outlook, Cancel, and post-conditions

#### TC:52 — Verify the internal redirect opens a composed Outlook email (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert Internally.
2. Select two internal users in To.
3. Click Redirect to Outlook.

**Expected Result:**

- A new tab opens an Outlook (Office 365) compose window.
- To contains the two selected users.
- The subject is "[SAITEX Alert] <Alert title>".
- The body matches the internal body, including "Impact on SAITEX".

#### TC:53 — Verify the customer redirect opens a composed Outlook email (Positive)

**Test Steps:**

1. Open Alert A's detail view and click Email Alert to Customer.
2. Select Customer and Contact emails in To.
3. Select CRM managers in Cc.
4. Click Redirect to Outlook.

**Expected Result:**

- A new tab opens an Outlook (Office 365) compose window.
- To and Cc contain exactly the selected addresses.
- The subject is "[SAITEX Alert] <Alert title>".
- The body matches the customer body, without "Impact on SAITEX".

#### TC:54 — Verify the popup closes and a confirmation is shown after redirect (Positive)

**Test Steps:**

1. Complete the steps of TC:52 or TC:53.
2. Return to the CRM tab.

**Expected Result:**

- The popup is closed.
- A "Redirected to Outlook" confirmation is shown.

#### TC:55 — Verify the Alert record is unchanged after redirect (Positive)

**Test Steps:**

1. Note Alert A's status, content, and Checked/Unchecked state.
2. Open either popup, select recipients, and click Redirect to Outlook.
3. Reload Alert A's detail view.

**Expected Result:**

- Status, content, and Checked/Unchecked state are identical to before.

#### TC:56 — Verify Cancel closes the popup without composing an email (Positive)

**Test Steps:**

1. Open either popup and select recipients.
2. Click Cancel.

**Expected Result:**

- The popup closes.
- No Outlook tab opens and no confirmation is shown.

#### TC:57 — Verify clicking outside the popup closes it without composing an email (Positive)

**Test Steps:**

1. Open either popup and select recipients.
2. Click outside the popup.

**Expected Result:**

- The popup closes.
- No Outlook tab opens and no confirmation is shown.

#### TC:58 — Verify nothing is recorded when the popup is cancelled (Negative)

**Test Steps:**

1. Open either popup, select recipients, and click Cancel.
2. Check Alert A and the selected Customer's Communication history.

**Expected Result:**

- Nothing is recorded and Alert A is unchanged.

#### TC:59 — Verify selections are cleared after Cancel (Edge)

**Test Steps:**

1. Open either popup and select recipients (and Cc, for the customer popup).
2. Click Cancel.
3. Reopen the same popup.

**Expected Result:**

- To and Cc are empty again.
- From and the Email Body are freshly pre-filled.

#### TC:60 — Verify the Escape key closes the popup (Edge)

**Test Steps:**

1. Open either popup.
2. Press Escape.

**Expected Result:**

- The popup closes without composing an email.

#### TC:61 — Verify the subject with special characters in the Alert title (Edge)

**Test Steps:**

1. Use an Alert whose title contains &, #, quotes, %, or non-English characters.
2. Open either popup, select recipients, and click Redirect to Outlook.

**Expected Result:**

- The Outlook subject reads exactly "[SAITEX Alert] <Alert title>", with every character intact and nothing cut off.

#### TC:62 — Verify a very long email with many recipients (Edge)

**Test Steps:**

1. Use an Alert with very long text.
2. Open either popup and select many recipients.
3. Click Redirect to Outlook.

**Expected Result:**

- Outlook opens with the complete To, Cc, and body.
- If a link length limit is reached, the user is told, rather than content being silently dropped.

#### TC:63 — Verify the redirect when the browser blocks pop-ups (Edge)

**Test Steps:**

1. Block pop-ups for the CRM in the browser settings.
2. Open either popup, select recipients, and click Redirect to Outlook.

**Expected Result:**

- The user is told the Outlook tab was blocked, or is offered another way to open it.
- The CRM does not show a "Redirected to Outlook" confirmation when nothing opened.

#### TC:64 — Verify the redirect when the user is not signed in to Outlook (Edge)

**Test Steps:**

1. Sign out of Office 365 in the browser.
2. Open either popup, select recipients, and click Redirect to Outlook.
3. Sign in when Outlook asks.

**Expected Result:**

- Outlook asks the user to sign in.
- After signing in, the compose window has the same To, Cc, subject, and body.

#### TC:65 — Verify double-clicking Redirect to Outlook (Edge)

**Test Steps:**

1. Open either popup and select recipients.
2. Double-click Redirect to Outlook.

**Expected Result:**

- Only one Outlook tab opens and only one confirmation is shown.

#### TC:66 — Verify the redirect after the session has expired (Edge)

**Test Steps:**

1. Open either popup and select recipients.
2. Wait for the CRM session to expire.
3. Click Redirect to Outlook.

**Expected Result:**

- The user is asked to log in again.
- No partial or broken Outlook email is opened.

#### TC:67 — Verify edits made in Outlook do not affect the CRM (Edge)

**Test Steps:**

1. Open either popup, select recipients, and click Redirect to Outlook.
2. In Outlook, change the subject and body, then send.
3. Reload Alert A's detail view in the CRM.

**Expected Result:**

- Alert A is unchanged in the CRM.

## Coverage summary

| Area                                 | Positive | Negative | Edge   | Total  |
| ------------------------------------ | -------- | -------- | ------ | ------ |
| A. Entry points and popup load       | 5        | 2        | 1      | 8      |
| B. Internal To recipients            | 5        | 4        | 3      | 12     |
| C. Customer To and Cc                | 8        | 7        | 7      | 22     |
| D. Email Body                        | 3        | 2        | 4      | 9      |
| E. Redirect, Cancel, post-conditions | 6        | 1        | 9      | 16     |
| **Total**                            | **27**   | **16**   | **24** | **67** |

## Acceptance criteria traceability

| Acceptance criterion                                                                                  | Test cases                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------- |
| From shows the logged-in user and cannot be edited                                                    | TC:4, TC:5, TC:6, TC:7     |
| No To recipient blocks the redirect with the mode-specific message                                    | TC:14, TC:15, TC:29, TC:30 |
| Internal body includes "Impact on SAITEX"                                                             | TC:44                      |
| Customer body excludes "Impact on SAITEX"                                                             | TC:46                      |
| Active Customer with Contacts is grouped, own email first                                             | TC:21, TC:22               |
| Active Customer with no email shows "No email on file" with nothing selectable                        | TC:31                      |
| Inactive Customer and its Contacts are not listed                                                     | TC:32, TC:33, TC:37        |
| Valid redirect opens Outlook with the same To, Cc, subject and body; popup closes with a confirmation | TC:52, TC:53, TC:54        |
| Cancel or click outside composes no email                                                             | TC:56, TC:57, TC:58        |
| An address appears only once                                                                          | TC:18, TC:36               |
| Cc is optional and lists CRM managers                                                                 | TC:26, TC:27, TC:28, TC:34 |
| Alert record unchanged                                                                                | TC:55, TC:67               |

## Notes for automation

- Everything up to the Outlook handoff is observable in the CRM and can be automated.
- For TC:52/TC:53/TC:61/TC:62, the reliable check is the Outlook link the CRM opens: capture the new tab's URL (`context.waitForEvent('page')`) and assert its `to`, `cc`, `subject` and `body` query parameters. Don't depend on the Outlook UI or a real mailbox.
- TC:63, TC:64 and TC:67 depend on the browser and Outlook rather than the CRM, so they are better run manually.
- TC:32/TC:33/TC:37/TC:38 need a known inactive Customer (C4). Create or deactivate one as test setup rather than relying on seed data.
