import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { RecipeDetailLocators } from '../../locators/planning/recipe-detail.locators';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { WAIT } from './waits';

/**
 * A recipe's detail page — read-only summary, Edit recipe / Send for
 * approval / Delete draft, and the Operations table. Owned by the
 * Planning QA. Totals are computed from the operations, never typed:
 * the heading reads "Operations (N) — the source of the X min total".
 */
export class RecipeDetailPage extends BasePage {
  readonly locators: RecipeDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new RecipeDetailLocators(page);
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

  /** A read-only user can't edit the recipe, add an operation or edit one. */
  async expectReadOnly(operation?: string): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.editRecipeButton);
    await expectAbsentOrDisabled(this.locators.newOperationButton);
    if (operation) await expectAbsentOrDisabled(this.locators.operationEditButton(operation));
  }

  /** A read-only user can't edit the recipe itself (no working "Edit recipe"). */
  async expectNoEditRecipe(): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.editRecipeButton);
  }

  async expectNoNewOperation(): Promise<void> {
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
    await expectAbsentOrDisabled(this.locators.newOperationButton);
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

  async expectOperationsHeading(count: number, totalMinutes?: number): Promise<void> {
    const name =
      totalMinutes === undefined
        ? new RegExp(`^Operations \\(${count}\\)`)
        : new RegExp(`^Operations \\(${count}\\) — the source of the ${totalMinutes} min total`);
    await expect(this.page.getByRole('heading', { name })).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectRisksPresentedAsBuffers(): Promise<void> {
    await expect(this.locators.risksHeading).toBeVisible();
    await expect(this.locators.risksHelp).toBeVisible();
  }

  async openNewOperation(): Promise<void> {
    await this.locators.newOperationButton.click();
  }

  async openOperationForEdit(name: string): Promise<void> {
    await this.locators.operationEditButton(name).click();
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

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.locators.operationsHeading).toBeVisible({ timeout: WAIT.NAVIGATION });
  }
}
