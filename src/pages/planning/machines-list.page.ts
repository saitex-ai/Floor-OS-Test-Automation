import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage } from './master-data-list.page';
import { MachinesListLocators } from '../../locators/planning/machines-list.locators';
import { paintedColours } from './badge-colours';
import { WAIT } from './waits';

/**
 * Planning > Master Data > Machines list. Owned by the Planning QA. Real
 * route: /planning/master-data/machines. Tabs: All / Active / Needs
 * attention. A row click opens the read-only detail page
 * (/machines/<uuid>) — see MachineDetailPage.
 */
export class MachinesListPage extends MasterDataListPage {
  readonly locators: MachinesListLocators;
  protected readonly route = '/planning/master-data/machines';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new MachinesListLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newMachineButton;
  }

  async openNewMachine(): Promise<void> {
    await this.openNew();
  }

  async expectNoMatchState(): Promise<void> {
    await expect(this.locators.noMatchState.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** The badge's own colours (background + text) for one machine's Status cell. */
  async statusBadgeColours(code: string, status: string): Promise<string> {
    const badge = this.locators.statusBadge(this.grid.row(code).first(), status);
    await expect(badge).toBeVisible({ timeout: WAIT.SERVER });
    return badge.evaluate(paintedColours);
  }
}
