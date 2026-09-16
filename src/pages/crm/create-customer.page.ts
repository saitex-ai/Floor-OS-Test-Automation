import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/** Customers list, under the CRM module (confirmed against the running app). */
const CUSTOMERS_LIST_PATH = '/crm/customers';

/**
 * "Create Customer" (CRM, Sprint 1 user story). Owned by the CRM QA.
 *
 * Locators are confirmed against the real running form (dumped via
 * ariaSnapshot() against a local `tilt up` stack), not guessed from the
 * ClickUp test-case text — see test-cases/crm/create-customer.md for that
 * text. Two things worth knowing before touching this file:
 *
 * - Country / CRM Stage / Origin Type / Origin / Buyer are custom
 *   comboboxes (a button that opens a popup with an `option`-per-choice
 *   list), not fillable text inputs — use selectComboboxOption(), not
 *   .fill(). Confirmed Country renders its popup as a `dialog`; CRM
 *   Stage opens a dropdown too but wasn't selecting via that same
 *   dialog->option path (observed directly in the running app) — likely
 *   a plain listbox popup with no `dialog` wrapper, not a search-combobox
 *   like Country's. selectComboboxOption() tries both shapes.
 * - "Referred By" is a text field that only appears once Origin Type is
 *   set to "Referral" (matches the user story's acceptance criteria: a
 *   referral-source field is conditionally required on that value).
 */
export interface CustomerProfileDetails {
  name?: string;
  email?: string;
  city?: string;
  country?: string;
  crmStage?: string;
  originType?: string;
  origin?: string;
  buyer?: string;
  referredBy?: string;
  linkedIn?: string;
  facebook?: string;
  instagram?: string;
}

export class CreateCustomerPage extends BasePage {
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
    super(page);

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

  async openFromCrmHome(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.createCustomerEntry.click();
  }

  async fillProfile(details: CustomerProfileDetails): Promise<void> {
    if (details.name !== undefined) await this.customerNameInput.fill(details.name);
    if (details.email !== undefined) await this.emailInput.fill(details.email);
    if (details.city !== undefined) await this.cityInput.fill(details.city);
    if (details.country !== undefined)
      await this.selectComboboxOption(this.countryCombobox, details.country);
    if (details.crmStage !== undefined)
      await this.selectComboboxOption(this.crmStageCombobox, details.crmStage);
    if (details.originType !== undefined) {
      await this.selectComboboxOption(this.originTypeCombobox, details.originType);
    }
    if (details.origin !== undefined)
      await this.selectComboboxOption(this.originCombobox, details.origin);
    if (details.buyer !== undefined)
      await this.selectComboboxOption(this.buyerCombobox, details.buyer);
    // Only rendered once Origin Type is "Referral" — set that first if this is provided.
    if (details.referredBy !== undefined) await this.referredByInput.fill(details.referredBy);
    if (details.linkedIn !== undefined) await this.linkedInInput.fill(details.linkedIn);
    if (details.facebook !== undefined) await this.facebookInput.fill(details.facebook);
    if (details.instagram !== undefined) await this.instagramInput.fill(details.instagram);
  }

  /**
   * Country / CRM Stage / Origin Type / Origin / Buyer are all triggered
   * the same way, but don't all render their popup the same way underneath
   * — Country's is a search combobox inside a `dialog`; CRM Stage opens a
   * dropdown that doesn't match that same dialog->option path (observed
   * directly, not assumed). Try the `dialog`-scoped option first since
   * that's confirmed for at least one field, and fall back to an
   * unscoped `option` search (a plain listbox popup, no dialog wrapper)
   * for whichever fields turn out to use the other shape.
   */
  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }

  /**
   * Adds a Business Process/Department row without assigning anyone
   * (TC:4). "Department" and "Assignees" are both comboboxes — same
   * selectComboboxOption() pattern as Country/CRM Stage/etc, not fillable
   * text inputs (confirmed directly: the previous .fill() attempt
   * resolved to the row's "Remove department" button instead, since that
   * button's aria-label also matched a loose /department/i search).
   */
  async addBusinessProcessWithoutAssignee(department: string): Promise<void> {
    await this.addBusinessProcessButton.click();
    const departmentCombobox = this.page.getByRole('combobox', { name: 'Department' }).last();
    await this.selectComboboxOption(departmentCombobox, department);
  }

  async addBusinessProcessWithAssignee(department: string, assignee: string): Promise<void> {
    await this.addBusinessProcessWithoutAssignee(department);
    const assigneeCombobox = this.page.getByRole('combobox', { name: 'Assignees' }).last();
    await this.selectComboboxOption(assigneeCombobox, assignee);
  }

  async linkExistingContact(contactName: string): Promise<void> {
    await this.selectComboboxOption(this.linkContactsCombobox, contactName);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Matches one of the form's `.crm-error` messages — several can be on screen at once. */
  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectDuplicateWarningVisible(): Promise<void> {
    await expect(this.duplicateWarningModal).toBeVisible();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.toast).toBeVisible();
    await expect(this.postSaveModal).toBeVisible();
  }

  async expectFormSectionsVisible(): Promise<void> {
    await expect(this.profileSection).toBeVisible();
    await expect(this.managementSection).toBeVisible();
    await expect(this.departmentsSection).toBeVisible();
    await expect(this.linkContactsSection).toBeVisible();
  }
}
