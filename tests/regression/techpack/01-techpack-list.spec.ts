import * as fs from 'fs';
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';
import { ShellHeaderPage } from '../../../src/pages/shell/shell-header.page';

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
 * Techpack — Techpacks List.
 *
 * Source of truth for these cases: test-cases/techpack/techpack-list.md.
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms(). Storage
 * state from auth.setup.ts is already applied via the "techpack" project's
 * dependency — no login needed here.
 */
const DUMMY_PDF = {
  name: `playwright-list-tc10-${Date.now()}.pdf`,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};
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

    await test.step('Heading, status tabs, and data grid are visible', async () => {
      await techpackPage.expectLoaded();
      await expect(techpackPage.locators.allTab).toBeVisible();
      await expect(techpackPage.locators.draftTab).toBeVisible();
      await expect(techpackPage.locators.openTab).toBeVisible();
      await expect(techpackPage.locators.approvedTab).toBeVisible();
      await expect(techpackPage.locators.table).toBeVisible();
    });
  });

  test('TC:2 Verify the "All" tab count equals Draft + Open + Approved', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

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
    await techpackPage.open();

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
    await techpackPage.open();

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
    await techpackPage.open();

    await test.step('Read an existing code from the first row, then search for it', async () => {
      const firstCode = await techpackPage.locators.table.getByRole('link').first().innerText();
      await techpackPage.search(firstCode);
      await techpackPage.expectRowVisible(firstCode);
    });
  });

  test('TC:6 Verify searching for a non-existent code returns no rows', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

    await test.step('Search for a code that cannot exist', async () => {
      await techpackPage.search(`NO-SUCH-TECHPACK-${Date.now()}`);
    });

    await test.step('The grid shows zero rows', async () => {
      await expect(techpackPage.locators.table.getByRole('row')).toHaveCount(1); // header row only
    });
  });

  test('TC:7 Verify the "New Techpack" button\'s default action opens AI Mode', async ({
    techpackPage,
    aiModeCopilotPage,
    page,
  }) => {
    await techpackPage.open();

    await test.step('Click the main "New Techpack" button', async () => {
      await techpackPage.clickNewTechpackDefault();
    });

    await test.step('Navigates to the AI Mode copilot', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new\/copilot/);
      // Corrected 2026-09-25: no "Saitex AI" text actually exists on this
      // screen (confirmed live via a full ariaSnapshot() dump on both dev
      // and uat) — the real h1 is "New techpack". See
      // AiModeCopilotLocators.heading's own note for the full account.
      await expect(aiModeCopilotPage.locators.heading).toBeVisible();
    });
  });

  test('TC:8 Verify the "New Techpack" dropdown offers both AI Mode and Classic', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

    await test.step('Click the chevron next to "New Techpack"', async () => {
      await techpackPage.locators.newTechpackDropdown.click();
    });

    await test.step('Both "AI Mode" and "Classic" options are offered', async () => {
      await expect(techpackPage.locators.aiModeMenuItem).toBeVisible();
      await expect(techpackPage.locators.classicMenuItem).toBeVisible();
    });
  });

  test('TC:9 Verify choosing "Classic" from the dropdown opens the manual form', async ({
    techpackPage,
    createTechpackPage,
    page,
  }) => {
    await techpackPage.open();

    await test.step('Open the dropdown and choose "Classic"', async () => {
      await techpackPage.startClassicCreate();
    });

    await test.step('Navigates to the manual New Techpack form', async () => {
      await expect(page).toHaveURL(/\/techpacks\/new$/);
      await expect(createTechpackPage.locators.heading).toBeVisible();
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

    await test.step("Open the list and click that techpack's row", async () => {
      await techpackPage.open();
      await techpackPage.search(code);
      await techpackPage.openRow(code);
    });

    await test.step('The canvas loads cleanly', async () => {
      await expect(page).toHaveURL(/\/techpacks\/(canvas\/)?[^/]+$/);
      // The canvas bundle + PDF can take well over the default 15s to settle on uat/dev.
      await expect(canvasPage.locators.loadErrorText).toBeHidden({ timeout: 30000 });
      await expect(canvasPage.locators.openingCanvasText).toBeHidden({ timeout: 30000 });
    });
  });

  test("TC:11 Verify the Filters panel's rule builder", async ({ techpackPage }) => {
    await techpackPage.open();

    await test.step('Open the Filters panel', async () => {
      await techpackPage.locators.filtersButton.click();
      await expect(techpackPage.locators.filterRulesLabel).toBeVisible();
      await expect(techpackPage.locators.filterMatchCountText).toBeVisible();
      await expect(techpackPage.locators.applyButton).toBeVisible();
    });

    await test.step('"Add rule" reveals an Attribute/operator/Value row', async () => {
      await techpackPage.locators.addRuleButton.click();
      await expect(techpackPage.locators.filterAttributeLabel).toBeVisible();
      await expect(techpackPage.locators.filterOperatorContains).toBeVisible();
      await expect(techpackPage.locators.filterValuePlaceholder).toBeVisible();
    });
  });

  test('TC:12 Verify "Toggle cell filters" reveals per-column inline filter inputs', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

    await test.step('Toggle cell filters on', async () => {
      await techpackPage.locators.toggleCellFiltersButton.click();
      await expect(techpackPage.locators.cellFilterInput('Techpack Code')).toBeVisible();
    });

    await test.step('Typing into a column filter narrows the grid', async () => {
      const firstCode = await techpackPage.locators.table.getByRole('link').first().innerText();
      await techpackPage.locators.cellFilterInput('Techpack Code').fill(firstCode);
      await techpackPage.expectRowVisible(firstCode);
    });
  });

  test('TC:13 Verify Configure columns can hide and re-show a column', async ({ techpackPage }) => {
    await techpackPage.open();

    await test.step('Hide the "Rev No" column', async () => {
      await techpackPage.locators.configureColumnsButton.click();
      await techpackPage.locators.columnCheckbox('Rev No').click();
      await techpackPage.locators.applyButton.click();
    });

    await test.step('The column header is gone from the grid', async () => {
      await expect(techpackPage.locators.table.getByText('Rev No', { exact: true })).toHaveCount(0);
    });

    await test.step('Re-show it', async () => {
      await techpackPage.locators.configureColumnsButton.click();
      await techpackPage.locators.columnCheckbox('Rev No').click();
      await techpackPage.locators.applyButton.click();
      await expect(techpackPage.locators.table.getByText('Rev No', { exact: true })).toBeVisible();
    });
  });

  test("TC:14 Verify the 3 layout modes change the grid's structure", async ({ techpackPage }) => {
    await techpackPage.open();

    await test.step('Vertical split shows a detail panel', async () => {
      await techpackPage.locators.verticalSplitButton.click();
      // The detail panel's own data (not just its shell) can take longer
      // than the global 15s expect timeout to populate on a slow dev day
      // — same "dev cold-start is slow" pattern documented elsewhere.
      await expect(techpackPage.locators.detailPanelHeaderLabel()).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Horizontal split still shows a detail panel', async () => {
      await techpackPage.locators.horizontalSplitButton.click();
      await expect(techpackPage.locators.detailPanelHeaderLabel()).toBeVisible({ timeout: 30_000 });
    });

    await test.step('No split hides the detail panel', async () => {
      await techpackPage.locators.noSplitButton.click();
      await expect(techpackPage.locators.detailPanelHeaderLabel()).toHaveCount(0);
    });
  });

  test('TC:15 Verify selecting rows shows a selection bar with "Compare"', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

    await test.step('Select one row', async () => {
      await techpackPage.locators.rowCheckboxAt(0).click();
      // The count and the "item(s) selected" label are separate elements
      // (a numbered badge next to the text, not one combined string) —
      // confirmed live, so match the label alone rather than "1 item
      // selected" as one phrase.
      await expect(techpackPage.locators.itemsSelectedText).toBeVisible();
      await expect(techpackPage.locators.compareButton).toBeVisible();
    });

    await test.step('Select a second row', async () => {
      await techpackPage.locators.rowCheckboxAt(1).click();
      await expect(techpackPage.locators.itemsSelectedText).toBeVisible();
    });

    await test.step('Clear selection', async () => {
      await techpackPage.locators.clearSelectionButton.click();
      await expect(techpackPage.locators.itemsSelectedText).toHaveCount(0);
    });
  });

  test('TC:16 Verify "Export CSV" triggers a real file download', async ({
    techpackPage,
    page,
  }) => {
    await techpackPage.open();

    await test.step('Click Export CSV', async () => {
      const downloadPromise = page.waitForEvent('download');
      await techpackPage.locators.exportCsvButton.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('techpacks.csv');
    });
  });

  test('TC:17 Verify code format correlates with creation method, not status', async ({
    techpackPage,
  }) => {
    // Corrected 2026-09-28, via live evidence: the DRAFT/<ULID> vs
    // TP<YYYYMM>-<seq> code format is NOT determined by Draft/Open/
    // Approved status (this test's original theory, based on 2026-09-25
    // evidence where every sampled Draft row happened to be AI-Mode-
    // created). A same-day re-run hit a genuine counter-example: a
    // freshly Classic-form-created techpack sat in Draft status with a
    // real `TP202609-000003` code, not a DRAFT/<ULID> one. The real
    // pattern, per techpack-module.md's own "Creator: copilot" note for
    // AI-created records: format correlates with **creation method**
    // instead — Classic's single synchronous "Create techpack" call
    // gets a real code immediately regardless of status; an AI-Mode
    // draft not yet finalized uses a placeholder ULID-style code until
    // some later step assigns a real one. Tests by Creator column
    // instead of by status tab.
    // Updated 2026-10-01: Creator now shows a person's name for both
    // creation methods (no more "copilot" / email values), so the grid's own
    // "Mode" column (AI / Manual) is what identifies the creation method.
    await techpackPage.open();
    await techpackPage.expectLoaded();
    await techpackPage.selectTab('All');

    const rows = (
      await test.step('Read Techpack Code, Status and Mode for the visible rows', () =>
        techpackPage.visibleRows(['Mode', 'Techpack Code', 'Status Name']))
    ).map((r) => ({ code: r['Techpack Code'], status: r['Status Name'], mode: r['Mode'] }));

    await test.step('AI-Mode drafts use the DRAFT/<code> placeholder format', async () => {
      const aiDrafts = rows.filter((r) => r.mode === 'AI' && r.status === 'Draft');
      test.skip(aiDrafts.length === 0, 'No AI-Mode draft visible on the first page of the list');
      for (const r of aiDrafts) expect(r.code, `AI draft ${r.code}`).toMatch(/^DRAFT\/\w+$/);
    });

    await test.step('Manual techpacks use the TP<YYYYMM>-<seq> format regardless of status', async () => {
      const manual = rows.filter((r) => r.mode === 'Manual');
      expect(manual.length, 'at least one Manual techpack is visible').toBeGreaterThan(0);
      for (const r of manual)
        expect(r.code, `Manual ${r.status} row ${r.code}`).toMatch(/^TP\d{6}-\d+$/);
    });
  });

  test('TC:18 Verify the current full column set renders (22 headers)', async ({
    techpackPage,
  }) => {
    await techpackPage.open();

    await test.step('All 21 named columns plus the select-row column are present', async () => {
      // The grid's own header row can render after expectLoaded()'s
      // heading check resolves (same "bundle loaded, data still
      // fetching" gap TC:3/TC:4 already work around) — poll rather than
      // reading once.
      await expect.poll(() => techpackPage.locators.columnHeaders.count()).toBeGreaterThan(1);
      const headerTexts = await techpackPage.locators.columnHeaders.allInnerTexts();
      const expected = [
        'Techpack Code',
        'Rev No',
        'Status Name',
        'Techpack Type',
        'Customer Name',
        'Company',
        'Season Name',
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
      for (const label of expected) {
        expect(headerTexts.some((h) => h.startsWith(label))).toBe(true);
      }
    });
  });

  test("TC:19 Verify Export CSV's own field values match what the on-screen grid resolves, not raw backend identifiers", async ({
    techpackPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxkuq', 'TC:19 bug (ClickUp)');
    test.setTimeout(60_000);
    await techpackPage.open();

    // The Approved tab guarantees a row with BOTH Creator and Approver
    // populated (Draft/Open rows never have an Approver yet) — needed to
    // check both fields' resolution, not just one.
    await techpackPage.selectTab('Approved');

    const { code, onScreen } =
      await test.step("Read a real Approved row's on-screen resolved values", async () => {
        const linkCode = await techpackPage.locators.table.getByRole('link').first().innerText();
        const headerTexts = await techpackPage.locators.columnHeaders.allInnerTexts();
        const cells = await techpackPage.rowCellTexts(linkCode);
        const at = (label: string) => cells[headerTexts.findIndex((h) => h.startsWith(label))];
        return {
          code: linkCode,
          onScreen: {
            customerName: at('Customer Name'),
            creator: at('Creator'),
            approver: at('Approver'),
          },
        };
      });

    const csvValues = await test.step('Download and parse the CSV export', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        techpackPage.locators.exportCsvButton.click(),
      ]);
      const filePath = await download.path();
      if (!filePath) throw new Error('CSV download did not resolve to a local file path');
      let csvText = fs.readFileSync(filePath, 'utf-8');
      if (csvText.charCodeAt(0) === 0xfeff) csvText = csvText.slice(1); // strip a leading BOM, seen on a real export
      csvText = csvText.replace(/\r/g, '');
      const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
      const header = parseCsvLine(lines[0] ?? '');
      const dataLine = lines.slice(1).find((l) => l.startsWith(`${code},`));
      if (!dataLine) throw new Error(`CSV export has no row for ${code}`);
      const fields = parseCsvLine(dataLine);
      const at = (label: string) => fields[header.indexOf(label)];
      return {
        customerName: at('Customer Name'),
        creator: at('Creator'),
        approver: at('Approver'),
      };
    });

    // Desired/correct behavior: the export's Customer Name/Creator/Approver
    // should be the exact same human-readable values the grid already
    // resolves on-screen — never a raw customer code or backend UUID.
    // expect.soft() on all three so each field's real, individual result is
    // reported in one run rather than stopping at the first failure (see
    // 03-create-techpack-ai-mode.spec.ts's TC:8 doc comment for this
    // repo's "assert correct behavior, let real bugs Fail cleanly"
    // rationale — this is the same convention applied to 3 fields at once).
    //
    // Live, confirmed 2026-09-30 on uat (re-verified same-day, not just
    // trusting the original 2026-09-29 finding — ClickUp z941abxb3u):
    // Customer Name reproducibly exports as the raw `CTC0000###` customer
    // code instead of the resolved name — a real, live, still-open bug.
    // Creator/Approver, by contrast, did NOT reproduce the raw-UUID version
    // of this same bug in this same re-check (every row exported a real
    // human name, e.g. "Alice Planner") — a genuine behavior change since
    // the original finding, recorded here rather than assumed without
    // re-checking live.
    expect
      .soft(
        csvValues.customerName,
        `CSV "Customer Name" should show the resolved name ("${onScreen.customerName}") like the grid does, not a raw customer code — live, confirmed bug (z941abxb3u)`,
      )
      .toBe(onScreen.customerName);

    expect
      .soft(
        csvValues.creator,
        'CSV "Creator" should show a human-readable name/email, matching the grid, not a raw backend UUID',
      )
      .toBe(onScreen.creator);

    expect
      .soft(
        csvValues.approver,
        'CSV "Approver" should show a human-readable name/email, matching the grid, not a raw backend UUID',
      )
      .toBe(onScreen.approver);
  });

  test("TC:20 Verify switching the shell's language to Vietnamese translates the Techpack module's own chrome, and reverts cleanly", async ({
    techpackPage,
    canvasPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb5r', 'TC:20 bug (ClickUp)');
    test.setTimeout(180_000);
    await techpackPage.open();

    // Find a genuinely Manual/Classic-created Open row (not an AI-Mode
    // draft) up front, before switching language. Live re-check
    // 2026-09-30 confirmed an AI-Mode-created canvas doesn't expose a
    // plain "Status" Details field the same li-based way a Classic
    // canvas does (it uses a differently-shaped Extracted Data panel
    // instead — see the Techpack QA's working notes), so picking an
    // arbitrary Open row risks a false "stuck loading" result unrelated
    // to the actual language bug this case is checking.
    await techpackPage.selectTab('Open');
    const code = await test.step('Find a Manual-created Open row', async () => {
      // One fresh reload if the first read finds none: right after a heavy grid
      // action (TC:19's CSV export) the grid can briefly show stale rows.
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) {
          await techpackPage.open();
          await techpackPage.selectTab('Open');
        }
        const rows = await techpackPage.visibleRows(['Mode', 'Techpack Code']);
        const manual = rows.find((r) => (r['Mode'] ?? '').toLowerCase() === 'manual');
        if (manual?.['Techpack Code']) return manual['Techpack Code'];
      }
      throw new Error('No Manual-created Open techpack visible in the list');
    });

    const shellHeaderPage = new ShellHeaderPage(page);
    let switchedToVietnamese = false;

    // CRITICAL: this drives a shared `alice` uat account other suites also
    // use — the language MUST be back to English before this test ends,
    // even if an assertion above fails. Everything after switching runs
    // inside try/finally for exactly that reason (same convention as the
    // 2026-09-29 exploration this case is based on).
    try {
      await test.step('Switch the shell language to Vietnamese', async () => {
        await shellHeaderPage.changeLanguage('Vietnamese');
        switchedToVietnamese = true;
        await expect(shellHeaderPage.locators.text('Tài liệu kỹ thuật').first()).toBeVisible({
          timeout: 15_000,
        });
      });

      await test.step("The List's heading/tabs/columns and this row's own Status value all translate", async () => {
        await expect(techpackPage.locators.statusTabNamed(/^Mở \d+/)).toBeVisible();
        const headerTexts = await techpackPage.locators.columnHeaders.allInnerTexts();
        const cells = await techpackPage.rowCellTexts(code);
        const statusCell = cells[headerTexts.findIndex((h) => h.startsWith('Tên trạng thái'))];
        expect(statusCell, "the List's own Status Name cell for this Open row").toBe('Mở');
      });

      await test.step('The canvas translates its labels; Details values stay as stored master data', async () => {
        await techpackPage.locators.rowLink(code).click();
        const statusRow = canvasPage.locators.fieldRow('Trạng thái');
        await statusRow.waitFor({ state: 'visible', timeout: 30_000 });
        // Details-panel values come straight from master data and are
        // meant to stay in English (confirmed with the dev team
        // 2026-10-01), so only the label is expected to translate here.
        await expect(statusRow).toContainText('Open');
        await expect(canvasPage.locators.fieldRow('Trạng thái khóa')).toBeVisible();
      });
    } finally {
      await test.step('Switch back to English and confirm a clean revert', async () => {
        if (!switchedToVietnamese) return;
        await shellHeaderPage.changeLanguage('English');
        const revertedBodyText = await shellHeaderPage.locators.body.innerText();
        expect(
          revertedBodyText,
          'no leftover Vietnamese text anywhere on the page after reverting to English',
        ).not.toMatch(/Tài liệu kỹ thuật|Bản nháp|Đã duyệt|Trạng thái|Khách hàng/i);
      });
    }
  });
});
