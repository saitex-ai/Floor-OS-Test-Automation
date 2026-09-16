# CRM — Create Customer (Sprint 1, User Story 1)

- **User Story:** [Create Customer](https://app.clickup.com/t/86eye4dth) — as a CRM user, I want to create a new
  Customer record with its full profile, management, and business-process
  detail, so the organization has a single authoritative record for a
  buying entity before any commercial activity begins.
- **Test-case set:** [CRM - Sprint 1 - Create Customer](https://app.clickup.com/t/86eyqvaq4)
- **Automated in:** [`tests/crm/create-customer.spec.ts`](../../tests/crm/create-customer.spec.ts)
- **Page object:** [`src/pages/crm/create-customer.page.ts`](../../src/pages/crm/create-customer.page.ts)

| #     | Test case                                                            | Steps                                                                                                                                                                       | Expected result                                                                                                                           | ClickUp                                      | Automated | Verified locally      |
| ----- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- | --------------------- |
| TC:1  | Verify navigation and layout of Create Customer screen               | 1. Navigate to the CRM module.<br>2. Click the "Create Customer" button/entry point.                                                                                        | The "Create Customer" form opens displaying Customer Profile, Customer Management, Departments and Assignees, and Link Contacts sections. | [link](https://app.clickup.com/t/86eyqvaru)  | ✅        | ✅ passing            |
| TC:2  | Verify validation when mandatory fields are left blank               | 1. Open the Create Customer form.<br>2. Leave mandatory fields empty (Customer Name, Email, City, Country, CRM Stage, Origin Type).<br>3. Click "Save Customer".            | Save is blocked; inline "Required" errors appear under each empty mandatory field.                                                        | [link](https://app.clickup.com/t/86eyqvatv)  | ✅        | ✅ passing            |
| TC:3  | Verify field-level format validation for URL fields                  | 1. Navigate to Customer Profile section.<br>2. Enter invalid strings into LinkedIn, Facebook, Instagram fields.<br>3. Click "Save Customer".                                | Save is blocked; "Enter a valid URL" errors shown under the respective fields.                                                            | [link](https://app.clickup.com/t/86eyqvav3)  | ✅        | ✅ passing            |
| TC:4  | Verify Business Process / Department assignee restriction            | 1. Fill in all required Customer details.<br>2. Add a Business Process/Department line under Customer Management.<br>3. Don't add an assignee.<br>4. Click "Save Customer". | Save is blocked with an error indicating at least one assignee is required for the added process/department.                              | [link](https://app.clickup.com/t/z941abt4rq) | ✅        | ❌ blocked (see note) |
| TC:5  | Verify duplicate detection modal warning                             | 1. Enter details (Name, Email, etc.) matching an existing Customer.<br>2. Click "Save Customer".                                                                            | Modal warns "This customer may already exist", lists matches, offers "Cancel to review" / "Save anyway".                                  | [link](https://app.clickup.com/t/z941abt4rr) | ✅        | ❌ blocked (see note) |
| TC:6  | Verify duplicate detection cancel action                             | 1. Trigger the duplicate detection warning.<br>2. Click "Cancel to review".                                                                                                 | Modal closes; user stays on the form to review/edit without saving.                                                                       | [link](https://app.clickup.com/t/z941abt4ru) | ✅        | ❌ blocked (see note) |
| TC:7  | Verify successful customer creation without existing contacts linked | 1. Fill in all valid mandatory/optional details.<br>2. Leave "Link Contacts" empty.<br>3. Click "Save Customer" (confirm "Save anyway" if the duplicate warning appears).   | Customer saved, unique Customer ID auto-generated, confirmation toast shown, "Proceed to Contact creation?" prompt modal appears.         | [link](https://app.clickup.com/t/z941abt4rw) | ✅        | ❌ blocked (see note) |
| TC:8  | Verify post-save Contact creation prompt — "Create Contact" path     | 1. Save a new customer without linked contacts.<br>2. On the post-save modal, click "Create Contact".                                                                       | Routes to the Create Contact form with the new Customer pre-linked.                                                                       | [link](https://app.clickup.com/t/z941abt4t4) | ✅        | ❌ blocked (see note) |
| TC:9  | Verify post-save Contact creation prompt — "Cancel" path             | 1. Save a new customer without linked contacts.<br>2. On the post-save modal, click "Cancel".                                                                               | Modal closes; user redirected to the Customer Detail view or Customer List.                                                               | [link](https://app.clickup.com/t/z941abt4t5) | ✅        | ❌ blocked (see note) |
| TC:10 | Verify linking existing contacts during Customer creation            | 1. Fill in valid customer details.<br>2. In "Link Contacts", search and select one or more existing unlinked Contacts.<br>3. Click "Save Customer".                         | Customer saved; selected Contact records updated to reference the new Customer.                                                           | [link](https://app.clickup.com/t/z941abt4t6) | ✅        | ❌ blocked (see note) |
| TC:11 | Verify Cancel button functionality                                   | 1. Open the Create Customer form and enter details.<br>2. Click "Cancel" at the bottom of the form.                                                                         | Creation canceled, no record persisted, user navigated back to the Customers list.                                                        | [link](https://app.clickup.com/t/z941abt4up) | ✅        | ✅ passing            |

## Notes for whoever picks this up next

**Update (2026-09-16):** the "none of that reference data is seeded"
note below is now out of date — Country/CRM Stage/Origin Type/Origin/
Buyer all have real options now (confirmed directly in the running app),
and `origin: 'Internal Referral'`, `buyer: 'Fabric'`, and a new
`referredBy` field (only rendered once Origin Type is "Referral") are
now filled in on every test case that needs a full valid profile
(TC:4–TC:10 in `create-customer.spec.ts`). Also fixed:
`selectComboboxOption()` in `create-customer.page.ts` previously assumed
every combobox's popup is a search-combobox inside a `dialog` (true for
Country) — CRM Stage opens a plain dropdown that doesn't match that
shape, so the selector now tries both. Re-verify against local/dev and
adjust `origin`/`buyer`/`referredBy` values here if your seed data uses
different labels than "Internal Referral" / "Fabric".

As of 2026-09-03 (superseded by the above), verified against a local
`tilt up` stack (`npm run test:crm`): **6 passing** (auth setup, TC:1,
TC:2, TC:3, TC:11, and the module smoke test), **7 blocked** (TC:4–TC:10)
on missing reference data. This matched the user story's own stated
prerequisite ("Reference/master data needed by the form is configured:
origin types, buyer/segment types, business-process catalogue, ...
country/region list") — it just wasn't configured on that machine yet.

Still worth knowing: TC:5/TC:6 (duplicate detection) need an _existing_
Customer in the data that matches the test's name/email, and TC:10 needs
an _existing, unlinked_ Contact — both currently placeholder values with
a TODO in `create-customer.spec.ts`, unconfirmed against real seed data.
