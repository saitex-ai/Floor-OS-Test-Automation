import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ScanCreateLocators } from '../../locators/crm/scan-create.locators';
import type { BusinessCard } from '../../utils/business-card';

const CUSTOMERS_LIST_PATH = '/crm/customers';
const CRM_HOME_PATH = '/crm';
const CONTACTS_LIST_PATH = '/crm/contacts';

/** Reading the document and running the checks takes ~10-30s on dev. */
const SCAN_TIMEOUT_MS = 90_000;
/** The assistant's AI replies to typed messages in a few seconds. */
const REPLY_TIMEOUT_MS = 30_000;
/**
 * How long the review form's duplicate-check dialog is watched to prove it
 * never moves past "Checking…" (z941abzd34). Caveat: a dialog that
 * resolves after this would still pass.
 */
const STUCK_DIALOG_WATCH_MS = 8_000;

/**
 * CRM Scan & Create with the Floor OS Assistant (see
 * scan-create.locators.ts for the screen as confirmed on dev, 2026-10-21).
 */
export class ScanCreatePage extends BasePage {
  readonly locators: ScanCreateLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ScanCreateLocators(page);
  }

  // ---------------------------------------------------------------- entry

  /** Customers list → More actions → Scan & Create. */
  async openFromCustomersList(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.locators.moreActionsButton.click();
    await this.locators.scanCreateMenuItem.click();
    await expect(this.locators.assistant).toBeVisible();
  }

  /** CRM Home's own "Scan & Create" button (added on dev 2026-10-21). */
  async openFromCrmHome(): Promise<void> {
    await this.gotoAuthenticated(CRM_HOME_PATH);
    await this.locators.scanCreateButton.click();
    await expect(this.locators.assistant).toBeVisible();
  }

  /** Contacts list → More actions → Scan & Create (added on dev 2026-10-21). */
  async openFromContactsList(): Promise<void> {
    await this.gotoAuthenticated(CONTACTS_LIST_PATH);
    await this.locators.moreActionsButton.click();
    await this.locators.scanCreateMenuItem.click();
    await expect(this.locators.assistant).toBeVisible();
  }

  /** The External Event Leads tab's own Scan & Create button. */
  async openFromCurrentPage(): Promise<void> {
    await this.locators.scanCreateButton.click();
    await expect(this.locators.assistant).toBeVisible();
  }

  // ------------------------------------------------------------ assistant

  async expectAssistantReady(): Promise<void> {
    const l = this.locators;
    await expect(l.greeting).toBeVisible();
    for (const option of [
      l.uploadFileOption,
      l.capturePhotoOption,
      l.uploadQrOption,
      l.captureQrOption,
    ]) {
      await expect(option).toBeEnabled();
    }
    await expect(l.messageBox).toHaveAttribute(
      'placeholder',
      "Pick an option, or type the contact's details…",
    );
    await expect(l.sendButton).toBeDisabled();
  }

  /**
   * "Capture a photo". On dev the camera opens in a separate browser
   * window when it can't open inside the page; that window is closed
   * straight away, since no real webcam is available to the tests.
   */
  async openCamera(): Promise<void> {
    const popup = this.page
      .context()
      .waitForEvent('page', { timeout: 10_000 })
      .catch(() => null);
    await this.locators.capturePhotoOption.click();
    await expect(this.locators.cameraCancelButton).toBeVisible();
    await (await popup)?.close();
  }

  /** Upload a file through "Upload a file" (or "Upload a QR code"). */
  async upload(filePath: string, option: 'file' | 'qr' = 'file'): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await (
      option === 'file' ? this.locators.uploadFileOption : this.locators.uploadQrOption
    ).click();
    await (await chooser).setFiles(filePath);
  }

  async expectOptionsDisabled(): Promise<void> {
    const l = this.locators;
    for (const option of [
      l.uploadFileOption,
      l.capturePhotoOption,
      l.uploadQrOption,
      l.captureQrOption,
    ]) {
      await expect(option).toBeDisabled();
    }
  }

  async expectChatLine(text: string | RegExp, timeout = REPLY_TIMEOUT_MS): Promise<void> {
    await expect(this.locators.chatLine(text).last()).toBeVisible({ timeout });
  }

  /** Waits for the scan to be read and every mandatory check to report. */
  async expectAllChecksPassed(
    card: Pick<BusinessCard, 'companyName' | 'contactName' | 'contactEmail'>,
    { typed = false } = {},
  ): Promise<void> {
    await this.expectChatLine(
      typed
        ? "Got it — I'll use the details you typed. Checking mandatory fields…"
        : 'Scan read. Checking mandatory fields before I pre-fill the form…',
      SCAN_TIMEOUT_MS,
    );
    // For typed details the assistant may drop our "Playwright " test tag
    // from the company name (seen on dev 2026-10-22), so accept either form.
    const company = card.companyName!.replace(/^Playwright /, '');
    const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.expectChatLine(
      typed
        ? new RegExp(`Customer name (Playwright )?${escaped} is unique\\.`)
        : `Customer name ${card.companyName} is unique.`,
      SCAN_TIMEOUT_MS,
    );
    await this.expectChatLine('CRM stage set to Lead (default).');
    await this.expectChatLine(`Contact name ${card.contactName} found.`);
    await this.expectChatLine(`Contact email ${card.contactEmail} is unique.`);
    await this.expectChatLine(
      'All mandatory checks passed. Every other field is optional — review the pre-filled form and add anything else before saving.',
    );
    await expect(this.locators.passedChecks()).toHaveCount(4);
    await expect(this.locators.reviewAndSaveButton).toBeVisible();
    await expect(this.locators.messageBox).toHaveAttribute(
      'placeholder',
      'Change a field, ask a question, or say save…',
    );
  }

  /** Upload a card and wait until every check has passed. */
  async scanToReview(card: BusinessCard): Promise<void> {
    await this.upload(card.filePath);
    await this.expectAllChecksPassed(card);
  }

  /**
   * Type a message and send it with the Send button. Pass
   * `expectEcho: false` for commands that close the assistant ("stop").
   */
  async send(text: string, { expectEcho = true } = {}): Promise<void> {
    await this.locators.messageBox.fill(text);
    await this.locators.sendButton.click();
    if (expectEcho) await this.expectChatLine(text);
  }

  async closeAssistant(): Promise<void> {
    await this.locators.closeAssistantButton.click();
    await expect(this.locators.assistant).toBeHidden();
  }

  async expectBackOnCustomersList(): Promise<void> {
    await expect(this.locators.assistant).toBeHidden();
    await expect(this.page).toHaveURL(/\/crm\/customers$/);
  }

  // ---------------------------------------------------------- review form

  async reviewAndSave(): Promise<void> {
    await this.locators.reviewAndSaveButton.click();
    await this.expectReviewFormLoaded();
  }

  async expectReviewFormLoaded(): Promise<void> {
    const l = this.locators;
    await expect(this.page).toHaveURL(/\/crm\/customers\/scan/);
    await expect(l.scanCompleteBanner).toBeVisible();
    await expect(l.contactProfileHeading).toBeVisible();
    await expect(l.customerProfileHeading).toBeVisible();
    await expect(l.customerManagementHeading).toBeVisible();
  }

  async expectReviewFormPrefilled(
    card: BusinessCard,
    { checkCrmStage = true } = {},
  ): Promise<void> {
    const l = this.locators;
    await expect(l.contactNameInput).toHaveValue(card.contactName);
    await expect(l.designationInput).toHaveValue(card.designation);
    await expect(l.contactEmailInput).toHaveValue(card.contactEmail!);
    await expect(l.contactCityInput).toHaveValue('San Francisco');
    await expect(l.customerNameInput).toHaveValue(card.companyName!);
    if (checkCrmStage) await expect(l.crmStageCombobox).toHaveText(/Lead/);
  }

  async expectCancelLeftOfSave(): Promise<void> {
    const cancel = await this.locators.cancelButton.boundingBox();
    const save = await this.locators.saveButton.boundingBox();
    expect(cancel, 'Cancel button is on screen').not.toBeNull();
    expect(save, 'Save button is on screen').not.toBeNull();
    expect(cancel!.x).toBeLessThan(save!.x);
  }

  async selectComboboxOption(combobox: Locator, name: string): Promise<void> {
    await combobox.click();
    await this.locators.option(name).click();
    await expect(combobox).toHaveText(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  /** The options a combobox currently offers (closes the list afterwards). */
  async comboboxOptions(combobox: Locator): Promise<string[]> {
    await combobox.click();
    const options = await this.page.getByRole('option').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return options.map((o) => o.trim());
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectCreatedDialog(): Promise<void> {
    await expect(this.locators.createdDialog).toBeVisible({ timeout: REPLY_TIMEOUT_MS });
  }

  /**
   * "View Customer" on the success dialog. Returns the new Customer's id
   * and the Customer record the details screen loads (the oracle for
   * system fields the screen doesn't show, such as Creation Method).
   */
  async viewCreatedCustomer(): Promise<{ id: string; record: Record<string, unknown> }> {
    const response = this.page.waitForResponse(
      (r) =>
        r.request().method() === 'GET' && /\/customers\/[0-9a-f-]{36}$/.test(r.url()) && r.ok(),
      { timeout: REPLY_TIMEOUT_MS },
    );
    await this.locators.viewCustomerButton.click();
    await expect(this.page).toHaveURL(/\/crm\/customers\/[0-9a-f-]{36}/);
    const id = this.page.url().match(/\/crm\/customers\/([0-9a-f-]{36})/)![1]!;
    const record = (await (await response).json()) as Record<string, unknown>;
    return { id, record };
  }

  /** The new Customer's details: name, stage, and its one linked Contact. */
  async expectCreatedCustomerDetails(card: BusinessCard): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 1, name: card.companyName! }),
    ).toBeVisible();
    await expect(this.page.getByText(/^CRM Stage$/i).locator('xpath=following::*[1]')).toHaveText(
      'Lead',
    );
    const contactsTab = this.page.getByRole('button', { name: 'Contacts (1)' });
    await expect(contactsTab).toBeVisible();
    await contactsTab.click();
    await expect(this.page.getByText(card.contactName).first()).toBeVisible();
  }

  /** The review form is gone (Cancel, or anything else that leaves it). */
  async expectReviewFormClosed(): Promise<void> {
    await expect(this.locators.saveButton).toBeHidden();
    await expect(this.page).not.toHaveURL(/\/crm\/customers\/scan/);
  }

  /** The "Nothing was saved" dialog stays on "Checking whether this customer already exists…". */
  async expectDuplicateCheckStuck(): Promise<void> {
    await expect(this.locators.duplicateCheckDialog).toBeVisible();
    await this.page.waitForTimeout(STUCK_DIALOG_WATCH_MS);
    await expect(this.locators.duplicateCheckDialog).toContainText(
      'Checking whether this customer already exists…',
    );
  }

  async expectTextOnPage(text: string): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  async expectFieldErrors(...messages: (string | RegExp)[]): Promise<void> {
    await expect(this.locators.attentionBanner).toBeVisible();
    for (const message of messages) {
      await expect(this.page.getByText(message).first()).toBeVisible();
    }
  }

  // ------------------------------------------------------------- results

  /** Customers list search; whether any row matches `name`. */
  async expectCustomerNotInList(name: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.page.getByRole('textbox', { name: 'Search', exact: true }).fill(name);
    await expect(this.page.getByRole('row').filter({ hasText: name })).toHaveCount(0, {
      timeout: 15_000,
    });
  }

  async expectCustomerInList(name: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.page.getByRole('textbox', { name: 'Search', exact: true }).fill(name);
    await expect(this.page.getByRole('row').filter({ hasText: name }).first()).toBeVisible({
      timeout: 15_000,
    });
  }
}
