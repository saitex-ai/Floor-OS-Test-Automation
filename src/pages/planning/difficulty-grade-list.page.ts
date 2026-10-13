import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { DifficultyGradeListLocators } from '../../locators/planning/difficulty-grade-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Difficulty grades list. Owned by the Planning
 * QA. Tabs are All / Active / Retired; columns Code, Label, Factor,
 * Off-machine, Sort, Description, Status. A row click opens a read-only
 * detail page; its Edit action opens the form — see DifficultyGradeFormPage.
 */
export class DifficultyGradeListPage extends MasterDataListPage {
  readonly locators: DifficultyGradeListLocators;
  protected readonly route = '/planning/master-data/difficulty-grades';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new DifficultyGradeListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newGradeButton;
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }
}
