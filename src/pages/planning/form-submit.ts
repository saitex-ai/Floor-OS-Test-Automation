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
 * Step 1 of a stepped form (calendars, machines, work centres, operations,
 * recipes, shifts — dev deploy 2026-10-28): "Save & continue" saves the
 * record and opens step 2 (its inline table); "Done" there opens the
 * record's detail page. Reports step 1 like submitForm(), but judged by
 * step 2 opening: the button can unmount for a moment mid-save even when
 * the save is then refused. Once it's saved, presses Done.
 */
export async function submitStepped(button: Locator, done: Locator): Promise<SubmitResult> {
  await expect(button).toBeVisible();
  if (await button.isDisabled()) return 'blocked-disabled';
  await button.click();
  // Save + step 2's render: NAVIGATION, not SERVER — 15s was missed under 2 workers on dev.
  const saved = await done
    .waitFor({ state: 'visible', timeout: WAIT.NAVIGATION })
    .then(() => true)
    .catch(() => false);
  if (!saved) return 'blocked-after-submit';
  await pressDone(done);
  return 'submitted';
}

/**
 * Presses step 2's Done until it leaves the step: a press while step 2 is
 * still rendering can be dropped (dev 2026-10-29, under 2 workers).
 */
export async function pressDone(done: Locator): Promise<void> {
  await expect(async () => {
    if (await done.isVisible()) await done.click({ timeout: WAIT.RETRY_STEP });
    await expect(done).toBeHidden({ timeout: WAIT.PERMISSION_SETTLE });
  }).toPass({ timeout: WAIT.NAVIGATION });
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
