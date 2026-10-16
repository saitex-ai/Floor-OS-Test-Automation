import { type Locator, type Page, expect } from '@playwright/test';
import { MasterDataListPage, becomesUsable } from './master-data-list.page';
import { ShiftKindsLocators } from '../../locators/planning/shift-kinds.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitForm, submitExpectingToast, type SubmitResult } from './form-submit';
import { WAIT } from './waits';

export interface ShiftKindValues {
  code?: string;
  label?: string;
  description?: string;
  countsAgainstCap?: boolean;
  displayOrder?: string;
  active?: boolean;
}

/**
 * Planning > Master Data > Shift kinds and its dialogs. Owned by the
 * Planning QA. Everything happens in modals over the list: "New shift
 * kind"; a row click opens a read-only view (Close / Edit, plus a one-click
 * "Retire / Restore this record" in its header); Edit turns the view into
 * "Edit shift kind", which saves in place and returns to the view.
 */
export class ShiftKindsPage extends MasterDataListPage {
  readonly locators: ShiftKindsLocators;
  protected readonly route = '/planning/master-data/shift-kinds';
  protected readonly heading: Locator;
  protected readonly newButton: Locator;

  constructor(page: Page) {
    super(page);
    this.locators = new ShiftKindsLocators(page);
    this.heading = this.locators.heading;
    this.newButton = this.locators.newShiftKindButton;
  }

  async expectNewOpen(): Promise<void> {
    const l = this.locators;
    await expect(l.newDialog).toBeVisible({ timeout: WAIT.NAVIGATION });
    for (const field of [
      l.code,
      l.label,
      l.description,
      l.countsAgainstCap,
      l.displayOrder,
      l.active,
    ])
      await expect(field).toBeVisible();
    await expect(l.cancelButton).toBeVisible();
    await expect(l.createButton).toBeVisible();
    // Still on the list route: a modal over it, not a page of its own.
    await this.expectNotOnNewPage();
  }

  async expectViewOpen(label: string): Promise<void> {
    await expect(this.locators.dialogHeading).toHaveText(label, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.code).toHaveCount(0);
  }

  async expectViewShows(text: string | RegExp): Promise<void> {
    await expect(this.locators.viewText).toContainText(text);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
    await expect(this.locators.editDialog).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async isEditAvailable(): Promise<boolean> {
    await expect(this.locators.dialogHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    return becomesUsable(this.locators.editButton);
  }

  async toggleRetire(): Promise<void> {
    await this.locators.retireToggle.click();
  }

  private async setSwitch(sw: Locator, on: boolean): Promise<void> {
    if ((await sw.isChecked()) !== on) await sw.click();
    await expect(sw).toBeChecked({ checked: on });
  }

  async fill(values: ShiftKindValues): Promise<void> {
    const l = this.locators;
    if (values.code !== undefined) await l.code.fill(values.code);
    if (values.label !== undefined) await l.label.fill(values.label);
    if (values.description !== undefined) await l.description.fill(values.description);
    if (values.countsAgainstCap !== undefined)
      await this.setSwitch(l.countsAgainstCap, values.countsAgainstCap);
    if (values.displayOrder !== undefined) await l.displayOrder.fill(values.displayOrder);
    if (values.active !== undefined) await this.setSwitch(l.active, values.active);
  }

  async expectCountsAgainstCap(on: boolean): Promise<void> {
    await expect(this.locators.countsAgainstCap).toBeChecked({ checked: on });
  }

  /** Types into Display order key by key — non-numeric keystrokes are filtered out. */
  async typeDisplayOrder(text: string): Promise<string> {
    await this.locators.displayOrder.fill('');
    await this.locators.displayOrder.pressSequentially(text);
    return this.locators.displayOrder.inputValue();
  }

  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  async createExpectingToast(text: string | RegExp): Promise<void> {
    await submitExpectingToast(this.locators.createButton, text);
  }

  async submitExpectingFlagged(action: 'create' | 'save', field: 'code' | 'label'): Promise<void> {
    const button = action === 'create' ? this.locators.createButton : this.locators.saveButton;
    await button.click();
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
    await expect(button).toBeVisible();
  }

  async cancelDialog(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async closeDialog(): Promise<void> {
    await this.locators.closeButton.click();
    await this.expectNoDialog();
  }

  async expectNoDialog(): Promise<void> {
    await expect(this.page.getByRole('dialog')).toHaveCount(0, { timeout: WAIT.NAVIGATION });
  }

  async expectCodeLocked(code: string): Promise<void> {
    await expect(this.locators.code).toBeDisabled();
    await expect(this.locators.code).toHaveValue(code);
  }

  async expectNotOnNewPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/shift-kinds$/);
  }
}
