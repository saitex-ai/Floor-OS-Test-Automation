import { type Locator, type Page } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { PrepLocators } from '../../locators/mill/prep.locators';

/**
 * Preparation production screen (/mill/prep) — Create dye-lot, Scan
 * yarn, Load beams, Orders. Owned by the Fabric Mill QA. Element
 * locators live in PrepLocators (`this.locators`).
 */
export class PrepPage extends MillScreenPage {
  protected readonly subPath = '/prep';
  protected readonly navLabel = 'Preparation';
  readonly locators: PrepLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new PrepLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }
}
