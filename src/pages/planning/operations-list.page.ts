import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { OperationsListLocators } from '../../locators/planning/operations-list.locators';
import { paintedColours } from './badge-colours';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Operations list ("Operation Master"). Owned by
 * the Planning QA. A row click opens the read-only detail page
 * (/operations/<CODE>); its "Edit operation" button opens the form — see
 * OperationDetailPage and OperationMasterFormPage.
 */
export class OperationsListPage extends MasterDataListPage {
  readonly locators: OperationsListLocators;
  protected readonly route = '/planning/master-data/operations';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationsListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newOperationButton;
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** The badge's own colours (background + text), from the nearest painted ancestor. */
  async studiedBadgeColours(code: string, label: 'Studied' | 'Estimate'): Promise<string> {
    const badge = this.locators.studiedBadge(this.grid.row(code).first(), label);
    await expect(badge).toBeVisible({ timeout: WAIT.SERVER });
    return badge.evaluate(paintedColours);
  }
}
