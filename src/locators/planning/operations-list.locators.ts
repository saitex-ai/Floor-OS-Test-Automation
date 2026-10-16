import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Operations
 * (/planning/master-data/operations, heading "Operation Master"). The grid
 * itself is the shared MasterDataListLocators (`OperationsListPage.grid`).
 * No actions or assertions here, see src/pages/planning/operations-list.page.ts.
 */
export class OperationsListLocators {
  readonly heading: Locator;
  readonly newOperationButton: Locator;
  /** The distinct message a search/filter that matches nothing should show. */
  readonly noMatchState: Locator;
  /** The empty-table message ("No operations yet — …"). */
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Operation Master' });
    this.newOperationButton = page.getByRole('button', { name: 'New operation' });
    this.noMatchState = page.getByText(/No operations match/i);
    this.emptyState = page.getByText(/No operations yet/i);
  }

  /** The Studied / Estimate badge inside one row. */
  studiedBadge(row: Locator, label: 'Studied' | 'Estimate'): Locator {
    return row.getByText(label, { exact: true });
  }
}
