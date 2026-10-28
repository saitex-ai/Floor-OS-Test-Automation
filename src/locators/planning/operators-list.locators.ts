import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Operators &
 * Qualifications (/planning/master-data/operators). Since the 2026-10-14 dev
 * deploy this replaces the separate Qualifications screen: one profile per
 * employee, with its qualifications as rows inside the profile. The grid
 * itself is the shared MasterDataListLocators (`OperatorsListPage.grid`).
 * No actions or assertions here, see src/pages/planning/operators-list.page.ts.
 */
export class OperatorsListLocators {
  readonly heading: Locator;
  readonly newButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Operators & Qualifications', level: 1 });
    this.newButton = page.getByRole('button', { name: 'New', exact: true });
  }

  /**
   * Of `rows`, the profiles whose employee record resolves. A profile whose
   * employee can't be found reads "Operator unavailable" in place of the name.
   */
  resolvedRows(rows: Locator): Locator {
    return rows.filter({ hasNotText: 'Operator unavailable' });
  }
}
