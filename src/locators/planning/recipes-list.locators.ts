import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Recipes & operations
 * (/planning/master-data/recipes). The grid itself is the shared
 * MasterDataListLocators (`RecipesListPage.grid`). Recipes are versioned:
 * the grid shows one row per version (V1, V2, ...) of the same code.
 * No actions or assertions here, see src/pages/planning/recipes-list.page.ts.
 */
export class RecipesListLocators {
  readonly heading: Locator;
  readonly newRecipeButton: Locator;
  readonly emptyState: Locator;
  readonly noMatchState: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Recipes & Operations', level: 1 });
    this.newRecipeButton = page.getByRole('button', { name: 'New recipe' });
    this.emptyState = page.getByText('Use New recipe above to add the first one.');
    this.noMatchState = page.getByText('No recipes match your filters');
  }
}
