import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { SampleRequestListLocators } from '../../locators/sample-development/sample-request-list.locators';

/**
 * Sample Requests list (/sample-development) — the module's own landing
 * view; there is no separate generic "module home" distinct from this
 * list. Owned by the Sample Development QA. Element locators live in
 * SampleRequestListLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 */
export class SampleRequestListPage extends BasePage {
  readonly locators: SampleRequestListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new SampleRequestListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(MODULES['sample-development'].path);
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['sample-development'].path}$`));
    await expect(this.locators.heading).toBeVisible({ timeout: 45_000 });
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async openNewSampleRequest(): Promise<void> {
    await this.locators.newSampleRequestButton.click();
  }

  /** Confirms a given Sample Request (by its real ID, e.g. "Sample_2026_0012") is visible in the list. */
  async expectRowVisible(sampleRequestId: string): Promise<void> {
    await expect(this.locators.row(sampleRequestId)).toBeVisible();
  }
}
