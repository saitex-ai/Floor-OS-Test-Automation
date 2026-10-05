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
 *
 * Confirmed directly (2026-10-01): dev's Management section also carries
 * a required "Company" combobox that does NOT exist on local at all —
 * saving without it on dev doesn't reach the duplicate-detection check or
 * a real save at all; it blocks on its own "Missing mandatory fields"
 * confirm-anyway dialog first. `CreateCustomerPage.fillProfile()` fills
 * it automatically (first available option) whenever it's present, so
 * every caller behaves the same on local and dev without needing to know
 * about this difference.
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
  readonly companyCombobox: Locator;
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
  readonly viewExistingCustomerButton: Locator;

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

    // Confirmed directly (2026-10-01): a required "Company" combobox that
    // exists on dev but NOT on local — a dev-only field this app adds to
    // the Management section. See CreateCustomerPage.fillProfile()'s
    // handling of it.
    this.companyCombobox = page.getByRole('combobox', { name: 'Company', exact: true });
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
    //
    // Confirmed directly on dev (2026-10-01): an exact Customer Name
    // match ("Acme Textiles") is a HARD block, not a soft warning —
    // heading "Match in Customer Name {name}", body "The Customer you
    // are trying to create already exists in CRM and cannot be created
    // again as duplicate or updated.", with only "Cancel"/"View Existing
    // Customer" buttons — there is NO "Save anyway" override for this
    // case. Matching both this phrasing and the original "may already
    // exist" one so this locator works whichever variant a given
    // environment/match-type actually renders.
    this.duplicateWarningModal = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: /may already exist|already exists in CRM|Match in Customer Name/i });
    this.saveAnywayButton = this.duplicateWarningModal.getByRole('button', { name: 'Save anyway' });
    // Accepts either "Cancel to review" (the original soft-warning text)
    // or the hard-block dialog's plain "Cancel" — exact on the latter so
    // it doesn't also match "Cancel to review" ambiguously.
    this.cancelToReviewButton = this.duplicateWarningModal.getByRole('button', {
      name: /^(Cancel to review|Cancel)$/,
    });
    this.viewExistingCustomerButton = this.duplicateWarningModal.getByRole('button', {
      name: 'View Existing Customer',
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
