import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New Company" / "Edit Company" form (same
 * field set either way) on the top-level Master Data module. No actions
 * or assertions here, see src/pages/master-data/company-form.page.ts for
 * those.
 *
 * Confirmed live on dev (2026-10-06):
 * - This is a query-param view on the list's own route, not a dedicated
 *   page — "New Company" opens `?create=true`, editing opens
 *   `?edit={CompanyCode}` on the same `/master-data/system-management/company`
 *   base URL.
 * - Country of Operation / Primary Currency / Secondary Currency are
 *   plain Radix `combobox` selects (click trigger -> `listbox` of
 *   `option`s appears immediately) — no typing/search needed, unlike
 *   Customer Season Master's grid-based "Pick a customer" picker.
 * - Two "Cancel" buttons exist on screen simultaneously (one near the
 *   top, one in the footer) — both discard identically, `.first()` is
 *   enough (same shape confirmed on Vendor Master's drawer).
 * - "Deactivate" only renders on Edit Company, never on Create. Company
 *   Code is disabled once a company is saved (immutable after creation).
 * - Company Code and Prefix Code are confirmed live to hard-cap at
 *   exactly 5 characters (silent truncation, no inline "too long" error).
 */
export class CompanyFormLocators {
  readonly companyCodeInput: Locator;
  readonly prefixCodeInput: Locator;
  readonly companyNameInput: Locator;
  readonly addressInput: Locator;
  readonly countryOfOperationCombobox: Locator;
  readonly taxRegistrationNumberInput: Locator;
  readonly activeCheckbox: Locator;
  readonly telephoneInput: Locator;
  readonly faxInput: Locator;
  readonly primaryCurrencyCombobox: Locator;
  readonly secondaryCurrencyCombobox: Locator;
  readonly scrapPercentInput: Locator;
  readonly masterDataApprovalSwitch: Locator;
  readonly imagePathInput: Locator;
  readonly documentPathInput: Locator;
  readonly frPathInput: Locator;
  readonly gproPathInput: Locator;

  readonly createButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly deactivateButton: Locator;
  readonly currencyListbox: Locator;

  constructor(private readonly page: Page) {
    this.companyCodeInput = page.getByRole('textbox', { name: 'Company Code *', exact: true });
    this.prefixCodeInput = page.getByRole('textbox', { name: 'Prefix Code *', exact: true });
    this.companyNameInput = page.getByRole('textbox', { name: 'Company Name *', exact: true });
    this.addressInput = page.getByRole('textbox', { name: 'Address *', exact: true });
    this.countryOfOperationCombobox = page.getByRole('combobox', {
      name: 'Country of Operation',
      exact: true,
    });
    this.taxRegistrationNumberInput = page.getByRole('textbox', {
      name: 'Tax Registration Number',
      exact: true,
    });
    this.activeCheckbox = page.getByRole('checkbox', { name: 'Active', exact: true });
    this.telephoneInput = page.getByRole('textbox', { name: 'Telephone', exact: true });
    this.faxInput = page.getByRole('textbox', { name: 'Fax', exact: true });
    this.primaryCurrencyCombobox = page.getByRole('combobox', {
      name: 'Primary Currency *',
      exact: true,
    });
    this.secondaryCurrencyCombobox = page.getByRole('combobox', {
      name: 'Secondary Currency *',
      exact: true,
    });
    this.scrapPercentInput = page.getByRole('spinbutton', { name: 'Scrap %', exact: true });
    this.masterDataApprovalSwitch = page.getByRole('switch', {
      name: 'Master Data Approval Required',
      exact: true,
    });
    this.imagePathInput = page.getByRole('textbox', { name: 'Image Path', exact: true });
    this.documentPathInput = page.getByRole('textbox', { name: 'Document Path', exact: true });
    this.frPathInput = page.getByRole('textbox', { name: 'FR Path', exact: true });
    this.gproPathInput = page.getByRole('textbox', { name: 'GPRO Path', exact: true });

    this.createButton = page.getByRole('button', { name: 'Create', exact: true });
    this.saveChangesButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).first();
    this.deactivateButton = page.getByRole('button', { name: 'Deactivate', exact: true });
    this.currencyListbox = page.getByRole('listbox');
  }

  /** An option in an open Country of Operation / Primary Currency / Secondary Currency dropdown. */
  option(match: string | RegExp): Locator {
    return this.page.getByRole('option', { name: match });
  }

  /**
   * The "Required" paragraph confirmed live to render as a `p` sibling
   * following a field (the xpath skips over any non-`p` siblings in
   * between, e.g. a combobox's own popup trigger), same pattern as
   * Vendor Master's own `requiredErrorFor()`.
   */
  requiredErrorFor(fieldAnchor: Locator): Locator {
    return fieldAnchor.locator('xpath=following-sibling::p[1]');
  }
}
