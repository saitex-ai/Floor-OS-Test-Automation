import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for Planning > Master Data > Qualifications list
 * (/planning/master-data/qualifications). No actions or assertions here,
 * see src/pages/planning/qualifications-list.page.ts for those.
 */
export class QualificationsListLocators {
  readonly heading: Locator;
  readonly newQualificationButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Qualifications' });
    this.newQualificationButton = page.getByRole('button', { name: 'New qualification' });
  }
}
