import type { Locator, Page } from '@playwright/test';

/**
 * Raw element locators for CRM Scan & Create: the "Floor OS Assistant" chat
 * and the review form it hands over to.
 *
 * Confirmed against dev (2026-10-21), matching the Floor OS CRM prototype
 * (crm-forms.jsx: ScanCreate / ScanBot):
 * - Entry: Customers list → "More actions" → "Scan & Create" (`menuitem`),
 *   or an External Event's Leads tab → "Scan & Create" (`button`).
 * - The assistant is a `dialog` named "Floor OS Assistant" with four source
 *   buttons, a "Message the assistant" textbox and a "Send" button.
 * - Each mandatory check is its own chat line, marked with an
 *   `img "Passed"` icon.
 * - "Review & save" opens the review form at /crm/customers/scan: three
 *   sections (Contact Profile / Customer Profile / Customer Management)
 *   and a "Cancel" + "Save customer & contact" footer.
 * - A successful save opens a dialog "Contact and Customer created
 *   successfully!" with "Cancel" and "View Customer".
 */
export class ScanCreateLocators {
  // Entry points
  readonly moreActionsButton: Locator;
  readonly scanCreateMenuItem: Locator;
  readonly scanCreateButton: Locator;

  // Floor OS Assistant
  readonly assistant: Locator;
  readonly closeAssistantButton: Locator;
  readonly greeting: Locator;
  readonly uploadFileOption: Locator;
  readonly capturePhotoOption: Locator;
  readonly uploadQrOption: Locator;
  readonly captureQrOption: Locator;
  readonly messageBox: Locator;
  readonly sendButton: Locator;
  readonly reviewAndSaveButton: Locator;
  readonly startAgainButton: Locator;
  readonly yesButton: Locator;
  readonly noButton: Locator;
  readonly reopenCameraButton: Locator;
  readonly cameraCancelButton: Locator;

  // Review form
  readonly scanCompleteBanner: Locator;
  readonly attentionBanner: Locator;
  readonly contactProfileHeading: Locator;
  readonly customerProfileHeading: Locator;
  readonly customerManagementHeading: Locator;
  readonly contactNameInput: Locator;
  readonly designationInput: Locator;
  readonly contactEmailInput: Locator;
  readonly contactCityInput: Locator;
  readonly customerNameInput: Locator;
  readonly customerCityInput: Locator;
  readonly crmStageCombobox: Locator;
  readonly originTypeCombobox: Locator;
  readonly originCombobox: Locator;
  readonly referredByLabel: Locator;
  readonly cancelButton: Locator;
  readonly saveButton: Locator;

  // After save
  readonly createdDialog: Locator;
  readonly viewCustomerButton: Locator;
  readonly duplicateCheckDialog: Locator;

  constructor(private readonly page: Page) {
    this.moreActionsButton = page.getByRole('button', { name: 'More actions' });
    this.scanCreateMenuItem = page.getByRole('menuitem', { name: 'Scan & Create' });
    this.scanCreateButton = page.getByRole('button', { name: 'Scan & Create' });

    this.assistant = page.getByRole('dialog', { name: 'Floor OS Assistant' });
    this.closeAssistantButton = this.assistant.getByRole('button', { name: 'Close assistant' });
    this.greeting = this.assistant.getByText(
      /^Hi .+ — scan a business card, document or QR code and I'll pre-fill the customer and contact\. You can also just type their details here\.$/,
    );
    this.uploadFileOption = this.assistant.getByRole('button', { name: 'Upload a file' });
    this.capturePhotoOption = this.assistant.getByRole('button', { name: 'Capture a photo' });
    this.uploadQrOption = this.assistant.getByRole('button', { name: 'Upload a QR code' });
    this.captureQrOption = this.assistant.getByRole('button', { name: 'Capture a QR code' });
    this.messageBox = this.assistant.getByRole('textbox', { name: 'Message the assistant' });
    this.sendButton = this.assistant.getByRole('button', { name: 'Send' });
    this.reviewAndSaveButton = this.assistant.getByRole('button', { name: 'Review & save' });
    this.startAgainButton = this.assistant.getByRole('button', { name: 'Start again' });
    this.yesButton = this.assistant.getByRole('button', { name: 'Yes', exact: true });
    this.noButton = this.assistant.getByRole('button', { name: 'No', exact: true });
    this.reopenCameraButton = this.assistant.getByRole('button', {
      name: /^(Reopen|Open) camera$/,
    });
    this.cameraCancelButton = this.assistant.getByRole('button', { name: 'Cancel', exact: true });

    this.scanCompleteBanner = page.getByText(
      /^Scan complete — \d+ fields? (was|were) pre-filled and (is|are) editable\. Review, adjust and save\.$/,
    );
    this.attentionBanner = page.getByText(/^\d+ fields? needs? attention/);
    this.contactProfileHeading = page.getByRole('heading', { name: 'Contact Profile' });
    this.customerProfileHeading = page.getByRole('heading', { name: 'Customer Profile' });
    this.customerManagementHeading = page.getByRole('heading', { name: 'Customer Management' });
    // Both profiles have Email/Phone/City fields; the Contact's come first
    // on the page and the Customer's second.
    this.contactNameInput = page.getByRole('textbox', { name: 'Contact Name *' });
    this.designationInput = page.getByRole('textbox', { name: 'Designation' });
    this.contactEmailInput = page.getByRole('textbox', { name: 'Email *' });
    this.contactCityInput = page.getByRole('textbox', { name: 'City', exact: true }).first();
    this.customerNameInput = page.getByRole('textbox', { name: 'Customer Name *' });
    this.customerCityInput = page.getByRole('textbox', { name: 'City', exact: true }).nth(1);
    this.crmStageCombobox = page.getByRole('combobox', { name: 'CRM Stage', exact: true });
    this.originTypeCombobox = page.getByRole('combobox', { name: 'Origin Type', exact: true });
    this.originCombobox = page.getByRole('combobox', { name: 'Origin', exact: true });
    this.referredByLabel = page.getByText(/^Referred By/);
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save customer & contact' });

    this.createdDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Contact and Customer created successfully!' });
    this.viewCustomerButton = this.createdDialog.getByRole('button', { name: 'View Customer' });
    this.duplicateCheckDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'Nothing was saved' });
  }

  /** A chat line in the assistant, by its (partial) text. */
  chatLine(text: string | RegExp): Locator {
    return this.assistant.getByText(text);
  }

  /** The "Passed" ticks next to each passed mandatory check. */
  passedChecks(): Locator {
    return this.assistant.getByRole('img', { name: 'Passed' });
  }

  option(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
