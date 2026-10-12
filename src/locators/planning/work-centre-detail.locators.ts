import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for a work centre's read-only detail page
 * (/planning/master-data/work-centres/<uuid>). Values are read with
 * `detailValue(page, label)` (form-field.locators.ts). No actions or
 * assertions here, see src/pages/planning/work-centre-detail.page.ts.
 */
export class WorkCentreDetailLocators {
  readonly allWorkCentresLink: Locator;
  readonly heading: Locator;
  readonly editButton: Locator;
  readonly summary: Locator;
  readonly accessRestricted: Locator;

  constructor(page: Page) {
    this.allWorkCentresLink = page.getByRole('link', { name: 'All work centres' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.editButton = page.getByRole('button', { name: 'Edit work centre' });
    this.summary = page.getByRole('main').last();
    this.accessRestricted = page.getByText(/Access restricted/i);
  }
}
