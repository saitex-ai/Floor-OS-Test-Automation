import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { MODULES } from '../../config/modules';
import { MILL_REMOTE_LOAD_TIMEOUT } from './mill-timeouts';
import { MillNavLocators } from '../../locators/mill/mill-nav.locators';

/**
 * What every Fabric Mill screen (Spinning, Preparation, Weaving,
 * Finishing, Goods requests) shares: open by its route under /mill,
 * wait for its <h1>, and switch Radix tabs. The mill remote shows
 * "Loading Fabric Mill…" first on dev, so the heading wait — not
 * networkidle, which never settles on dev because of the notifications
 * SSE stream — is what says the screen is ready.
 */
export abstract class MillScreenPage extends BasePage {
  /** Route under /mill, e.g. "/spinning". */
  protected abstract readonly subPath: string;
  /** This screen's link text in the mill navigation drawer, e.g. "Spinning". */
  protected abstract readonly navLabel: string;
  abstract get heading(): Locator;

  readonly nav: MillNavLocators;

  constructor(page: Page) {
    super(page);
    this.nav = new MillNavLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(`${MODULES['mill'].path}${this.subPath}`);
    await this.expectLoaded();
  }

  /**
   * Switch to this screen through the mill's own navigation drawer — a
   * client-side route change (~3s on dev), where open()'s full page load
   * re-downloads the mill remote (~40s on dev, measured 2026-09-24).
   * Falls back to open() when the tab isn't inside the mill yet (a
   * fresh tab, or a new worker after a failure).
   */
  async openViaNav(): Promise<void> {
    if (!new URL(this.page.url(), 'http://x').pathname.startsWith(MODULES['mill'].path)) {
      await this.open();
      return;
    }
    await this.nav.openNavigationButton.click();
    await this.nav.link(this.navLabel).click();
    await this.expectLoaded();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${MODULES['mill'].path}${this.subPath}`));
    await expect(this.heading).toBeVisible({ timeout: MILL_REMOTE_LOAD_TIMEOUT });
  }

  async selectTab(tab: Locator): Promise<void> {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  }
}
