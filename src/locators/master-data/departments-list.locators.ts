import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the top-level Master Data module's Department
 * Master list (/master-data/system-management/departments) — not to be
 * confused with Planning's own separate "Master Data" submenu. No actions
 * or assertions here, see src/pages/master-data/departments-list.page.ts
 * for those.
 */
export class DepartmentsListLocators {
  readonly heading: Locator;
  readonly newDepartmentButton: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Departments' });
    this.newDepartmentButton = page.getByRole('button', { name: 'New department' });
    this.searchInput = page.getByPlaceholder(/search departments/i);
  }

  /** Anchored on the exact Code-column cell, same pattern as Planning's row(). */
  row(code: string): Locator {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell').filter({ hasText: new RegExp(`^${code}$`) }),
    });
  }
}
