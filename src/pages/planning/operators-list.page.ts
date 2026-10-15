import { type Locator, type Page } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { OperatorsListLocators } from '../../locators/planning/operators-list.locators';

/**
 * Planning > Master Data > Operators & Qualifications list. Owned by the
 * Planning QA. Tabs are by deployment (All / Fixed / Floating / Rotating
 * crew). A row click opens that operator's profile — see OperatorProfilePage.
 */
export class OperatorsListPage extends MasterDataListPage {
  readonly locators: OperatorsListLocators;
  protected readonly route = '/planning/master-data/operators';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new OperatorsListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newButton;
  }

  /** Opens the first listed profile — a seed record; read-only callers only. */
  async openFirstProfile(): Promise<void> {
    await this.grid.bodyRows().first().click();
  }
}
