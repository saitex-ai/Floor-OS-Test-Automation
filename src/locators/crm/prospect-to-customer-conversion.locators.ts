import { type Locator, type Page } from '@playwright/test';

/** The two CRM Stage tabs on the Customers list that sit behind "+2 more". */
export type OverflowStageTab = 'Prospects' | 'Customers';

/**
 * Raw element locators for the CRM-side surfaces of "Prospect to Customer
 * Conversion (1st Ever Sample Order)" (CRM, Sprint 5) — no actions or
 * assertions here, see src/pages/crm/prospect-to-customer-conversion.page.ts.
 *
 * Confirmed against dev (2026-10-15) via ariaSnapshot():
 *
 * - The Customers list (`/crm/customers`) has CRM Stage tabs as buttons:
 *   "All N", "Leads N", "Qualified Leads N", then a "+2 more" button that
 *   opens a `menu "+2 more"` holding `menuitem "Prospects N"` and
 *   `menuitem "Customers N"` — "Customer" is a real CRM Stage.
 * - A `textbox "Search"` narrows the list; each data row's accessible
 *   name carries the Customer Name and its CRM Stage cell text
 *   (e.g. "... Playwright P2C Probe 1792062636409 Prospect Referral ...").
 *
 * The Biz Docs Orders tile (the story's trigger entry point) lives in
 * biz-doc.locators.ts (`ordersTile`, `createOrderButton`).
 */
export class ProspectToCustomerConversionLocators {
  readonly searchInput: Locator;
  readonly moreStageTabsButton: Locator;

  constructor(private readonly page: Page) {
    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    this.moreStageTabsButton = page.getByRole('button', { name: '+2 more' });
  }

  /** A CRM Stage tab tucked behind "+2 more" — name carries a live count, so prefix-matched. */
  overflowStageTab(tab: OverflowStageTab): Locator {
    return this.page.getByRole('menuitem', { name: new RegExp(`^${tab} \\d+$`) });
  }

  /** The Customers list data row for one Customer, matched by its (unique) name. */
  customerRow(customerName: string): Locator {
    return this.page.getByRole('row').filter({ hasText: customerName });
  }

  /** The CRM Stage cell (2nd data column, after the selection checkbox) within a row. */
  crmStageCell(row: Locator): Locator {
    return row.getByRole('cell').nth(2);
  }
}
