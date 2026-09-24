import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Finishing production screen
 * (/mill/finishing) — no actions or assertions here, see
 * src/pages/mill/finishing.page.ts for those.
 */
export class FinishingLocators {
  readonly heading: Locator;

  // Tabs
  readonly consumeInputsTab: Locator;
  readonly recordOutputTab: Locator;
  readonly ordersTab: Locator;

  // Consume inputs tab
  readonly finishingOrderCard: Locator;
  readonly greigeRollCard: Locator;

  // Record output tab
  readonly finishedLengthInput: Locator;
  readonly doffToQcButton: Locator;

  // Orders tab
  readonly finishingOrdersCard: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'Finishing' });

    this.consumeInputsTab = page.getByRole('tab', { name: /^Consume inputs/ });
    this.recordOutputTab = page.getByRole('tab', { name: /^Record output/ });
    this.ordersTab = page.getByRole('tab', { name: /^Orders/ });

    this.finishingOrderCard = page.getByRole('heading', { name: 'Finishing order', exact: true });
    this.greigeRollCard = page.getByRole('heading', { name: 'Greige roll' });

    this.finishedLengthInput = page.getByLabel('Finished length');
    this.doffToQcButton = page.getByRole('button', { name: /^Doff & put away/ });

    this.finishingOrdersCard = page.getByRole('heading', { name: 'Finishing orders' });
  }
}
