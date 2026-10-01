import { type Locator, type Page } from '@playwright/test';

/**
 * Techpack — Validation rules (`/techpacks/admin/validation-rules`), element
 * locators only; see src/pages/techpack/validation-rules.page.ts for
 * actions/assertions. Reached via the Techpack module's own collapsed
 * "WORKSPACE" nav drawer (not a separate module).
 *
 * Confirmed live via real ariaSnapshot() dumps, not guessed — list page on
 * dev 2026-09-30 (local exploration evidence (not committed)
 * rules.snapshot.txt), and both New/Edit dialogs + the Archive confirmation
 * on uat 2026-10-01. Notable real DOM shapes:
 *
 * - Status tabs are plain `button`s whose accessible name carries a live
 *   count ("Active 32"); the selected one has `aria-pressed="true"`.
 *   Disabled/Archived live behind a "+2 more" overflow button.
 * - Status and Customer column headers have NO sort button (plain text);
 *   Id/Name/Severity/Version/Updated each have one.
 * - The rule dialog's Customer/Techpack Type/Season/Style/Fabric/Wash/
 *   Product Type pickers are each a `button "Search <x>..."` combobox
 *   trigger (Techpack Type onward were added between 2026-09-30 and
 *   2026-10-01 — see test-cases/techpack/validation-rules.md TC:15).
 * - "Advanced — rule JSON" is a collapsed group with no button role of its
 *   own — clicking its text toggles it. Scope/Assertion textboxes only
 *   exist in the accessibility tree once it's expanded.
 * - The Archive confirmation is NOT a `dialog` role (a plain
 *   getByRole('dialog') timed out against it live while it was clearly on
 *   screen) — matched as alertdialog-or-dialog by its own heading text.
 */
export class ValidationRulesLocators {
  readonly heading: Locator;

  // Techpack module nav drawer (for TC:1/TC:28)
  readonly techpacksListHeading: Locator;
  readonly openNavigationButton: Locator;
  readonly validationRulesNavLink: Locator;

  // List toolbar
  readonly moreTabsButton: Locator;
  readonly filterInput: Locator;
  readonly newRuleButton: Locator;

  // Grid
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly dataRows: Locator;
  readonly emptyStateTitle: Locator;
  readonly emptyStateHint: Locator;

  // Pagination
  readonly showingText: Locator;
  readonly rowsPerPageCombobox: Locator;
  readonly firstPageButton: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly lastPageButton: Locator;
  readonly jumpToPageInput: Locator;

  // New / Edit rule dialog
  readonly ruleDialog: Locator;
  readonly newRuleDialog: Locator;
  readonly editRuleDialog: Locator;
  readonly describeInput: Locator;
  readonly generateButton: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly customerPicker: Locator;
  readonly severityCombobox: Locator;
  readonly notifyOwnerSwitch: Locator;
  readonly blockApprovalSwitch: Locator;
  readonly advancedToggle: Locator;
  readonly scopeInput: Locator;
  readonly assertionInput: Locator;
  readonly createRuleButton: Locator;
  readonly saveChangesButton: Locator;
  readonly cancelButton: Locator;
  readonly closeButton: Locator;
  readonly activateButton: Locator;
  readonly disableButton: Locator;
  readonly archiveButton: Locator;

  // Archive confirmation
  readonly archiveConfirmDialog: Locator;
  readonly archiveConfirmButton: Locator;
  readonly archiveConfirmCancelButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Validation rules', level: 1 });

    this.techpacksListHeading = page.getByRole('heading', { name: 'TechPacks', level: 1 });
    this.openNavigationButton = page.getByRole('button', { name: 'Open navigation' });
    this.validationRulesNavLink = page.getByRole('link', { name: 'Validation rules', exact: true });

    this.moreTabsButton = page.getByRole('button', { name: /^\+\d+ more$/ });
    this.filterInput = page.getByPlaceholder('Filter by id, name or description');
    this.newRuleButton = page.getByRole('button', { name: 'New rule' });

    this.table = page.getByRole('table');
    this.columnHeaders = this.table.getByRole('columnheader');
    // Header row lives in the first rowgroup, data rows in the second.
    this.dataRows = this.table.getByRole('rowgroup').nth(1).getByRole('row');
    this.emptyStateTitle = page.getByText('No rules match');
    this.emptyStateHint = page.getByText('Adjust the filters, or create a new rule.');

    this.showingText = page.getByText(/Showing \d+ to \d+ of \d+/);
    this.rowsPerPageCombobox = page.getByRole('combobox', { name: 'Rows per page' });
    this.firstPageButton = page.getByRole('button', { name: 'First page' });
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.lastPageButton = page.getByRole('button', { name: 'Last page' });
    this.jumpToPageInput = page.getByRole('textbox', { name: /^Jump to page/ });

    this.ruleDialog = page.getByRole('dialog', { name: /^(New|Edit) validation rule$/ });
    this.newRuleDialog = page.getByRole('dialog', { name: 'New validation rule' });
    this.editRuleDialog = page.getByRole('dialog', { name: 'Edit validation rule' });
    const d = this.ruleDialog;
    this.describeInput = d.getByRole('textbox', { name: 'Describe this rule' });
    this.generateButton = d.getByRole('button', { name: 'Generate' });
    this.nameInput = d.getByRole('textbox', { name: 'Name *' });
    this.descriptionInput = d.getByRole('textbox', { name: 'Description', exact: true });
    this.customerPicker = d.getByRole('button', { name: 'Search customers...' });
    this.severityCombobox = d.getByRole('combobox', { name: 'Severity' });
    this.notifyOwnerSwitch = d.getByRole('switch', { name: 'Notify the techpack owner' });
    this.blockApprovalSwitch = d.getByRole('switch', { name: 'Block approval until acknowledged' });
    this.advancedToggle = d.getByText('Advanced — rule JSON', { exact: true });
    this.scopeInput = d.getByRole('textbox', { name: 'Scope (JSON)' });
    this.assertionInput = d.getByRole('textbox', { name: 'Assertion (JSON) *' });
    this.createRuleButton = d.getByRole('button', { name: 'Create rule' });
    this.saveChangesButton = d.getByRole('button', { name: 'Save changes' });
    this.cancelButton = d.getByRole('button', { name: 'Cancel', exact: true });
    this.closeButton = d.getByRole('button', { name: 'Close', exact: true });
    this.activateButton = d.getByRole('button', { name: 'Activate', exact: true });
    this.disableButton = d.getByRole('button', { name: 'Disable', exact: true });
    this.archiveButton = d.getByRole('button', { name: 'Archive', exact: true });

    this.archiveConfirmDialog = page
      .getByRole('alertdialog')
      .or(page.getByRole('dialog', { name: 'Archive this rule?' }))
      .filter({ hasText: 'Archive this rule?' });
    this.archiveConfirmButton = this.archiveConfirmDialog.getByRole('button', {
      name: 'Archive',
      exact: true,
    });
    this.archiveConfirmCancelButton = this.archiveConfirmDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
  }

  /** A primary status tab ("All 33", "Active 32", ...) by its label prefix. */
  statusTab(tab: 'All' | 'Draft' | 'Suggested' | 'Active'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${tab} \\d+$`) });
  }

  /**
   * An overflow status tab ("Disabled 0" / "Archived 1") inside the "+2
   * more" menu. Role not pinned down live (rendered as a two-column
   * label/count list), so this matches any of the plausible menu roles.
   */
  overflowTab(tab: 'Disabled' | 'Archived'): Locator {
    const name = new RegExp(`^${tab}\\s*\\d+$`);
    return this.page
      .getByRole('menuitem', { name })
      .or(this.page.getByRole('menuitemradio', { name }))
      .or(this.page.getByRole('option', { name }))
      .or(this.page.getByRole('button', { name }));
  }

  /** A column header's sort button (Id/Name/Severity/Version/Updated have one). */
  sortButton(column: string): Locator {
    return this.columnHeaders.getByRole('button', { name: column, exact: true });
  }

  columnHeader(column: string): Locator {
    return this.page.getByRole('columnheader', { name: new RegExp(`^${column} Resize`) });
  }

  /** A data row whose text contains `text` (a rule's Id or Name). */
  row(text: string): Locator {
    return this.dataRows.filter({ hasText: text });
  }

  /** Any of the dialog's scoping pickers ("Search techpack types..." etc.). */
  scopingPicker(placeholder: string): Locator {
    return this.ruleDialog.getByRole('button', { name: placeholder });
  }

  toast(text: string | RegExp): Locator {
    return this.page.getByText(text).first();
  }
}
