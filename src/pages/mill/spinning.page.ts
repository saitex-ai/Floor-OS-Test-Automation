import { type Locator, type Page } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { SpinningLocators } from '../../locators/mill/spinning.locators';

/**
 * Spinning production screen (/mill/spinning) — Mixing orders, Laydown,
 * Yarn output. Owned by the Fabric Mill QA. Element locators live in
 * SpinningLocators (`this.locators`).
 */
export class SpinningPage extends MillScreenPage {
  protected readonly subPath = '/spinning';
  protected readonly navLabel = 'Spinning';
  readonly locators: SpinningLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SpinningLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }

  /** Picks the `index`-th open cotton unit for a recipe line (form state only). */
  async pickRecipeUnit(unitPicker: Locator, index: number): Promise<void> {
    await unitPicker.click();
    await this.locators.cottonUnitOptions.nth(index).click();
  }
}
