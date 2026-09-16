import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ShellLoginLocators } from '../../locators/shell/shell-login.locators';

/**
 * app-shell's pre-auth landing page + Keycloak's hosted login form.
 * `goto('/')` lands on app-shell's own "Welcome to FloorOS" screen first;
 * its "Sign in" button is what triggers the OIDC PKCE redirect to
 * Keycloak (see floorOS docs/handbook/14-frontends.md, "Authentication").
 *
 * Element locators live in ShellLoginLocators (`this.locators`) — this
 * class only holds the login flow built on top of them.
 */
export class ShellLoginPage extends BasePage {
  readonly locators: ShellLoginLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ShellLoginLocators(page);
  }

  async login(username: string, password: string): Promise<void> {
    const l = this.locators;
    await l.signInButton.click();
    await l.usernameInput.fill(username);
    await l.passwordInput.fill(password);
    await l.submitButton.click();

    // Keycloak redirects back to the shell immediately, but the token
    // exchange that follows is still async — wait for the app to actually
    // render its authenticated state, not just for the URL to change.
    await this.page.waitForURL((url) => !url.pathname.startsWith('/realms/'));
    await expect(l.signInButton).toBeHidden({ timeout: 15_000 });
  }
}
