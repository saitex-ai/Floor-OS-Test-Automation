import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the New / Edit allowance form, which replaces
 * the Allowances grid on an operation's detail page (same URL). No actions
 * or assertions here, see src/pages/planning/allowance-form.page.ts.
 */
export class AllowanceFormLocators {
  readonly breadcrumb: Locator;
  readonly newHeading: Locator;
  readonly editHeading: Locator;
  readonly type: Locator;
  readonly percentage: Locator;
  readonly differs: Locator;
  readonly why: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** The edit form's save notice ("Saving overwrites this allowance — …" / "Saves as a new version …"). */
  readonly saveNotice: Locator;
  readonly operationPicker: Locator;

  constructor(private readonly page: Page) {
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.newHeading = page.getByRole('heading', { name: 'New allowance', level: 1 });
    this.editHeading = page.getByRole('heading', { name: 'Edit allowance', level: 1 });
    this.type = page.getByRole('combobox', { name: 'Allowance type', exact: true });
    this.percentage = page.getByRole('textbox', { name: 'Percentage applied (%)' });
    this.differs = page.getByRole('switch', { name: 'Differs from the allowance type default' });
    this.why = page.getByRole('textbox', { name: 'Why the default was not used' });
    this.createButton = page.getByRole('button', { name: 'Create allowance' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.operationPicker = page.getByRole('combobox', { name: /^Operation/ });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
