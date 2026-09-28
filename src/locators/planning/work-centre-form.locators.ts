import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "New work centre" create form
 * (/planning/master-data/work-centres/new) — a much larger form than this
 * app's other Master Data screens (21 fields), most of them optional. No
 * actions or assertions here, see src/pages/planning/work-centre-form.page.ts
 * for those.
 *
 * The 5 fields confirmed live (2026-09-25) to actually block save if left
 * unset — everything else on this form has a sensible default or is
 * genuinely optional: Owning department, What it is used for, How
 * capacity is measured, Capacity unit, Status. All five open as a real
 * `role=option` listbox when clicked (Owning department's is wrapped in a
 * `dialog` since it's live-sourced from the Departments master, sourced
 * the same way as Employees' own Department field — see
 * agent-notes/master-data-module.md — but unlike that field, this one DOES
 * use role=option, not plain buttons, so a normal option-name locator
 * works directly here).
 */
export class WorkCentreFormLocators {
  readonly centreCode: Locator;
  readonly name: Locator;
  readonly owningDepartment: Locator;
  readonly usedFor: Locator;
  readonly capacityMeasuredBy: Locator;
  readonly capacityUnit: Locator;
  readonly status: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.centreCode = page.getByRole('textbox', { name: 'Centre code' });
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.owningDepartment = page.getByRole('combobox', { name: 'Owning department', exact: true });
    this.usedFor = page.getByRole('combobox', { name: 'What it is used for', exact: true });
    this.capacityMeasuredBy = page.getByRole('combobox', {
      name: 'How capacity is measured',
      exact: true,
    });
    this.capacityUnit = page.getByRole('combobox', { name: 'Capacity unit', exact: true });
    this.status = page.getByRole('combobox', { name: 'Status', exact: true });
    this.createButton = page.getByRole('button', { name: 'Create work centre' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  /** An option inside whichever combobox popover is currently open. */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
