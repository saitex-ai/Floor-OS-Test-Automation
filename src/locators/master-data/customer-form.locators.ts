import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New Customer" / "Edit Customer" form
 * (same field set either way) on the top-level Master Data module. No
 * actions or assertions here, see
 * src/pages/master-data/customer-form.page.ts for those.
 *
 * Confirmed live on dev (2026-10-06):
 * - Query-param view on the list's own route, not a dedicated page —
 *   "New Customer" opens `?create=true` on
 *   `/master-data/system-management/customers`.
 * - Country / Currency / Payment Method / Credit Terms are plain Radix
 *   `combobox` selects (click trigger -> `listbox` of `option`s appears
 *   immediately) — no grid-based picker like Customer Season Master's
 *   "Pick a customer".
 * - Customer Code is a disabled, auto-generated textbox (placeholder
 *   "Auto-generated" before save, shows the real code after). Prefix ID
 *   is free-text on create but becomes disabled once saved — same
 *   "locks after first save" shape as the Code.
 * - A "Brands" tab sits alongside "General"; before the customer is first
 *   saved it only shows "Please save the customer first before adding
 *   brands." — no "Add Brand" control exists until after save.
 * - Two "Cancel" buttons exist on screen simultaneously (top + footer) —
 *   both discard identically, `.first()` is enough.
 * - "Deactivate" only renders on Edit Customer, never on Create.
 */
export class CustomerFormLocators {
  readonly customerCodeInput: Locator;
  readonly prefixIdInput: Locator;
  readonly customerNameInput: Locator;
  readonly contactPersonInput: Locator;
  readonly emailInput: Locator;
  readonly websiteInput: Locator;
  readonly phone1Input: Locator;
  readonly buyerCodeInput: Locator;
  readonly faxInput: Locator;
  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly cityInput: Locator;
  readonly stateProvinceInput: Locator;
  readonly postalCodeInput: Locator;
  readonly countryCombobox: Locator;
  readonly currencyCombobox: Locator;
  readonly paymentMethodCombobox: Locator;
  readonly creditTermsCombobox: Locator;
  readonly activeCheckbox: Locator;

  readonly generalTab: Locator;
  readonly brandsTab: Locator;
  readonly addBrandButton: Locator;

  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly deactivateButton: Locator;

  constructor(private readonly page: Page) {
    this.customerCodeInput = page.getByRole('textbox', { name: 'Customer Code', exact: true });
    this.prefixIdInput = page.getByRole('textbox', { name: 'Prefix ID *', exact: true });
    this.customerNameInput = page.getByRole('textbox', { name: 'Customer Name *', exact: true });
    this.contactPersonInput = page.getByRole('textbox', { name: 'Contact Person', exact: true });
    this.emailInput = page.getByRole('textbox', { name: 'Email', exact: true });
    this.websiteInput = page.getByRole('textbox', { name: 'Website', exact: true });
    this.phone1Input = page.getByRole('textbox', { name: 'Phone 1', exact: true });
    this.buyerCodeInput = page.getByRole('textbox', { name: 'Buyer Code', exact: true });
    this.faxInput = page.getByRole('textbox', { name: 'Fax', exact: true });
    this.addressLine1Input = page.getByRole('textbox', { name: 'Address Line 1', exact: true });
    this.addressLine2Input = page.getByRole('textbox', { name: 'Address Line 2', exact: true });
    this.cityInput = page.getByRole('textbox', { name: 'City', exact: true });
    this.stateProvinceInput = page.getByRole('textbox', { name: 'State / Province', exact: true });
    this.postalCodeInput = page.getByRole('textbox', { name: 'Postal Code', exact: true });
    this.countryCombobox = page.getByRole('combobox', { name: 'Country *', exact: true });
    this.currencyCombobox = page.getByRole('combobox', { name: 'Currency *', exact: true });
    this.paymentMethodCombobox = page.getByRole('combobox', { name: 'Payment Method', exact: true });
    this.creditTermsCombobox = page.getByRole('combobox', { name: 'Credit Terms', exact: true });
    this.activeCheckbox = page.getByRole('checkbox', { name: 'Active', exact: true });

    this.generalTab = page.getByRole('tab', { name: 'General' });
    this.brandsTab = page.getByRole('tab', { name: 'Brands' });
    this.addBrandButton = page.getByRole('button', { name: 'Add Brand' });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).first();
    this.deactivateButton = page.getByRole('button', { name: 'Deactivate', exact: true });
  }

  /** An option in an open Country / Currency / Payment Method / Credit Terms dropdown. */
  option(match: string | RegExp): Locator {
    return this.page.getByRole('option', { name: match });
  }

  /** The "Required" paragraph confirmed live to render as a `p` sibling following a field. */
  requiredErrorFor(fieldAnchor: Locator): Locator {
    return fieldAnchor.locator('xpath=following-sibling::p[1]');
  }
}
