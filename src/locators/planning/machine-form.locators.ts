import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New machine" create form
 * (/planning/master-data/machines/new). No actions or assertions here,
 * see src/pages/planning/machine-form.page.ts for those.
 */
export class MachineFormLocators {
  readonly assetCode: Locator;
  readonly machineType: Locator;
  readonly workCentre: Locator;
  readonly status: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.assetCode = page.getByRole('textbox', { name: 'Asset code' });
    // Was a free-text "Machine class" textbox until the 2026-10-14 dev deploy; now a
    // combobox of the Machine type master ("SNLS · Single needle lockstitch", …).
    this.machineType = page.getByRole('combobox', { name: 'Machine type', exact: true });
    this.workCentre = page.getByRole('combobox', { name: 'Work centre', exact: true });
    this.status = page.getByRole('combobox', { name: 'Status', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create machine' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
