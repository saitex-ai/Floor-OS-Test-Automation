import { type Locator, type Page } from '@playwright/test';

/** The two CRM Stage tabs on the Customers list that sit behind "+2 more". */
export type OverflowStageTab = 'Prospects' | 'Customers';

/**
 * Raw element locators for the CRM-side surfaces of "Prospect to Customer
 * Conversion (1st Ever Sample Order)" (CRM, Sprint 5) — no actions or
 * assertions here, see src/pages/crm/prospect-to-customer-conversion.page.ts.
 * The CRM Stage field row and the notification bell/panel are reused from
 * QualifiedLeadToProspectLocators (composed by the page object).
 *
 * Confirmed against dev (2026-10-15) via ariaSnapshot():
 *
 * - Customers list (`/crm/customers`): CRM Stage tabs are buttons ("All N",
 *   "Leads N", "Qualified Leads N"), then "+2 more" opens `menu "+2 more"`
 *   with `menuitem "Prospects N"` / `menuitem "Customers N"`. Selecting one promotes it into the bar as a
 *   button and the overflow becomes "+1 more". A
 *   `textbox "Search"` narrows the list and a "Refresh" button reloads it.
 *   Row cells: select checkbox, Customer Name, CRM Stage, ...
 * - Customer Details → System section: "Customer Code" value renders as a
 *   bare "CTC0001860"-shaped text node (with a "Locked field" icon), and
 *   "Updated By" reads "system:sales-order" after a Sales Order converts
 *   the Customer.
 * - Customer Details sub-tabs: Overview / Lead Qualification / Biz Docs /
 *   Communication / Contacts (n). No Audit / History tab.
 * - The conversion's in-app notification is a `link` in the bell panel,
 *   href `/crm/customers/{id}?tab=overview`, text "The Customer {name} is
 *   converted from Prospect to Customer as this Customer's first ever
 *   Sales Order {SO#} has come in Floor OS.Click to view the Customer
 *   crm.customer.converted_to_customer · now". Digits in the name are
 *   masked as "[phone]", so match it by href, never by the name.
 */
export class ProspectToCustomerConversionLocators {
  readonly searchInput: Locator;
  readonly refreshButton: Locator;
  readonly moreStageTabsButton: Locator;
  readonly customerCodeValue: Locator;
  readonly overviewTabButton: Locator;
  readonly auditHistoryTab: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });
    this.moreStageTabsButton = page.getByRole('button', { name: /^\+\d+ more$/ });
    this.customerCodeValue = page.getByText(/^CTC\d+$/).first();
    this.overviewTabButton = page.getByRole('button', { name: 'Overview', exact: true });
    this.auditHistoryTab = page.getByRole('button', { name: /audit|history/i });
  }

  /** A CRM Stage tab tucked behind "+N more" — name carries a live count, so prefix-matched. */
  overflowStageTab(tab: OverflowStageTab): Locator {
    return this.page.getByRole('menuitem', { name: new RegExp(`^${tab} \\d+$`) });
  }

  /**
   * The same stage tab once promoted to the tab bar. Confirmed on dev:
   * selecting an overflow tab moves it into the bar as a pressed button
   * ("Prospects 44" [pressed]) and the overflow shrinks to "+1 more".
   */
  promotedStageTab(tab: OverflowStageTab): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${tab} \\d+$`) });
  }

  /** The Customers list data row for one Customer, matched by its (unique) name. */
  customerRow(customerName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: customerName });
  }

  /** The CRM Stage cell (2nd data column, after the selection checkbox) within a row. */
  crmStageCell(row: Locator): Locator {
    return row.getByRole('cell').nth(2);
  }

  /** "Updated By" value in Customer Details' System section. */
  updatedByValue(value: string): Locator {
    return this.page.getByText(value, { exact: true });
  }

  /** Every Prospect -> Customer conversion notification for one Customer (matched by href). */
  conversionNotifications(customerId: string): Locator {
    return this.page
      .locator(`a[href*="/crm/customers/${customerId}"]`)
      .filter({ hasText: 'converted from Prospect to Customer' });
  }
}
