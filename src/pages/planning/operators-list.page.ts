import { type Locator, type Page, expect } from '@playwright/test';
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

  /**
   * Opens the first profile whose employee resolves — a seed record; read-only
   * callers only. A profile whose employee record is gone ("Operator
   * unavailable") has no "Add a qualification" row when edited, and such
   * profiles can fill whole pages (dev, 2026-10-28: 76 of 95, and all 50 rows
   * of page 1), so this pages forward until it finds one.
   */
  async openFirstResolvedProfile(): Promise<void> {
    const resolved = this.locators.resolvedRows(this.grid.bodyRows());
    while ((await resolved.count()) === 0) {
      expect(
        await this.grid.nextPageButton.isEnabled(),
        'no operator profile with a resolving employee on any page',
      ).toBe(true);
      const { from } = await this.showing();
      await this.nextPage();
      await expect.poll(async () => (await this.showing()).from).not.toBe(from);
    }
    await resolved.first().click();
  }
}
