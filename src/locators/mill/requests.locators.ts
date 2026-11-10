import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Goods request & approval screen
 * (/mill/requests) — no actions or assertions here, see
 * src/pages/mill/requests.page.ts for those.
 *
 * The request list is filtered by status tabs (All — selected by default
 * — / Pending / In transit / "+n more"; status pills until 2026-11).
 * "Receive Goods" and "Direct transfer" are items in the "More actions"
 * menu (header buttons until 2026-11) and open popups; "New request"
 * opens its own page, /mill/requests/new (a popup until 2026-10-26).
 */
export class RequestsLocators {
  readonly heading: Locator;

  // Status filter tabs (aria-selected marks the selected one)
  readonly allStatusFilter: Locator;
  readonly pendingStatusFilter: Locator;

  // "More actions" menu — its items open popups
  readonly moreActionsButton: Locator;
  readonly receiveGoodsMenuItem: Locator;
  readonly directTransferMenuItem: Locator;

  // Opens the "New request" page (/mill/requests/new)
  readonly newRequestButton: Locator;
  readonly newRequestHeading: Locator;

  // New request page — "Requesting department" is a searchable
  // combobox too (as of 2026-10, was a native <select> as recently as
  // 2026-10-05). The single "From {source}" region for the chosen
  // department's own upstream source has its own material picker
  // (also a searchable combobox), a quantity per picked unit and a
  // "Submit request to {source}" button.
  readonly requestMaterialsCard: Locator;
  readonly requestingDepartmentCombobox: Locator;
  readonly sourceRegions: Locator;
  readonly nothingToPull: Locator;
  readonly valueAboveZeroHint: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Goods request & approval' });

    this.allStatusFilter = page.getByRole('tab', { name: /^All\s*\d/ });
    this.pendingStatusFilter = page.getByRole('tab', { name: /^Pending\s*\d/ });

    this.moreActionsButton = page.getByRole('button', { name: 'More actions' });
    this.receiveGoodsMenuItem = page.getByRole('menuitem', { name: /^Receive Goods/ });
    this.directTransferMenuItem = page.getByRole('menuitem', { name: /^Direct transfer/ });

    this.newRequestButton = page.getByRole('button', { name: /^New request/i });
    this.newRequestHeading = page.getByRole('heading', { level: 1, name: 'New request' });

    this.requestMaterialsCard = page.getByRole('heading', { name: /^Request materials for / });
    this.requestingDepartmentCombobox = page.getByRole('combobox', {
      name: 'Requesting department',
    });
    this.sourceRegions = page.getByRole('region', { name: /^From / });
    this.nothingToPull = page.getByText('Nothing to pull right now');
    this.valueAboveZeroHint = page.getByText('Enter a value above zero.');

    this.toast = page.locator('[data-sonner-toast]');
  }

  /** The "From {source}" region on the New request page. */
  sourceRegion(source: string): Locator {
    return this.page.getByRole('region', { name: `From ${source}` });
  }

  /** The cmdk search popover's option rows — opened by any combobox on this screen (department or material). */
  get comboboxOptions(): Locator {
    return this.page.locator('[cmdk-item]');
  }
}
