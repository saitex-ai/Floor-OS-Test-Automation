import { type Locator, type Page } from '@playwright/test';
import { MillScreenPage } from './mill-screen.page';
import { FinishingLocators } from '../../locators/mill/finishing.locators';

/**
 * Finishing production screen (/mill/finishing) — Consume inputs,
 * Record output, Orders. Owned by the Fabric Mill QA. Element locators
 * live in FinishingLocators (`this.locators`).
 */
export class FinishingPage extends MillScreenPage {
  protected readonly subPath = '/finishing';
  protected readonly navLabel = 'Finishing';
  readonly locators: FinishingLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new FinishingLocators(page);
  }

  get heading(): Locator {
    return this.locators.heading;
  }
}
