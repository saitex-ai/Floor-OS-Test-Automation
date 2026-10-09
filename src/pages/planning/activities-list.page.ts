import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { ActivitiesListLocators } from '../../locators/planning/activities-list.locators';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Activities list. Owned by the Planning QA.
 * A row click opens a read-only detail page (/activities/{id}); its
 * "Edit activity" button opens the form — see ActivityFormPage.
 */
export class ActivitiesListPage extends MasterDataListPage {
  readonly locators: ActivitiesListLocators;
  protected readonly route = '/planning/master-data/activities';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new ActivitiesListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newActivityButton;
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }
}
