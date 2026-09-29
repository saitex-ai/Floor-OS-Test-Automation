import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { LeadQualificationLocators } from '../../locators/crm/lead-qualification.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Lead Qualification screen" (CRM, Sprint 4 user story). Owned by the
 * CRM QA. Confirmed against the running app (2026-09-25) — see
 * LeadQualificationLocators' class doc for the corrections that made to
 * the original ClickUp text (notably: Convert enables after the FIRST
 * saved department review, not after all four; the Manager combobox isn't
 * actually filtered by Department; editing a review requires its own
 * "Edit review" button — resubmitting the top form duplicates instead).
 *
 * TC:2's "stage-log entry (actor/timestamp/trigger)", "notification
 * broadcast", and "green completion banner naming the conversion date and
 * acting user" were all checked for directly against a real conversion
 * (screenshots + full-body text dumps, immediately after the click and
 * polled for several seconds after) and **none of the three were
 * observed** — not on the Lead Qualification tab, not on the Customer's
 * Overview tab (which does show generic "Updated On"/"Updated By" fields,
 * but nothing naming the Lead Qualification conversion as the trigger),
 * and not in the shell's notification panel ("No notifications yet.",
 * same empty state qualified-lead-to-prospect.page.ts found for its own
 * conversion notification). What IS real and CRM-observable: the header
 * stage label and Overview's "CRM Stage" field both flip to "Qualified
 * Lead", and the saved review row(s) remain visible, unchanged, after
 * conversion (audit-relevant records are NOT wiped). See the spec file
 * for exactly which slice of TC:2 is asserted for real vs. `test.fixme()`'d.
 */
export interface QualificationReview {
  department: string;
  manager: string;
  score: number;
  review: string;
}

export class LeadQualificationPage extends BasePage {
  readonly locators: LeadQualificationLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new LeadQualificationLocators(page);
  }

  async openFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.tabButton.click();
  }

  private async selectComboboxOption(name: string, optionText: string): Promise<void> {
    const trigger =
      name === 'Department' ? this.locators.departmentCombobox : this.locators.managerCombobox;
    await trigger.click();
    await this.page.getByRole('option', { name: optionText, exact: true }).click();
  }

  /** Submits one department review — the minimum needed to unlock Convert. */
  async submitReview(details: QualificationReview): Promise<void> {
    await this.selectComboboxOption('Department', details.department);
    await this.selectComboboxOption('Manager', details.manager);
    await this.locators.scoreRadio(details.score).check();
    await this.locators.reviewTextbox.fill(details.review);
    await this.locators.saveReviewButton.click();
  }

  /** Attempts a Save with whatever fields are currently blank — used for TC:4. */
  async attemptSaveBlank(): Promise<void> {
    await this.locators.saveReviewButton.click();
  }

  /**
   * Edits the most-recently-saved review row in place (its "Edit review"
   * button, newest first) — the only real way to update an existing
   * review without creating a duplicate. See the class doc/locators'
   * class doc for why resubmitting the top form instead duplicates.
   */
  async editMostRecentReview(details: { score: number; review: string }): Promise<void> {
    await this.locators.editReviewButtons.first().click();
    const row = this.locators.editingRowContainer();
    const cancelButton = row.getByRole('button', { name: 'Cancel', exact: true });
    await row.getByRole('radio', { name: String(details.score), exact: true }).check();
    await row.getByRole('textbox').fill(details.review);
    await row.getByRole('button', { name: 'Save', exact: true }).click();
    // The row shows a transient "Saving…" state before collapsing back to
    // its read view (confirmed directly) — reading it immediately catches
    // that mid-transition, so wait for the edit widget to actually close.
    await cancelButton.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  async expectReviewCount(n: number): Promise<void> {
    const pattern = n === 0 ? /No reviews yet/ : new RegExp(`^${n} review\\(s\\) saved`);
    await expect(this.locators.reviewsSummaryText).toHaveText(pattern);
  }

  /** Asserts a saved row renders with an avatar, department chip, score, and review text — TC:1's expected result. */
  async expectReviewRowVisible(details: QualificationReview): Promise<void> {
    const row = this.page.getByText(details.review, { exact: false }).locator('..');
    await expect(row).toContainText(details.manager);
    await expect(row).toContainText(details.department);
    await expect(row).toContainText(`${details.score} / 10`);
  }

  async expectFieldValidationErrors(): Promise<void> {
    await expect(this.locators.departmentSelectError).toBeVisible();
    await expect(this.locators.managerSelectError).toBeVisible();
    await expect(this.locators.scoreError).toBeVisible();
    await expect(this.locators.reviewError).toBeVisible();
    await expect(this.locators.departmentCombobox).toHaveAttribute('aria-invalid', 'true');
    await expect(this.locators.managerCombobox).toHaveAttribute('aria-invalid', 'true');
    await expect(this.locators.reviewTextbox).toHaveAttribute('aria-invalid', 'true');
  }

  async expectConvertEnabled(): Promise<void> {
    await expect(this.locators.convertButton).toBeEnabled();
  }

  /**
   * Zero-review Lead, logged in as a Manager: Convert is genuinely
   * HTML-disabled, and hovering it raises a real tooltip explaining why
   * (confirmed a real Radix tooltip — zero role=tooltip matches before
   * hover, exactly one after).
   */
  async expectConvertDisabledWithRequirementNote(): Promise<void> {
    await expect(this.locators.convertButton).toBeDisabled();
    await this.locators.convertButton.hover({ force: true });
    await expect(this.locators.convertRequirementNote).toBeVisible();
    await expect(this.locators.convertRequirementNote).toHaveText(
      "At least one Manager's Review and Score must exist.",
    );
  }

  /** Logged in as an Executive: the Convert button doesn't render at all — replaced by an explicit role-restriction note. */
  async expectConvertLockedForExecutive(): Promise<void> {
    await expect(this.locators.convertButton).toHaveCount(0);
    await expect(this.locators.convertRestrictionNote).toBeVisible();
  }

  async convertToQualifiedLead(): Promise<void> {
    await this.locators.convertButton.click();
  }

  /** The Customer Details header's own CRM Stage text — confirmed against the running app: reads "Qualified Lead Active ..." right after a successful conversion. */
  async expectStageIsQualifiedLead(): Promise<void> {
    await expect(this.page.getByText(/^Qualified Lead\b/).first()).toBeVisible();
  }

  /** The AI-dossier panel's empty state — visible for any Lead with no dossier yet (see class doc: this is the one genuinely reachable empty state, since the tab itself is absent once CRM Stage moves past Lead). */
  async expectNoDossierEmptyState(): Promise<void> {
    await expect(this.locators.noDossierHeading).toBeVisible();
    await expect(this.locators.noDossierParagraph).toBeVisible();
  }

  /** The reviews list's own empty state, for a genuinely fresh Lead with zero saved reviews. */
  async expectNoReviewsEmptyState(): Promise<void> {
    await expect(this.locators.reviewsSummaryText).toHaveText(/No reviews yet/);
  }
}
