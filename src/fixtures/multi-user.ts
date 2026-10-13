import type { Browser, BrowserContext, Page } from '@playwright/test';
import { ShellLoginPage } from '../pages/shell/shell-login.page';
import { env, type ModuleCredentials } from '../config/env';

/**
 * A module's optional extra login, read from `<PREFIX>_<ROLE>_USER_<ENV>` /
 * `<PREFIX>_<ROLE>_PASSWORD_<ENV>` (e.g. PLANNING_READONLY_USER_DEV).
 * Returns undefined when either is unset, so callers can skip instead of
 * failing.
 */
export function userCredentials(envPrefix: string, role: string): ModuleCredentials | undefined {
  const suffix = env.testEnv.toUpperCase();
  const username = process.env[`${envPrefix}_${role}_USER_${suffix}`]?.trim();
  const password = process.env[`${envPrefix}_${role}_PASSWORD_${suffix}`]?.trim();
  return username && password ? { username, password } : undefined;
}

/**
 * A module's optional second login for multi-user cases, read from
 * `<PREFIX>_SECOND_USER_<ENV>` / `<PREFIX>_SECOND_PASSWORD_<ENV>`.
 */
export function secondUserCredentials(envPrefix: string): ModuleCredentials | undefined {
  return userCredentials(envPrefix, 'SECOND');
}

/**
 * Logs in as a specific user in a brand-new, fully isolated browser context
 * — needed for any genuine multi-user test (seeing whether a *different*
 * logged-in user shows up as present, etc).
 *
 * A plain `browser.newContext()` silently inherits the current Playwright
 * project's default `storageState` (see `playwright.config.ts` — every
 * module project sets `use: { storageState: authFile(id) }`), which is
 * already-cached, already-valid session data for whichever account that
 * project's own `auth.setup.ts` logged in as. Confirmed the hard way: six
 * consecutive attempts at a two-user Techpack canvas test all "logged in
 * as Bob" without ever throwing an error, yet the resulting session was
 * still genuinely Alice throughout — `BasePage.gotoAuthenticated()`'s own
 * doc comment explains why this looks like a successful login with no
 * form: clicking "Sign in" against a still-valid session cookie completes
 * a real but invisible OIDC round trip, taking a few seconds but never
 * prompting for credentials. That's correct, expected behavior for *that*
 * cached account — the mistake was never clearing it before trying to log
 * in as a *different* one. Passing `storageState: undefined` here is what
 * actually gets a clean context where the login form shows up for real.
 */
export async function loginAsUser(
  browser: Browser,
  username: string,
  password: string,
): Promise<{ page: Page; context: BrowserContext; close: () => Promise<void> }> {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  const login = new ShellLoginPage(page);
  await login.goto('/');
  await login.locators.signInButton.waitFor({ state: 'visible', timeout: 30_000 });
  await login.login(username, password);
  return { page, context, close: () => context.close() };
}
