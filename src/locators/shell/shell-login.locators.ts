import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for app-shell's pre-auth landing page + Keycloak's
 * hosted login form — no actions or assertions here, see
 * src/pages/shell/shell-login.page.ts for those. Keycloak locators use
 * its default theme ids; update them here (only here) if floorOS ships a
 * custom theme.
 */
export class ShellLoginLocators {
  readonly signInButton: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('#kc-login');
  }
}
