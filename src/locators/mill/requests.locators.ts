import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Goods request & approval screen
 * (/mill/requests) — no actions or assertions here, see
 * src/pages/mill/requests.page.ts for those.
 *
 * Since the 2026-09 redesign, an approver (mill:requests:approve) sees
 * Approvals (default) / Direct transfer tabs, with "New request" and
 * "Receive goods" as buttons that open a popup dialog — not tabs. The
 * Approvals tab shows a single unified list of requests (Request /
 * Status / For / Transfer to / Raised columns); there is no separate
 * "Cleared" archive.
 */
export class RequestsLocators {
  readonly heading: Locator;

  // Tabs
  readonly approvalsTab: Locator;
  readonly directTransferTab: Locator;

  // Opens the "New request" popup dialog
  readonly newRequestButton: Locator;
  readonly newRequestDialog: Locator;

  // New request dialog — "Requesting department" is a searchable
  // combobox too (as of 2026-10, was a native <select> as recently as
  // 2026-10-05). The single "From {source}" region for the chosen
  // department's own upstream source has its own material picker
  // (also a searchable combobox), quantity and Add button.
  readonly requestMaterialsCard: Locator;
  readonly requestingDepartmentCombobox: Locator;
  readonly sourceRegions: Locator;
  readonly nothingToPull: Locator;
  readonly valueAboveZeroHint: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Goods request & approval' });

    this.approvalsTab = page.getByRole('tab', { name: /^Approvals/ });
    this.directTransferTab = page.getByRole('tab', { name: /^Direct transfer/ });

    this.newRequestButton = page.getByRole('button', { name: /^New request/i });
    this.newRequestDialog = page.getByRole('dialog');

    this.requestMaterialsCard = page.getByRole('heading', { name: /^Request materials for / });
    this.requestingDepartmentCombobox = page.getByRole('combobox', { name: 'Requesting department' });
    this.sourceRegions = page.getByRole('region', { name: /^From / });
    this.nothingToPull = page.getByText('Nothing to pull right now');
    this.valueAboveZeroHint = page.getByText('Enter a value above zero.');

    this.toast = page.locator('[data-sonner-toast]');
  }

  /** The "From {source}" region on the New request popup. */
  sourceRegion(source: string): Locator {
    return this.page.getByRole('region', { name: `From ${source}` });
  }

  /** The cmdk search popover's option rows — opened by any combobox on this screen (department or material). */
  get comboboxOptions(): Locator {
    return this.page.locator('[cmdk-item]');
  }
}
