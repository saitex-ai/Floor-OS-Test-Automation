import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Create Customer" screen (CRM, Sprint 1
 * user story) — no actions or assertions here, see
 * src/pages/crm/create-customer.page.ts for those. Confirmed against the
 * real running form (dumped via ariaSnapshot() against a local `tilt up`
 * stack and against dev), not guessed from the ClickUp test-case text —
 * see test-cases/crm/create-customer.md for that text.
 *
 * Country / CRM Stage / Origin Type / Origin / Buyer are custom
 * comboboxes (a button that opens a popup with an `option`-per-choice
 * list), not fillable text inputs. "Referred By" is a text field that
 * only appears once Origin Type is set to "Referral".
 */
export class CreateCustomerLocators {
  // Customers list entry point
  readonly createCustomerEntry: Locator;

  // Form sections (layout check — TC:1)
  readonly profileSection: Locator;
  readonly managementSection: Locator;
  readonly departmentsSection: Locator;
  readonly linkContactsSection: Locator;

  // Profile fields
  readonly customerNameInput: Locator;
  readonly emailInput: Locator;
  readonly cityInput: Locator;
  readonly countryCombobox: Locator;
  readonly referredByInput: Locator;
  readonly linkedInInput: Locator;
  readonly facebookInput: Locator;
  readonly instagramInput: Locator;

  // Management fields
  readonly crmStageCombobox: Locator;
  readonly originTypeCombobox: Locator;
  readonly originCombobox: Locator;
  readonly buyerCombobox: Locator;

  // Business Process / Department rows
  readonly addBusinessProcessButton: Locator;

  // Link Contacts
  readonly linkContactsCombobox: Locator;

  // Primary actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  // Duplicate-detection modal
  readonly duplicateWarningModal: Locator;
  readonly saveAnywayButton: Locator;
  readonly cancelToReviewButton: Locator;

  // Post-save modal + confirmation toast (app-shell uses sonner — see
  // frontends/app-shell/package.json)
  readonly postSaveModal: Locator;
  readonly createContactButton: Locator;
  readonly postSaveCancelButton: Locator;
  readonly toast: Locator;

  constructor(page: Page) {
    this.createCustomerEntry = page.getByRole('button', { name: 'Create Customer' });

    this.profileSection = page.getByRole('heading', { name: 'Customer Profile' });
    this.managementSection = page.getByRole('heading', { name: 'Customer Management' });
    // Not a heading in the real DOM — a plain paragraph.
    this.departmentsSection = page.getByText('Departments and Assignees');
    this.linkContactsSection = page.getByRole('heading', { name: 'Link Contacts' });

    this.customerNameInput = page.getByLabel('Customer Name');
    this.emailInput = page.getByLabel('Email');
    this.cityInput = page.getByLabel('City');
    // "Country" also substring-matches the "Phone country code" combobox's
    // label — exact: true is required to disambiguate.
    this.countryCombobox = page.getByRole('combobox', { name: 'Country', exact: true });
    this.referredByInput = page.getByLabel('Referred By');
    this.linkedInInput = page.getByLabel('LinkedIn');
    this.facebookInput = page.getByLabel('Facebook');
    this.instagramInput = page.getByLabel('Instagram');

    this.crmStageCombobox = page.getByRole('combobox', { name: 'CRM Stage', exact: true });
    this.originTypeCombobox = page.getByRole('combobox', { name: 'Origin Type', exact: true });
    this.originCombobox = page.getByRole('combobox', { name: 'Origin', exact: true });
    this.buyerCombobox = page.getByRole('combobox', { name: 'Buyer', exact: true });

    this.addBusinessProcessButton = page.getByRole('button', { name: 'Add', exact: true });

    this.linkContactsCombobox = page.getByRole('combobox', { name: 'Contacts to link' });

    this.saveButton = page.getByRole('button', { name: 'Save Customer' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });

    // Confirmed on dev: this app's confirmation-style modals render as
    // role="alertdialog", not role="dialog" — getByRole('dialog') alone
    // never matches them. Accepting either role defensively, since it's
    // plausible not every modal in the app uses the same one.
    this.duplicateWarningModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /may already exist/i });
    this.saveAnywayButton = this.duplicateWarningModal.getByRole('button', { name: 'Save anyway' });
    this.cancelToReviewButton = this.duplicateWarningModal.getByRole('button', {
      name: 'Cancel to review',
    });

    this.postSaveModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /created successfully/i });
    this.createContactButton = this.postSaveModal.getByRole('button', { name: 'Create Contact' });
    this.postSaveCancelButton = this.postSaveModal.getByRole('button', { name: 'Cancel' });

    // sonner can stack more than one toast at once (confirmed on dev: 2
    // renders for a single save) — .first() avoids a strict-mode failure
    // when checking "a toast is visible" rather than a specific one.
    this.toast = page.locator('[data-sonner-toast]').first();
  }
}
