import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for a BOM's detail page (/bom/<code>/<rev>) —
 * no actions or assertions here, see src/pages/bom/bom-detail.page.ts
 * for those. The detail page has no <h1>: the breadcrumb ("Bill of
 * Materials › {customer} › {code} · Rev 00") is what identifies it.
 */
export class BomDetailLocators {
  readonly breadcrumb: Locator;
  readonly backButton: Locator;

  // Approved + locked state
  readonly lockedStatus: Locator;
  readonly reopenButton: Locator;
  readonly addLineButton: Locator;

  readonly itemsTab: Locator;

  // Reports menu
  readonly reportsButton: Locator;
  readonly reportsMenu: Locator;
  readonly bomReportItem: Locator;
  readonly thdReportItem: Locator;
  readonly trimCardItem: Locator;

  constructor(page: Page) {
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.backButton = page.getByRole('button', { name: 'Back', exact: true });

    this.lockedStatus = page.getByText('LOCKED', { exact: true });
    // "Reopen" shows twice on an Approved BOM — in the lock banner and the toolbar.
    this.reopenButton = page.getByRole('button', { name: 'Reopen' }).first();
    this.addLineButton = page.getByRole('button', { name: /Add line$/ });

    this.itemsTab = page.getByRole('button', { name: /^B\.O\.M Items/ });

    this.reportsButton = page.getByRole('button', { name: 'Reports' });
    this.reportsMenu = page.getByRole('menu', { name: 'BOM reports' });
    this.bomReportItem = this.reportsMenu.getByRole('menuitem', { name: 'BOM Report' });
    this.thdReportItem = this.reportsMenu.getByRole('menuitem', { name: 'THD Report' });
    this.trimCardItem = this.reportsMenu.getByRole('menuitem', { name: 'Trim Card' });
  }
}
