import { type Locator, type Page } from '@playwright/test';
import { dateTriggers } from './form-field.locators';

/**
 * Raw element locators for the New / Edit maintenance window form, which
 * replaces the windows grid on a machine's detail page (same URL). No
 * actions or assertions here, see
 * src/pages/planning/maintenance-window-form.page.ts.
 */
export class MaintenanceWindowFormLocators {
  readonly breadcrumb: Locator;
  readonly newHeading: Locator;
  readonly editHeading: Locator;
  readonly kind: Locator;
  readonly windowStart: Locator;
  readonly windowEnd: Locator;
  readonly why: Locator;
  readonly anomaly: Locator;
  readonly active: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  /** The edit form's save notice ("Saves in place. …" / "Saves as a new version …"). */
  readonly saveNotice: Locator;
  readonly machinePicker: Locator;
  readonly requiredMessages: Locator;

  constructor(private readonly page: Page) {
    this.breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    this.newHeading = page.getByRole('heading', { name: 'New maintenance window', level: 1 });
    this.editHeading = page.getByRole('heading', { name: 'Edit maintenance window', level: 1 });
    this.kind = page.getByRole('combobox', { name: 'Kind', exact: true });
    // Window start, then Window end — the only two date-time fields on the form.
    this.windowStart = dateTriggers(page, true).nth(0);
    this.windowEnd = dateTriggers(page, true).nth(1);
    this.why = page.getByRole('textbox', { name: 'Why', exact: true });
    this.anomaly = page.getByRole('combobox', { name: 'Anomaly that prompted it', exact: true });
    this.active = page.getByRole('switch', { name: 'Active', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create maintenance window' });
    this.saveButton = page.getByRole('button', { name: 'Save changes' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.saveNotice = page.getByText(/^(Saving|Saves)\b/);
    this.machinePicker = page.getByRole('combobox', { name: /^Machine/ });
    this.requiredMessages = page.getByRole('alert').filter({ hasText: /^Required$/ });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
