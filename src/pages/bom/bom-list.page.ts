import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { BomListLocators } from '../../locators/bom/bom-list.locators';

export const BOM_PATH = MODULES['bom'].path;

/**
 * The first view of the BOM remote on dev can take a minute (yesterday's
 * sanity run measured 63s to the list, sign-in gate included) — far
 * over the 15s default expect timeout. Only the wait for the list
 * heading gets this; every other assertion keeps the default.
 */
const BOM_REMOTE_LOAD_TIMEOUT = 75_000;

/**
 * BOM list (/bom, "Bill of Materials"). Owned by the BOM QA.
 * Element locators live in BomListLocators (`this.locators`).
 */
export class BomListPage extends BasePage {
  readonly locators: BomListLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new BomListLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(BOM_PATH);
    await this.expectLoaded();
  }

  /**
   * Reuse the tab if it's already on the list (a shared-tab smoke run);
   * only fall back to open()'s full page load — about a minute on dev —
   * for a fresh tab.
   */
  async openInPlace(): Promise<void> {
    if (new URL(this.page.url(), 'http://x').pathname === BOM_PATH) {
      await this.expectLoaded();
      return;
    }
    await this.open();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${BOM_PATH}$`));
    await expect(this.locators.heading).toBeVisible({ timeout: BOM_REMOTE_LOAD_TIMEOUT });
    await expect(this.locators.rows.first()).toBeVisible();
  }

  /** Reads the number out of a status tab's name, e.g. "Open 42" → 42. */
  async countOf(tab: Locator): Promise<number> {
    const name = (await tab.textContent()) ?? '';
    return Number(name.replace(/[^\d]/g, ''));
  }

  /** Clicks a status tab and checks the footer total matches that tab's count. */
  async selectStatusTab(tab: Locator): Promise<void> {
    const expected = await this.countOf(tab);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(this.locators.footerSummary).toHaveText(
      new RegExp(`of ${expected.toLocaleString('en-US')}$`),
    );
  }

  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill(term);
  }

  async clearSearch(): Promise<void> {
    await this.locators.searchInput.clear();
  }

  async openBom(code: string): Promise<void> {
    await this.locators.techpackLink(code).first().click();
  }

  async openNewBomDialog(): Promise<void> {
    await this.locators.newBomButton.click();
    await expect(this.locators.newBomDialog).toBeVisible();
  }

  async cancelNewBomDialog(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.newBomDialog).toBeHidden();
  }
}
