import { type Locator, type Page } from '@playwright/test';

/** Where a row's input is looked up: its row, or the page (for a `has:` filter). */
type Scope = Locator | Page;

/**
 * Raw element locators for an allowance's inputs. Since the 2026-10-28 dev
 * deploy an allowance is a row of the "Allowances (N)" inline table on step
 * 2 of Edit operation ("Allowances and tooling", Allowances tab — see
 * InlineTableLocators): the add row for a new one, a saved row after its
 * "Edit allowance". Each input is looked up inside the row passed in. No
 * actions or assertions here, see src/pages/planning/allowance-form.page.ts.
 */
export class AllowanceFormLocators {
  readonly stepTitle: Locator;
  readonly allowancesTab: Locator;
  readonly allowancesPanel: Locator;
  /** "Each allowance is saved the moment its + or Save is pressed." */
  readonly saveNotice: Locator;
  /** The form's footer Cancel (a row being edited has its own Cancel, above it). */
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.stepTitle = page.getByText('STEP 2 OF 2 · ALLOWANCES AND TOOLING');
    this.allowancesTab = page.getByRole('tab', { name: 'Allowances' });
    this.allowancesPanel = page.getByRole('tabpanel', { name: 'Allowances' });
    this.saveNotice = page.getByText(/^Each allowance is saved the moment/);
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true }).last();
  }

  /** On a saved row being edited the type is fixed: shown as text, or a disabled picker. */
  type(row: Scope): Locator {
    return row.getByRole('combobox', { name: 'Allowance type', exact: true });
  }

  percentage(row: Scope): Locator {
    return row.getByRole('textbox', { name: 'Percentage applied' });
  }

  /** "Override" (was "Differs from the allowance type default"): on once the percentage differs. */
  differs(row: Scope): Locator {
    return row.getByRole('switch', { name: 'Override' });
  }

  /** Only once Override is on. */
  why(row: Scope): Locator {
    return row.getByRole('textbox', { name: 'Why the default was not used' });
  }

  operationPicker(row: Scope): Locator {
    return row.getByRole('combobox', { name: /^Operation/ });
  }

  /**
   * The cell holding `control`, where its message renders. Pass the control
   * built on the page (e.g. `kind(page)`): a `has:` filter is queried inside
   * each cell.
   */
  cellOf(row: Locator, control: Locator): Locator {
    return row.getByRole('cell').filter({ has: control });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
