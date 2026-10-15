# CRM — Prospect to Customer Conversion (1st Ever Sample Order) (Sprint 5)

- **Story:** when the first-ever order (Sample Order, or Bulk Order) is created for a Prospect from Customer Details → Biz Docs → Orders tile, the Customer's CRM Stage changes automatically from `Prospect` to `Customer`. The change is recorded in Audit History and stakeholders are notified in-app and by email. Later orders do not trigger it again.
- **Test-case set:** [CRM -Sprint- 5 - Prospect to Customer Conversion (1st Ever Sample Order)](https://app.clickup.com/t/z941abyjhw)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Automated in:** [`tests/regression/crm/34-prospect-to-customer-conversion.spec.ts`](../../tests/regression/crm/34-prospect-to-customer-conversion.spec.ts)
- **Page objects:** [`src/pages/crm/prospect-to-customer-conversion.page.ts`](../../src/pages/crm/prospect-to-customer-conversion.page.ts) (new, Customers list), [`src/pages/crm/biz-doc.page.ts`](../../src/pages/crm/biz-doc.page.ts) (Orders tile), [`src/pages/crm/qualified-lead-to-prospect.page.ts`](../../src/pages/crm/qualified-lead-to-prospect.page.ts) (CRM Stage on Customer Details)

## Test cases

| #    | Test case                                                           | Steps                                                                                                                                    | Expected result                                                                                                              | ClickUp                                      | Automated    | Dev result (2026-10-15) |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------ | ----------------------- |
| TC:1 | Verify First Sample Order Manual Creation                           | 1. Customer Details → Biz Docs → Orders tile.<br>2. Create Order, Category = Sample Order.<br>3. Fill mandatory fields, Save.            | CRM Stage changes from `Prospect` to `Customer` right away. The Sample Order is listed under the Orders tile.                | [link](https://app.clickup.com/t/z941abyn6c) | `test.fixme` | blocked                 |
| TC:2 | verify UI Consistency Across Views                                  | 1. Open the Customer List and Customer Overview.<br>2. Create the first-ever Sample Order.<br>3. Check both views, refreshing if needed. | The Customer List shows the new stage and tab. Overview shows `Customer`. Stage-based widgets update.                        | [link](https://app.clickup.com/t/z941abyn6d) | `test.fixme` | blocked                 |
| TC:3 | Verify Audit History & Stakeholder Notifications                    | 1. Create the first-ever Sample Order for a Prospect.<br>2. Check Audit History.<br>3. Check the notification panel and email.           | An audit entry records `Prospect` → `Customer` and names the triggering order. Stakeholders get a system alert and an email. | [link](https://app.clickup.com/t/z941abypre) | `test.fixme` | blocked                 |
| TC:4 | Verify Subsequent Sample Orders Do Not Re-Trigger                   | 1. Create a second Sample Order.<br>2. Check the stage and audit log.                                                                    | The stage stays `Customer`. No duplicate audit entry or notification.                                                        | [link](https://app.clickup.com/t/z941abypt1) | `test.fixme` | blocked                 |
| TC:5 | Bulk Order After Initial Sample Order Conversion (Sample ---> Bulk) | 1. Create a Bulk Order after the converting Sample Order.                                                                                | The order is created under Biz Docs. The stage stays `Customer`.                                                             | [link](https://app.clickup.com/t/z941abypt2) | `test.fixme` | blocked                 |
| TC:6 | Sample Order After Initial Bulk Order Conversion (Bulk --->Sample)  | 1. Create a Sample Order after the converting Bulk Order.                                                                                | The order is created under Biz Docs. The stage stays `Customer`.                                                             | [link](https://app.clickup.com/t/z941abypt4) | `test.fixme` | blocked                 |
| TC:7 | Verify First Order Created is a Bulk Order                          | 1. Customer Details → Biz Docs → Orders tile.<br>2. Create Order, Category = Bulk Order.<br>3. Save.                                     | CRM Stage changes from `Prospect` to `Customer`. The order is saved under the Orders tile.                                   | [link](https://app.clickup.com/t/z941abypt5) | `test.fixme` | blocked                 |

## What each test checks today

Each TC creates its own new Customer through the UI. The Create Customer form offers CRM Stage = `Prospect`, and the Customer is named `Playwright P2C TC<n> <timestamp>`. Each test then checks these things against dev before it stops at `test.fixme()`:

1. Customer Details shows `CRM Stage • Prospect`.
2. On the Biz Docs tab, the Orders tile is a read-only placeholder (see below). There is no "Create Order" control, and clicking the tile opens nothing.
3. TC:2 only: on the Customers list, the Customer appears under the **Prospects** tab (in the "+2 more" menu), and its CRM Stage column reads `Prospect`.

## Blocker: there is no way to create an order on dev

Confirmed with ariaSnapshot on dev, 2026-10-15:

- On Customer Details → Biz Docs, the fourth tile is `note "Orders: —. Purchase Orders is not available in floorOS yet."`. It is not a button, has no Create Order action, and nothing happens when you click it.
- None of the apps in the FloorOS app drawer creates Sample or Bulk Orders: Techpacks, BOM, Master Data, Costing, Planning, Sample Development, Lab, Production, Garment Products, CRM, Control Center, MIS, PLM. The CRM side navigation has no Orders entry either.
- Only the UI was used. Creating orders through direct API writes is out of scope for this suite.

As a result, none of the seven TCs can run its trigger. ClickUp marks all seven as **pass** on DEV, with a test run on 2026-10-14. That does not match what the dev app showed on 2026-10-15. Check with the manual tester which build or which entry point they used.

TC:3 has two further gaps:

- Customer Details has no Audit History view. Overview shows only the Profile, System, Customer Management, and Departments sections.
- The framework has no mailbox fixture for checking the email notification.

## When order creation ships

`BizDocPage.expectOrdersTileIsUnavailablePlaceholder()` will start to fail. When it does:

1. Probe the new Create Order form.
2. Add its locators to `biz-doc.locators.ts`. The `createOrderButton` placeholder is already there.
3. Replace each test's `test.fixme()` with the real flow. Each test has a `TODO(CRM QA)` comment that says what to assert.
4. After conversion, use `ProspectToCustomerConversionPage.selectOverflowStageTab('Customers')` and `expectCustomerListedWithStage(name, 'Customer')` to check the list view.
