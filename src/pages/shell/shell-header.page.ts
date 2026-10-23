import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ShellHeaderLocators } from '../../locators/shell/shell-header.locators';

/**
 * app-shell's authenticated chrome — shell-level controls shared by every
 * module (unlike ShellLoginPage, which only covers the pre-auth gate).
 * Currently wraps the language switch; add more here (not to a specific
 * module's page object) as other shared shell actions get automated.
 */
export class ShellHeaderPage extends BasePage {
  readonly locators: ShellHeaderLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ShellHeaderLocators(page);
  }

  /**
   * Who's signed in, as the opened user menu shows it (initials, name, role
   * and email). The menu button itself only shows the initials ("BQ") since
   * the 2026-10-22 design-system release.
   */
  async signedInUserText(): Promise<string> {
    await this.locators.userMenuButton.click();
    await expect(this.locators.userMenu).toBeVisible();
    const text = await this.locators.userMenu.innerText();
    await this.page.keyboard.press('Escape');
    await expect(this.locators.userMenu).toBeHidden();
    return text;
  }

  /** User menu › Preferences. */
  async openPreferences(): Promise<void> {
    await this.locators.userMenuButton.click();
    await this.locators.preferencesMenuItem.click();
    await expect(this.locators.preferencesHeading).toBeVisible({ timeout: 30_000 });
  }

  /**
   * Switches the language on the Preferences page, then goes back to the
   * page it was called from. That return is a plain goto(), not
   * gotoAuthenticated(): the latter waits for the English "Open user menu"
   * label, which is translated while the shell is in Vietnamese. Callers
   * wait for their own (translated) content.
   */
  async changeLanguage(language: 'English' | 'Vietnamese'): Promise<void> {
    const returnTo = this.page.url();
    await this.openPreferences();
    const option = this.locators.languageOption(language);
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    await this.page.goto(returnTo);
  }
}
