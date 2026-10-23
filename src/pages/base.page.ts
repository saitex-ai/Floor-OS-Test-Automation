import type { Page } from '@playwright/test';
import { ShellLoginLocators } from '../locators/shell/shell-login.locators';

/**
 * localStorage key where ShellLoginPage.login() records the username it
 * logged in with, so gotoAuthenticated() can get past the welcome page
 * without credentials of its own (see there).
 */
export const LOGIN_HINT_STORAGE_KEY = 'pw-hybrid.loginHint';

/**
 * Every Page Object extends this. Keep it thin: only what every page
 * genuinely shares (navigation, title) belongs here — page-specific
 * locators and actions belong on the concrete page class.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Use this (not goto()) for every module page's entry point.
   *
   * Confirmed live (2026-10-22, the new FloorOS design system): a fresh
   * context preloaded with the storageState auth.setup.ts saved goes
   * straight into the app. But when the app's own session is gone while the
   * Keycloak session cookie is still valid (e.g. a token that expired during
   * a long run), it lands on the "Welcome to FloorOS!" page instead. Entering
   * a username and pressing Continue there redeems the Keycloak session with
   * no password prompt — a real OIDC round trip that takes a few seconds.
   * Keycloak's session decides who you are; the username is only a hint, so
   * the one ShellLoginPage.login() recorded (LOGIN_HINT_STORAGE_KEY) is used.
   *
   * So this can't just wait for the welcome page and treat a timeout as a
   * failure: race it against a marker present on every authenticated page
   * (the "Open user menu" button — module pages have no banner landmark in
   * the new design, so the old banner-scoped Notifications button is gone),
   * act on whichever shows up first, and only throw if neither does.
   *
   * ShellLoginPage doesn't use this: its login() drives the welcome page
   * deliberately, for the one real (credentialed) login in auth.setup.ts.
   */
  async gotoAuthenticated(path = '/'): Promise<void> {
    await this.goto(path);

    const l = new ShellLoginLocators(this.page);
    // 90 s, not 60: dev's new shell took ~35-60 s to render an authenticated
    // page on 2026-10-22 under parallel workers.
    const outcome = await Promise.race([
      l.identifierInput.waitFor({ state: 'visible', timeout: 90_000 }).then(() => 'gate' as const),
      l.userMenuButton
        .waitFor({ state: 'visible', timeout: 90_000 })
        .then(() => 'authenticated' as const),
    ]);

    if (outcome === 'gate') {
      // A string expression: tsconfig has no "dom" lib, so `window` isn't typed here.
      const hint = await this.page.evaluate<string | null>(
        `window.localStorage.getItem(${JSON.stringify(LOGIN_HINT_STORAGE_KEY)})`,
      );
      if (!hint) {
        throw new Error(
          'gotoAuthenticated(): landed on the FloorOS welcome page with no saved login — ' +
            'run this through a project that depends on its <module>-setup login.',
        );
      }
      await l.identifierInput.fill(hint);
      await l.continueButton.click();
      await l.userMenuButton.waitFor({ state: 'visible', timeout: 30_000 });
    }
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
