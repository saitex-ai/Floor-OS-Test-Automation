import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CreateCustomerLocators } from '../../locators/crm/create-customer.locators';

/** Customers list, under the CRM module (confirmed against the running app). */
const CUSTOMERS_LIST_PATH = '/crm/customers';

/**
 * "Create Customer" (CRM, Sprint 1 user story). Owned by the CRM QA.
 *
 * Element locators live in CreateCustomerLocators (`this.locators`) — this
 * class only holds flows/actions/assertions built on top of them. Two
 * things worth knowing before touching this file:
 *
 * - Country / CRM Stage / Origin Type / Origin / Buyer are custom
 *   comboboxes (a button that opens a popup with an `option`-per-choice
 *   list), not fillable text inputs — use selectComboboxOption(), not
 *   .fill(). Confirmed Country renders its popup as a `dialog`; CRM
 *   Stage opens a dropdown too but wasn't selecting via that same
 *   dialog->option path (observed directly in the running app) — likely
 *   a plain listbox popup with no `dialog` wrapper, not a search-combobox
 *   like Country's. selectComboboxOption() tries both shapes.
 * - "Referred By" is a text field that only appears once Origin Type is
 *   set to "Referral" (matches the user story's acceptance criteria: a
 *   referral-source field is conditionally required on that value).
 */
export interface CustomerProfileDetails {
  name?: string;
  email?: string;
  city?: string;
  country?: string;
  crmStage?: string;
  originType?: string;
  origin?: string;
  buyer?: string;
  referredBy?: string;
  linkedIn?: string;
  facebook?: string;
  instagram?: string;
}

export class CreateCustomerPage extends BasePage {
  readonly locators: CreateCustomerLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CreateCustomerLocators(page);
  }

  async openFromCrmHome(): Promise<void> {
    await this.gotoAuthenticated(CUSTOMERS_LIST_PATH);
    await this.locators.createCustomerEntry.click();
  }

  async fillProfile(details: CustomerProfileDetails): Promise<void> {
    const l = this.locators;
    if (details.name !== undefined) await l.customerNameInput.fill(details.name);
    if (details.email !== undefined) await l.emailInput.fill(details.email);
    if (details.city !== undefined) await l.cityInput.fill(details.city);
    if (details.country !== undefined)
      await this.selectComboboxOption(l.countryCombobox, details.country);
    if (details.crmStage !== undefined)
      await this.selectComboboxOption(l.crmStageCombobox, details.crmStage);
    if (details.originType !== undefined) {
      await this.selectComboboxOption(l.originTypeCombobox, details.originType);
    }
    if (details.origin !== undefined)
      await this.selectComboboxOption(l.originCombobox, details.origin);
    if (details.buyer !== undefined)
      await this.selectComboboxOption(l.buyerCombobox, details.buyer);
    // Only rendered once Origin Type is "Referral" — set that first if this is provided.
    if (details.referredBy !== undefined) await l.referredByInput.fill(details.referredBy);
    if (details.linkedIn !== undefined) await l.linkedInInput.fill(details.linkedIn);
    if (details.facebook !== undefined) await l.facebookInput.fill(details.facebook);
    if (details.instagram !== undefined) await l.instagramInput.fill(details.instagram);
  }

  /**
   * Country / CRM Stage / Origin Type / Origin / Buyer are all triggered
   * the same way, but don't all render their popup the same way underneath
   * — Country's is a search combobox inside a `dialog`; CRM Stage opens a
   * dropdown that doesn't match that same dialog->option path (observed
   * directly, not assumed). Try the `dialog`-scoped option first since
   * that's confirmed for at least one field, and fall back to an
   * unscoped `option` search (a plain listbox popup, no dialog wrapper)
   * for whichever fields turn out to use the other shape. Not a locator
   * per se — a runtime search parameterized by optionText, so it belongs
   * here rather than in CreateCustomerLocators.
   */
  private async selectComboboxOption(trigger: Locator, optionText: string | RegExp): Promise<void> {
    await trigger.click();
    const inDialog = this.page.getByRole('dialog').last().getByRole('option', { name: optionText });
    const anywhere = this.page.getByRole('option', { name: optionText });
    await inDialog.or(anywhere).first().click();
  }

  /**
   * Adds a Business Process/Department row without assigning anyone
   * (TC:4). "Department" and "Assignees" are both comboboxes — same
   * selectComboboxOption() pattern as Country/CRM Stage/etc, not fillable
   * text inputs (confirmed directly: the previous .fill() attempt
   * resolved to the row's "Remove department" button instead, since that
   * button's aria-label also matched a loose /department/i search).
   */
  async addBusinessProcessWithoutAssignee(department: string): Promise<void> {
    await this.locators.addBusinessProcessButton.click();
    const departmentCombobox = this.page.getByRole('combobox', { name: 'Department' }).last();
    await this.selectComboboxOption(departmentCombobox, department);
  }

  async addBusinessProcessWithAssignee(department: string, assignee: string): Promise<void> {
    await this.addBusinessProcessWithoutAssignee(department);
    const assigneeCombobox = this.page.getByRole('combobox', { name: 'Assignees' }).last();
    await this.selectComboboxOption(assigneeCombobox, assignee);
  }

  async linkExistingContact(contactName: string): Promise<void> {
    await this.selectComboboxOption(this.locators.linkContactsCombobox, contactName);
  }

  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /** Matches one of the form's `.crm-error` messages — several can be on screen at once. */
  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectDuplicateWarningVisible(): Promise<void> {
    await expect(this.locators.duplicateWarningModal).toBeVisible();
  }

  async expectSavedSuccessfully(): Promise<void> {
    // The toast (sonner) auto-dismisses in a few seconds — real in a normal
    // run, but too fast to reliably catch once anything slows execution
    // down (confirmed 2026-09-21: every save failed this exact check under
    // Playwright's debug/Inspector pacing, even though the save always
    // actually succeeded — the durable post-save modal, which carries the
    // same success message, was already on screen). That modal alone is
    // sufficient proof of success, so it's the only thing asserted here now.
    await expect(this.locators.postSaveModal).toBeVisible();
  }

  async expectFormSectionsVisible(): Promise<void> {
    await expect(this.locators.profileSection).toBeVisible();
    await expect(this.locators.managementSection).toBeVisible();
    await expect(this.locators.departmentsSection).toBeVisible();
    await expect(this.locators.linkContactsSection).toBeVisible();
  }
}
