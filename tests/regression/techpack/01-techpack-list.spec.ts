import * as fs from 'fs';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';

/**
 * Minimal CSV line splitter — not a full RFC 4180 parser, just enough to
 * handle the one real quoting shape this export actually uses (a
 * double-quoted field containing literal commas and/or escaped `""`
 * quotes, e.g. `"STELLA 24"" CROP STRETCH WITH 1"" DOUBLE CUFF"`, seen in
 * a real downloaded export — see techpack-list.md's TC:19 notes). A plain
 * `.split(',')` would silently misalign every column after a quoted
 * comma.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Techpack — Techpack Dashboard and its grid.
 *
 * Source of truth for these cases: test-cases/techpack/techpack-list.md.
 * Rewritten 2026-10-23 for the FloorOS design-system release of 2026-10-22
 * (the "TechPacks" list became a "Dashboard"; see the doc's 2026-10-23
 * update). TC:8 and TC:12 were retired that day (the "New Techpack" menu and
 * "Toggle cell filters" are gone) and their numbers are not reused.
 *
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms(). Storage state from
 * auth.setup.ts is already applied via the "techpack" project's dependency —
 * no login needed here.
 */
const QA_AUTO_DESCRIPTION =
  'QA-AUTO — Techpack regression test data (pw-hybrid-framework). Safe to delete.';
const DUMMY_PDF = {
  name: `playwright-list-tc10-${Date.now()}.pdf`,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};

/** The 8 columns the grid shows by default, in order. */
const DEFAULT_COLUMNS = [
  'Name and Code',
  'Rev No',
  'Stage',
  'Status',
  'Techpack Type',
  'Customer Name',
  'Company',
  'Season',
];

/** The "Columns" dialog's hidden-by-default columns, in list order. */
const HIDDEN_BY_DEFAULT = [
  'Style Value Code',
  'Style Value Desc',
  'Fabric Value Code',
  'Fabric Value Desc',
  'Wash Value Code',
  'Wash Value Desc',
  'Product Value Code',
  'Product Value Desc',
  'Remark',
  'Created Date',
  'Creator',
  'Mode',
  'Approved Date',
  'Approver',
];

/** The code at the end of a "Name and Code" cell ("3301 Deconstructed Super Slim TP202610-000129"). */
const codeOf = (nameAndCode: string): string => nameAndCode.trim().split(/\s+/).pop() ?? '';

test.describe('Techpack - Techpacks List', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('Techpacks List');
    await allure.owner('Techpack QA');
  });

  test('TC:1 Verify the Techpacks list loads with status tabs and a data grid', async ({
    techpackPage,
  }) => {
    await test.step('Navigate to the Techpack module', async () => {
      await techpackPage.open();
    });

    await test.step('"Dashboard" heading, status tabs, and data grid are visible', async () => {
      await techpackPage.expectLoaded();
      await techpackPage.ensureListView();
      for (const tab of ['All', 'Draft', 'Open', 'Approved'] as const) {
        await expect(techpackPage.locators.statusTab(tab)).toHaveText(/\d+/);
      }
      await expect(techpackPage.locators.table).toBeVisible();
    });
  });

  test('TC:2 Verify the "All" tab count equals Draft + Open + Approved', async ({
    techpackPage,
  }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();

    await test.step('Read the count on each status tab', async () => {
      const [all, draft, open, approved] = await Promise.all([
        techpackPage.tabCount('All'),
        techpackPage.tabCount('Draft'),
        techpackPage.tabCount('Open'),
        techpackPage.tabCount('Approved'),
      ]);

      await test.step("All's count equals the sum of the other three", async () => {
        expect(all).toBe(draft + open + approved);
      });
    });
  });

  test('TC:3 Verify selecting the "Open" status tab filters the grid', async ({ techpackPage }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Click the "Open" tab', async () => {
      await techpackPage.selectTab('Open');
    });

    await test.step('Only Open rows are shown; the tab is selected', async () => {
      await techpackPage.expectTabSelected('Open');
      // The grid refetches asynchronously after the tab click — poll
      // rather than reading statuses once, which can catch the previous
      // (unfiltered) rows still on screen.
      await expect
        .poll(async () => (await techpackPage.visibleStatuses()).every((s) => s === 'Open'))
        .toBe(true);
    });
  });

  test('TC:4 Verify selecting the "Approved" status tab filters the grid', async ({
    techpackPage,
  }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Click the "Approved" tab', async () => {
      await techpackPage.selectTab('Approved');
    });

    await test.step('Only Approved rows are shown; the tab is selected', async () => {
      await techpackPage.expectTabSelected('Approved');
      await expect
        .poll(async () => (await techpackPage.visibleStatuses()).every((s) => s === 'Approved'))
        .toBe(true);
    });
  });

  test('TC:5 Verify searching by Techpack Code narrows the grid', async ({ techpackPage }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Read an existing code from the first row, then search for it', async () => {
      const firstCode = await techpackPage.firstCode();
      await techpackPage.search(firstCode);
      await expect
        .poll(async () => {
          const codes = await techpackPage.visibleCodes();
          return codes.length > 0 && codes.every((c) => c === firstCode);
        })
        .toBe(true);
    });
  });

  test('TC:6 Verify searching for a non-existent code returns no rows', async ({
    techpackPage,
  }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Search for a code that cannot exist', async () => {
      await techpackPage.search(`NO-SUCH-TECHPACK-${Date.now()}`);
    });

    await test.step('The grid shows zero rows and the "No results found" state', async () => {
      await expect(techpackPage.locators.emptyResultText).toBeVisible();
      await expect(techpackPage.locators.codeButtons).toHaveCount(0);
      await expect(techpackPage.locators.showingCountText).toHaveText('Showing 0 packs');
    });
  });

  test('TC:7 Verify "Create New" opens AI Mode directly', async ({
    techpackPage,
    aiModeCopilotPage,
    page,
  }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();

    await test.step('"Create New" is a plain button (no dropdown or menu)', async () => {
      await expect(techpackPage.locators.createNewButton).not.toHaveAttribute('aria-haspopup');
    });

    await test.step('Click "Create New"', async () => {
      await techpackPage.clickCreateNew();
    });

    await test.step('Navigates to the AI Mode page', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new\/copilot/);
      await expect(aiModeCopilotPage.locators.heading).toBeVisible({ timeout: 30_000 });
    });
  });

  test('TC:9 Verify the Classic (manual) form is reachable from the Dashboard', async ({
    techpackPage,
    aiModeCopilotPage,
    createTechpackPage,
    page,
  }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();

    await test.step('Create New › Add files › More tools › Manual form', async () => {
      await techpackPage.clickCreateNew();
      await expect(aiModeCopilotPage.locators.heading).toBeVisible({ timeout: 30_000 });
      await aiModeCopilotPage.openManualFormFromAddFiles();
    });

    await test.step('Navigates to the manual New Techpack form', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new$/);
      await expect(createTechpackPage.locators.heading).toBeVisible({ timeout: 30_000 });
    });
  });

  test('TC:10 Verify opening a techpack row from the list navigates to its canvas', async ({
    techpackPage,
    createTechpackPage,
    canvasPage,
    page,
  }) => {
    test.setTimeout(180000);

    // Legacy seed records are known to intermittently 404 or hang on
    // "Opening canvas…" — per the user's developer, that's a seed-data
    // problem specifically, not a general defect ("any techpack we
    // create can be opened and viewed"). So this creates a fresh
    // techpack first and opens *that* one from the list, rather than
    // gambling on which existing row happens to load today — see
    // test-cases/techpack/techpack-list.md's notes.
    const code = await test.step('Create a fresh techpack to open', async () => {
      await createTechpackPage.openFromTechpacksList();
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
      await createTechpackPage.fillDetails({ description: QA_AUTO_DESCRIPTION });
      await createTechpackPage.uploadTechpackFile(DUMMY_PDF);
      let result = await createTechpackPage.createExpectingResult();
      for (let i = 0; result === 'duplicate' && i < 3; i++) {
        await page.keyboard.press('Escape');
        await createTechpackPage.fillAllRequiredWithRandomAvailable();
        result = await createTechpackPage.createExpectingResult();
      }
      expect(result).toBe('created');
      await createTechpackPage.expectCreatedSuccessfully();
      return createTechpackPage.currentTechpackCode();
    });

    await test.step('Open the Dashboard, search for it and click its code', async () => {
      await techpackPage.openAndWaitForRows();
      await techpackPage.search(code);
      await techpackPage.openCode(code);
    });

    await test.step("The techpack's page loads cleanly", async () => {
      await expect(page).toHaveURL(/\/techpacks\/view\/[^/]+$/, { timeout: 30_000 });
      await expect(page.getByRole('heading', { name: code, level: 1 })).toBeVisible({
        timeout: 30_000,
      });
      await expect(canvasPage.locators.loadErrorText).toBeHidden();
      await expect(canvasPage.locators.openingCanvasText).toBeHidden({ timeout: 30000 });
    });
  });

  test("TC:11 Verify the Filters dialog's sections and fields", async ({ techpackPage }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Open Filters: General Information is open by default', async () => {
      await techpackPage.openFilters();
      const l = techpackPage.locators;
      await expect(l.filterSectionToggle('General Information')).toHaveText('Hide');
      await expect(l.filterSectionToggle('Garment Specifications')).toHaveText('Show');
      await expect(l.filterSectionToggle('System Info')).toHaveText('Show');
      for (const field of [
        'Rev No',
        'Stage',
        'Status',
        'Techpack Type',
        'Customer Name',
        'Company Name',
      ]) {
        await expect(
          l.filterSection('General Information').getByText(field, { exact: true }),
        ).toBeVisible();
      }
      for (const button of ['Clear', 'Apply', 'Advanced Filter', 'Close']) {
        await expect(
          l.filterDialog.getByRole('button', { name: button, exact: true }),
        ).toBeVisible();
      }
    });

    await test.step('Status and Stage offer the expected values', async () => {
      expect(await techpackPage.filterFieldOptions('Status')).toEqual([
        'Draft',
        'Open',
        'Approved',
        'Cancelled',
      ]);
      expect(await techpackPage.filterFieldOptions('Stage')).toEqual([
        'Draft',
        'First proto',
        'Fitting',
        'SMS',
        'TOP',
        'Approved',
      ]);
    });

    await test.step('Garment Specifications: Season and the value code/desc fields', async () => {
      await techpackPage.expandFilterSection('Garment Specifications');
      await expect(techpackPage.locators.filterSectionToggle('General Information')).toHaveText(
        'Show',
      );
      const section = techpackPage.locators.filterSection('Garment Specifications');
      for (const field of [
        'Season',
        'Style Value Code',
        'Style Value Desc',
        'Fabric Value Code',
        'Fabric Value Desc',
        'Wash Value Code',
        'Wash Value Desc',
        'Product Value Code',
        'Product Value Desc',
      ]) {
        await expect(section.getByText(field, { exact: true })).toBeVisible();
      }
    });

    await test.step('System Info: dates (on / before / after / between), Creator, Approver', async () => {
      await techpackPage.expandFilterSection('System Info');
      const section = techpackPage.locators.filterSection('System Info');
      for (const field of ['Created Date', 'Creator', 'Approved Date', 'Approver']) {
        await expect(section.getByText(field, { exact: true })).toBeVisible();
      }
      expect(await techpackPage.filterFieldOptions('Created Date')).toEqual([
        'on',
        'before',
        'after',
        'between',
      ]);
    });
  });

  test('TC:13 Verify Configure columns can hide and re-show a column', async ({ techpackPage }) => {
    await techpackPage.openAndWaitForRows();

    try {
      await test.step('Hide the "Rev No" column', async () => {
        await techpackPage.setColumnsVisible(['Rev No'], false);
      });

      await test.step('The column header is gone from the grid', async () => {
        await expect.poll(() => techpackPage.columnHeaderTexts()).not.toContain('Rev No');
      });

      await test.step('Re-show it', async () => {
        await techpackPage.setColumnsVisible(['Rev No'], true);
        await expect.poll(() => techpackPage.columnHeaderTexts()).toContain('Rev No');
      });
    } finally {
      // The column choice survives a reload: never leave it changed.
      await techpackPage.resetColumns();
    }
  });

  test("TC:14 Verify the View menu's three layouts", async ({ techpackPage, page }) => {
    await techpackPage.openAndWaitForRows();
    const l = techpackPage.locators;

    try {
      await test.step('The menu offers List View (checked), Vertical Split and Grid View', async () => {
        await l.viewButton.click();
        await expect(l.viewMenu.getByRole('menuitemradio')).toHaveText([
          'List View',
          'Vertical Split',
          'Grid View',
        ]);
        await expect(l.viewOption('List View')).toHaveAttribute('aria-checked', 'true');
        await page.keyboard.press('Escape');
      });

      await test.step('Vertical Split: one column beside a detail pane for the first row', async () => {
        await techpackPage.chooseView('Vertical Split');
        await expect(l.openTechPackButton).toBeVisible({ timeout: 30_000 });
        for (const section of [
          'General Information',
          'Garment Specifications',
          'System Info',
        ] as const) {
          await expect(l.detailPaneSection(section)).toBeVisible();
        }
        await expect.poll(() => techpackPage.columnHeaderTexts()).toEqual(['', 'Name and Code']);
      });

      await test.step('Grid View: cards, no table', async () => {
        await techpackPage.chooseView('Grid View');
        await expect(l.gridViewCards.first()).toBeVisible({ timeout: 30_000 });
        await expect(l.table).toHaveCount(0);
      });

      await test.step('List View: the full grid again, no detail pane', async () => {
        await techpackPage.chooseView('List View');
        await expect.poll(() => techpackPage.columnHeaderTexts()).toEqual(['', ...DEFAULT_COLUMNS]);
        await expect(l.openTechPackButton).toHaveCount(0);
      });
    } finally {
      // The View choice survives a reload: always leave it on List View.
      await techpackPage.ensureListView();
    }
  });

  test('TC:15 Verify selecting rows shows a selection bar with "Compare"', async ({
    techpackPage,
  }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Select one row', async () => {
      await techpackPage.locators.rowCheckboxAt(0).click();
      await expect(techpackPage.locators.itemsSelectedText).toHaveText(/^1\s*item selected/);
      await expect(techpackPage.locators.compareButton).toBeVisible();
    });

    await test.step('Select a second row', async () => {
      await techpackPage.locators.rowCheckboxAt(1).click();
      await expect(techpackPage.locators.itemsSelectedText).toHaveText(/^2\s*items selected/);
    });

    await test.step('Clear selection', async () => {
      await techpackPage.locators.clearSelectionButton.click();
      await expect(techpackPage.locators.itemsSelectedText).toHaveCount(0);
    });
  });

  test('TC:16 Verify "Export" triggers a real file download', async ({ techpackPage }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('Click Export', async () => {
      const download = await techpackPage.export();
      expect(download.suggestedFilename()).toBe('techpacks.csv');
    });
  });

  test('TC:17 Verify code format correlates with creation method, not status', async ({
    techpackPage,
  }) => {
    // The DRAFT/<ULID> vs TP<YYYYMM>-<seq> format follows how the techpack
    // was made, not its status (corrected 2026-09-28): Classic's synchronous
    // "Create techpack" gets a TP code at once; an AI-Mode draft keeps a
    // DRAFT/ placeholder until it's submitted ("Open Techpack", 2026-10-22
    // redesign), and from then on has a TP code even while its status is
    // still Draft (seen 2026-10-23). The "Mode" column (AI / Manual) tells
    // the two apart; it's hidden by default since the redesign.
    await techpackPage.openAndWaitForRows();
    await techpackPage.selectTab('Draft');
    await expect
      .poll(async () => (await techpackPage.visibleStatuses()).every((s) => s === 'Draft'))
      .toBe(true);

    try {
      await techpackPage.setColumnsVisible(['Mode'], true);
      const rows = (
        await test.step('Read Name and Code, Status and Mode for the Draft rows', () =>
          techpackPage.visibleRows(['Name and Code', 'Status', 'Mode']))
      ).map((r) => ({
        code: codeOf(r['Name and Code'] ?? ''),
        status: r['Status'],
        mode: r['Mode'],
      }));

      await test.step('Every DRAFT/<code> row is an AI-Mode draft', async () => {
        const placeholders = rows.filter((r) => r.code.startsWith('DRAFT/'));
        test.skip(placeholders.length === 0, 'No unsubmitted AI-Mode draft on the first page');
        for (const r of placeholders) {
          expect(r.code, `${r.code} format`).toMatch(/^DRAFT\/\w+$/);
          expect(r.mode, `${r.code} Mode`).toBe('AI');
        }
      });

      await test.step('Manual techpacks always have a TP<YYYYMM>-<seq> code, even as Draft', async () => {
        for (const r of rows.filter((x) => x.mode === 'Manual'))
          expect(r.code, `Manual ${r.status} row ${r.code}`).toMatch(/^TP\d{6}-\d+$/);
      });
    } finally {
      await techpackPage.resetColumns();
    }
  });

  test('TC:18 Verify the default column set (8 of 22 shown)', async ({ techpackPage, page }) => {
    await techpackPage.openAndWaitForRows();

    await test.step('The grid shows the 8 default columns, in order', async () => {
      // The leading select-row column has no text of its own.
      await expect.poll(() => techpackPage.columnHeaderTexts()).toEqual(['', ...DEFAULT_COLUMNS]);
    });

    await test.step('"Configure columns" reads 8/22 and lists the rest unticked', async () => {
      await techpackPage.openColumns();
      const l = techpackPage.locators;
      await expect(l.columnsCounterText).toHaveText('8/22');
      await expect(l.lockedColumnCheckbox).toBeChecked();
      await expect(l.lockedColumnCheckbox).toBeDisabled();
      const state = await techpackPage.columnsDialogState();
      expect(state.filter((c) => c.checked).map((c) => c.label)).toEqual([
        'Name and Code',
        ...DEFAULT_COLUMNS.slice(1).map((c) => (c === 'Company' ? 'Company Name' : c)),
      ]);
      expect(state.filter((c) => !c.checked).map((c) => c.label)).toEqual(HIDDEN_BY_DEFAULT);
      await page.keyboard.press('Escape');
      await expect(l.columnsDialog).toBeHidden();
    });
  });

  test('TC:19 Verify Export writes the visible columns with the same human-readable values as the grid', async ({
    techpackPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxkuq', 'TC:19 bug (ClickUp)');
    test.setTimeout(90_000);
    await techpackPage.openAndWaitForRows();

    // The Approved tab guarantees rows with both Creator and Approver set.
    await techpackPage.selectTab('Approved');
    await expect
      .poll(async () => (await techpackPage.visibleStatuses()).every((s) => s === 'Approved'))
      .toBe(true);

    try {
      await test.step('Show Creator and Approver', async () => {
        await techpackPage.setColumnsVisible(['Creator', 'Approver'], true);
      });

      const columns = ['Name and Code', 'Stage', 'Customer Name', 'Season', 'Creator', 'Approver'];
      const onScreen =
        await test.step("Read the first Approved row's values on screen", async () => {
          const [row] = await techpackPage.visibleRows(columns);
          if (!row) throw new Error('No Approved row on screen');
          return row;
        });

      const csv = await test.step('Download and parse the export', async () => {
        const download = await techpackPage.export();
        expect(download.suggestedFilename()).toBe('techpacks.csv');
        const filePath = await download.path();
        if (!filePath) throw new Error('CSV download did not resolve to a local file path');
        let csvText = fs.readFileSync(filePath, 'utf-8');
        if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1); // strip a leading BOM, seen on a real export
        const lines = csvText
          .replace(/\r/g, '')
          .split('\n')
          .filter((l) => l.trim().length > 0);
        const header = parseCsvLine(lines[0] ?? '');
        const code = codeOf(onScreen['Name and Code'] ?? '');
        const dataLine = lines.slice(1).find((l) => l.startsWith(`${code},`));
        if (!dataLine) throw new Error(`CSV export has no row for ${code}`);
        const fields = parseCsvLine(dataLine);
        return { header, at: (label: string) => fields[header.indexOf(label)] ?? '' };
      });

      await test.step('The header is the visible columns, in grid order', async () => {
        expect(csv.header).toEqual([
          'Techpack Code',
          'Rev No',
          'Stage',
          'Status',
          'Techpack Type',
          'Customer Name',
          'Company Name',
          'Season',
          'Creator',
          'Approver',
        ]);
      });

      await test.step('Every value matches what the grid shows', async () => {
        // "—" is how the grid shows an empty value.
        const shown = (label: string) => (onScreen[label] === '—' ? '' : (onScreen[label] ?? ''));
        // Known bug z941abxkuq: Customer Name exports the raw `CTC…` customer
        // code instead of the name the grid shows (still seen 2026-10-23).
        expect
          .soft(
            csv.at('Customer Name'),
            'Customer Name should be the name, not a raw code (z941abxkuq)',
          )
          .toBe(shown('Customer Name'));
        // Open question (2026-10-23, not filed yet): Season exports the season
        // code (`SS24`) and Stage the enum (`FITTING`), not what the grid shows.
        expect.soft(csv.at('Season'), 'Season should be the season name').toBe(shown('Season'));
        expect.soft(csv.at('Stage'), 'Stage should be the stage label').toBe(shown('Stage'));
        expect.soft(csv.at('Creator'), 'Creator should be a name').toBe(shown('Creator'));
        expect.soft(csv.at('Approver'), 'Approver should be a name').toBe(shown('Approver'));
      });
    } finally {
      await techpackPage.resetColumns();
    }
  });

  test('TC:20 Verify switching the language to Vietnamese in Preferences translates the Techpack Dashboard, and reverts cleanly', async ({
    techpackPage,
    shellHeaderPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb5r', 'TC:20 bug (ClickUp)');
    test.setTimeout(180_000);
    await techpackPage.openAndWaitForRows();

    let switchedToVietnamese = false;
    // The language is stored per browser, so this can't leak into other
    // tests' contexts; it's still always reverted, even if an assertion fails.
    try {
      await test.step('User menu › Preferences › Tiếng Việt', async () => {
        await shellHeaderPage.changeLanguage('Vietnamese');
        switchedToVietnamese = true;
      });

      await test.step('The Dashboard translates', async () => {
        const main = techpackPage.locators.main;
        await expect(main.getByRole('heading', { name: 'Bảng điều khiển', level: 1 })).toBeVisible({
          timeout: 60_000,
        });
        await expect(main.getByRole('button', { name: 'Tạo mới', exact: true })).toBeVisible();
        for (const tab of [/^Tất cả \d+/, /^Bản nháp \d+/, /^Mở \d+/, /^Đã duyệt \d+/]) {
          await expect(techpackPage.locators.statusTabNamed(tab)).toBeVisible();
        }
        for (const button of ['Bộ lọc', 'Cấu hình cột', 'Chế độ xem', 'Xuất']) {
          await expect(main.getByRole('button', { name: button, exact: true })).toBeVisible();
        }
        await expect(techpackPage.locators.searchInput).toHaveAttribute('placeholder', 'Tìm kiếm');
        await expect.poll(() => techpackPage.columnHeaderTexts()).toContain('Tên và mã');
        await expect.poll(() => techpackPage.columnHeaderTexts()).toContain('Trạng thái');
        const statuses = (await techpackPage.visibleRows(['Trạng thái'])).map(
          (r) => r['Trạng thái'],
        );
        expect(statuses.length).toBeGreaterThan(0);
        for (const s of statuses) expect(['Bản nháp', 'Mở', 'Đã duyệt']).toContain(s);
      });
    } finally {
      await test.step('Switch back to English and confirm a clean revert', async () => {
        if (!switchedToVietnamese) return;
        await shellHeaderPage.changeLanguage('English');
        await techpackPage.expectLoaded();
        const revertedBodyText = await shellHeaderPage.locators.body.innerText();
        expect(
          revertedBodyText,
          'no leftover Vietnamese text anywhere on the page after reverting to English',
        ).not.toMatch(/Bảng điều khiển|Bản nháp|Đã duyệt|Trạng thái|Tạo mới/i);
      });
    }
  });
});
