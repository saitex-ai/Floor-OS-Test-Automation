import { type Page, expect } from '@playwright/test';
import { WAIT } from './waits';

/**
 * Call right after `gotoAuthenticated(path)`. When a fresh context goes
 * through the shell's sign-in gate, dev doesn't always come back to the
 * requested route: in a 2-worker run (2026-10-12) the Operations list
 * opened as an operation's detail page that another context had just
 * visited as the same user. Once the shell has settled on a Planning page,
 * re-navigate if it isn't `path`.
 */
export async function ensureRoute(page: Page, path: string): Promise<void> {
  await expect
    .poll(() => new URL(page.url()).pathname, {
      message: 'the shell should settle on a Planning route',
      timeout: WAIT.NAVIGATION,
    })
    .toMatch(/^\/planning\//)
    .catch(() => {});
  if (new URL(page.url()).pathname !== path) await page.goto(path);
}
