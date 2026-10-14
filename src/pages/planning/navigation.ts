import { type Page, expect } from '@playwright/test';
import { WAIT } from './waits';

/**
 * Call right after `gotoAuthenticated(path)`. When a fresh context goes
 * through the shell's sign-in gate, dev doesn't always come back to the
 * requested route: in a 2-worker run (2026-10-12) the Operations list
 * opened as an operation's detail page that another context had just
 * visited as the same user. Waits until the URL stops changing on any route
 * (a no-access user settles on the App Launcher, not a Planning route, and
 * used to sit out the whole timeout here), then re-navigates only if the
 * shell settled on a different Planning route.
 */
export async function ensureRoute(page: Page, path: string): Promise<void> {
  let previous = '';
  await expect
    .poll(
      () => {
        const current = new URL(page.url()).pathname;
        const settled = current === previous;
        previous = current;
        return settled;
      },
      { message: 'the URL should stop changing', timeout: WAIT.NAVIGATION, intervals: [500] },
    )
    .toBe(true)
    .catch(() => {});
  const current = new URL(page.url()).pathname;
  if (current.startsWith('/planning/') && current !== path) await page.goto(path);
}
