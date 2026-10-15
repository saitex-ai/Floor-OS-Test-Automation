# CRM — Company for Customer (Sprint 5)

- **Test-case set:** [CRM -Sprint -5 - Company for Customer](https://app.clickup.com/t/z941abx7df)
- **Related bug:** [Customer Record Can Be Created Without Selecting a Mandatory Company](https://app.clickup.com/t/z941abx9aw) (marked done in ClickUp, still reproducible on dev 2026-10-15)
- **Automated in:** [`tests/regression/crm/31-company-for-customer.spec.ts`](../../tests/regression/crm/31-company-for-customer.spec.ts)
- **Page objects:** [`src/pages/crm/create-customer.page.ts`](../../src/pages/crm/create-customer.page.ts), [`src/pages/crm/customer-detail.page.ts`](../../src/pages/crm/customer-detail.page.ts)

| #    | Test case                                            | Steps                                                                                                                                        | Expected result                                                                                                                                      | ClickUp                                      | Automated | Verified on dev                    |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ---------------------------------- |
| TC:1 | Verify Company Field Options (Static Reference Data) | 1. Click on the Company field dropdown.<br>2. Attempt to type a custom, unlisted company name directly into the field.                       | The dropdown displays only the pre-configured list of operating companies. Free text entry is rejected; unlisted values cannot be selected or saved. | [link](https://app.clickup.com/t/z941abx7dg) | ✅        | ✅ passing                         |
| TC:2 | Create Customer with Single Company Selection        | 1. Fill in mandatory customer details.<br>2. Select one operating company from the Company dropdown.<br>3. Click Save.                       | The record is created and persisted. The selected company is displayed in the Customer Details Overview / Management card.                           | [link](https://app.clickup.com/t/z941abx7dh) | ✅        | ✅ passing                         |
| TC:3 | Create Customer with Multiple Company Selections     | 1. Fill in mandatory customer details.<br>2. Select two or more operating companies.<br>3. Click Save.                                       | The record saves without errors. In the read view, every selected company is a distinct chip/item rather than a single comma-joined string.          | [link](https://app.clickup.com/t/z941abx7dj) | ✅        | ⚠️ passing, asserts BUG (see note) |
| TC:4 | Attempt to Save Customer without Selecting a Company | 1. Leave the Company field blank.<br>2. Click Save.                                                                                          | Save is blocked. The Company field shows an inline validation error (e.g. "At least one Company must be selected").                                  | [link](https://app.clickup.com/t/z941abx7dk) | ✅        | ⚠️ passing, asserts BUG (see note) |
| TC:5 | Edit Existing Customer's Company Associations        | 1. Open the Customer's Management section and click Edit.<br>2. Add a second operating company and remove the initial one.<br>3. Click Save. | The changes are persisted. The read view updates to show the new company/companies and omits the removed one.                                        | [link](https://app.clickup.com/t/z941abx7dm) | ✅        | ✅ passing                         |
| TC:6 | Verify Audit History on Company Field Modification   | 1. Open the Customer record.<br>2. Open the Audit History or Activity log tab.<br>3. Review the entries for the Company field change.        | An audit entry shows the modification with old value(s), new value(s), the exact timestamp and the acting user.                                      | [link](https://app.clickup.com/t/z941abx7dp) | ⏸ fixme   | ❌ feature missing (see note)      |

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
- **TC:3 (BUG):** both companies are saved, but the Detail read view
  renders them as one plain comma-joined string (`AFD, Other Co`), which
  is exactly what the expected result rules out. The test asserts the
  current string, so it fails when chips are introduced.
- **TC:4 (BUG):** with every other mandatory field filled and Company
  left blank, Save goes through ("Customer … was created successfully!")
  and the new Customer's Company is empty. No inline error is shown. The
  test asserts this current behavior and should be changed to expect the
  validation error once bug z941abx9aw is really fixed on dev.
- **TC:6 (fixme):** Customer Detail has no Audit History / Activity log.
  Its tabs are Overview, Lead Qualification, Biz Docs, Communication and
  Contacts. The System card's "Updated On / Updated By" is the only trace
  of a change, with no old/new values.
