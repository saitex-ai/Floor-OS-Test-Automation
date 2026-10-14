import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Shift kinds
 * (/planning/master-data/shift-kinds) and its dialogs: "New shift kind",
 * the read-only view a row click opens (heading = the label; Close / Edit
 * / "Retire this record"), and "Edit shift kind". The grid is the shared
 * MasterDataListLocators. No actions or assertions here, see
 * src/pages/planning/shift-kinds.page.ts.
 */
export class ShiftKindsLocators {
  readonly heading: Locator;
  readonly newShiftKindButton: Locator;
  readonly dialog: Locator;
  readonly newDialog: Locator;
  readonly editDialog: Locator;
  readonly dialogHeading: Locator;
  readonly retireToggle: Locator;
  readonly code: Locator;
  readonly codeFixedHelp: Locator;
  readonly label: Locator;
  readonly description: Locator;
  readonly countsAgainstCap: Locator;
  readonly displayOrder: Locator;
  readonly active: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly closeButton: Locator;
  readonly saveNotice: Locator;
  readonly viewText: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { name: 'Shift kinds', level: 1 });
    this.newShiftKindButton = page.getByRole('button', { name: 'New shift kind' });
    this.dialog = page.getByRole('dialog').last();
    this.newDialog = page.getByRole('dialog', { name: 'New shift kind' });
    this.editDialog = page.getByRole('dialog', { name: 'Edit shift kind' });
    this.dialogHeading = this.dialog.getByRole('heading', { level: 2 });
    // The header's one-click toggle: "Retire this record" / "Restore this record".
    this.retireToggle = this.dialog.getByRole('button', { name: /^(Retire|Restore) this record$/ });
    this.code = this.dialog.getByRole('textbox', { name: 'Lookup code' });
    this.codeFixedHelp = this.dialog.getByText(/The code is fixed once the record exists/);
    this.label = this.dialog.getByRole('textbox', { name: 'Display label' });
    this.description = this.dialog.getByRole('textbox', { name: 'Description' });
    this.countsAgainstCap = this.dialog.getByRole('switch', {
      name: 'Counts against overtime cap',
    });
    this.displayOrder = this.dialog.getByRole('textbox', { name: 'Display order' });
    this.active = this.dialog.getByRole('switch', { name: 'Active' });
    this.createButton = this.dialog.getByRole('button', { name: 'Create shift kind' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.editButton = this.dialog.getByRole('button', { name: 'Edit', exact: true });
    this.closeButton = this.dialog.getByRole('button', { name: 'Close', exact: true }).last();
    this.saveNotice = this.dialog.getByText(/^(Saving|Saves)\b/);
    this.viewText = this.dialog.getByRole('group');
  }
}
