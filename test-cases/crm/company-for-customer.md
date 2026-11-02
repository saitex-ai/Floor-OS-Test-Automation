# CRM — Company for Customer (Sprint 5)

- **Test-case set:** [CRM -Sprint -5 - Company for Customer](https://app.clickup.com/t/z941abx7df)
- **Related bug:** [Customer Record Can Be Created Without Selecting a Mandatory Company](https://app.clickup.com/t/z941abx9aw), closed as not a bug on 2026-10-29: Company is optional.
- **Automated in:** [`tests/regression/crm/31-company-for-customer.spec.ts`](../../tests/regression/crm/31-company-for-customer.spec.ts)
- **Page objects:** [`src/pages/crm/create-customer.page.ts`](../../src/pages/crm/create-customer.page.ts), [`src/pages/crm/customer-detail.page.ts`](../../src/pages/crm/customer-detail.page.ts)

| #    | Test case                                                  | Steps                                                                                                                                        | Expected result                                                                                                                                      | ClickUp                                      | Automated | Verified on dev               |
| ---- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ----------------------------- |
| TC:1 | Verify Company Field Options (Static Reference Data)       | 1. Click on the Company field dropdown.<br>2. Attempt to type a custom, unlisted company name directly into the field.                       | The dropdown displays only the pre-configured list of operating companies. Free text entry is rejected; unlisted values cannot be selected or saved. | [link](https://app.clickup.com/t/z941abx7dg) | ✅        | ✅ passing                    |
| TC:2 | Create Customer with Single Company Selection              | 1. Fill in mandatory customer details.<br>2. Select one operating company from the Company dropdown.<br>3. Click Save.                       | The record is created and persisted. The selected company is displayed in the Customer Details Overview / Management card.                           | [link](https://app.clickup.com/t/z941abx7dh) | ✅        | ✅ passing                    |
| TC:3 | Create Customer with Multiple Company Selections           | 1. Fill in mandatory customer details.<br>2. Select two or more operating companies.<br>3. Click Save.                                       | The record saves without errors. In the read view, every selected company is a distinct chip/item rather than a single comma-joined string.          | [link](https://app.clickup.com/t/z941abx7dj) | ✅        | ✅ passing (dev)              |
| TC:4 | Verify a Customer Can Be Saved Without Selecting a Company | 1. Leave the Company field blank.<br>2. Click Save.                                                                                          | The Customer is saved with no Company; Company is optional (QA decision 2026-10-29).                                                                 | [link](https://app.clickup.com/t/z941abx7dk) | ✅        | ✅ passing (dev)              |
| TC:5 | Edit Existing Customer's Company Associations              | 1. Open the Customer's Management section and click Edit.<br>2. Add a second operating company and remove the initial one.<br>3. Click Save. | The changes are persisted. The read view updates to show the new company/companies and omits the removed one.                                        | [link](https://app.clickup.com/t/z941abx7dm) | ✅        | ✅ passing                    |
| TC:6 | Verify Audit History on Company Field Modification         | 1. Open the Customer record.<br>2. Open the Audit History or Activity log tab.<br>3. Review the entries for the Company field change.        | An audit entry shows the modification with old value(s), new value(s), the exact timestamp and the acting user.                                      | [link](https://app.clickup.com/t/z941abx7dp) | ⏸ fixme   | ❌ feature missing (see note) |

## Notes (confirmed against dev, 2026-10-15)

- **Company field shape:** a multi-select combobox in the Customer
  Management section. It opens a popup with a "Search companies…" box and
  a listbox "Company"; the popup stays open after each pick, and clicking a
  selected option again deselects it. Selected companies show as chips in
  the trigger (Create form and Detail edit mode).
- **Company list is data-driven:** dev lists "AFD" plus many
  "Automation QA Company …" records created by other automation, so the
  tests pick whichever options come first instead of hard-coding names.
  Whether that list is meant to be a fixed "static" set can't be
  checked from the UI.
- **TC:1:** typing an unlisted name gives "No companies match", an empty
  listbox, and Enter doesn't add it. The field stays at "Select".
- **TC:3:** multiple companies can be selected, and both are saved. The
  Detail read view shows them as one comma-separated list (`AFD, Other
Co`). Confirmed with the team (2026-10-15) that this is the intended
  display, not a bug.
- **TC:4:** Company is optional. With Company left blank, Save goes
  through ("Customer … was created successfully!") and the Customer's
  Company is empty. QA decision 2026-10-29, recorded on
  [the test case](https://app.clickup.com/t/z941abx7dk?comment=1100750000251306);
  bug z941abx9aw is closed as not a bug.
- **TC:6 (fixme):** Customer Detail has no Audit History / Activity log.
  Its tabs are Overview, Lead Qualification, Biz Docs, Communication and
  Contacts. The System card's "Updated On / Updated By" is the only trace
  of a change, with no old/new values.
