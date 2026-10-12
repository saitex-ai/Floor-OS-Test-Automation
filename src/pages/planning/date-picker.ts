import { type Locator, type Page } from '@playwright/test';
import { DatePickerLocators } from '../../locators/planning/form-field.locators';

/** Opens a date field's picker and picks today. */
export async function pickToday(page: Page, trigger: Locator): Promise<void> {
  const picker = new DatePickerLocators(page);
  await trigger.click();
  await picker.today.click();
  // A date-only picker closes on the day click; a date-time one waits for Done.
  if (await picker.doneButton.isVisible().catch(() => false)) await picker.doneButton.click();
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
