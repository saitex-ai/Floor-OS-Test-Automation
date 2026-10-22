import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for app-shell's pre-auth welcome page + Keycloak's
 * hosted login form — no actions or assertions here, see
 * src/pages/shell/shell-login.page.ts for those.
 *
 * Confirmed live (2026-10-22, the new FloorOS design system): the welcome
 * page no longer has a "Sign in" button. It asks for the username first
 * ("Username or email" + "Continue"), then redirects to Keycloak's
 * "Sign in to your account" form with the username already filled in
 * (login_hint), where only the password is entered. Keycloak now lives
 * under /auth/realms/… rather than /realms/….
 */
export class ShellLoginLocators {
  /** Welcome page: the username box. Keycloak's own username box shares this name. */
  readonly identifierInput: Locator;
  readonly continueButton: Locator;
  /** Keycloak form. */
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  /**
   * Present on every authenticated page — home and every module — so it's
   * the "logged in" marker. Module pages have no banner landmark in the new
   * design, so the old banner-scoped Notifications button no longer works.
   */
  readonly userMenuButton: Locator;

  constructor(page: Page) {
    this.identifierInput = page.getByRole('textbox', { name: 'Username or email' });
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Sign In', exact: true });
    this.userMenuButton = page.getByRole('button', { name: 'Open user menu' });
  }
}
