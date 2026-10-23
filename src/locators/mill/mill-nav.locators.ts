import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Fabric Mill navigation — the panel holding
 * the mill's own links (Spinning, Preparation, ...).
 *
 * New design (2026-10-23): an always-open sidebar, a complementary landmark
 * named "Fabric Mill". Before that: a drawer, the complementary
 * "Navigation", opened by the shell's "Open navigation" button —
 * openViaNav() still handles that if it ever reappears. Both names are
 * matched, and only a visible link is used.
 *
 * Links are scoped to that panel on purpose: an unscoped "Spinning" link
 * also matches the home page's "Cotton in Spinning" stock tile.
 */
export class MillNavLocators {
  readonly openNavigationButton: Locator;
  readonly navigationPanel: Locator;

  constructor(page: Page) {
    this.openNavigationButton = page.getByRole('button', { name: 'Open navigation' });
    this.navigationPanel = page.getByRole('complementary', { name: /^(Fabric Mill|Navigation)$/ });
  }

  link(label: string): Locator {
    return this.navigationPanel
      .getByRole('link', { name: label, exact: true })
      .filter({ visible: true })
      .first();
  }
}
