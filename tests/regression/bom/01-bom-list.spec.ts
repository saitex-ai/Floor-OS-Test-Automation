import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/bom.fixtures';
import { partial } from '../../../src/utils/test-annotations';

/**
 * BOM — Bill of Materials List.
 *
 * Source of truth for these cases: test-cases/bom/bom-list.md. Read-only:
 * nothing here creates or changes a BOM, so it runs against whatever BOMs
 * the environment already has. Storage state from auth.setup.ts is
 * already applied via the "bom" project's dependency — no login needed.
 *
 * TC:10 ("Toggle cell filters") was retired on 2026-10-23: the 2026-10-22
 * redesign removed the list's per-column filters. Its number is not reused.
 */

/** The 21 data columns shown by default (plus the select-row checkbox). */
const DEFAULT_COLUMNS = [
  'Techpack Code',
  'Rev No',
  'B.O.M Rev No',
  'Approved Date',
  'Approved By',
  'Customer',
  'Customer Prefix',
  'Company',
  'Fabric Code',
  'Fabric Name',
  'Completed',
  'Product Code',
  'Product Name',
  'Remark',
  'Season Code',
  'Status',
  'Style Code',
  'Style',
  'Techpack Type Code',
  'Wash Code',
  'Wash Name',
];

test.describe('BOM - Bill of Materials List', () => {
  test.beforeEach(async () => {
    await allure.epic('BOM');
    await allure.feature('BOM List');
    await allure.owner('BOM QA');
  });

  test('TC:1 Verify the BOM list loads with its heading, status tabs, toolbar and grid', async ({
    bomListPage,
  }) => {
    const l = bomListPage.locators;
    await test.step('Navigate to the BOM module', async () => {
      await bomListPage.open();
    });

    await test.step('Heading, All/Open/Approved tabs, search, New BOM and the grid are visible', async () => {
      await expect(l.heading).toBeVisible();
      await expect(l.allTab).toBeVisible();
      await expect(l.openTab).toBeVisible();
      await expect(l.approvedTab).toBeVisible();
      await expect(l.allTab).toHaveAttribute('aria-pressed', 'true');
      await expect(l.searchByPlaceholder('Search by code, customer, season...')).toBeVisible();
      await expect(l.newBomButton).toBeVisible();
      await expect(l.rows.first()).toBeVisible();
      await expect(l.footerSummary).toBeVisible();
    });
  });

  test('TC:2 Verify the "All" tab count equals Open + Approved', async ({ bomListPage }) => {
    await bomListPage.open();
    await bomListPage.waitForTabCounts();

    await test.step('All = Open + Approved', async () => {
      const all = await bomListPage.countOf(bomListPage.locators.allTab);
      const open = await bomListPage.countOf(bomListPage.locators.openTab);
      const approved = await bomListPage.countOf(bomListPage.locators.approvedTab);
      expect(all).toBe(open + approved);
    });
  });

  test('TC:3 Verify selecting the "Open" tab shows only Open BOMs', async ({ bomListPage }) => {
    await bomListPage.open();
    await bomListPage.waitForTabCounts();

    await test.step('The tab is pressed and the footer total matches its count', async () => {
      await bomListPage.selectStatusTab(bomListPage.locators.openTab);
    });

    await test.step('Every visible row is Open', async () => {
      const statuses = await bomListPage.columnValues('Status');
      expect(statuses.length).toBeGreaterThan(0);
      expect(new Set(statuses)).toEqual(new Set(['Open']));
    });
  });

  test('TC:4 Verify selecting the "Approved" tab shows only Approved BOMs', async ({
    bomListPage,
  }) => {
    await bomListPage.open();
    await bomListPage.waitForTabCounts();

    await test.step('The tab is pressed and the footer total matches its count', async () => {
      await bomListPage.selectStatusTab(bomListPage.locators.approvedTab);
    });

    await test.step('Every visible row is Approved, with an Approved Date', async () => {
      const statuses = await bomListPage.columnValues('Status');
      expect(statuses.length).toBeGreaterThan(0);
      expect(new Set(statuses)).toEqual(new Set(['Approved']));
      // Legacy BOMs (the old 7-digit sequence, e.g. TP202601-0000394, seen on
      // dev 2026-10-26) can be Approved with no Approved Date. They're legacy
      // data, not something this app produces, so they're left out.
      const codes = await bomListPage.columnValues('Techpack Code');
      const approvedDates = await bomListPage.columnValues('Approved Date');
      const isLegacy = (code: string) => /^TP\d{6}-\d{7}$/.test(code);
      const legacy = codes.filter(isLegacy).length;
      if (legacy > 0)
        partial(`${legacy} legacy BOM(s) (7-digit sequence) not checked for an Approved Date`);
      const current = approvedDates.filter((_, i) => !isLegacy(codes[i] ?? ''));
      expect(current.every((d) => /\d/.test(d))).toBe(true);
    });
  });

  test('TC:5 Verify the 21 default columns render', async ({ bomListPage }) => {
    await bomListPage.open();
    // The header row can render after the page itself (seen under 2 workers on uat).
    await expect.poll(() => bomListPage.columnLabels()).toEqual(DEFAULT_COLUMNS);
  });

  test('TC:6 Verify searching by Techpack Code narrows the grid to that techpack', async ({
    bomListPage,
  }) => {
    await bomListPage.open();
    const code = await bomListPage.firstRowCode();

    await test.step(`Search for ${code}`, async () => {
      await bomListPage.searchFor(code);
    });

    await test.step('Every remaining row is that techpack (one per BOM revision)', async () => {
      const codes = await bomListPage.columnValues('Techpack Code');
      expect(codes.length).toBeGreaterThan(0);
      expect(new Set(codes)).toEqual(new Set([code]));
    });
  });

  test('TC:7 Verify searching for a non-existent code returns no rows', async ({ bomListPage }) => {
    await bomListPage.open();
    await bomListPage.search(`NO-SUCH-BOM-${Date.now()}`);
    await expect(bomListPage.locators.rows).toHaveCount(0);
  });

  test("TC:8 Verify a row's Techpack Code opens that BOM's detail page at its own revision", async ({
    bomListPage,
    bomDetailPage,
  }) => {
    await bomListPage.open();
    const code = await bomListPage.firstRowCode();
    const bomRev = Number((await bomListPage.columnValues('B.O.M Rev No'))[0]);

    await test.step("Click the first row's Techpack Code", async () => {
      await bomListPage.openBom(code);
    });

    await test.step('The detail page opens for that code and B.O.M revision', async () => {
      await bomDetailPage.expectOpenFor(code, bomRev);
      expect(await bomDetailPage.headerField('B.O.M Code')).toBe(code);
    });
  });

  test("TC:9 Verify the Filter dialog's Advanced Filter rule builder", async ({ bomListPage }) => {
    const l = bomListPage.locators;
    await bomListPage.open();

    await test.step('Filters opens the "Filter" dialog with its fields and a live match count', async () => {
      await bomListPage.openFilters();
      await expect(l.filterIntroText).toBeVisible();
      for (const label of [
        'Techpack Code',
        'Customer',
        'Season Code',
        'Status',
        'Completed',
        'Approved date',
        'Effective date',
      ]) {
        await expect(l.filterLabel(label)).toBeVisible();
      }
      await expect(l.filterClearButton).toBeVisible();
      await expect(l.filterApplyButton).toBeVisible();
      await expect(l.advancedFilterButton).toBeVisible();
    });

    await test.step('Advanced Filter shows "Rules" with no custom rules yet', async () => {
      await bomListPage.openAdvancedFilter();
      await expect(l.noCustomRulesText).toBeVisible();
    });

    await test.step('"Add rule" adds an Attribute / operator / Value row', async () => {
      await bomListPage.addFilterRule();
      await expect(l.ruleOperatorCombobox()).toBeDisabled();
      await expect(l.ruleValueCombobox).toBeVisible();
      await expect(l.removeRuleButton).toBeVisible();
    });
  });

  test('TC:11 Verify Configure columns can hide and re-show a column, and Techpack Code is locked', async ({
    bomListPage,
  }) => {
    await bomListPage.open();

    await test.step('Techpack Code has no toggle in Configure columns', async () => {
      expect(await bomListPage.isColumnConfigurable('Techpack Code')).toBe(false);
    });

    await test.step('Hiding "Rev No" removes it from the grid', async () => {
      await bomListPage.setColumnVisible('Rev No', false);
      await expect(bomListPage.locators.columnHeaderButton('Rev No')).toHaveCount(0);
    });

    await test.step('Re-showing it brings it back', async () => {
      await bomListPage.setColumnVisible('Rev No', true);
      await expect(bomListPage.locators.columnHeaderButton('Rev No')).toBeVisible();
    });
  });

  test('TC:12 Verify the View menu switches between List View, Vertical Split and Horizontal Split', async ({
    bomListPage,
  }) => {
    const l = bomListPage.locators;
    await bomListPage.open();
    await bomListPage.waitForTabCounts();
    const total = await bomListPage.countOf(l.allTab);
    const firstCode = await bomListPage.firstRowCode();

    await test.step('View offers List View (checked), Vertical Split and Horizontal Split', async () => {
      expect(await bomListPage.viewOptions()).toEqual({
        names: ['List View', 'Vertical Split', 'Horizontal Split'],
        checked: 'List View',
      });
    });

    await test.step('Vertical Split: a card list beside a preview of the selected BOM', async () => {
      await bomListPage.setLayout('Vertical Split');
      await expect(l.splitRecordCount).toHaveText(`${total} record${total === 1 ? '' : 's'}`);
      await expect(l.essentialCardsButton).toHaveAttribute('aria-pressed', 'true');
      await expect(l.detailedCardsButton).toBeVisible();
      await l.splitRecordRows.first().click();
      await expect(l.previewBreadcrumb).toContainText(firstCode);
    });

    await test.step('Horizontal Split: the full grid, with the preview underneath', async () => {
      await bomListPage.setLayout('Horizontal Split');
      await expect(l.columnHeaderButton('Techpack Code')).toBeVisible();
      await l.rowStatusCell(0).click();
      await expect(l.previewBreadcrumb).toContainText(firstCode);
    });

    await test.step('List View: the full grid only, no preview', async () => {
      await bomListPage.setLayout('List View');
      await expect(l.columnHeaderButton('Techpack Code')).toBeVisible();
      await expect(l.previewBreadcrumb).toHaveCount(0);
    });
  });

  test('TC:13 Verify "Export CSV" downloads the list as bom-list.csv', async ({ bomListPage }) => {
    await bomListPage.open();
    const download = await bomListPage.exportCsv();
    expect(download.suggestedFilename()).toBe('bom-list.csv');
  });

  test('TC:14 Verify selecting rows shows a selection bar whose Export downloads bom-export.csv', async ({
    bomListPage,
  }) => {
    await bomListPage.open();

    await test.step('Selecting one row shows "1 item selected" with Export', async () => {
      await bomListPage.selectRow(0);
      await expect(bomListPage.locators.selectionBar).toHaveText(/^\s*1\s*item selected/);
    });

    await test.step('Export downloads the selection', async () => {
      const download = await bomListPage.exportSelected();
      expect(download.suggestedFilename()).toBe('bom-export.csv');
    });

    await test.step('Clear selection removes the bar', async () => {
      await bomListPage.clearSelection();
    });
  });

  test('TC:15 Verify "New BOM" is a single action that opens the Create BOM techpack dialog', async ({
    bomListPage,
  }) => {
    await bomListPage.open();
    await bomListPage.openNewBomDialog();
    await expect(bomListPage.locators.noTechpackSelected).toBeVisible();
    await bomListPage.cancelNewBomDialog();
  });

  test('TC:16 Verify people columns show names, never raw user ids', async ({ bomListPage }) => {
    // Regression check for ClickUp z941abwgw0 (BOM "Created by" / approver
    // showed a raw user id) — fixed to "name, else email, else N/A".
    await allure.tms('https://app.clickup.com/t/z941abwgw0', 'z941abwgw0 (ClickUp)');
    await bomListPage.open();
    await bomListPage.selectStatusTab(bomListPage.locators.approvedTab);

    const approvers = (await bomListPage.columnValues('Approved By')).filter(Boolean);
    expect(approvers.length).toBeGreaterThan(0);
    for (const name of approvers) {
      expect(name, 'a raw UUID').not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
      expect(name, 'a raw system actor id').not.toMatch(/^system:/);
    }
  });

  test('TC:17 Verify switching the language to Vietnamese in Preferences translates the BOM list, and reverts cleanly', async ({
    bomListPage,
    shellHeaderPage,
  }) => {
    test.setTimeout(150_000);
    const l = bomListPage.locators;
    await bomListPage.open();

    // The language is kept in the browser (localStorage), not on the
    // account, and every test has its own browser context, so this can't
    // reach other tests or suites.
    await test.step('User menu › Preferences › Tiếng Việt', async () => {
      await shellHeaderPage.changeLanguage('Vietnamese');
    });

    await test.step('Heading, tabs, toolbar, search placeholder and column headers translate', async () => {
      await expect(l.headingNamed('Định mức nguyên phụ liệu')).toBeVisible({ timeout: 60_000 });
      await expect(l.buttonNamed(/^Tất cả [\d,]+$/)).toBeVisible();
      await expect(l.buttonNamed(/^Mở [\d,]+$/)).toBeVisible();
      await expect(l.buttonNamed(/^Đã duyệt [\d,]+$/)).toBeVisible();
      await expect(l.buttonNamed('BOM mới')).toBeVisible();
      await expect(l.buttonNamed('Xuất CSV')).toBeVisible();
      await expect(l.searchByPlaceholder('Tìm theo mã, khách hàng, mùa...')).toBeVisible();
      await expect(l.columnHeaderButton('Mã Tài liệu kỹ thuật')).toBeVisible();
      await expect(l.columnHeaderButton('Người duyệt')).toBeVisible();
    });

    await test.step('Switch back to English: every string reverts', async () => {
      await shellHeaderPage.changeLanguage('English');
      await expect(l.heading).toBeVisible({ timeout: 60_000 });
      await expect(l.newBomButton).toBeVisible();
      await expect(l.columnHeaderButton('Techpack Code')).toBeVisible();
    });
  });
});
