import { type Locator, type Page } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { WeavingLocators } from '../../locators/mill/weaving.locators';

/**
 * Weaving production screen (/mill/weaving) — Consume inputs, Record
 * output, Orders. Owned by the Fabric Mill QA. Element locators live in
 * WeavingLocators (`this.locators`).
 */
export class WeavingPage extends MillScreenPage {
  protected readonly subPath = '/weaving';
  protected readonly navLabel = 'Weaving';
  readonly locators: WeavingLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new WeavingLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }
}
