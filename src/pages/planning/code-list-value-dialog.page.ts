import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CodeListValueDialogLocators } from '../../locators/planning/code-lists.locators';
import { fieldAlert } from '../../locators/planning/form-field.locators';
import { submitForm, type SubmitResult } from './form-submit';
import { becomesUsable } from './master-data-list.page';
import { WAIT } from './waits';

export interface CodeListValueFields {
  value?: string;
  shownAs?: string;
  whatItMeans?: string;
  displayOrder?: string;
  inUse?: boolean;
}

/**
 * The code-list value dialogs on a code list's page. Owned by the Planning
 * QA. "New value" is a modal (Value / Shown as / What it means / Display
 * order / In use; Cancel / Create value) scoped to the list it was opened
 * from — there's no list picker. A row click opens a read-only view
 * (heading = the label; Close / Edit); Edit turns it into "Edit value",
 * which saves in place and returns to the view.
 */
export class CodeListValueDialogPage extends BasePage {
  readonly locators: CodeListValueDialogLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CodeListValueDialogLocators(page);
  }

  async expectNewOpen(): Promise<void> {
    await expect(this.locators.newDialog).toBeVisible({ timeout: WAIT.NAVIGATION });
    for (const field of [
      this.locators.value,
      this.locators.shownAs,
      this.locators.whatItMeans,
      this.locators.displayOrder,
      this.locators.inUse,
    ])
      await expect(field).toBeVisible();
    await expect(this.locators.cancelButton).toBeVisible();
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectNoListPicker(): Promise<void> {
    await expect(this.locators.listPicker).toHaveCount(0);
  }

  async expectViewOpen(label: string): Promise<void> {
    await expect(this.locators.heading).toHaveText(label, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.value).toHaveCount(0);
  }

  /** Watched for WAIT.PERMISSION_SETTLE — see becomesUsable(). */
  async isEditAvailable(): Promise<boolean> {
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.NAVIGATION });
    return becomesUsable(this.locators.editButton);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
    await expect(this.locators.editDialog).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async fill(values: CodeListValueFields): Promise<void> {
    const l = this.locators;
    if (values.value !== undefined) await l.value.fill(values.value);
    if (values.shownAs !== undefined) await l.shownAs.fill(values.shownAs);
    if (values.whatItMeans !== undefined) await l.whatItMeans.fill(values.whatItMeans);
    if (values.displayOrder !== undefined) await l.displayOrder.fill(values.displayOrder);
    if (values.inUse !== undefined) await this.setInUse(values.inUse);
  }

  async setInUse(on: boolean): Promise<void> {
    if ((await this.locators.inUse.isChecked()) !== on) await this.locators.inUse.click();
    await expect(this.locators.inUse).toBeChecked({ checked: on });
  }

  /** Types into Display order key by key — non-numeric keystrokes are filtered out. */
  async typeDisplayOrder(text: string): Promise<string> {
    await this.locators.displayOrder.fill('');
    await this.locators.displayOrder.pressSequentially(text);
    return this.locators.displayOrder.inputValue();
  }

  /** A successful create closes the dialog. */
  async create(): Promise<SubmitResult> {
    return submitForm(this.locators.createButton);
  }

  /** A successful save returns the dialog to its read-only view. */
  async saveChanges(): Promise<SubmitResult> {
    return submitForm(this.locators.saveButton);
  }

  /** Clicks Create / Save changes expecting the dialog to stay open with `field` flagged. */
  async submitExpectingFlagged(
    action: 'create' | 'save',
    field: 'value' | 'shownAs' | 'whatItMeans' | 'displayOrder',
  ): Promise<void> {
    const button = action === 'create' ? this.locators.createButton : this.locators.saveButton;
    await button.click();
    await expect(fieldAlert(this.locators[field])).toBeVisible({ timeout: WAIT.VALIDATION });
    await expect(button).toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async close(): Promise<void> {
    await this.locators.closeButton.click();
    await expect(this.locators.dialog).toHaveCount(0, { timeout: WAIT.NAVIGATION });
  }

  async expectClosed(): Promise<void> {
    await expect(this.page.getByRole('dialog')).toHaveCount(0, { timeout: WAIT.NAVIGATION });
  }

  async expectValueLocked(code: string): Promise<void> {
    await expect(this.locators.value).toBeDisabled();
    await expect(this.locators.value).toHaveValue(code);
    await expect(this.locators.valueFixedHelp).toBeVisible();
  }

  async expectSaveNotice(text: string | RegExp): Promise<void> {
    await expect(this.locators.saveNotice).toHaveText(text);
  }

  async expectCodeTaken(): Promise<void> {
    await expect(fieldAlert(this.locators.value)).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.createButton).toBeVisible();
  }

  async expectViewShows(text: string): Promise<void> {
    await expect(this.locators.viewText).toContainText(text);
  }
}
