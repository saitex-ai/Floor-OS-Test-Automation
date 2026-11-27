import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

/**
 * Raw element locators for Planning > Master Data > Routing Templates
 * (/planning/master-data/routing-templates). The grid itself is the shared
 * MasterDataListLocators (`RoutingTemplatesListPage.grid`). Rows have plain
 * inline "Duplicate" (every row) and "Retire" (Active rows) buttons; Retire
 * opens a dialog, or "Can't retire …" while a revision is pending.
 * No actions or assertions here, see src/pages/planning/routing-templates-list.page.ts.
 */
export class RoutingTemplatesListLocators {
  readonly heading: Locator;
  readonly newTemplateButton: Locator;
  readonly refreshButton: Locator;
  /** The "Cycle kind" filter pills above the tabs ("All", "Proto 2", …). */
  readonly cycleKindPills: Locator;
  readonly retireDialog: Locator;
  readonly successorPicker: Locator;
  readonly retireConfirmButton: Locator;
  readonly retireCancelButton: Locator;
  /** Shown instead of the Retire dialog while a revision is pending. */
  readonly cantRetireDialog: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Routing Templates', level: 1 });
    this.newTemplateButton = page.getByRole('button', { name: 'New template' });
    this.refreshButton = page.getByRole('button', { name: 'Refresh', exact: true });
    this.cycleKindPills = page.getByRole('group', { name: 'Cycle kind' });
    this.retireDialog = page.getByRole('dialog', { name: /^Retire .+\?$/ });
    this.successorPicker = this.retireDialog.getByRole('combobox', {
      name: 'Successor (optional)',
    });
    this.retireConfirmButton = this.retireDialog.getByRole('button', {
      name: 'Retire',
      exact: true,
    });
    this.retireCancelButton = this.retireDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.cantRetireDialog = page.getByRole('alertdialog', { name: /^Can't retire / });
  }

  cycleKindPill(label: string): Locator {
    return this.cycleKindPills.getByRole('button', { name: label, exact: true });
  }

  /** An inline row action ("Duplicate" / "Retire") on the row whose Code cell is `code`. */
  rowAction(row: Locator, action: 'Duplicate' | 'Retire'): Locator {
    return row.getByRole('button', { name: action, exact: true });
  }

  /** An option of the open Successor picker (or any open listbox). */
  options(): Locator {
    return this.page.getByRole('option');
  }

  /**
   * The split view's preview pane: the region next to the grid that shows
   * the selected template — found by its "Edit template" / "Open template"
   * round action and its own Steps heading.
   */
  previewStepsHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Steps \(\d+\)$/ });
  }

  /** A record in a split view's left-hand list (a button named "<name> <code> · <cycle kind> <status>"). */
  splitRecord(code: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`\\b${escapeRegExp(code)} ·`) });
  }
}
