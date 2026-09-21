import type { Page } from '@playwright/test';

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
   * Use this (not goto()) for every module page's entry point. The first
   * fresh browser context of a run lands on app-shell's "Welcome to
   * FloorOS" gate first — even one preloaded with the Keycloak session
   * cookies auth.setup.ts saved via storageState. Only clicking "Sign in"
   * redeems that session: traced over the network, it's a real OIDC round
   * trip (discovery → redirect to Keycloak's /authorize → immediate 302
   * back with a code → token + userinfo exchange), just one Keycloak
   * skips the login form for because the session cookie is still valid —
   * so it takes a few seconds but never prompts for credentials.
   *
   * A later gotoAuthenticated() call in the same already-authenticated
   * tab (confirmed 2026-09-21, e.g. a test that navigates twice) can land
   * straight in the app with no gate at all — the shell doesn't always
   * replay it once a session is already redeemed in that tab. So this
   * can't just wait for the gate and treat a timeout as failure: that's
   * only a real failure if we're not authenticated either. Race the gate
   * against a marker that's part of the authenticated shell on every
   * module (the Notifications button), and act on whichever genuinely
   * shows up first — only throw if neither does.
   *
   * ShellLoginPage doesn't use this: its login() drives that same gate
   * deliberately, for the one real (credentialed) login in auth.setup.ts.
   */
  async gotoAuthenticated(path = '/'): Promise<void> {
    await this.goto(path);

    const signInButton = this.page.getByRole('button', { name: 'Sign in' });
    // Scoped to the shell's top banner — an unscoped match on "Notifications"
    // hits a second, unrelated "Control Center Notifications" button
    // elsewhere on the page (confirmed 2026-09-21: strict-mode violation,
    // 2 matches). The banner has exactly one.
    const authenticatedMarker = this.page
      .getByRole('banner')
      .getByRole('button', { name: /Notifications/ });

    const outcome = await Promise.race([
      signInButton.waitFor({ state: 'visible', timeout: 60_000 }).then(() => 'gate' as const),
      authenticatedMarker
        .waitFor({ state: 'visible', timeout: 60_000 })
        .then(() => 'authenticated' as const),
    ]);

    if (outcome === 'gate') {
      await signInButton.click();
      await signInButton.waitFor({ state: 'hidden', timeout: 20_000 });
    }
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
