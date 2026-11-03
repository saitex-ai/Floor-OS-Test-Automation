import { type Locator, type Page } from '@playwright/test';
import { fieldHelp } from './form-field.locators';

/**
 * Raw element locators for Planning > Master Data > Code lists
 * (/planning/master-data/code-lists) and one code list's own page
 * (/code-lists/<table>, e.g. /code-lists/activity_type), whose values grid
 * is the same shared grid (MasterDataListLocators). No actions or
 * assertions here, see src/pages/planning/code-lists.page.ts.
 */
export class CodeListsLocators {
  readonly listHeading: Locator;
  /** The code lists are a fixed manifest: no "New …" action at the top level. */
  readonly anyNewButton: Locator;
  /** What a create action here would be called — never rendered. */
  readonly newCodeListButton: Locator;
  readonly allCodeListsLink: Locator;
  readonly listTitle: Locator;
  readonly newValueButton: Locator;

  constructor(private readonly page: Page) {
    this.listHeading = page.getByRole('heading', { name: 'Code lists', level: 1 });
    this.anyNewButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: /^(\+ )?New\b/ });
    this.newCodeListButton = page.getByRole('button', { name: /New code list/i });
    this.allCodeListsLink = page.getByRole('link', { name: 'All code lists' });
    this.listTitle = page.getByRole('heading', { level: 1 });
    this.newValueButton = page.getByRole('button', { name: 'New value' });
  }

  /** A summary label on a list's page ("Table", "In plain terms", "Why it exists") or its value. */
  summaryText(text: string): Locator {
    return this.page.getByRole('main').last().getByText(text, { exact: true }).first();
  }
}

/**
 * Raw element locators for the code-list value dialogs: "New value", the
 * read-only view a row click opens (heading = the value's label, with Edit
 * / Close / "Retire this record"), and "Edit value". Only one is open at a
 * time. No actions or assertions here, see
 * src/pages/planning/code-list-value-dialog.page.ts.
 */
export class CodeListValueDialogLocators {
  readonly dialog: Locator;
  readonly newDialog: Locator;
  readonly editDialog: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly value: Locator;
  readonly valueFixedHelp: Locator;
  readonly shownAs: Locator;
  readonly whatItMeans: Locator;
  readonly displayOrder: Locator;
  readonly inUse: Locator;
  readonly listPicker: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly editButton: Locator;
  readonly closeButton: Locator;
  readonly saveNotice: Locator;
  readonly viewText: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog').last();
    this.newDialog = page.getByRole('dialog', { name: 'New value' });
    this.editDialog = page.getByRole('dialog', { name: 'Edit value' });
    this.heading = this.dialog.getByRole('heading', { level: 2 });
    this.subtitle = this.heading.locator('xpath=following-sibling::p[1]');
    this.value = this.dialog.getByRole('textbox', { name: 'Value', exact: true });
    this.valueFixedHelp = fieldHelp(this.dialog, /The value is fixed once the record exists/);
    this.shownAs = this.dialog.getByRole('textbox', { name: 'Shown as' });
    this.whatItMeans = this.dialog.getByRole('textbox', { name: 'What it means' });
    this.displayOrder = this.dialog.getByRole('textbox', { name: 'Display order' });
    this.inUse = this.dialog.getByRole('switch', { name: 'In use' });
    this.listPicker = this.dialog.getByRole('combobox');
    this.createButton = this.dialog.getByRole('button', { name: 'Create value' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save changes' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.editButton = this.dialog.getByRole('button', { name: 'Edit', exact: true });
    // The footer's "Close" (the header has an icon-only one too).
    this.closeButton = this.dialog.getByRole('button', { name: 'Close', exact: true }).last();
    this.saveNotice = this.dialog.getByText(/^(Saving|Saves)\b/);
    this.viewText = this.dialog.getByRole('group');
  }
}
