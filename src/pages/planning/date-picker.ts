import { type Locator, type Page, expect } from '@playwright/test';
import { DatePickerLocators } from '../../locators/planning/form-field.locators';
import { WAIT } from './waits';

/** Opens a date field's picker and picks today. */
export async function pickToday(page: Page, trigger: Locator): Promise<void> {
  const picker = new DatePickerLocators(page);
  await trigger.click();
  await picker.today.click();
  // A date-only picker closes on the day click; a date-time one waits for Done.
  // Retried until it's closed, so a Done that renders a moment late still gets clicked.
  await expect(async () => {
    if (await picker.doneButton.isVisible()) await picker.doneButton.click();
    await expect(picker.dialog).toBeHidden({ timeout: WAIT.RETRY_STEP });
  }).toPass({ timeout: WAIT.NAVIGATION });
}

/** Opens a date-time field's picker and picks today at hh:mm. */
export async function pickTodayAt(
  page: Page,
  trigger: Locator,
  hh: string,
  mm: string,
): Promise<void> {
  const picker = new DatePickerLocators(page);
  await trigger.click();
  await picker.today.click();
  await picker.hour(hh).click();
  await picker.minute(mm).click();
  await picker.doneButton.click();
}

/**
 * Opens a date field's picker and picks day `day` of the month it opens on
 * (the current month), or `monthOffset` months before (-) / after (+) it. Day buttons are named like "Monday, October 5th,
 * 2026" ("Today, …" for today); the grid is labelled "October 2026".
 */
export async function pickDayOfShownMonth(
  page: Page,
  trigger: Locator,
  day: number,
  monthOffset = 0,
): Promise<void> {
  const picker = new DatePickerLocators(page);
  await trigger.click();
  for (let i = 0; i < Math.abs(monthOffset); i += 1)
    await (monthOffset < 0 ? picker.previousMonth : picker.nextMonth).click();
  const [month, year] = ((await picker.grid.getAttribute('aria-label')) ?? '').split(' ');
  await picker.day(new RegExp(`${month} ${day}(st|nd|rd|th), ${year}$`)).click();
  if (await picker.doneButton.isVisible().catch(() => false)) await picker.doneButton.click();
}

/** Opens a time field's picker and picks hh:mm (minutes in 5-minute steps); closes it. */
export async function pickTime(
  page: Page,
  trigger: Locator,
  hh: string,
  mm: string,
): Promise<void> {
  const picker = new DatePickerLocators(page);
  await trigger.click();
  await picker.hour(hh).click();
  await picker.minute(mm).click();
  // The time popover stays open after the minute click.
  if (await picker.dialog.isVisible().catch(() => false)) await page.keyboard.press('Escape');
}
