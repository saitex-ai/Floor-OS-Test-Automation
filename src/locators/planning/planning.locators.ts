import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Planning module's landing view — no
 * actions or assertions here, see src/pages/planning/planning.page.ts for those.
 */
export class PlanningLocators {
  readonly heading: Locator;

  constructor(page: Page) {
    // Confirmed live 2026-09-25: the landing view's real heading is an
    // <h2> ("Planning" / "Select a screen from the left navigation.") —
    // a level-1 heading never appears here. Same wrong-guess shape as the
    // identical Master Data stub bug (see agent-notes/master-data-module.md's
    // "Landing view" section) — the old level:1 guess could never have
    // matched, ever, regardless of timing.
    this.heading = page.getByRole('heading', { name: 'Planning', level: 2 });
  }
}
