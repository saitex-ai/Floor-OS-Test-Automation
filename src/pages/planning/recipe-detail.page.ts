import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { RecipeDetailLocators } from '../../locators/planning/recipe-detail.locators';
import { detailValue } from '../../locators/planning/form-field.locators';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { InlineTable } from './inline-table';
import { pressDone } from './form-submit';
import { WAIT } from './waits';

/**
 * A recipe's detail page — read-only summary, Edit recipe / Send for
 * approval / Delete draft, and the read-only Operations table (operations
 * are added and edited on step 2 of Edit recipe since the 2026-10-28 dev
 * deploy — see OperationFormPage). Owned by the Planning QA. Totals are computed from the operations, never typed:
 * the heading reads "Operations (N) — the source of the X min total".
 */
export class RecipeDetailPage extends BasePage {
  readonly locators: RecipeDetailLocators;
  readonly operations: InlineTable;

  constructor(page: Page) {
    super(page);
    this.locators = new RecipeDetailLocators(page);
    this.operations = new InlineTable(page, 'Operations', 'operation');
  }

  /** After "Create recipe": the code dev generated (RCP-0001…), read from the new detail page. */
  async createdCode(): Promise<string> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/recipes\/(?!new$)[\w-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    const code = detailValue(this.page, 'Code');
    await expect(code).toHaveText(/^[A-Z][A-Z0-9_]*-\d+$/, { timeout: WAIT.NAVIGATION });
    return (await code.innerText()).trim();
  }

  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/recipes\/[\w-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expect(this.page.getByText(code, { exact: true }).first()).toBeVisible();
  }

  /**
   * A draft saves with just code + name; the detail page lists the rest:
   * "Before it can be sent for approval, fill in: …. Add at least one active operation."
   */
  async expectApprovalPrerequisites(items: string[]): Promise<void> {
    for (const item of items) {
      await expect(this.locators.approvalPrerequisites).toContainText(item);
    }
  }

  async expectNoApprovalPrerequisite(item: string): Promise<void> {
    await expect(this.locators.approvalPrerequisites).toBeVisible();
    await expect(this.locators.approvalPrerequisites).not.toContainText(item);
  }

  /**
   * A read-only user can't edit the recipe, add an operation or edit one —
   * all three go through "Edit recipe" since the 2026-10-28 dev deploy, and
   * the Operations grid here has no add row or row Edit.
   */
  async expectReadOnly(operation?: string): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.editRecipeButton);
    await this.operations.expectReadOnly();
    if (operation) await expectAbsentOrDisabled(this.locators.operationEditButton(operation));
  }

  /** A read-only user can't edit the recipe itself (no working "Edit recipe"). */
  async expectNoEditRecipe(): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.editRecipeButton);
  }

  /** Adding an operation needs Edit recipe (the grid here is read-only). */
  async expectNoNewOperation(): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.editRecipeButton);
  }

  async startEditing(): Promise<void> {
    await this.locators.editRecipeButton.click();
  }

  async expectEditRecipeAvailable(): Promise<void> {
    await expect(this.locators.editRecipeButton).toBeVisible();
  }

  async expectSummaryContains(text: string | RegExp): Promise<void> {
    await expect(this.locators.summary).toContainText(text);
  }

  async expectSummaryLacks(text: string | RegExp): Promise<void> {
    await expect(this.locators.summary).not.toContainText(text);
  }

  /** "Total duration (min)" value in the summary, e.g. "30" or "—". */
  async totalDuration(): Promise<string> {
    const text = await this.locators.summary.innerText();
    return text.match(/Total duration \(min\)\s*([^\s]+)/)?.[1] ?? '';
  }

  /** "Standard minutes / unit" value in the summary, e.g. "6" or "—". */
  async standardMinutes(): Promise<string> {
    const text = await this.locators.summary.innerText();
    return text.match(/Standard minutes \/ \w+\s*([^\s]+)/)?.[1] ?? '';
  }

  /**
   * "Operations (N)", and with `totalMinutes` the recipe's "Total duration
   * (min)". The heading said "— the source of the X min total" until the
   * 2026-10-28 dev deploy; the total is now only in the summary, so this
   * leaves step 2 of Edit recipe with Done (rows are already saved) to read it.
   */
  async expectOperationsHeading(count: number, totalMinutes?: number): Promise<void> {
    await expect(
      this.page.getByRole('heading', { name: new RegExp(`^Operations \\(${count}\\)`) }),
    ).toBeVisible({ timeout: WAIT.SERVER });
    if (totalMinutes === undefined) return;
    if (/\/edit$/.test(new URL(this.page.url()).pathname)) await this.finishEditing();
    await expect
      .poll(() => this.totalDuration(), { timeout: WAIT.SERVER })
      .toBe(String(totalMinutes));
  }

  async expectRisksPresentedAsBuffers(): Promise<void> {
    await expect(this.locators.risksHeading).toBeVisible();
    await expect(this.locators.risksHelp).toBeVisible();
  }

  /**
   * Operations are added on step 2 of Edit recipe: opens it there (if not
   * already), with the add row ready.
   */
  async openNewOperation(): Promise<void> {
    if (!(await this.operations.locators.addButton.isVisible())) {
      await this.locators.editRecipeButton.click();
      await expect(this.page).toHaveURL(/\/recipes\/[^/]+\/edit$/, { timeout: WAIT.NAVIGATION });
      await this.locators.operationsStep.click();
    }
    await this.operations.expectAddRow();
  }

  /** Opens step 2 of Edit recipe and the row's "Edit operation". */
  async openOperationForEdit(name: string): Promise<void> {
    await this.openNewOperation();
    await this.locators.operationEditButton(name).click();
    await expect(this.operations.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** Done on step 2: leaves Edit recipe for the detail page (rows are already saved). */
  async finishEditing(): Promise<void> {
    await pressDone(this.locators.doneButton);
    await expect(this.locators.editRecipeButton).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  async searchOperations(term: string): Promise<void> {
    await this.locators.operationsSearch.fill(term);
  }

  async expectOperationRow(name: string): Promise<void> {
    await expect(this.locators.operationRow(name)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoOperationRow(name: string): Promise<void> {
    await expect(this.locators.operationRow(name)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** An operation saved without a name lists as "Not named yet". */
  async expectUnnamedOperationRow(): Promise<void> {
    await expect(
      this.locators.operationsTable.getByRole('row').filter({ hasText: 'Not named yet' }).first(),
    ).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectOperationRowContains(name: string, text: string | RegExp): Promise<void> {
    await expect(this.locators.operationRow(name)).toContainText(text);
  }

  async operationRowCount(): Promise<number> {
    return this.locators.operationDataRows().count();
  }

  /** A recipe-level total is never an editable control on this page. */
  async expectTotalsReadOnly(): Promise<void> {
    await expect(
      this.page.getByRole('textbox', { name: /total duration|standard minutes \/|total sam/i }),
    ).toHaveCount(0);
  }

  async deleteDraft(): Promise<void> {
    await this.locators.deleteDraftButton.click();
    await this.locators.confirmDeleteButton.click();
    await expect(this.locators.deleteDraftDialog).toHaveCount(0);
  }

  /**
   * Reloads the recipe's detail page. From step 2 of Edit recipe it leaves
   * with Done first (rows are already saved; a reload there reopens step 1).
   */
  async reload(): Promise<void> {
    if (/\/edit$/.test(new URL(this.page.url()).pathname)) await this.finishEditing();
    await this.page.reload();
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
  }
}
