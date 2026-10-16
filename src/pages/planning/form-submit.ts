import { type Locator, expect } from '@playwright/test';
import { toast } from '../../locators/planning/form-field.locators';
import { WAIT } from './waits';

export type SubmitResult = 'blocked-disabled' | 'blocked-after-submit' | 'submitted';

/**
 * Clicks a Planning master-data form's submit button and reports what
 * happened, without ever hanging. Some invalid values disable the button
 * before any click; others are only caught after a real submit. A
 * successful submit navigates away and unmounts the button — dev's latency
 * is too variable for a fixed sleep (a 1.5s sleep once caught a submit
 * mid-flight and misread it as "blocked"), so wait up to 15s for it to go.
 */
export async function submitForm(button: Locator): Promise<SubmitResult> {
  await expect(button).toBeVisible();
  if (await button.isDisabled()) return 'blocked-disabled';
  // Short click timeout: the button can start unmounting mid-click on a fast
  // submit. That's the only click failure tolerated — if the button is still
  // on screen, the click itself failed (overlay, detached node) and nothing
  // was submitted, so rethrow rather than report it as "blocked".
  await button.click({ timeout: 5_000 }).catch(async (error: unknown) => {
    if (await button.isVisible().catch(() => false)) throw error;
  });
  const disappeared = await button
    .waitFor({ state: 'hidden', timeout: WAIT.SERVER })
    .then(() => true)
    .catch(() => false);
  return disappeared ? 'submitted' : 'blocked-after-submit';
}

/**
 * Clicks a submit button expecting the server to refuse it with a toast
 * (duplicate code, loop, …). Toasts fade after a few seconds, so this checks
 * straight after the click, then that the form is still there.
 */
export async function submitExpectingToast(button: Locator, text: string | RegExp): Promise<void> {
  await expect(button).toBeEnabled();
  await button.click();
  await expect(toast(button.page(), text).first()).toBeVisible({ timeout: WAIT.SERVER });
  await expect(button).toBeVisible();
}
