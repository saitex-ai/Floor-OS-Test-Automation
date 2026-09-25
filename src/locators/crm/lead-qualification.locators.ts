import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Lead Qualification screen" (CRM, Sprint 4
 * user story) — no actions or assertions here, see
 * src/pages/crm/lead-qualification.page.ts for those.
 *
 * Confirmed against the running app (2026-09-25):
 * - It's a sub-tab of Customer Details ("Lead Qualification", alongside
 *   Overview/Biz Docs/Communication/Contacts), not a separate screen.
 * - The review form is a single, ungated set of fields (Department*,
 *   Manager*, Manager's score* 1-10, Manager's review*) with its own
 *   "Save" button — every saved review appends to a plain list below (no
 *   `<section>`/dialog wrapper), one row per submission.
 * - The four Department options are exactly: Fabric Mill, Merchandise,
 *   Costing, Sales — matching TC:2's "four chips" premise.
 * - Contradicting that premise, though: "Convert Lead to Qualified Lead"
 *   enables after the FIRST saved review, for ANY one department — not
 *   after all four. Confirmed directly (saved one review, checked the
 *   button was no longer `disabled`).
 */
export class LeadQualificationLocators {
  readonly tabButton: Locator;

  readonly departmentCombobox: Locator;
  readonly managerCombobox: Locator;
  readonly scoreRadiogroup: Locator;
  readonly reviewTextbox: Locator;
  readonly saveReviewButton: Locator;

  readonly convertButton: Locator;

  constructor(private readonly page: Page) {
    this.tabButton = page.getByRole('button', { name: 'Lead Qualification', exact: true });

    this.departmentCombobox = page.getByRole('combobox', { name: 'Department', exact: true });
    this.managerCombobox = page.getByRole('combobox', { name: 'Manager', exact: true });
    this.scoreRadiogroup = page.getByRole('radiogroup', { name: "Manager's score" });
    this.reviewTextbox = page.getByRole('textbox', { name: "Manager's review" });
    this.saveReviewButton = page.getByRole('button', { name: 'Save', exact: true });

    this.convertButton = page.getByRole('button', { name: 'Convert Lead to Qualified Lead' });
  }

  scoreRadio(value: number): Locator {
    return this.scoreRadiogroup.getByRole('radio', { name: String(value), exact: true });
  }
}
