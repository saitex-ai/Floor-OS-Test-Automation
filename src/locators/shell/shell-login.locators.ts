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
 *
 * 2026-11-02: uat's welcome page was redesigned again ("Sign In", "Welcome
 * to Floor OS. Sign in to continue.") and the username box is now named
 * "Username/Email"; dev still shows "Welcome to FloorOS!" and "Username or
 * email". identifierInput matches both.
 */
export class ShellLoginLocators {
  /**
   * Welcome page: the username box, "Username or email" on dev and
   * "Username/Email" on uat. Keycloak's own username box shares dev's name.
   */
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
    this.identifierInput = page.getByRole('textbox', { name: /^Username( or email|\/Email)$/ });
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.passwordInput = page.getByLabel('Password', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Sign In', exact: true });
    this.userMenuButton = page.getByRole('button', { name: 'Open user menu' });
  }
}
