# CRM — Email an Alert (Sprint 5)

- **Test-case set:** [CRM -Sprint -5-Email an Alert](https://app.clickup.com/t/z941abx7ga)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Detailed (wider) test-case doc:** [`email-alert-internally-and-to-customer.md`](email-alert-internally-and-to-customer.md). The "Doc TCs" column below maps each ClickUp TC to it.
- **Automated in:** [`tests/regression/crm/32-email-an-alert.spec.ts`](../../tests/regression/crm/32-email-an-alert.spec.ts)
- **Locators:** [`src/locators/crm/alerts.locators.ts`](../../src/locators/crm/alerts.locators.ts)
- **Page object:** [`src/pages/crm/alerts.page.ts`](../../src/pages/crm/alerts.page.ts) (fixture `alertsPage`)
- **Outlook deep-link parser:** [`src/utils/outlook-compose.ts`](../../src/utils/outlook-compose.ts)

## Test cases

| #    | Test case                                                                                 | Doc TCs                        | ClickUp                                      | Automated    | Dev run 2026-10-15                      |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------- | ------------ | --------------------------------------- |
| TC:1 | Internal recipients build the body (incl. "Impact on SAITEX") and open Outlook pre-filled | 4, 6, 9–11, 43, 44, 52, 54, 55 | [link](https://app.clickup.com/t/z941abyjby) | ✅           | ✅ passing                              |
| TC:2 | Redirection blocked when no internal recipient is selected                                | 14                             | [link](https://app.clickup.com/t/z941abyjbz) | ✅           | ✅ passing                              |
| TC:3 | Successful redirection for Customer Email Alert (with optional Cc)                        | 24, 27, 45, 46, 53, 54         | [link](https://app.clickup.com/t/z941abyjc0) | ✅           | ✅ passing                              |
| TC:4 | Redirection blocked when no customer recipient is selected                                | 29                             | [link](https://app.clickup.com/t/z941abyjc1) | ✅           | ✅ passing (fixed on dev by 2026-10-23) |
| TC:5 | Customers and their Contacts are grouped and formatted in the dropdown                    | 22                             | [link](https://app.clickup.com/t/z941abyjc2) | ✅           | ✅ passing                              |
| TC:6 | Display for active Customers lacking an email address                                     | 31                             | [link](https://app.clickup.com/t/z941abyjc3) | ✅           | ✅ passing (fixed on dev by 2026-10-21) |
| TC:7 | Inactive Customers and inactive Contacts are excluded                                     | 32, 33, 37                     | [link](https://app.clickup.com/t/z941abyjc4) | ✅ (partial) | 🐞 passing, asserts BUG (still listed)  |
| TC:8 | An email shared across records appears only once                                          | 36                             | [link](https://app.clickup.com/t/z941abyjc5) | ✅           | ✅ passing                              |
| TC:9 | Closing or cancelling the popup aborts without side effects                               | 56, 57, 58, 59                 | [link](https://app.clickup.com/t/z941abyjc6) | ✅           | ✅ passing                              |

## Bugs found on dev (2026-10-15)

1. **TC:4: wrong validation message on the Customer popup.** Open an Alert, click Email Alert to Customer, leave To empty and click Redirect to Outlook. The redirect is correctly blocked, but the message reads "Select a Customer email ID". Expected: "Select at least one email address" (the wording Key Meeting Notes' "Notify the Customer" uses). **Fixed on dev by 2026-10-23:** the message now reads "Select at least one email address", and TC:4 asserts that.
2. **TC:6: a Customer with no email is left out.** Create an active Customer with no email and no Contacts, open Email Alert to Customer and search the To list for it. Nothing is returned and "No email on file" never appears. Expected: the Customer is listed with "No email on file" and can't be selected. **Fixed on dev by 2026-10-21:** the Customer is now listed with "No email on file" and no option, and TC:6 asserts that.
3. **TC:7: inactive Customers are still offered.** Create a Customer with a Contact, deactivate the Customer (its status reads Inactive), reload the Alert and open Email Alert to Customer. The Customer's own email and its Contact are still listed and can be selected. Expected: neither is listed.

## Notes

- **Outlook hand-off.** Redirect to Outlook opens a compose deep link in a new tab. The internal popup uses `outlook.office.com/mail/0/deeplink/compose?to=&subject=&body=`; the Customer popup uses `outlook.cloud.microsoft/mail/deeplink/compose?mailtouri=<mailto:…>`. Tests stub Outlook's hosts, decode the link's to/cc/subject/body, compare the body with the popup's preview, and close the tab. Outlook itself is never loaded.
- **Alerts are a fixed seed set.** The tests read the first Alert only. They never Check, Uncheck or delete it, and they assert its detail screen (including the System "Updated On/By" fields) is unchanged afterwards.
- **Test data.** Each test creates its own uniquely named Customers and Contacts ("PW Email Alert …") through the UI. TC:7 deactivates only the Customer it created.
- **TC:7 is partial.** An inactive Contact under an active Customer can't be set up through the UI. Contacts have no Activate/Deactivate control, and deactivating a Customer doesn't change its Contacts' status (see `contacts-tab.page.ts`). Only the inactive-Customer half is checked.
- **TC:8.** Two Customers with the same email produced a single option. The second Customer's group disappears entirely, because its only address was the duplicate.
- **TC:9.** "No transaction recorded" is checked by the Alert detail screen staying unchanged and the addressed Customer's Logged Communications staying at 0. A successful Customer redirect briefly shows "Recording…", but nothing appeared in the Customer's Communication tab during probing either, so this check is weak.
- **Observation (not a ClickUp TC):** when the Customer To list isn't searched, it renders only the first 200 Customers alphabetically. Customers past that point only appear when searched for.
