import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ShellHeaderLocators } from '../../locators/shell/shell-header.locators';

/**
 * app-shell's authenticated top header/banner — genuinely shell-level
 * chrome shared by every module (unlike ShellLoginPage, which only covers
 * the pre-auth gate). Currently only wraps the "Change language" control;
 * add more here (not to a specific module's page object) as other shared
 * header actions get automated, so future modules can reuse this instead
 * of re-deriving the same shell chrome.
 */
export class ShellHeaderPage extends BasePage {
  readonly locators: ShellHeaderLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ShellHeaderLocators(page);
  }

  /** Opens the header's language menu and picks the given option. */
  async changeLanguage(language: 'English' | 'Vietnamese'): Promise<void> {
    await this.locators.changeLanguageButton.click();
    await this.locators.languageOption(language).click();
  }

  /**
   * Opens the user menu, reads its summary (initials, full name, role and
   * email, e.g. "AP Alice Planner Admin alice@flooros.dev") and closes it
   * again. The menu button alone shows only the initials since 2026-10-22.
   */
  async readSignedInUserSummary(): Promise<string> {
    await this.locators.userMenuButton.click();
    await expect(this.locators.userMenu).toBeVisible();
    const summary = (await this.locators.userMenu.innerText()).replace(/\s+/g, ' ').trim();
    await this.page.keyboard.press('Escape');
    await expect(this.locators.userMenu).toBeHidden();
    return summary;
  }
}
