import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for app-shell's authenticated top header/banner —
 * distinct from ShellLoginLocators (the pre-auth "Welcome to FloorOS" gate
 * + Keycloak form). This is genuinely shell-level chrome present on every
 * module's screen, not owned by any one module — see
 * src/pages/shell/shell-header.page.ts for the actions built on top of
 * these.
 *
 * Confirmed live via a real ariaSnapshot() dump against uat.flooros.app,
 * 2026-09-30:
 *
 *   - button "Change language"
 *   - menu "Language":
 *     - menuitemradio "English" [checked]
 *     - menuitemradio "Tiếng Việt"
 *
 * **The button's own accessible name is itself localized once the shell is
 * already in Vietnamese mode** (becomes "Đổi ngôn ngữ") — match both, or a
 * second language-switch attempt within the same (already-Vietnamese)
 * session won't find it.
 */
export class ShellHeaderLocators {
  readonly changeLanguageButton: Locator;
  readonly languageMenu: Locator;
  readonly userMenuButton: Locator;
  readonly accessRestrictedText: Locator;
  readonly body: Locator;

  constructor(private readonly page: Page) {
    this.changeLanguageButton = page.getByRole('button', { name: /Change language|Đổi ngôn ngữ/i });
    this.languageMenu = page.getByRole('menu', { name: 'Language' });
    this.userMenuButton = page.getByRole('banner').getByRole('button', { name: /Open user menu/ });
    this.accessRestrictedText = page.getByText(/Access restricted|do not have permission/i);
    this.body = page.locator('body');
  }

  /** Exact text anywhere on the page, e.g. a translated module name. */
  text(content: string): Locator {
    return this.page.getByText(content, { exact: true });
  }

  /** The "English"/"Tiếng Việt" radio menu item — real role is `menuitemradio`, not `menuitem`. */
  languageOption(language: 'English' | 'Vietnamese'): Locator {
    return this.page.getByRole('menuitemradio', {
      name: language === 'Vietnamese' ? 'Tiếng Việt' : 'English',
    });
  }
}
