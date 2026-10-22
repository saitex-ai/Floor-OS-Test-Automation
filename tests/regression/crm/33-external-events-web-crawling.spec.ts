import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Build External Events List with Web Crawling (Sprint 5).
 *
 * Source of truth: ClickUp task https://app.clickup.com/t/z941abx7f2.
 * List-only: nothing here creates an event or changes an event's status
 * (other suites depend on the shared seed pool — see
 * 23-external-event-details.spec.ts).
 *
 * Confirmed against dev (2026-10-15) — see external-events.page.ts's
 * "Sprint 5" section for details:
 * - The ClickUp examples ("Webinar" type, "Scheduled" status, "Start
 *   Date" column) don't exist in this app. Real types are Exhibition /
 *   Fashion Show / Other / Sales Summit / Trade Fair, status filtering is
 *   the status tabs, and the date column is "Schedule". Tests read real
 *   values off the live grid instead of hardcoding seed content.
 * - Column visibility/order, sort and layout are saved per BROWSER in
 *   localStorage ("crm-events-list-prefs-v1"), not per user on the server.
 *   Each Playwright test runs in a fresh browser context, so nothing
 *   leaks, but TC:5/TC:6 still put back what they change.
 */
test.describe('CRM - Build External Events List with Web Crawling', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Build External Events List with Web Crawling');
    await allure.owner('CRM QA');
  });

  test('TC:1 Default List Load', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fj', 'TC:1 (ClickUp)');
    const l = externalEventsPage.locators;

    await test.step('Open the External Events list without searching or filtering', async () => {
      await externalEventsPage.openList();
    });

    await test.step('The screen loads with the All tab active and no search/filter applied', async () => {
      await externalEventsPage.expectListLoaded();
      await expect(l.statusTab('All')).toHaveAttribute('aria-pressed', 'true');
      await expect(l.searchInput).toHaveValue('');
      // No "(N applied)" suffix on the Filters toggle = no filter active.
      await expect(l.filtersButton).toHaveAccessibleName('Filters');
    });

    await test.step('Every visible event is listed: the grid total equals the All tab count', async () => {
      const allCount = await externalEventsPage.readStatusTabCount('All');
      expect(allCount).toBeGreaterThan(0);
      await externalEventsPage.expectPaginationTotal(allCount);
      // First page shows min(total, page size of 25) rows, each with a title.
      await expect(l.dataRows).toHaveCount(Math.min(allCount, 25));
      const titles = await externalEventsPage.readColumnValues('Event');
      for (const title of titles) {
        expect(title.length).toBeGreaterThan(0);
      }
    });
  });

  test('TC:2 Free-Text Search', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fk', 'TC:2 (ClickUp)');
    const l = externalEventsPage.locators;

    await externalEventsPage.openList();
    const unfilteredTotal = await externalEventsPage.readPaginationTotal();

    // A partial, lower-cased fragment of a real event title — exercises
    // both partial and case-insensitive matching without depending on
    // any one environment's seed content.
    let keyword = '';
    await test.step('Pick a partial keyword from a real event title', async () => {
      const titles = await externalEventsPage.readColumnValues('Event');
      const word = titles.flatMap((t) => t.split(/[^A-Za-z]+/)).find((w) => w.length >= 6);
      expect(word, 'expected a title word of 6+ letters to search for').toBeTruthy();
      keyword = word!.slice(1).toLowerCase();
    });

    await test.step(`Search "${keyword}" — the list narrows to matching events only`, async () => {
      await externalEventsPage.search(keyword);
      // 15 s: the search is debounced and then refetched server-side; dev
      // has taken several seconds to answer under load.
      await expect
        .poll(() => externalEventsPage.readPaginationTotal(), { timeout: 15_000 })
        .toBeLessThan(unfilteredTotal);
      await expect(l.dataRows.first()).toBeVisible();
      for (const text of await l.dataRows.allInnerTexts()) {
        expect(text.toLowerCase()).toContain(keyword);
      }
    });

    await test.step('Search by a Type value — matches across the Type column too', async () => {
      await externalEventsPage.search('');
      await externalEventsPage.expectPaginationTotal(unfilteredTotal);
      const type = (await externalEventsPage.readColumnValues('Type'))[0] ?? '';
      await externalEventsPage.search(type);
      // 15 s: debounced server-side refetch, as above.
      await expect
        .poll(() => externalEventsPage.readPaginationTotal(), { timeout: 15_000 })
        .toBeLessThan(unfilteredTotal);
      for (const text of await l.dataRows.allInnerTexts()) {
        expect(text.toLowerCase()).toContain(type.toLowerCase());
      }
    });

    await test.step('Clearing the search restores the full list', async () => {
      await externalEventsPage.search('');
      await externalEventsPage.expectPaginationTotal(unfilteredTotal);
    });
  });

  test('TC:3 Filtering by Type and Status', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fm', 'TC:3 (ClickUp)');
    const l = externalEventsPage.locators;

    await externalEventsPage.openList();
    const allTotal = await externalEventsPage.readPaginationTotal();
    let attendedTotal = 0;
    let type = '';
    let combinedTotal = 0;

    await test.step('Select the Attended status tab', async () => {
      attendedTotal = await externalEventsPage.readStatusTabCount('Attended');
      test.skip(attendedTotal === 0, 'No Attended events in this environment to filter.');
      await externalEventsPage.selectStatusTab('Attended');
      await externalEventsPage.expectPaginationTotal(attendedTotal);
      type = (await externalEventsPage.readColumnValues('Type'))[0] ?? '';
    });

    await test.step(`Filter by Type "${type}" — only rows matching BOTH type and status remain`, async () => {
      await externalEventsPage.filterByType(type);
      await expect(l.filtersButton).toHaveAccessibleName('Filters (1 applied)');
      await expect(l.statusTab('Attended')).toHaveAttribute('aria-pressed', 'true');
      await expect
        .poll(() => externalEventsPage.readPaginationTotal())
        .toBeLessThanOrEqual(attendedTotal);
      combinedTotal = await externalEventsPage.readPaginationTotal();
      expect(combinedTotal).toBeGreaterThan(0);
      // The tab badges re-scope to the applied filter.
      expect(await externalEventsPage.readStatusTabCount('Attended')).toBe(combinedTotal);
      for (const value of await externalEventsPage.readColumnValues('Type')) {
        expect(value).toBe(type);
      }
      for (const value of await externalEventsPage.readColumnValues('Status')) {
        expect(value).toBe('Attended');
      }
    });

    await test.step('Switching to the All tab broadens to the Type filter alone', async () => {
      await externalEventsPage.selectStatusTab('All');
      await expect
        .poll(() => externalEventsPage.readPaginationTotal())
        .toBeGreaterThanOrEqual(combinedTotal);
      const typeOnlyTotal = await externalEventsPage.readPaginationTotal();
      expect(typeOnlyTotal).toBeLessThanOrEqual(allTotal);
      for (const value of await externalEventsPage.readColumnValues('Type')) {
        expect(value).toBe(type);
      }
    });

    await test.step('Removing the Type filter restores the unfiltered list', async () => {
      await externalEventsPage.removeFilter(`Type: ${type}`);
      await expect(l.filtersButton).toHaveAccessibleName('Filters');
      await externalEventsPage.expectPaginationTotal(allTotal);
      await externalEventsPage.selectStatusTab('Attended');
      await externalEventsPage.expectPaginationTotal(attendedTotal);
    });
  });

  test('TC:4 Column Sorting', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fn', 'TC:4 (ClickUp)');
    const l = externalEventsPage.locators;
    // The ClickUp example's "Start Date" is the "Schedule" column here, and
    // it is already the grid's default (ascending) order, so its first
    // click shows no visible change. "Event" (title) demonstrates the
    // asc -> desc toggle unambiguously.
    const column = 'Event';
    // Dev's sort ignores case, accents, spaces and punctuation (confirmed
    // 2026-10-21: "Denimsandjeans Vietnam" sorts before "Denim Show"), so
    // the order check compares the same way.
    const collator = new Intl.Collator('en', { sensitivity: 'base', ignorePunctuation: true });
    const isSorted = (values: string[], dir: 1 | -1): boolean =>
      values.slice(1).every((v, i) => dir * collator.compare(values[i] ?? '', v) <= 0);

    await externalEventsPage.openList();
    let ascIconClass = '';

    await test.step(`First click on "${column}" sorts ascending`, async () => {
      await externalEventsPage.clickColumnSort(column);
      await expect
        .poll(async () => isSorted(await externalEventsPage.readColumnValues(column), 1))
        .toBe(true);
      // The header's icon switches to the highlighted "active sort" style.
      await expect(l.columnSortIcon(column)).toHaveClass(/text-ring/);
      ascIconClass = (await l.columnSortIcon(column).getAttribute('class')) ?? '';
    });

    await test.step(`Second click on "${column}" re-sorts descending immediately`, async () => {
      await externalEventsPage.clickColumnSort(column);
      await expect
        .poll(async () => isSorted(await externalEventsPage.readColumnValues(column), -1))
        .toBe(true);
      await expect(l.columnSortIcon(column)).toHaveClass(/text-ring/);
    });

    await test.step('Sort indicator: the same two-headed icon for both directions, highlighted when active', async () => {
      // The header shows the same "arrow-up-down" icon for ascending and
      // descending, only highlighted when active. Accepted as-is by the
      // team (2026-10-15) — not a bug; the row order itself is what TC:4
      // verifies above.
      const descIconClass = (await l.columnSortIcon(column).getAttribute('class')) ?? '';
      expect(ascIconClass).toContain('lucide-arrow-up-down');
      expect(descIconClass).toBe(ascIconClass);
      await expect(l.columnHeader(column)).not.toHaveAttribute('aria-sort', /.+/);
    });
  });

  test('TC:5 Column Configuration and Persistence', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fp', 'TC:5 (ClickUp)');
    test.slow();

    await externalEventsPage.openList();
    const defaultLabels = await externalEventsPage.readColumnLabels();
    expect(defaultLabels).toContain('Created By');
    expect(defaultLabels).not.toContain('Leads');
    let customLabels: string[] = [];

    try {
      await test.step('Open the column configuration panel', async () => {
        await externalEventsPage.openColumnsDialog();
      });

      await test.step('Hide "Created By", show hidden "Leads", drag "Schedule" above "Type"', async () => {
        await externalEventsPage.toggleColumn('Created By');
        await externalEventsPage.toggleColumn('Leads');
        await externalEventsPage.dragColumnOnto('Schedule', 'Type');
        const order = await externalEventsPage.readColumnsDialogOrder();
        expect(order.indexOf('Schedule')).toBeLessThan(order.indexOf('Type'));
        await externalEventsPage.applyColumns();
      });

      await test.step('The customized column layout is applied instantly', async () => {
        customLabels = await externalEventsPage.readColumnLabels();
        expect(customLabels).not.toContain('Created By');
        expect(customLabels).toContain('Leads');
        expect(customLabels.indexOf('Schedule')).toBeLessThan(customLabels.indexOf('Type'));
        expect(customLabels[0]).toBe('Event');
      });

      await test.step('After a browser refresh the same column configuration is retained', async () => {
        await externalEventsPage.reloadList();
        expect(await externalEventsPage.readColumnLabels()).toEqual(customLabels);
      });
    } finally {
      await test.step('Cleanup: reset columns to default', async () => {
        await externalEventsPage.resetColumnsToDefault();
        expect(await externalEventsPage.readColumnLabels()).toEqual(defaultLabels);
      });
    }
  });

  test('TC:6 Alternate List Layout Switching', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7fr', 'TC:6 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    await externalEventsPage.openList();
    let title = '';
    let type = '';
    let keyword = '';
    let total = 0;

    await test.step('Set up a status tab, Type filter, search and a selected row', async () => {
      const attended = await externalEventsPage.readStatusTabCount('Attended');
      test.skip(attended === 0, 'No Attended events in this environment.');
      await externalEventsPage.selectStatusTab('Attended');
      await externalEventsPage.expectPaginationTotal(attended);
      title = (await externalEventsPage.readColumnValues('Event'))[0] ?? '';
      type = (await externalEventsPage.readColumnValues('Type'))[0] ?? '';
      keyword = title.split(' ')[0] ?? '';
      await externalEventsPage.filterByType(type);
      await externalEventsPage.search(keyword);
      await expect(l.eventRow(title).first()).toBeVisible();
      await externalEventsPage.selectRow(title);
      await expect(l.rowCheckbox(title)).toBeChecked();
      total = await externalEventsPage.readPaginationTotal();
    });

    const expectStatePreserved = async (): Promise<void> => {
      await expect(l.searchInput).toHaveValue(keyword);
      await expect(l.removeFilterChip(`Type: ${type}`)).toBeVisible();
      await expect(l.statusTab('Attended')).toHaveAttribute('aria-pressed', 'true');
      await externalEventsPage.expectPaginationTotal(total);
    };

    try {
      await test.step('Switch to Vertical split — list + preview pane, state kept', async () => {
        await externalEventsPage.switchLayout('Vertical split');
        await expect(l.splitListItem(title)).toHaveAccessibleName(/^Deselect row /);
        await expect(l.splitPreviewHeading).toHaveText(title);
        await expectStatePreserved();
      });

      await test.step('Switch to Horizontal split — table + preview pane, state kept', async () => {
        await externalEventsPage.switchLayout('Horizontal split');
        await expect(l.rowCheckbox(title)).toBeChecked();
        await expect(l.splitPreviewHeading).toHaveText(title);
        await expectStatePreserved();
      });

      await test.step('Switch back to No split — plain table, state kept', async () => {
        await externalEventsPage.switchLayout('No split');
        await expect(l.splitPreviewHeading).toBeHidden();
        await expect(l.rowCheckbox(title)).toBeChecked();
        await expectStatePreserved();
      });
    } finally {
      await test.step('Cleanup: back to the default No split layout, filter removed', async () => {
        await externalEventsPage.switchLayout('No split');
        if (await l.removeFilterChip(`Type: ${type}`).isVisible()) {
          await externalEventsPage.removeFilter(`Type: ${type}`);
        }
      });
    }
  });

  test('TC:7 Search with Zero Matching Results', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abx7g7', 'TC:7 (ClickUp)');
    const l = externalEventsPage.locators;
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await externalEventsPage.openList();
    const unfilteredTotal = await externalEventsPage.readPaginationTotal();

    await test.step('Search a nonsense string', async () => {
      await externalEventsPage.search('XYZ-999-NOT-REAL');
    });

    await test.step('A friendly empty state is shown and no rows remain', async () => {
      // Real copy is "No events found" + "Try removing a filter or
      // clearing them all." — generic rather than search-specific like
      // the ClickUp example, but a clear, friendly empty state.
      // 15 s: the empty state only renders once the debounced server-side
      // search returns, which dev has taken several seconds to do.
      await expect(l.emptyStateMessage).toBeVisible({ timeout: 15_000 });
      await expect(l.emptyStateMessage).toHaveText('No events found');
      await expect(l.emptyStateHint).toBeVisible();
      await expect(l.dataRows).toHaveCount(0);
    });

    await test.step('The UI stays stable — no crash, no unhandled errors', async () => {
      await expect(l.pageHeading).toBeVisible();
      await expect(l.searchInput).toHaveValue('XYZ-999-NOT-REAL');
      await externalEventsPage.search('');
      await externalEventsPage.expectPaginationTotal(unfilteredTotal);
      expect(pageErrors, `unhandled page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    });
  });
});
