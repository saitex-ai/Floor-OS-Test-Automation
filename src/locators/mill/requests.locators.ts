import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Goods request & approval screen
 * (/mill/requests) — no actions or assertions here, see
 * src/pages/mill/requests.page.ts for those.
 *
 * An approver (mill:requests:approve) sees Approvals (default) / New
 * request / Direct transfer / Receive goods; everyone else sees New
 * request / Receive goods / My requests. "Cleared" is not a tab — it's
 * a caption over the archive list inside Approvals (or My requests).
 */
export class RequestsLocators {
  readonly heading: Locator;

  // Tabs
  readonly approvalsTab: Locator;
  readonly newRequestTab: Locator;
  readonly receiveGoodsTab: Locator;

  // New request tab — each source ("From Cotton", "From Spinning", ...)
  // is its own region with its own material picker, quantity and Add.
  readonly requestMaterialsCard: Locator;
  readonly requestingDepartmentSelect: Locator;
  readonly sourceRegions: Locator;
  readonly nothingToPull: Locator;
  readonly valueAboveZeroHint: Locator;

  // Approvals tab — archive rows under "Cleared", e.g. "Fulfilled REQ-2026-000019 …"
  readonly clearedRows: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Goods request & approval' });

    this.approvalsTab = page.getByRole('tab', { name: /^Approvals/ });
    this.newRequestTab = page.getByRole('tab', { name: /^New request/ });
    this.receiveGoodsTab = page.getByRole('tab', { name: /^Receive goods/ });

    this.requestMaterialsCard = page.getByRole('heading', { name: /^Request materials for / });
    this.requestingDepartmentSelect = page.getByLabel('Requesting department');
    this.sourceRegions = page.getByRole('region', { name: /^From / });
    this.nothingToPull = page.getByText('Nothing to pull right now');
    this.valueAboveZeroHint = page.getByText('Enter a value above zero.');

    this.clearedRows = page.getByRole('button', {
      name: /^(Fulfilled|Rejected|Closed short|In transit) REQ-/,
    });

    this.toast = page.locator('[data-sonner-toast]');
  }

  /** The "From {source}" region on the New request tab. */
  sourceRegion(source: string): Locator {
    return this.page.getByRole('region', { name: `From ${source}` });
  }
}
