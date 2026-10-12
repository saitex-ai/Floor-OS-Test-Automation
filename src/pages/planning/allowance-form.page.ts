import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AllowanceFormLocators } from '../../locators/planning/allowance-form.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { WAIT } from './waits';

/**
 * The New / Edit allowance form on an operation's detail page. Owned by
 * the Planning QA. It replaces the Allowances grid in place (same URL)
 * under an "Operation · <CODE>" breadcrumb; there's no Operation picker.
 * Types are offered as "<type> · default N.NN%"; one row per type, so a
 * type already on the operation is not offered again, and the type is
 * locked on edit. Typing a percentage that differs from the type default
 * flips "Differs from the allowance type default" on, which makes "Why the
 * default was not used" required.
 */
export class AllowanceFormPage extends BasePage {
  readonly locators: AllowanceFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AllowanceFormLocators(page);
  }

  async expectOpenForCreate(operationCode: string): Promise<void> {
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.breadcrumb).toHaveText(`Operation · ${operationCode}`);
    await expect(this.locators.createButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  async expectOpenForEdit(operationCode: string): Promise<void> {
    await expect(this.locators.editHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.breadcrumb).toHaveText(`Operation · ${operationCode}`);
    await expect(this.locators.saveButton).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
  }

  /** Type / Percentage / Differs, and no Operation picker ("Why …" only shows once Differs is on). */
  async expectFields(): Promise<void> {
    await expect(this.locators.type).toBeVisible();
    await expect(this.locators.percentage).toBeVisible();
    await expect(this.locators.differs).toBeVisible();
    await expect(this.locators.operationPicker).toHaveCount(0);
  }

  async setDiffers(on: boolean): Promise<void> {
    if ((await this.locators.differs.isChecked()) !== on) await this.locators.differs.click();
    await this.expectDiffers(on);
  }

  async expectWhyShown(): Promise<void> {
    await expect(this.locators.why).toBeVisible();
  }

  async typeOptions(): Promise<string[]> {
    await this.locators.type.click();
    await expect(this.locators.options().first()).toBeVisible();
    const options = (await this.locators.options().allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    return options;
  }

  /** Picks a type by its name ("Human motion fatigue"), ignoring the " · default N%" suffix. */
  async pickType(type: string): Promise<void> {
    await this.locators.type.click();
    await this.locators.option(new RegExp(`^${type} ·`)).click();
  }

  async setPercentage(value: string): Promise<void> {
    await this.locators.percentage.fill(value);
  }

  async percentageValue(): Promise<string> {
    return this.locators.percentage.inputValue();
  }

  async expectDiffers(on: boolean): Promise<void> {
    await expect(this.locators.differs).toBeChecked({ checked: on });
  }

  async fillWhy(text: string): Promise<void> {
    await this.locators.why.fill(text);
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
    await expect(this.locators.cancelButton).toBeHidden({ timeout: WAIT.NAVIGATION });
  }

  async expectFieldFlagged(field: 'type' | 'percentage' | 'why'): Promise<void> {
    // Percentage is a number input (see fieldAlert).
    const levels = field === 'percentage' ? 2 : 1;
    await expect(fieldAlert(this.locators[field], levels)).toBeVisible({
      timeout: WAIT.VALIDATION,
    });
  }

  async expectTypeLocked(): Promise<void> {
    await expect(this.locators.type).toBeDisabled();
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async saveNoticeText(): Promise<string> {
    return (await this.locators.saveNotice.innerText()).trim();
  }
}
