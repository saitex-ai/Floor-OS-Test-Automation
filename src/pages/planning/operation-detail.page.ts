import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperationDetailLocators } from '../../locators/planning/operation-detail.locators';
import { detailValue } from '../../locators/planning/form-field.locators';
import { becomesUsable, expectAbsentOrDisabled } from './master-data-list.page';
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
 * the Allowances grid ("Allowances (N) — X% applied, added not
 * compounded"). Owned by the Planning QA. The URL carries the code.
 */
export class OperationDetailPage extends BasePage {
  readonly locators: OperationDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new OperationDetailLocators(page);
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

  /** Every allowance type is already on the operation: "New allowance" is disabled. */
  async expectNewAllowanceDisabled(): Promise<void> {
    await expect(this.locators.newAllowanceButton).toBeDisabled({ timeout: WAIT.SERVER });
  }

  async openNewAllowance(): Promise<void> {
    await this.locators.newAllowanceButton.click();
  }

  async expectNewAllowanceUnavailable(): Promise<void> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expectAbsentOrDisabled(this.locators.newAllowanceButton);
  }

  /**
   * The row's icon-only "Edit": a normal click lands on the `<td>` that
   * wraps it (it intercepts pointer events at the button's centre), so
   * dispatch the click on the button itself.
   */
  async openAllowanceEdit(type: string): Promise<void> {
    await this.locators.allowanceEditButton(type).dispatchEvent('click');
  }

  /** Watched for WAIT.PERMISSION_SETTLE — see becomesUsable(). */
  async isNewAllowanceAvailable(): Promise<boolean> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return becomesUsable(this.locators.newAllowanceButton);
  }

  async isAllowanceEditAvailable(type: string): Promise<boolean> {
    await expect(this.locators.allowanceRow(type)).toBeVisible({ timeout: WAIT.SERVER });
    return becomesUsable(this.locators.allowanceEditButton(type));
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
   * The "Allowances (N)" section with its add action. An operation without
   * allowances may render no table at all, so the grid isn't required.
   */
  async expectAllowancesSection(): Promise<void> {
    await expect(this.locators.allowancesHeading).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.newAllowanceButton).toBeVisible();
  }
}
