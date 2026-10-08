import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New Vendor" / "Edit Vendor" form (same
 * field set either way) on the top-level Master Data module. No actions
 * or assertions here, see src/pages/master-data/vendor-form.page.ts for
 * those.
 *
 * Confirmed live on dev (2026-10-06):
 * - This is a right-side drawer keyed off a query param, not a dedicated
 *   route — "New Vendor" opens `?create=true` on the list's own URL,
 *   editing opens `?edit={VendorCode}`. There are two `<main>` elements on
 *   screen at once (the list underneath, the drawer on top), so every
 *   locator here should stay scoped to role-based lookups rather than
 *   `page.locator('main')`.
 * - Currency and Country are NOT fillable comboboxes — each is a button
 *   ("Pick currency" / "Pick country") that opens its own grid-based
 *   picker dialog with a search box and paginated `row`s (not
 *   `option`s/`listbox`). Credit Terms and Payment Method, by contrast,
 *   ARE plain Radix `combobox`/`option` selects.
 * - Two "Cancel" buttons exist on screen simultaneously (one near the
 *   header, one in the footer) — both discard identically, `.first()` is
 *   enough.
 * - "Deactivate" only renders in the Edit Vendor header, never on Create.
 */
export class VendorFormLocators {
  readonly vendorCodeInput: Locator;
  readonly prefixIdInput: Locator;
  readonly vendorNameInput: Locator;
  readonly pickCurrencyButton: Locator;
  readonly activeCheckbox: Locator;
  readonly deactivateButton: Locator;

  readonly generalTab: Locator;
  readonly categoriesTab: Locator;
  readonly imageTab: Locator;

  readonly registeredNameInput: Locator;
  readonly accountReferenceNumberInput: Locator;
  readonly vendorClassIdInput: Locator;
  readonly creditTermsCombobox: Locator;
  readonly paymentMethodCombobox: Locator;
  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly cityInput: Locator;
  readonly stateProvinceInput: Locator;
  readonly pickCountryButton: Locator;
  readonly postalCodeInput: Locator;
  readonly phone1Input: Locator;
  readonly phone2Input: Locator;
  readonly faxInput: Locator;
  readonly emailInput: Locator;
  readonly websiteInput: Locator;
  readonly supplierMoqInput: Locator;

  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;

  // Currency / Country picker dialogs (grid-based, confirmed live — not a listbox).
  readonly currencyPickerDialog: Locator;
  readonly countryPickerDialog: Locator;

  constructor(private readonly page: Page) {
    this.vendorCodeInput = page.getByRole('textbox', { name: 'Vendor Code' });
    this.prefixIdInput = page.getByRole('textbox', { name: 'Prefix ID', exact: false });
    this.vendorNameInput = page.getByRole('textbox', { name: 'Vendor Name', exact: false });
    this.pickCurrencyButton = page.getByRole('button', { name: 'Pick currency' });
    this.activeCheckbox = page.getByRole('checkbox', { name: 'Active' });
    this.deactivateButton = page.getByRole('button', { name: 'Deactivate' });

    this.generalTab = page.getByRole('tab', { name: 'General' });
    this.categoriesTab = page.getByRole('tab', { name: 'Categories' });
    this.imageTab = page.getByRole('tab', { name: 'Image' });

    this.registeredNameInput = page.getByRole('textbox', { name: 'Registered Name' });
    this.accountReferenceNumberInput = page.getByRole('textbox', { name: 'Account Reference Number' });
    this.vendorClassIdInput = page.getByRole('textbox', { name: 'Vendor Class ID' });
    this.creditTermsCombobox = page.getByRole('combobox', { name: 'Credit Terms', exact: false });
    this.paymentMethodCombobox = page.getByRole('combobox', { name: 'Payment Method', exact: false });
    this.addressLine1Input = page.getByRole('textbox', { name: 'Address Line 1', exact: false });
    this.addressLine2Input = page.getByRole('textbox', { name: 'Address Line 2' });
    this.cityInput = page.getByRole('textbox', { name: 'City', exact: false });
    this.stateProvinceInput = page.getByRole('textbox', { name: 'State / Province' });
    this.pickCountryButton = page.getByRole('button', { name: 'Pick country' });
    this.postalCodeInput = page.getByRole('textbox', { name: 'Postal Code' });
    this.phone1Input = page.getByRole('textbox', { name: 'Phone 1' });
    this.phone2Input = page.getByRole('textbox', { name: 'Phone 2' });
    this.faxInput = page.getByRole('textbox', { name: 'Fax' });
    this.emailInput = page.getByRole('textbox', { name: 'Email', exact: true });
    this.websiteInput = page.getByRole('textbox', { name: 'Website' });
    this.supplierMoqInput = page.getByRole('textbox', { name: 'Supplier MOQ' });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).first();

    this.currencyPickerDialog = page.getByRole('dialog', { name: 'Select Currency' });
    this.countryPickerDialog = page.getByRole('dialog', { name: 'Select Country' });
  }

  /**
   * The "Required" error paragraph. For a plain input/combobox (e.g.
   * Prefix ID, Vendor Name, Credit Terms) it renders as that element's own
   * next sibling — confirmed live. For Currency/Country, confirmed live
   * via a real failing test run (2026-10-06) that this does NOT hold: the
   * "Pick currency"/"Pick country" button sits inside its own
   * textbox+button wrapper, and the paragraph is a sibling of THAT
   * wrapper, not of the button itself — `button.following-sibling::p`
   * finds nothing. `.or()` tries both shapes so one requiredErrorFor()
   * works for every field on this form regardless of which shape it is
   * (only one of the two xpaths ever matches a real element for a given
   * field, so this never becomes a strict-mode multiple-match).
   */
  requiredErrorFor(fieldAnchor: Locator): Locator {
    const directSibling = fieldAnchor.locator('xpath=following-sibling::p[1]');
    const parentsSibling = fieldAnchor.locator('xpath=../following-sibling::p[1]');
    return directSibling.or(parentsSibling);
  }

  /** A row in the open currency picker dialog, e.g. /USD/ or /US Dollar/. */
  currencyRow(match: string | RegExp): Locator {
    return this.currencyPickerDialog.getByRole('row', { name: match });
  }

  /** A row in the open country picker dialog, e.g. /India/. */
  countryRow(match: string | RegExp): Locator {
    return this.countryPickerDialog.getByRole('row', { name: match });
  }

  /** An option in an open Credit Terms / Payment Method dropdown. */
  option(match: string | RegExp): Locator {
    return this.page.getByRole('option', { name: match });
  }
}
