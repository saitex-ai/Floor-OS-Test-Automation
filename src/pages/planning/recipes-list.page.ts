import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { RecipesListLocators } from '../../locators/planning/recipes-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Recipes & operations list. Owned by the
 * Planning QA. Tabs are by owning department (All / Cutting / Sewing /
 * "+N more"). A row click opens the recipe's detail page, where its
 * operations live — see RecipeDetailPage.
 */
export class RecipesListPage extends MasterDataListPage {
  readonly locators: RecipesListLocators;
  protected readonly route = '/planning/master-data/recipes';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new RecipesListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newRecipeButton;
  }

  /** One row per version — the code's newest version is listed first. */
  override async openRow(code: string): Promise<void> {
    await this.grid.row(code).first().click();
  }

  override async expectRowVisible(code: string): Promise<void> {
    await expect(this.grid.row(code).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  override async expectRowContains(code: string, text: string | RegExp): Promise<void> {
    await expect(this.grid.row(code).first()).toContainText(text, { timeout: WAIT.SERVER });
  }

  override async findRow(code: string): Promise<void> {
    await this.open();
    await this.expectLoaded();
    await this.search(code);
    await this.expectRowVisible(code);
  }

  /** A search/filter that matches nothing has its own message (TC-LR-11). */
  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.emptyState).toHaveCount(0);
  }

  /** The newest version's Maturity cell reads `maturity`. */
  async expectMaturity(
    code: string,
    maturity: 'Estimated' | 'Provisional' | 'Approved',
  ): Promise<void> {
    await expect(
      this.grid.row(code).first().getByRole('cell', { name: maturity, exact: true }),
    ).toBeVisible({ timeout: WAIT.SERVER });
  }
}
