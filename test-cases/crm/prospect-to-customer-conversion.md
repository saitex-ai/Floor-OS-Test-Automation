# CRM — Prospect to Customer Conversion (1st Ever Sample Order) (Sprint 5)

- **Story:** when the first-ever order (Sample Order or Bulk Order) is created for a Prospect, its CRM Stage changes automatically from `Prospect` to `Customer`. The change is audited and stakeholders are notified in-app and by email. Later orders don't trigger it again.
- **Test-case set:** [CRM -Sprint- 5 - Prospect to Customer Conversion (1st Ever Sample Order)](https://app.clickup.com/t/z941abyjhw)
- **Source:** ClickUp ("Test Cases and Runs" list, Test Management folder), pulled 2026-10-15
- **Automated in:** [`tests/regression/crm/34-prospect-to-customer-conversion.spec.ts`](../../tests/regression/crm/34-prospect-to-customer-conversion.spec.ts)
- **Page objects:**
  - [`src/pages/crm/prospect-to-customer-conversion.page.ts`](../../src/pages/crm/prospect-to-customer-conversion.page.ts): CRM Stage, Customers list, Updated By and the conversion notification.
  - [`src/pages/master-data/sales-order.page.ts`](../../src/pages/master-data/sales-order.page.ts): new; the trigger.
  - The Customer Season Master page objects: the season that a Sales Order needs.
  - [`src/pages/crm/biz-doc.page.ts`](../../src/pages/crm/biz-doc.page.ts): the Orders tile.

## Where orders are really created (confirmed on dev, 2026-10-15)

The ClickUp steps say Customer Details → Biz Docs → Orders tile → Create Order. On dev that tile is a read-only note that says "Orders: —. Purchase Orders is not available in floorOS yet." It has no Create Order action. Orders are created here instead:

**Master Data → Sales Order Management → Sales Order** (`/master-data/sales-order-management/sales-order`) → **New Sales Order** → dialog "Sale Order Information"

- **Order Type:** `SMS` is the sample order and `BULK` is the bulk order. The screen's own text says either one converts a CRM Prospect into a Customer.
- **Required fields:** Order Type, Requested Date (defaults to today), Customer and Season.
- **Season comes first:** a Season belongs to a Customer, so each TC first creates a Customer Season in Master Data → System Management → Customer Season Master.
- **New Prospects work immediately:** a brand-new CRM Prospect can be selected straight away in both the season's customer picker and the order's customer picker. Pickers search by Customer Code, for example `CTC0001860`.

Each TC creates its own data through the UI, and nothing that existed before is touched. The data is:

1. A Customer named `Playwright P2C TC<n> <timestamp>` at CRM Stage Prospect.
2. Season `PWP<timestamp>` for that Customer.
3. One or two Sales Orders, each with the unique Description `PW P2C <first|second> <SMS|BULK> <timestamp>`.

## Test cases

| #    | Test case                                                           | Steps (as automated)                                                                                                  | Expected result (ClickUp)                                                                                      | ClickUp                                      | Dev result (2026-10-15)                                                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC:1 | Verify First Sample Order Manual Creation                           | New Prospect + season → SMS Sales Order → Customer Details → Biz Docs                                                 | Stage changes `Prospect` → `Customer`. The Sample Order is listed under the Orders tile.                       | [link](https://app.clickup.com/t/z941abyn6c) | ✅ Stage converts and the order is in the Sales Order list. **BUG:** the Biz Docs Orders tile still shows the placeholder and doesn't list the order.                                                                             |
| TC:2 | verify UI Consistency Across Views                                  | Second tab on the Customers list (Prospects tab) + Customer Overview → SMS order → Refresh the list / reload Overview | The list shows the new stage and tab. Overview shows `Customer`. Stage widgets update.                         | [link](https://app.clickup.com/t/z941abyn6d) | ✅ After Refresh, the Customer leaves the Prospects tab, is listed under Customers as `Customer`, and Overview shows `Customer`. Views don't update in real time; the TC allows "upon refresh". Dashboard counts aren't asserted. |
| TC:3 | Verify Audit History & Stakeholder Notifications                    | New Prospect → SMS order → Customer Details (System section) → notification bell                                      | An audit entry for `Prospect` → `Customer` that names the order. Stakeholders get a system alert and an email. | [link](https://app.clickup.com/t/z941abypre) | ✅ Updated By is `system:sales-order`, and exactly one in-app notification names the SO#. **BUG:** there is no Audit History view. Email isn't checked because there is no mailbox fixture (annotation).                          |
| TC:4 | Verify Subsequent Sample Orders Do Not Re-Trigger                   | SMS #1 → stage and notification → SMS #2 → stage and notifications                                                    | Stage stays `Customer`. No duplicate audit entry or notification.                                              | [link](https://app.clickup.com/t/z941abypt1) | ✅ Stage stays `Customer`. There is still exactly one conversion notification, it names SMS #1, and none names SMS #2.                                                                                                            |
| TC:5 | Bulk Order After Initial Sample Order Conversion (Sample ---> Bulk) | SMS → `Customer` → BULK                                                                                               | The order is created under Biz Docs. Stage stays `Customer`.                                                   | [link](https://app.clickup.com/t/z941abypt2) | ✅ The BULK order is created and listed, stage stays `Customer`, and no repeat notification is sent. **BUG:** the order isn't shown under Biz Docs.                                                                               |
| TC:6 | Sample Order After Initial Bulk Order Conversion (Bulk --->Sample)  | BULK → `Customer` → SMS                                                                                               | The order is created under Biz Docs. Stage stays `Customer`.                                                   | [link](https://app.clickup.com/t/z941abypt4) | ✅ The SMS order is created and listed, stage stays `Customer`, and no repeat notification is sent. **BUG:** the order isn't shown under Biz Docs.                                                                                |
| TC:7 | Verify First Order Created is a Bulk Order                          | New Prospect → BULK order (first ever)                                                                                | Stage changes `Prospect` → `Customer`. The order is saved under the Orders tile.                               | [link](https://app.clickup.com/t/z941abypt5) | ✅ A BULK order converts the Customer, and the notification names the BULK SO#. **BUG:** the Orders tile still shows the placeholder.                                                                                             |

All 7 pass on dev. The "BUG:" steps assert what the app really does today.

## Bugs and gaps found

1. **The Biz Docs Orders tile doesn't reflect Sales Orders (TC:1, 5, 6, 7).** On Customer Details → Biz Docs, the Orders tile still shows "Orders: —. Purchase Orders is not available in floorOS yet." after one or more SMS/BULK Sales Orders exist for the Customer. The tile can't be clicked and has no list or Create Order action. The TCs expect the order to be listed under the Orders tile.
2. **There is no Audit History view (TC:3).** Customer Details has only these tabs: Overview, Lead Qualification, Biz Docs, Communication and Contacts. The only trace of the conversion is the System section's "Updated By: system:sales-order". The TC expects an audit entry that records `Prospect` → `Customer` and names the triggering order.
3. **Not verified:**
   - The stakeholder email (TC:3), because the framework has no mailbox fixture.
   - The CRM Home "Pipeline" stage counts (TC:2), because dev is shared and other suites change the counts at the same time.

## Observed behavior worth knowing

- The conversion is asynchronous and lands a few seconds after the Sales Order is saved. Already-open CRM views (Customers list, Customer Details) don't update in real time; they need Refresh or a reload. Checks poll with Refresh.
- The conversion notification is `crm.customer.converted_to_customer`. Its text is "The Customer {name} is converted from Prospect to Customer as this Customer's first ever Sales Order {SO#} has come in Floor OS." It links to `/crm/customers/{id}?tab=overview`.
- In notification text, digit runs in the Customer name are masked as `[phone]`. Tests therefore match notifications by link href, not by name.
- The Sales Order list's "Created By" column shows a user UUID rather than a name. This isn't asserted and is outside this story.
- Customers list stage tabs: Prospects and Customers sit behind a "+2 more" menu. Selecting one moves it into the tab bar, and the menu becomes "+1 more".
