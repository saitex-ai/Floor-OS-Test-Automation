import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — External Events List screen (Sprint 3).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abu9fa.
 * Confirmed against the running app (2026-09-25) — see
 * external-events.locators.ts's class doc for the corrections that made:
 * notably, "AI Relevance" is a real, sortable column but hidden by
 * default (must be toggled on via Configure Columns), and only 4 of the
 * 6 status tabs render as top-level buttons — Not Attending/Elapsed sit
 * behind a "+2 more" menu.
 */
test.describe('CRM - External Events List screen', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('External Events List screen');
    await allure.owner('CRM QA');
  });

  test('TC:1 Navigate to External Events', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fb', 'TC:1 (ClickUp)');

    await test.step('Open the External Events module', async () => {
      await externalEventsPage.openList();
    });

    await test.step('The list screen loads with status tabs and search', async () => {
      await externalEventsPage.expectListLoaded();
    });
  });

  test('TC:2 End-to-End User Journey (Planning, Sorting, and Detail View)', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fc', 'TC:2 (ClickUp)');

    await externalEventsPage.openList();

    await test.step('Select the Planning status tab', async () => {
      await externalEventsPage.selectStatusTab('Planning');
      await expect(externalEventsPage.locators.statusTab('Planning')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    await test.step('Sort by AI Relevance (hidden by default — enable it first)', async () => {
      await externalEventsPage.showAiRelevanceColumn();
      await externalEventsPage.sortByAiRelevanceDescending();
    });

    await test.step('Clicking the top-scored row opens its Details screen', async () => {
      await externalEventsPage.openFirstRow();
      await expect(page).toHaveURL(/\/crm\/events\/[0-9a-f-]+/);
    });
  });

  test('TC:3 Combined Status Tabs and Free-Text Search', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fd', 'TC:3 (ClickUp)');

    await externalEventsPage.openList();

    // Corrected (2026-10-05): a hardcoded venue keyword ("Amsterdam",
    // confirmed real on local's seed data) doesn't hold on dev — its
    // "To Attend" seed data is entirely different (e.g. a Milan event).
    // Reading a real keyword from whichever seed data is actually present
    // makes this test environment-agnostic instead of tied to one
    // environment's specific seed content.
    const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
    let keyword = '';

    await test.step('Select the To Attend tab and pick a real venue keyword from its own seed data', async () => {
      await externalEventsPage.selectStatusTab('To Attend');
      const hasAny = await externalEventsPage.hasAnyRows();
      test.skip(!hasAny, 'No "To Attend" events in this environment to search within.');
      const firstRowText = await rows.first().innerText();
      // The venue/date cell is "{Date} · {City}" or "{Date} · {Venue},
      // {City}" — inconsistent between rows (confirmed directly: some
      // carry a venue name, some don't), so isolate everything after the
      // LAST " · " first (clears the date, which can itself contain a
      // comma, e.g. "Oct 21–22, 2026"), then take whatever's after the
      // last remaining comma, if any — giving just the city either way.
      const afterLastDot = firstRowText.split(' · ').pop() ?? '';
      const afterLastComma = afterLastDot.split(',').pop() ?? afterLastDot;
      keyword = afterLastComma.trim();
      expect(keyword.length, 'expected a real city/venue keyword to extract from the first row').toBeGreaterThan(0);
      await externalEventsPage.search(keyword);
    });

    await test.step('The grid shows only rows matching both the tab and the keyword', async () => {
      await expect(rows.first()).toBeVisible();
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toContainText(keyword);
      }
    });
  });

  test('TC:4 Free-Text Search with Non-Existent Criteria', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fe', 'TC:4 (ClickUp)');

    await externalEventsPage.openList();

    await test.step('Search a non-existent keyword', async () => {
      await externalEventsPage.search('XyzNonExistentVenue99');
    });

    await test.step('The table shows an empty state, no crash', async () => {
      await expect(externalEventsPage.locators.emptyStateMessage).toBeVisible();
    });
  });

  test('TC:5 Status Preservation for Decided Events Past End Date', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fg', 'TC:5 (ClickUp)');

    // Confirmed against the running app: this can't be exercised for real
    // (no way to fast-forward server time from a Playwright test), but
    // the underlying claim IS directly observable in existing seed data —
    // several "To Attend"/"Attended" events in this environment already
    // have schedules well in the past and still show their decided
    // status, never "Elapsed" (only genuinely UNDECIDED "Planning"
    // events combine with "· Elapsed"). Documents the confirmed real
    // behavior rather than simulating a date jump.
    await externalEventsPage.openList();
    await externalEventsPage.selectStatusTab('Attended');
    await page.waitForTimeout(500);

    await test.step('Decided (Attended) events past their end date keep their decided status, not Elapsed', async () => {
      const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
      const count = await rows.count();
      test.skip(count === 0, 'No Attended events in this environment to check.');
      const texts = await rows.allInnerTexts();
      for (const text of texts) {
        expect(text).not.toContain('Elapsed');
      }
    });
  });

  test('TC:6 All Status Tabs Count Validation', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abu9fh', 'TC:6 (ClickUp)');

    await externalEventsPage.openList();

    const readCount = async (name: string): Promise<number> => {
      const text = await externalEventsPage.locators.statusTab(name).innerText();
      return Number(text.replace(/\D/g, ''));
    };

    await test.step('Sum of individual status tabs equals the All tab total', async () => {
      const all = await readCount('All');
      const planning = await readCount('Planning');
      const toAttend = await readCount('To Attend');
      const attended = await readCount('Attended');

      await externalEventsPage.locators.moreStatusTabsButton.click();
      const notAttendingText = await page
        .getByRole('menuitem', { name: /^Not Attending \d+$/ })
        .innerText();
      const elapsedText = await page
        .getByRole('menuitem', { name: /^Elapsed \d+$/ })
        .innerText();
      const notAttending = Number(notAttendingText.replace(/\D/g, ''));
      const elapsed = Number(elapsedText.replace(/\D/g, ''));
      await page.keyboard.press('Escape');

      // Confirmed against the running app: a genuinely undecided event
      // past its own schedule shows a COMPOUND status — "Planning ·
      // Elapsed" — and counts toward BOTH the Planning tab AND the
      // Elapsed tab. The naive sum therefore double-counts every such
      // event; subtracting that overlap is what actually reconciles
      // with the All total, not a flat sum (the ClickUp text's premise
      // that the five tabs partition cleanly doesn't hold).
      await externalEventsPage.selectStatusTab('Planning');
      const planningRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
      const planningTexts = await planningRows.allInnerTexts();
      const planningElapsedOverlap = planningTexts.filter((t) => t.includes('Elapsed')).length;

      expect(planning + toAttend + attended + notAttending + elapsed - planningElapsedOverlap).toBe(
        all,
      );
    });
  });
});
