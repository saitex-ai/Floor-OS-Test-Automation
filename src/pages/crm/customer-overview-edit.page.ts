import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  CustomerOverviewEditLocators,
  type OverviewSection,
} from '../../locators/crm/customer-overview-edit.locators';

/**
 * Section-level editing on the Customer Detail screen's Overview tab
 * (`/crm/customers/{uuid}`, CRM Sprint 5 — "Customer Overview -> Edit").
 * Covers test-cases/crm/customer-overview-edit.md. Owned by the CRM QA.
 *
 * Complements CustomerDetailPage (Sprint 1 field-by-field helpers) with
 * section-scoped Edit/Save/Cancel and per-section read-only/edit-mode
 * assertions. Confirmed on dev (2026-10-15):
 *
 * - Customer Profile, Customer Management and Departments and Assignees
 *   each have their own "Edit" button; clicking it swaps that card's
 *   button for "Cancel" + "Save" and turns every editable field in that
 *   card (only) into an input/combobox. Other cards stay read-only, but
 *   their own "Edit" buttons stay enabled — two sections can be opened
 *   at once if the user clicks both.
 * - A successful save shows a sonner toast "{Section} updated" (e.g.
 *   "Customer Profile updated"), returns the card to read-only, bumps
 *   the Profile's Version field and refreshes System → Updated On.
 * - "Customer Name" is the only mandatory Profile field (the " •"
 *   marker). Saving it blank keeps the card in edit mode and flags the
 *   row with "Required" (input gets aria-invalid="true"). Email can be
 *   saved blank.
 * - Locked fields (Version, Status, all System fields) show a padlock
 *   (`title="Locked field"`) and never get an input in edit mode.
 * - No Audit History tab/section exists on the screen (tabs are Overview,
 *   Lead Qualification, Biz Docs, Communication, Contacts).
 */
export class CustomerOverviewEditPage extends BasePage {
  readonly locators: CustomerOverviewEditLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CustomerOverviewEditLocators(page);
  }

  async openSectionEdit(section: OverviewSection): Promise<void> {
    await this.locators.editButton(section).click();
    await expect(this.locators.saveButton(section)).toBeVisible();
  }

  async saveSection(section: OverviewSection): Promise<void> {
    await this.locators.saveButton(section).click();
  }

  async cancelSection(section: OverviewSection): Promise<void> {
    await this.locators.cancelButton(section).click();
  }

  async fillField(section: OverviewSection, label: string, value: string): Promise<void> {
    await this.locators.fieldTextbox(section, label).fill(value);
  }

  async fillPhoneNumber(value: string): Promise<void> {
    await this.locators.phoneNumberInput.fill(value);
  }

  async selectFieldOption(section: OverviewSection, label: string, option: string): Promise<void> {
    await this.locators.fieldCombobox(section, label).click();
    await this.locators.option(option).click();
    await expect(this.locators.fieldCombobox(section, label)).toContainText(option);
  }

  async expectSectionInEditMode(section: OverviewSection): Promise<void> {
    await expect(this.locators.saveButton(section)).toBeVisible();
    await expect(this.locators.cancelButton(section)).toBeVisible();
    await expect(this.locators.editButton(section)).toHaveCount(0);
    await expect(this.locators.editableControls(section).first()).toBeVisible();
  }

  /** Read-only: no Save/Cancel and no input/combobox anywhere in the card. */
  async expectSectionReadOnly(section: OverviewSection): Promise<void> {
    await expect(this.locators.saveButton(section)).toHaveCount(0);
    await expect(this.locators.cancelButton(section)).toHaveCount(0);
    await expect(this.locators.editableControls(section)).toHaveCount(0);
  }

  async expectFieldValue(section: OverviewSection, label: string, value: string): Promise<void> {
    await expect(this.locators.fieldRow(section, label)).toContainText(value);
  }

  async expectFieldNotShowing(section: OverviewSection, text: string): Promise<void> {
    await expect(this.locators.section(section)).not.toContainText(text);
  }

  async fieldValue(section: OverviewSection, label: string): Promise<string> {
    return (await this.locators.fieldRow(section, label).innerText()).trim();
  }

  /** Full rendered text of a card — used to prove a card was left untouched. */
  async sectionText(section: OverviewSection): Promise<string> {
    return (await this.locators.section(section).innerText()).trim();
  }

  async expectSectionText(section: OverviewSection, text: string): Promise<void> {
    await expect(this.locators.section(section)).toHaveText(text, { useInnerText: true });
  }

  async expectSuccessToast(text: string | RegExp): Promise<void> {
    await expect(this.locators.toast(text).first()).toBeVisible();
  }

  async expectNoSuccessToast(text: string | RegExp): Promise<void> {
    await expect(this.locators.toast(text)).toHaveCount(0);
  }

  async expectFieldRequiredError(section: OverviewSection, label: string): Promise<void> {
    await expect(this.locators.fieldRow(section, label)).toContainText('Required');
    await expect(this.locators.fieldTextbox(section, label)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  }

  /**
   * Locked field: padlock icon, no input/combobox in the row, and
   * clicking + typing on it leaves the shown value unchanged.
   */
  async expectFieldLocked(section: OverviewSection, label: string): Promise<void> {
    const row = this.locators.fieldRow(section, label);
    await expect(this.locators.fieldLockedIcon(section, label)).toBeVisible();
    await expect(row.locator('input, textarea, [role="combobox"]')).toHaveCount(0);
    const before = (await row.innerText()).trim();
    await row.click();
    await this.page.keyboard.type('XYZ');
    await expect(row).toHaveText(before, { useInnerText: true });
  }

  /** Not present on dev as of 2026-10-15 — see TC:4 in 30-customer-overview-edit.spec.ts. */
  async openAuditHistoryTab(): Promise<void> {
    await this.locators.detailTab(/Audit History/i).click();
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.locators.section('Customer Profile')).toBeVisible({ timeout: 30_000 });
  }
}
