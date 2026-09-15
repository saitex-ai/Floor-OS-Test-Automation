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
   * Use this (not goto()) for every module page's entry point. A fresh
   * browser context always lands on app-shell's "Welcome to FloorOS" gate
   * first — even one preloaded with the Keycloak session cookies
   * auth.setup.ts saved via storageState. Only clicking "Sign in" redeems
   * that session: traced over the network, it's a real OIDC round trip
   * (discovery → redirect to Keycloak's /authorize → immediate 302 back
   * with a code → token + userinfo exchange), just one Keycloak skips the
   * login form for because the session cookie is still valid — so it
   * takes a few seconds but never prompts for credentials. ShellLoginPage
   * doesn't use this: its login() drives that same gate deliberately, for
   * the one real (credentialed) login in auth.setup.ts.
   */
  async gotoAuthenticated(path = '/'): Promise<void> {
    await this.goto(path);

    // isVisible() doesn't wait — called immediately after goto() resolves,
    // it can race the React app's own hydration and see neither the gate
    // nor the authenticated content yet, silently reading as "not shown"
    // and skipping the click below. Give it a real window to render first.
    // 15s (not the 5s this started as) — a remote environment over VPN can
    // be meaningfully slower to render than a same-machine local server;
    // the gate reliably appears on every fresh page in this app, so this
    // is dead time only in the (nonexistent, per that same behavior)
    // "already authenticated on load" case, not a tax on the happy path.
    const signInButton = this.page.getByRole('button', { name: 'Sign in' });
    const gateShown = await signInButton
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (gateShown) {
      await signInButton.click();
      await signInButton.waitFor({ state: 'hidden', timeout: 20_000 });
    }
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
