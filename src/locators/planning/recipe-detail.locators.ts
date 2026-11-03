import { type Locator, type Page } from '@playwright/test';
import { fieldHelp } from './form-field.locators';

/**
 * Raw element locators for a recipe's detail page
 * (/planning/master-data/recipes/<id>): the header actions, the read-only
 * summary (totals, risks, links, versions) and the Operations table. The
 * New/Edit operation form replaces the table in place — see
 * OperationFormLocators. No actions or assertions here, see
 * src/pages/planning/recipe-detail.page.ts for those.
 */
export class RecipeDetailLocators {
  readonly allRecipesLink: Locator;
  readonly editRecipeButton: Locator;
  readonly sendForApprovalButton: Locator;
  readonly deleteDraftButton: Locator;
  readonly deleteDraftDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly summary: Locator;
  readonly approvalPrerequisites: Locator;
  readonly risksHeading: Locator;
  readonly risksHelp: Locator;
  readonly operationsHeading: Locator;
  readonly operationsSearch: Locator;
  /** Edit recipe's step 2 in its "Steps" list. */
  readonly operationsStep: Locator;
  readonly doneButton: Locator;
  readonly operationsTable: Locator;

  constructor(private readonly page: Page) {
    this.allRecipesLink = page.getByRole('link', { name: 'All recipes' });
    this.editRecipeButton = page.getByRole('button', { name: 'Edit recipe' });
    this.sendForApprovalButton = page.getByRole('button', { name: 'Send for approval' });
    this.deleteDraftButton = page.getByRole('button', { name: 'Delete draft' });
    this.deleteDraftDialog = page.getByRole('alertdialog', { name: /Delete draft/ });
    this.confirmDeleteButton = this.deleteDraftDialog.getByRole('button', { name: 'Delete draft' });
    this.summary = page.getByRole('main').last();
    this.approvalPrerequisites = page.getByText(/^Before it can be sent for approval/);
    this.risksHeading = page.getByRole('heading', { name: 'Known risks it carries' });
    // A tooltip button's name since the 2026-10-28 dev deploy (was an inline line).
    this.risksHelp = fieldHelp(page, /named, visible buffers? instead of informal padding/);
    this.operationsHeading = page.getByRole('heading', { name: /^Operations \(\d+\)/ });
    this.operationsSearch = page.getByRole('searchbox', { name: /^Search operations/ });
    this.operationsStep = page.getByRole('list', { name: 'Steps' }).getByRole('button', {
      name: /^Operations/,
    });
    this.doneButton = page.getByRole('button', { name: 'Done', exact: true });
    this.operationsTable = page.getByRole('table').filter({
      has: page.getByRole('columnheader', { name: 'Step' }),
    });
  }

  /** An operation row, matched on its Operation cell's exact text. */
  operationRow(name: string): Locator {
    return this.operationsTable.getByRole('row').filter({
      has: this.page.getByRole('cell', { name, exact: true }),
    });
  }

  operationEditButton(name: string): Locator {
    return this.operationRow(name).getByRole('button', { name: 'Edit operation', exact: true });
  }

  /** Saved operation rows: not the header, the add row or the empty-grid message. */
  operationDataRows(): Locator {
    return this.operationsTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') })
      .filter({ hasNot: this.page.getByRole('button', { name: 'Add operation' }) })
      .filter({ hasNotText: /^No operations/ });
  }
}
