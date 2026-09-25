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
 * saved department review, not after all four).
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

  async expectConvertEnabled(): Promise<void> {
    await expect(this.locators.convertButton).toBeEnabled();
  }

  async convertToQualifiedLead(): Promise<void> {
    await this.locators.convertButton.click();
  }

  /** The Customer Details header's own CRM Stage text — confirmed against the running app: reads "Qualified Lead Active ..." right after a successful conversion. */
  async expectStageIsQualifiedLead(): Promise<void> {
    await expect(this.page.getByText(/^Qualified Lead\b/).first()).toBeVisible();
  }
}
