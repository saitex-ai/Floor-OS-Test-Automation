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
    await expect(picker.dialog).toBeHidden({ timeout: 1_000 });
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
