import { type Page, expect } from '@playwright/test';
import { BasePage, LOGIN_HINT_STORAGE_KEY } from '../base.page';
import { ShellLoginLocators } from '../../locators/shell/shell-login.locators';

/**
 * app-shell's pre-auth welcome page + Keycloak's hosted login form.
 * `goto('/')` lands on app-shell's own "Welcome to FloorOS!" screen first.
 * Since the 2026-10-22 design system it asks for the username there
 * ("Username or email" + "Continue"); Continue triggers the OIDC PKCE
 * redirect to Keycloak, whose form arrives with the username pre-filled
 * (login_hint), so only the password is entered (see floorOS
 * docs/handbook/14-frontends.md, "Authentication").
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
    await l.identifierInput.fill(username);
    await l.continueButton.click();
    await l.passwordInput.fill(password);
    // Guard against the fill landing while Keycloak's form is still settling
    // (seen once on dev, 2026-10-22: an empty submit → "Invalid username or
    // password"). Checked as "not empty" so the password never appears in an
    // error message or trace.
    await expect(l.passwordInput).not.toHaveValue('');
    await l.submitButton.click();

    // Keycloak (now under /auth/realms/…) redirects back to the shell
    // immediately, but the token exchange that follows is still async — wait
    // for the app to actually render its authenticated state, not just for
    // the URL to change. The saved storageState must include that token, or
    // every later context lands back on the welcome page.
    await this.page.waitForURL((url) => !url.pathname.includes('/realms/'));
    await expect(l.userMenuButton).toBeVisible({ timeout: 30_000 });

    // Remembered for BasePage.gotoAuthenticated(): if a later context lands
    // on the welcome page (app session gone, Keycloak session still valid),
    // the username + Continue is all it takes to redeem the session.
    // A string expression: tsconfig has no "dom" lib, so `window` isn't typed here.
    await this.page.evaluate(
      `window.localStorage.setItem(${JSON.stringify(LOGIN_HINT_STORAGE_KEY)}, ${JSON.stringify(username)})`,
    );
  }
}
