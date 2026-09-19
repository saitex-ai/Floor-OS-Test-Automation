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

    // The gate reliably appears on every fresh page in this app — there is
    // no legitimate "already authenticated on load" case where it's absent.
    // So if it doesn't show up within the timeout, that's a real problem
    // (dev too slow, or something actually broken), not a signal to assume
    // we're already past it. Let waitFor() throw here instead of swallowing
    // the timeout: this used to catch it and silently skip the click below,
    // which left the page stuck on the welcome gate and failed confusingly
    // at some unrelated later locator (e.g. "Create Customer") instead of
    // here, where the real cause is. 60s (not the 15s this was) gives dev
    // real headroom under worker contention before this is called a failure.
    const signInButton = this.page.getByRole('button', { name: 'Sign in' });
    await signInButton.waitFor({ state: 'visible', timeout: 60_000 });
    await signInButton.click();
    await signInButton.waitFor({ state: 'hidden', timeout: 20_000 });
  }

  async title(): Promise<string> {
    return this.page.title();
  }
}
