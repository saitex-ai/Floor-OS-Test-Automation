import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Fabric Mill navigation drawer — the
 * shell's "Open navigation" button opens a complementary "Navigation"
 * panel holding the mill's own links (Spinning, Preparation, ...).
 * Links are scoped to that panel on purpose: an unscoped "Spinning"
 * link also matches the home page's "Cotton in Spinning" stock tile.
 */
export class MillNavLocators {
  readonly openNavigationButton: Locator;
  readonly navigationPanel: Locator;

  constructor(page: Page) {
    this.openNavigationButton = page.getByRole('button', { name: 'Open navigation' });
    this.navigationPanel = page.getByRole('complementary', { name: 'Navigation' });
  }

  link(label: string): Locator {
    return this.navigationPanel.getByRole('link', { name: label, exact: true });
  }
}
