import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Difficulty grades
 * (/planning/master-data/difficulty-grades). The grid itself is the shared
 * MasterDataListLocators (`DifficultyGradeListPage.grid`). No actions or
 * assertions here, see src/pages/planning/difficulty-grade-list.page.ts.
 */
export class DifficultyGradeListLocators {
  readonly heading: Locator;
  readonly newGradeButton: Locator;
  readonly noMatchState: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Difficulty grades', level: 1 });
    this.newGradeButton = page.getByRole('button', { name: 'New difficulty grade' });
    this.noMatchState = page.getByText(/match your filters|No difficulty grades/i);
  }
}
