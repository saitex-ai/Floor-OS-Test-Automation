import { type Locator, type Page, expect } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { RequestsLocators } from '../../locators/mill/requests.locators';

/**
 * Goods request & approval screen (/mill/requests). Owned by the Fabric
 * Mill QA. Element locators live in RequestsLocators (`this.locators`).
 */
export class RequestsPage extends MillScreenPage {
  protected readonly subPath = '/requests';
  protected readonly navLabel = 'Goods Requests';
  readonly locators: RequestsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new RequestsLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }

  /**
   * Only a raise-any user (e.g. a stores admin) sees "Requesting
   * department", and on dev it starts with nothing applied ("Request
   * materials for -") even though the picker shows Finishing — so pick
   * one explicitly. Preparation pulls yarn from Spinning.
   */
  async chooseRequestingDepartment(department: string): Promise<void> {
    if (await this.locators.requestingDepartmentSelect.isVisible()) {
      await this.locators.requestingDepartmentSelect.selectOption({ label: department });
    }
    await expect(this.locators.requestMaterialsCard).toHaveText(`Request materials for ${department}`);
  }

  /**
   * The first "From {source}" region on the New request tab that has
   * something to pull, skipping Cotton (its By weight / By bales toggle
   * makes it the odd one out). Returns null if nothing is pullable.
   */
  async firstPullableSource(): Promise<Locator | null> {
    await expect(this.locators.requestMaterialsCard).toBeVisible();
    // The source regions render after the card heading — wait for them (or
    // the empty state) before listing, since all() doesn't wait.
    await expect(this.locators.sourceRegions.first().or(this.locators.nothingToPull)).toBeVisible();
    const regions = await this.locators.sourceRegions.all();
    for (const region of regions) {
      const name = (await region.getAttribute('aria-label')) ?? '';
      if (name === 'From Cotton') continue;
      const options = await region.getByRole('combobox').first().locator('option').count();
      if (options > 1) return region;
    }
    return null;
  }

  /** Picks the first unit in `source`'s picker and types a quantity — without pressing Add. */
  async enterFirstUnit(source: Locator, quantity: string): Promise<void> {
    await source.getByRole('combobox').first().selectOption({ index: 1 });
    await source.getByRole('textbox').first().fill(quantity);
  }

  addButton(source: Locator): Locator {
    return source.getByRole('button', { name: 'Add', exact: true });
  }
}
