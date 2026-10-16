import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { WorkCentresListLocators } from '../../locators/planning/work-centres-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Work Centres list. Owned by the Planning QA.
 * Real route: /planning/master-data/work-centres. Tabs are the capacity
 * pools ("What it is used for"), and a pool's tab only appears once a
 * centre uses it. A row click opens the read-only detail page
 * (/work-centres/<uuid>) — see WorkCentreDetailPage.
 */
export class WorkCentresListPage extends MasterDataListPage {
  readonly locators: WorkCentresListLocators;
  protected readonly route = '/planning/master-data/work-centres';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new WorkCentresListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newWorkCentreButton;
  }

  async openNewWorkCentre(): Promise<void> {
    await this.openNew();
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }
}
