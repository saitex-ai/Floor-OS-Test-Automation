import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperationDetailLocators } from '../../locators/planning/operation-detail.locators';
import { detailValue } from '../../locators/planning/form-field.locators';
import { becomesUsable, expectAbsentOrDisabled } from './master-data-list.page';
import { InlineTable } from './inline-table';
import { pressDone } from './form-submit';
import { WAIT } from './waits';
import { ensureRoute } from './navigation';

/** One allowance row's cells, as the Allowances grid shows them. */
export interface AllowanceRowValues {
  percentage?: string | RegExp;
  override?: 'Override' | 'Default';
  why?: string;
}

/**
 * An operation's detail page: read-only summary, "Edit operation", and
 * the read-only Allowances grid. Since the 2026-10-28 dev deploy
 * allowances are added and edited on step 2 of Edit operation, as rows of
 * an inline table — see AllowanceFormPage. Owned by the Planning QA. The
 * URL carries the code.
 */
export class OperationDetailPage extends BasePage {
  readonly locators: OperationDetailLocators;
  readonly allowances: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationDetailLocators(page);
    this.allowances = new InlineTable(page, 'Allowances', 'allowance');
  }

  async open(code: string): Promise<void> {
    await this.gotoAuthenticated(`/planning/master-data/operations/${code}`);
    await ensureRoute(this.page, `/planning/master-data/operations/${code}`);
    await this.expectLoaded(code);
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/operations/${code}$`), {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.summary.getByText(code, { exact: true }).first()).toBeVisible();
  }

  /** Read-only: the summary is text, not inputs; editing is the separate "Edit operation". */
  async expectReadOnlyView(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible();
    await expect(this.locators.summary.getByRole('textbox', { name: /^Operation/ })).toHaveCount(0);
  }

  async startEditing(): Promise<void> {
    await this.locators.editButton.click();
  }

  async expectNoEditAction(): Promise<void> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectAbsentOrDisabled(this.locators.editButton);
  }

  async value(label: string): Promise<string> {
    return (await detailValue(this.page, label).innerText()).trim();
  }

  async expectValue(label: string, value: string | RegExp): Promise<void> {
    await expect(detailValue(this.page, label)).toHaveText(value);
  }

  async expectSummaryContains(text: string | RegExp): Promise<void> {
    await expect(this.locators.summary).toContainText(text);
  }

  async expectBadge(text: string): Promise<void> {
    await expect(this.locators.badge(text)).toBeVisible();
  }

  async expectDomainParameter(key: string, value: string): Promise<void> {
    await expect(this.locators.domainParameters).toContainText(`${key}: ${value}`);
  }

  /** Status is set on the edit form (as in the prototype) — no Activate / Approve / Retire here. */
  async expectNoStatusActions(): Promise<void> {
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.statusActions).toHaveCount(0);
  }

  /** The heading reads "Allowances (0)" until the rows load, so this waits for `count`. */
  async expectAllowanceCount(count: number): Promise<void> {
    await expect(this.locators.allowancesHeading).toHaveText(
      new RegExp(`^Allowances \\(${count}\\)`),
      { timeout: WAIT.SERVER },
    );
  }

  /**
   * Every allowance type is already on the operation: step 2 offers no add
   * row (or a disabled one) — there's no type left to add.
   */
  async expectNewAllowanceDisabled(): Promise<void> {
    await this.openAllowancesStep();
    const add = this.allowances.locators.addButton;
    if ((await add.count()) > 0) await expect(add).toBeDisabled();
    else await expect(this.allowances.locators.addRow).toHaveCount(0);
  }

  /** Opens step 2 of Edit operation (if not already there), Allowances tab. */
  async openAllowancesStep(): Promise<void> {
    if (!(await this.locators.stepTitle.isVisible())) {
      await this.locators.editButton.click();
      await expect(this.page).toHaveURL(/\/operations\/[^/]+\/edit$/, {
        timeout: WAIT.NAVIGATION,
      });
      await this.locators.allowancesStep.click();
      await expect(this.locators.stepTitle).toBeVisible({ timeout: WAIT.NAVIGATION });
    }
    if ((await this.locators.allowancesTab.getAttribute('aria-selected')) !== 'true')
      await this.locators.allowancesTab.click();
    await expect(this.allowances.locators.table).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** Allowances are added on step 2 of Edit operation: opens it there, with the add row ready. */
  async openNewAllowance(): Promise<void> {
    await this.openAllowancesStep();
    await this.allowances.expectAddRow();
  }

  /** A read-only user: no usable "Edit operation", so no way to add one. */
  async expectNewAllowanceUnavailable(): Promise<void> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectAbsentOrDisabled(this.locators.editButton);
  }

  /** Opens step 2 of Edit operation and the row's "Edit allowance". */
  async openAllowanceEdit(type: string): Promise<void> {
    await this.openAllowancesStep();
    await this.allowances.startEdit(type);
  }

  /** Adding an allowance needs Edit operation. Watched for WAIT.PERMISSION_SETTLE — see becomesUsable(). */
  async isNewAllowanceAvailable(): Promise<boolean> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.editButton);
  }

  /** Editing an allowance also needs Edit operation (the grid here is read-only). */
  async isAllowanceEditAvailable(type: string): Promise<boolean> {
    await expect(this.locators.allowanceRow(type)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.editButton);
  }

  /** Done on step 2: leaves Edit operation for the detail page (rows are already saved). */
  async finishEditing(): Promise<void> {
    await pressDone(this.locators.doneButton);
    await expect(this.locators.editButton).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async expectAllowanceRow(type: string, values: AllowanceRowValues = {}): Promise<void> {
    const row = this.locators.allowanceRow(type);
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    const cells = row.getByRole('cell');
    // Columns: Allowance type | Percentage applied | Type default | Override | Why | Active | (Edit)
    if (values.percentage) await expect(cells.nth(1)).toHaveText(values.percentage);
    if (values.override) await expect(cells.nth(3)).toHaveText(values.override);
    if (values.why) await expect(cells.nth(4)).toHaveText(values.why);
  }

  /**
   * No row for `type`. Only meaningful once the grid has rows to show: call it
   * after expectAllowanceRow() on an anchor row, or an empty, still-loading
   * grid would pass it.
   */
  async expectNoAllowanceRow(type: string): Promise<void> {
    await expect(this.locators.allowanceRow(type)).toHaveCount(0);
  }

  async allowancePercentage(type: string): Promise<string> {
    return (await this.locators.allowanceRow(type).getByRole('cell').nth(1).innerText()).trim();
  }

  /**
   * The "Allowances (N)" section: read-only here (no add row); allowances
   * are added through "Edit operation".
   */
  async expectAllowancesSection(): Promise<void> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.SERVER });
    await this.allowances.expectReadOnly();
    await expect(this.locators.editButton).toBeVisible();
  }
}
