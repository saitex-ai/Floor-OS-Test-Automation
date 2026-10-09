import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AttributeValueMasterLocators } from '../../locators/master-data/attribute-value-master.locators';

const ATTRIBUTE_VALUE_MASTER_PATH = '/master-data/inventory-item-management/attribute-values';

export interface AttributeValueFieldValues {
  /** Parent Attribute ID to pick via the nested "Select Parent Attribute" grid picker (e.g. "IAM0000005"). */
  parentAttributeId?: string;
  userAttributeValueCode?: string;
  description?: string;
}

/**
 * The top-level Master Data module's Attribute Value Master screen, under
 * Inventory Item Management
 * (/master-data/inventory-item-management/attribute-values). Owned by the
 * Master Data QA (shared module). Element locators live in
 * AttributeValueMasterLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Source of truth for test cases: test-cases/master-data/
 * attribute-value-master/attribute-value-master-testcases.md. Confirmed
 * live against dev (2026-10-08). Several real, confirmed app behaviors are
 * deliberately asserted as-is (not worked around), per this repo's
 * established discipline:
 * - TC:3 — the edit-save toast is "Attribute value updated" with **no**
 *   trailing period, while the create toast dynamically embeds the new
 *   code and DOES carry one ("Attribute value <CODE> created.") — a real
 *   inconsistency within this one screen.
 * - TC:11 — duplicate User Attribute Value Code (within the same parent
 *   Attribute) is blocked with a generic "Could not create the value"
 *   toast, a third distinct wording across the three Inventory Item
 *   Management screens.
 * - TC:12 — User Attribute Value Code is silently force-uppercased and
 *   capped at 20 characters, with no inline warning for either.
 * - New values created by this session's Admin test user save directly as
 *   "Approved", not "Draft" — not treated as a bug here (flagged instead in
 *   the test-cases file's Notes as an open question about the approval
 *   workflow's real trigger condition).
 */
export class AttributeValueMasterPage extends BasePage {
  readonly locators: AttributeValueMasterLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AttributeValueMasterLocators(page);
  }

  async open(): Promise<void> {
    await this.gotoAuthenticated(ATTRIBUTE_VALUE_MASTER_PATH);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: 60_000 });
    await expect(this.locators.addValueButton).toBeVisible();
  }

  async selectTab(name: 'All' | 'Draft' | 'Approved' | 'Inactive' | 'Rejected'): Promise<void> {
    await this.locators.tab(name).click();
  }

  /**
   * Same settle-after-search fix as the other Inventory Item Management/
   * Master Data grids, plus one more: always clear the box before
   * re-filling, even when filling the same text again.
   *
   * Root-caused via a real, repeatable automation failure: expectRowVisible()/
   * openRowForEdit() both retry by re-calling search() with the SAME text on
   * every attempt. Playwright's `.fill()` sets the value directly — if the
   * value doesn't actually change (identical text re-filled), no new
   * input/change event fires, so the grid's own debounced filter never
   * re-runs. On a genuinely slow or unlucky first attempt (confirmed live:
   * this module's grid has 370+ rows and growing, the largest of the three
   * Inventory Item Management screens), every subsequent "retry" was
   * therefore a no-op against an already-stale result, burning the entire
   * retry budget for nothing. Clearing first guarantees a fresh
   * input/change event — and a fresh debounce cycle — on every call.
   */
  async search(term: string): Promise<void> {
    await this.locators.searchInput.fill('');
    await this.locators.searchInput.fill(term);
    await this.waitForRowsToSettle();
  }

  private async waitForRowsToSettle(): Promise<void> {
    const rows = this.page.getByRole('row');
    let previous = -1;
    for (let i = 0; i < 20; i++) {
      const current = await rows.count();
      if (current === previous) return;
      previous = current;
      await this.page.waitForTimeout(250);
    }
  }

  async openAddValue(): Promise<void> {
    await this.locators.addValueButton.click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /**
   * Searches by code/description/attribute text first, then opens that
   * row's "Edit Value" dialog.
   *
   * Retries the search itself, not just the click — confirmed live this
   * module's grid (370+ seeded rows and growing) can take longer than a
   * single search-debounce cycle to settle on a freshly-created record,
   * especially later in a long sequential run; a bare one-shot
   * search()+click() genuinely timed out against the real dev environment
   * (not a locator-correctness issue) until this was retried the same way
   * expectRowVisible() already does.
   */
  async openRowForEdit(text: string): Promise<void> {
    await expect(async () => {
      await this.search(text);
      await expect(this.locators.row(text)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await this.locators.row(text).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Clicks "Review" on a "Masters needing review" panel item — opens the same "Edit Value" dialog with extra Reject/Approve buttons (TC:7). */
  async openReviewForDraftItem(text: string): Promise<void> {
    await this.locators.reviewListItem(text).getByRole('button', { name: 'Review' }).click();
    await expect(this.locators.dialog).toBeVisible();
  }

  /** Same shared grid-picker shape as Attribute Master's/Product Service Master's "Pick item category" — sourced from Attribute Master's own 28 attributes instead. */
  async pickParentAttribute(attributeId: string): Promise<void> {
    await this.locators.pickParentAttributeButton.click();
    await expect(this.locators.parentAttributePickerDialog).toBeVisible();
    await this.locators.parentAttributeFilterInput.fill(attributeId);
    await expect(this.locators.parentAttributePickerRow(attributeId).first()).toBeVisible();
    await this.locators.parentAttributePickerRow(attributeId).first().click();
    await expect(this.locators.parentAttributePickerDialog).toBeHidden();
  }

  /** Fills whichever fields are provided — `parentAttributeId` and `userAttributeValueCode` are the only two genuinely required (TC:10). */
  async fillForm(values: AttributeValueFieldValues): Promise<void> {
    if (values.parentAttributeId !== undefined)
      await this.pickParentAttribute(values.parentAttributeId);
    if (values.userAttributeValueCode !== undefined)
      await this.locators.userAttributeValueCodeInput.fill(values.userAttributeValueCode);
    if (values.description !== undefined)
      await this.locators.descriptionInput.fill(values.description);
  }

  async create(): Promise<void> {
    await this.locators.createButton.click();
  }

  async saveChanges(): Promise<void> {
    await this.locators.saveChangesButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Clicks "Delete <code>" (top of the Edit Value dialog) then confirms on the nested "cannot be undone" alertdialog — a real, permanent delete (TC:9). */
  async deleteRecord(): Promise<void> {
    await this.locators.deleteButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmButton.click();
  }

  /** Opens the delete confirmation and backs out of it without deleting. */
  async openDeleteThenCancel(): Promise<void> {
    await this.locators.deleteButton.click();
    await expect(this.locators.deleteConfirmDialog).toBeVisible();
    await this.locators.deleteConfirmCancelButton.click();
  }

  /** Clicks a Draft record's "Approve & make active" button in its Review ("Edit Value") dialog. */
  async approveAndMakeActive(): Promise<void> {
    await this.locators.approveAndMakeActiveButton.click();
  }

  /** Clicks a Draft record's "Reject" button in its Review ("Edit Value") dialog. */
  async reject(): Promise<void> {
    await this.locators.rejectButton.click();
  }

  /**
   * Full round trip for the inline per-row deactivate flow (TC:8): click the
   * Status cell's button (e.g. "Approved"), choose "Change to Inactive" from
   * the resulting menu, then confirm on the "Set to Inactive" alertdialog.
   * Confirmed live this is the ONLY working deactivate path on this screen
   * — the Edit dialog's own "Active" checkbox is always checked+disabled.
   */
  async changeRowStatusToInactive(text: string): Promise<void> {
    await this.locators.statusButton(text).click();
    await expect(this.locators.statusMenu).toBeVisible();
    await this.locators.changeToInactiveMenuItem.click();
    await expect(this.locators.changeStatusConfirmDialog).toBeVisible();
    await this.locators.setToInactiveButton.click();
  }

  async selectRowCheckbox(text: string): Promise<void> {
    await this.locators.rowCheckbox(text).check();
  }

  // ---- Field-state inspection (edge/trap cases) --------------------------

  async isParentAttributePickerLocked(): Promise<boolean> {
    return !(await this.locators.pickParentAttributeButton.isEnabled());
  }

  async isActiveCheckboxLocked(): Promise<boolean> {
    const checked = await this.locators.activeCheckbox.isChecked();
    const disabled = await this.locators.activeCheckbox.isDisabled();
    return checked && disabled;
  }

  /** The User Attribute Value Code field's real current value — used to confirm the silent 20-char cap + forced uppercasing (TC:12). */
  async userAttributeValueCodeValue(): Promise<string> {
    return this.locators.userAttributeValueCodeInput.inputValue();
  }

  async descriptionValue(): Promise<string> {
    return this.locators.descriptionInput.inputValue();
  }

  // ---- Assertions ---------------------------------------------------------

  /**
   * Real toast text confirmed live: dynamically embeds the newly-generated
   * Attribute Value Code, e.g. "Attribute value TCAV793145 created." — the
   * only create toast across all three Inventory Item Management screens
   * that interpolates the record's own code rather than using a fixed
   * string.
   *
   * Matched case-insensitively on purpose: User Attribute Value Code is
   * confirmed live (TC:12) to be silently force-uppercased on save, so a
   * `code` argument built with mixed case (e.g. a human-readable test
   * prefix like "TCAVFull...") will render in the real toast fully
   * upper-cased — a plain case-sensitive match against the original input
   * would never find it, confirmed directly by a real automation failure.
   */
  async expectCreatedToast(code: string | RegExp = /.+/): Promise<void> {
    const pattern =
      typeof code === 'string'
        ? new RegExp(`Attribute value ${escapeRegExp(code)} created\\.`, 'i')
        : new RegExp(
            `Attribute value ${code.source} created\\.`,
            code.flags.includes('i') ? code.flags : `${code.flags}i`,
          );
    await expect(this.page.getByText(pattern)).toBeVisible({ timeout: 15_000 });
  }

  /** Real toast text confirmed live: "Attribute value updated" — no trailing period (inconsistent with the create toast above). */
  async expectUpdatedToast(): Promise<void> {
    await expect(this.page.getByText('Attribute value updated', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live: "Attribute value deleted." */
  async expectDeletedToast(): Promise<void> {
    await expect(this.page.getByText('Attribute value deleted.', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  /** Real toast text confirmed live on the inline "Change to Inactive" flow: "Attribute value status updated." */
  async expectStatusUpdatedToast(): Promise<void> {
    await expect(
      this.page.getByText('Attribute value status updated.', { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Real toast text confirmed live on a duplicate User Attribute Value Code
   * (within the same parent Attribute): "Could not create the value" — the
   * dialog stays open with the entered data intact (TC:11's documented gap).
   */
  async expectCreateFailedToast(): Promise<void> {
    await expect(this.page.getByText('Could not create the value', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
  }

  async expectRequiredErrorCount(count: number): Promise<void> {
    await expect(this.locators.requiredError).toHaveCount(count);
  }

  async expectRowVisible(text: string): Promise<void> {
    await expect(async () => {
      await this.search(text);
      await expect(this.locators.row(text)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
  }

  /**
   * Searches by `searchTerm` then asserts the row uniquely identified by
   * `uniqueMatchText` (e.g. this record's own code) is among the results.
   *
   * Safer than calling expectRowVisible(searchTerm) directly when
   * searchTerm is a shared value, not a unique one — confirmed live
   * searching by a common parent Attribute name like "Composition" matches
   * 50+ existing rows at once, and row()'s own locator (built to match any
   * cell containing the search text) then throws a strict-mode violation
   * on toBeVisible() rather than a clean pass/fail (TC:4's "search by
   * attribute name" case).
   */
  async expectRowVisibleAfterSearch(searchTerm: string, uniqueMatchText: string): Promise<void> {
    await expect(async () => {
      await this.search(searchTerm);
      await expect(this.locators.row(uniqueMatchText)).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
  }

  async expectRowNotVisible(text: string): Promise<void> {
    await this.search(text);
    await expect(this.locators.row(text)).toHaveCount(0);
  }

  async expectRowStatus(text: string, status: string): Promise<void> {
    await this.search(text);
    await expect(this.locators.statusButton(text)).toHaveText(status);
  }

  /** The "Masters needing review" region is visible with a heading mentioning the live Draft count. */
  async expectReviewRegionVisible(): Promise<void> {
    await expect(this.locators.reviewRegion).toBeVisible();
  }

  /** A given "Masters needing review" item shows its three inline quick actions. */
  async expectReviewItemHasQuickActions(text: string): Promise<void> {
    const item = this.locators.reviewListItem(text);
    await expect(item.getByRole('button', { name: 'Review' })).toBeVisible();
    await expect(item.getByRole('button', { name: 'Reject' })).toBeVisible();
    await expect(item.getByRole('button', { name: 'Make active' })).toBeVisible();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
