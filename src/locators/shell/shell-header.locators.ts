import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for app-shell's authenticated chrome (the floating
 * top-right controls, the user menu and the Preferences page) — distinct
 * from ShellLoginLocators (the pre-auth "Welcome to FloorOS" gate +
 * Keycloak form). This is shell-level chrome present on every module's
 * screen, not owned by any one module — see
 * src/pages/shell/shell-header.page.ts for the actions built on top of
 * these.
 *
 * As of the 2026-10-22 design-system release (confirmed live on uat,
 * 2026-10-23) there is no "Change language" button any more. Language is a
 * pair of buttons on the Preferences page (`/preferences`, reached from the
 * user menu's "Preferences", or "Account settings" on uat since 2026-10-26):
 *
 *   - group "Language":
 *     - button "English" [pressed]
 *     - button "Tiếng Việt"
 *
 * The choice is stored per browser (localStorage), not per account.
 * **The shell's own labels are localized once it's in Vietnamese** ("Open
 * user menu" becomes "Mở menu người dùng", "Preferences" becomes "Tùy chọn",
 * "Language" becomes "Ngôn ngữ"), so these match both languages, or
 * switching back to English from Vietnamese wouldn't find them.
 */
export class ShellHeaderLocators {
  readonly userMenuButton: Locator;
  /** The opened user menu; its first line reads e.g. "BQ Bob QCLead Qc-lead bob@flooros.dev". */
  readonly userMenu: Locator;
  readonly preferencesMenuItem: Locator;
  readonly preferencesHeading: Locator;
  readonly languageGroup: Locator;
  readonly accessRestrictedText: Locator;
  readonly body: Locator;

  constructor(private readonly page: Page) {
    // Not scoped to the banner: module pages have no banner landmark in the new design (2026-10-22).
    this.userMenuButton = page
      .getByRole('button', { name: /^(Open user menu|Mở menu người dùng)/ })
      .first();
    this.userMenu = page.getByRole('menu', { name: /^(User menu|Menu người dùng)$/ });
    // The user menu's way to /preferences: "Preferences" (dev), renamed
    // "Account settings" on uat by the 2026-10-26 deploy.
    this.preferencesMenuItem = page.getByRole('menuitem', {
      name: /^(Preferences|Account settings|Tùy chọn|Cài đặt tài khoản)$/,
    });
    this.preferencesHeading = page.getByRole('heading', {
      name: /^(Preferences|Tùy chọn)$/,
      level: 1,
    });
    this.languageGroup = page.getByRole('group', { name: /^(Language|Ngôn ngữ)$/ });
    this.accessRestrictedText = page.getByText(/Access restricted|do not have permission/i);
    this.body = page.locator('body');
  }

  /** Exact text anywhere on the page, e.g. a translated module name. */
  text(content: string): Locator {
    return this.page.getByText(content, { exact: true });
  }

  /** A language button on the Preferences page; each is named in its own language. */
  languageOption(language: 'English' | 'Vietnamese'): Locator {
    return this.languageGroup.getByRole('button', {
      name: language === 'Vietnamese' ? 'Tiếng Việt' : 'English',
      exact: true,
    });
  }
}
