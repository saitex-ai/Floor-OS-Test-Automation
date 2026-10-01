import * as allure from 'allure-js-commons';
import type { Browser } from '@playwright/test';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';
import { env } from '../../../src/config/env';
import { loginAsUser, secondUserCredentials } from '../../../src/fixtures/multi-user';
import { ShellHeaderPage } from '../../../src/pages/shell/shell-header.page';
import { ValidationRulesPage } from '../../../src/pages/techpack/validation-rules.page';

/**
 * Techpack — Validation Rules (`/techpacks/admin/validation-rules`).
 *
 * Source of truth for these cases: test-cases/techpack/validation-rules.md.
 * No ClickUp test-case tasks exist for this story; cases with a filed ClickUp
 * bug or clarification link to it via allure.tms(). Storage state (alice, Techpack Admin) comes from the
 * "techpack" project's auth.setup.ts dependency, same as every other spec
 * in this folder.
 *
 * **Disposable test data.** This screen creates/mutates real, shared rules
 * that gate real techpack submissions, so every rule this file creates is
 * named `PW REGRESSION <timestamp>[-suffix]`, given a Scope JSON that only
 * matches a customer code that doesn't exist (so even while briefly Active
 * it can never gate a real techpack), and archived again by the end of its
 * own block (archiving is permanent — they stay behind in the Archived tab,
 * same "disposable record, documented" convention as canvas-review.md's
 * disposable techpack). The only pre-existing rule this file touches is
 * EVERLANE-INTERLINING-COLOR-DARK, for TC:22 specifically (see there).
 *
 * **Environment split.** Everything runs as alice on uat (the primary
 * target). TC:26/TC:28/TC:29 need a second, non-Admin login (bob, Qc-lead),
 * which only exists on dev — uat has no working bob account (same gap as
 * 05-multi-user-presence.spec.ts TC:2, see multi-user-presence.md). Rather
 * than let those three hang on a login that can never succeed, they skip
 * cleanly unless TECHPACK_SECOND_USER_<ENV> / TECHPACK_SECOND_PASSWORD_<ENV>
 * are set (bob's login, on dev). They use only the `browser` fixture (never
 * alice's `page`), so they can be run on dev with `--no-deps` without
 * touching .auth/techpack.json.
 */

const RUN_ID = Date.now();
const NO_MATCH_SCOPE = JSON.stringify({
  op: 'all',
  predicates: [{ op: 'equals', fact: 'header.customer', value: 'PW-REGRESSION-NO-SUCH-CUSTOMER' }],
});
const DISPOSABLE_ASSERTION = JSON.stringify({
  kind: 'itemPresent',
  itemCode: 'PW-REGRESSION-TEST',
});
const disposableRule = (suffix: string) => ({
  name: `PW REGRESSION ${RUN_ID}-${suffix}`,
  description:
    'Disposable rule created by 06-validation-rules.spec.ts — safe to ignore, archived by the same run.',
  scopeJson: NO_MATCH_SCOPE,
  assertionJson: DISPOSABLE_ASSERTION,
});

/** Name-based sort check: true if `values` is in ascending or descending order under any sane comparator. */
function isSortedEitherWay(values: string[]): boolean {
  const comparators: ((a: string, b: string) => number)[] = [
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', ignorePunctuation: true }),
    (a, b) => (a < b ? -1 : a > b ? 1 : 0),
    (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0),
  ];
  return comparators.some((cmp) => {
    const asc = values.every((v, i) => i === 0 || cmp(values[i - 1] ?? '', v) <= 0);
    const desc = values.every((v, i) => i === 0 || cmp(values[i - 1] ?? '', v) >= 0);
    return asc || desc;
  });
}

test.describe('Techpack - Validation Rules', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('Validation Rules');
    await allure.owner('Techpack QA');
  });

  // ─── Read-only list checks (no shared-state mutation, no serial needed) ───

  test('TC:1 Verify the "Validation rules" link is reachable from the Techpack module\'s own nav', async ({
    validationRulesPage,
    page,
  }) => {
    test.setTimeout(120_000);
    await test.step('Open the Techpack module, open the nav drawer, click "Validation rules"', async () => {
      await validationRulesPage.openViaTechpackNav();
    });
    await test.step('Lands on /techpacks/admin/validation-rules', async () => {
      await expect(page).toHaveURL(/\/techpacks\/admin\/validation-rules\/?$/);
      await expect(validationRulesPage.locators.heading).toBeVisible();
    });
  });

  test('TC:2 Verify the list screen loads with heading, tabs, filter, and grid', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await test.step('Heading, 4 counted status tabs, "+2 more", filter box, New rule, grid', async () => {
      await expect(l.heading).toBeVisible();
      for (const tab of ['All', 'Draft', 'Suggested', 'Active'] as const) {
        await expect(l.statusTab(tab)).toBeVisible();
      }
      await expect(l.moreTabsButton).toHaveText(/\+2 more/);
      await expect(l.filterInput).toBeVisible();
      await expect(l.newRuleButton).toBeVisible();
      await expect(l.table).toBeVisible();
      await expect(l.dataRows.first()).toBeVisible();
    });
  });

  test('TC:3 Verify the status-tab counts add up correctly', async ({ validationRulesPage }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    const counts =
      await test.step('Read every tab count, including the two overflow ones', async () => {
        const c = {
          All: await validationRulesPage.tabCount('All'),
          Draft: await validationRulesPage.tabCount('Draft'),
          Suggested: await validationRulesPage.tabCount('Suggested'),
          Active: await validationRulesPage.tabCount('Active'),
          Disabled: await validationRulesPage.overflowTabCount('Disabled'),
          Archived: await validationRulesPage.overflowTabCount('Archived'),
        };
        await allure.attachment('tab-counts.json', JSON.stringify(c, null, 2), 'application/json');
        return c;
      });
    expect(
      counts.Draft + counts.Suggested + counts.Active + counts.Disabled + counts.Archived,
      `All should equal Draft+Suggested+Active+Disabled+Archived (${JSON.stringify(counts)})`,
    ).toBe(counts.All);
  });

  test('TC:4 Verify "+2 more" reveals the Disabled and Archived tabs', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    await test.step('Click "+2 more"', async () => {
      await validationRulesPage.openMoreTabs();
    });
    await test.step('"Disabled <n>" and "Archived <n>" are both listed', async () => {
      await expect(validationRulesPage.locators.overflowTab('Disabled')).toBeVisible();
      await expect(validationRulesPage.locators.overflowTab('Archived')).toBeVisible();
    });
  });

  test('TC:5 Verify selecting a status tab filters the grid', async ({ validationRulesPage }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    await test.step('Click the "Active" tab — it becomes the pressed tab', async () => {
      await validationRulesPage.selectTab('Active');
      await expect(validationRulesPage.locators.statusTab('All')).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
    await test.step('Every visible row is Active', async () => {
      // The tab flips to pressed before the grid re-renders — an immediate
      // read still returned the All view's leading Archived rows on the
      // first real run (screenshot taken a moment later showed a correctly
      // filtered grid). Poll until the rows actually settle.
      let statuses: string[] = [];
      await expect
        .poll(
          async () => {
            statuses = await validationRulesPage.columnValues('Status');
            return statuses.length > 0 && statuses.every((s) => s === 'Active');
          },
          { timeout: 20_000 },
        )
        .toBe(true);
      expect(
        new Set(statuses),
        `statuses shown under the Active tab: ${statuses.join(', ')}`,
      ).toEqual(new Set(['Active']));
    });
  });

  test('TC:6 Verify the filter box narrows the grid by Id/Name', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    const totalBefore = await validationRulesPage.tabCount('All');
    await test.step('Filter by "EVERLANE"', async () => {
      await validationRulesPage.filter('EVERLANE');
    });
    await test.step('Only EVERLANE rules remain', async () => {
      const rows = await validationRulesPage.visibleRows();
      await allure.attachment(
        'everlane-rows.json',
        JSON.stringify(rows, null, 2),
        'application/json',
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.length).toBeLessThan(totalBefore);
      for (const r of rows) {
        expect(`${r['Id']} ${r['Name']} ${r['Customer']}`.toUpperCase()).toContain('EVERLANE');
      }
    });
  });

  test("TC:7 Verify the filter box's empty state for a non-matching query", async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    await test.step('Filter by a string that matches nothing', async () => {
      await validationRulesPage.filter('zzz-no-such-rule-zzz');
    });
    await test.step('"No rules match" empty state, and the tab badges reflect the filtered view (all 0)', async () => {
      await expect(validationRulesPage.locators.emptyStateTitle).toBeVisible();
      await expect(validationRulesPage.locators.emptyStateHint).toBeVisible();
      for (const tab of ['All', 'Draft', 'Suggested', 'Active'] as const) {
        expect(await validationRulesPage.tabCount(tab), `${tab} tab count while filtered`).toBe(0);
      }
    });
  });

  test('TC:8 Verify which columns are sortable', async ({ validationRulesPage }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await test.step('Id, Name, Severity, Version, Updated each have a sort button', async () => {
      for (const col of ['Id', 'Name', 'Severity', 'Version', 'Updated']) {
        await expect(l.sortButton(col), `${col} sort button`).toBeVisible();
      }
    });
    await test.step('Status and Customer have no sort button', async () => {
      for (const col of ['Status', 'Customer']) {
        await expect(l.columnHeader(col)).toBeVisible();
        await expect(
          l.columnHeader(col).getByRole('button', { name: col, exact: true }),
        ).toHaveCount(0);
      }
    });
    await test.step('Clicking "Name" actually re-orders the grid by Name', async () => {
      await l.sortButton('Name').click();
      await expect
        .poll(async () => isSortedEitherWay(await validationRulesPage.columnValues('Name')), {
          timeout: 15_000,
          message: 'grid did not come out sorted by Name after clicking its sort button',
        })
        .toBe(true);
    });
  });

  test('TC:9 Verify pagination controls appear for a multi-page dataset', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    const total = await validationRulesPage.tabCount('All');
    expect(total, 'precondition: more than one page (25/page) of rules').toBeGreaterThan(25);

    await test.step('Page 1 controls: "Showing 1 to 25 of N", Rows per page 25, First/Previous disabled', async () => {
      await expect(l.showingText).toContainText(`Showing 1 to 25 of ${total}`);
      await expect(l.rowsPerPageCombobox).toContainText('25');
      await expect(l.firstPageButton).toBeDisabled();
      await expect(l.previousPageButton).toBeDisabled();
      await expect(l.nextPageButton).toBeEnabled();
      await expect(l.lastPageButton).toBeEnabled();
      await expect(l.jumpToPageInput).toBeVisible();
    });

    await test.step('Next page moves to rows 26+', async () => {
      await l.nextPageButton.click();
      await expect(l.showingText).toContainText(`Showing 26 to ${Math.min(50, total)} of ${total}`);
      await expect(l.previousPageButton).toBeEnabled();
    });
  });

  // ─── New rule dialog checks (opened and cancelled — nothing is created) ───

  test('TC:10 Verify "New rule" opens the New validation rule dialog with the full field set', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await validationRulesPage.openNewRule();

    await test.step('Title + "created as drafts" subtitle', async () => {
      await expect(
        l.newRuleDialog.getByRole('heading', { name: 'New validation rule' }),
      ).toBeVisible();
      await expect(
        l.newRuleDialog.getByText(
          'New rules are created as drafts — activate one to start gating drafts.',
        ),
      ).toBeVisible();
    });
    await test.step('Describe + disabled Generate, Name *, Description, Customer, Severity, "When this rule fails", collapsed Advanced', async () => {
      await expect(l.describeInput).toBeVisible();
      await expect(l.generateButton).toBeDisabled();
      await expect(l.nameInput).toBeVisible();
      await expect(l.descriptionInput).toBeVisible();
      await expect(l.customerPicker).toBeVisible();
      await expect(l.severityCombobox).toBeVisible();
      await expect(l.newRuleDialog.getByText('When this rule fails')).toBeVisible();
      await expect(l.advancedToggle).toBeVisible();
      await expect(l.assertionInput, 'Advanced group starts collapsed').toBeHidden();
    });
    await test.step('Cancel / disabled "Create rule" / Close', async () => {
      await expect(l.cancelButton).toBeVisible();
      await expect(l.createRuleButton).toBeDisabled();
      await expect(l.closeButton).toBeVisible();
    });
    await test.step('Scoping helper text reads "Leave a field blank to match every value"', async () => {
      // Replaced the old Customer-only "Leave blank to apply to every customer"
      // when the form gained its extra scoping fields — confirmed intended by
      // the user 2026-10-01 (see TC:15).
      await expect(
        l.newRuleDialog.getByText(/Leave a field blank to match every value/),
      ).toBeVisible({
        timeout: 5_000,
      });
    });
    await l.cancelButton.click();
  });

  test('TC:11 Verify "Create rule" stays disabled until the required Assertion (JSON) field is filled', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await validationRulesPage.openNewRule();

    await test.step('Fill only Name and Description — Create rule is still disabled', async () => {
      await l.nameInput.fill(`PW REGRESSION ${RUN_ID}-TC11-never-created`);
      await l.descriptionInput.fill('Never submitted — TC:11 only checks the button state.');
      await expect(l.createRuleButton).toBeDisabled();
    });
    await test.step('Expand Advanced and fill Assertion (JSON) — Create rule becomes enabled', async () => {
      await validationRulesPage.expandAdvanced();
      await l.assertionInput.fill(DISPOSABLE_ASSERTION);
      await expect(l.createRuleButton).toBeEnabled({ timeout: 5_000 });
    });
    await test.step('Cancel without creating', async () => {
      await l.cancelButton.click();
      await expect(l.newRuleDialog).toBeHidden();
    });
  });

  test("TC:12 Verify the Severity dropdown's options and default", async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    await validationRulesPage.open();
    await validationRulesPage.openNewRule();
    await test.step('Defaults to Error', async () => {
      await expect(validationRulesPage.locators.severityCombobox).toContainText('Error');
    });
    await test.step('Exactly Error, Warning, Info', async () => {
      expect(await validationRulesPage.severityOptions()).toEqual(['Error', 'Warning', 'Info']);
    });
    await validationRulesPage.locators.cancelButton.click();
  });

  test('TC:15 Verify rules can be scoped by Customer, Techpack Type, Season, Style, Fabric, Wash and Product Type', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await validationRulesPage.openNewRule();

    await test.step('Customer is a scoping field', async () => {
      await expect(l.customerPicker).toBeVisible();
    });
    await test.step('Techpack Type, Season, Style, Fabric, Wash and Product Type scoping fields are all present', async () => {
      const missing: string[] = [];
      for (const label of ['Techpack Type', 'Season', 'Style', 'Fabric', 'Wash', 'Product Type']) {
        if (!(await l.newRuleDialog.getByText(label, { exact: true }).count())) missing.push(label);
      }
      expect(missing, 'Scoping fields missing from the New rule form').toEqual([]);
    });
    await test.step('Helper text explains blank fields match everything and filled fields must all match', async () => {
      await expect(
        l.newRuleDialog.getByText(
          /The rule applies only when all filled fields match the techpack/,
        ),
      ).toBeVisible();
    });
    await l.cancelButton.click();
  });

  test('TC:16 Verify the "When this rule fails" switches default off and are independently toggleable', async ({
    validationRulesPage,
  }) => {
    test.setTimeout(120_000);
    const l = validationRulesPage.locators;
    await validationRulesPage.open();
    await validationRulesPage.openNewRule();

    await test.step('Both default off, with their helper text', async () => {
      await expect(l.notifyOwnerSwitch).not.toBeChecked();
      await expect(l.blockApprovalSwitch).not.toBeChecked();
      await expect(
        l.newRuleDialog.getByText('Sends one notification per validation run.'),
      ).toBeVisible();
      await expect(
        l.newRuleDialog.getByText(
          'Submit is blocked while this rule has unacknowledged findings, regardless of severity.',
        ),
      ).toBeVisible();
    });
    await test.step('Toggling "Notify" leaves "Block approval" untouched', async () => {
      await l.notifyOwnerSwitch.click();
      await expect(l.notifyOwnerSwitch).toBeChecked();
      await expect(l.blockApprovalSwitch).not.toBeChecked();
    });
    await test.step('Toggling "Block approval" leaves "Notify" untouched', async () => {
      await l.blockApprovalSwitch.click();
      await expect(l.blockApprovalSwitch).toBeChecked();
      await expect(l.notifyOwnerSwitch).toBeChecked();
      await l.notifyOwnerSwitch.click();
      await expect(l.notifyOwnerSwitch).not.toBeChecked();
      await expect(l.blockApprovalSwitch).toBeChecked();
    });
    await l.cancelButton.click();
  });

  // ─── Full lifecycle on one disposable rule ───

  test.describe('Lifecycle on a disposable rule (TC:14, 13, 17, 18, 21, 19, 20, 23, 24)', () => {
    // Each test here picks up the SAME disposable rule where the previous one
    // left it (Draft -> Active -> Archived), so order matters and a failure
    // must stop the rest rather than run them against the wrong state.
    // Scoped to this nested block only (same reasoning as
    // 03-create-techpack-ai-mode.spec.ts's own serial block) so a failure
    // here doesn't skip the independent read-only checks above, TC:22, or
    // the separate Disable block below.
    test.describe.configure({ mode: 'serial' });
    const rule = disposableRule('lifecycle');

    test.afterAll(async ({ browser }) => {
      // Safety net only: TC:24 archives this rule on a fully green run.
      const context = await browser.newContext();
      const outcome = await new ValidationRulesPage(await context.newPage()).archiveIfNotArchived(
        rule.name,
      );
      console.log(`[06-validation-rules] cleanup of "${rule.name}": ${outcome}`);
      await context.close();
    });

    test('TC:14 Verify a newly created rule lands as Draft, Version 1', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(180_000);
      await validationRulesPage.open();
      await test.step(`Create "${rule.name}" (Name, Description, Assertion — Customer left blank)`, async () => {
        await validationRulesPage.createRule(rule);
      });
      await test.step('It appears in the list as Draft, Version 1', async () => {
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Draft');
        const row = await validationRulesPage.findRule(rule.name);
        expect(row?.['Version']).toBe('1');
      });
    });

    test('TC:13 Verify leaving Customer blank scopes a rule globally', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(120_000);
      await validationRulesPage.open();
      const row = await validationRulesPage.findRule(rule.name);
      expect(row, `disposable rule "${rule.name}" should be in the list`).not.toBeNull();
      expect(row?.['Customer']).toBe('All customers');
    });

    test('TC:17 Verify opening an existing rule shows Edit validation rule with its real state', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(120_000);
      const l = validationRulesPage.locators;
      await validationRulesPage.open();
      const row = await validationRulesPage.findRule(rule.name);
      await validationRulesPage.openRule(rule.name);
      await test.step('Title + "Every saved edit bumps the rule version" subtitle', async () => {
        await expect(
          l.editRuleDialog.getByRole('heading', { name: 'Edit validation rule' }),
        ).toBeVisible();
        await expect(
          l.editRuleDialog.getByText(
            'Every saved edit bumps the rule version and re-triggers evaluation.',
          ),
        ).toBeVisible();
      });
      await test.step('Shows its real Status/Version/Id and pre-filled values', async () => {
        expect(await validationRulesPage.dialogStatusAndVersion()).toEqual({
          status: 'Draft',
          version: 1,
        });
        await expect(l.editRuleDialog).toContainText(row?.['Id'] ?? '<missing id>');
        await expect(l.nameInput).toHaveValue(rule.name);
        await expect(l.descriptionInput).toHaveValue(rule.description);
        await validationRulesPage.expandAdvanced();
        await expect(l.assertionInput).toHaveValue(/PW-REGRESSION-TEST/);
      });
      await validationRulesPage.closeDialog();
    });

    test("TC:18 Verify a Draft rule's available lifecycle actions", async ({
      validationRulesPage,
    }) => {
      test.setTimeout(120_000);
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      expect(await validationRulesPage.dialogActionButtons()).toEqual([
        'Activate',
        'Archive',
        'Cancel',
        'Save changes',
        'Close',
      ]);
      await validationRulesPage.closeDialog();
    });

    test('TC:21 Verify "Save changes" is disabled with zero unsaved edits (Draft, then Active)', async ({
      validationRulesPage,
    }) => {
      // Covers the Draft half here; the Active half is re-checked in TC:20
      // below once this same rule has been activated.
      test.setTimeout(120_000);
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      await expect(validationRulesPage.locators.saveChangesButton).toBeDisabled();
      await validationRulesPage.closeDialog();
    });

    test('TC:19 Verify Activate transitions a Draft rule to Active', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(180_000);
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      await test.step('Click Activate — "Validation rule activated" toast', async () => {
        await validationRulesPage.activate();
        await validationRulesPage.closeDialog();
      });
      await test.step('Status is Active, Version unchanged (1)', async () => {
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Active');
        expect((await validationRulesPage.findRule(rule.name))?.['Version']).toBe('1');
      });
    });

    test("TC:20 Verify an Active rule's available lifecycle actions (+ TC:21 Active half)", async ({
      validationRulesPage,
    }) => {
      test.setTimeout(120_000);
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      expect(await validationRulesPage.dialogStatusAndVersion()).toEqual({
        status: 'Active',
        version: 1,
      });
      await test.step('Disable, Archive, Cancel, Save changes, Close — no Activate', async () => {
        expect(await validationRulesPage.dialogActionButtons()).toEqual([
          'Disable',
          'Archive',
          'Cancel',
          'Save changes',
          'Close',
        ]);
      });
      await test.step('TC:21 (Active half): Save changes still disabled with zero edits', async () => {
        await expect(validationRulesPage.locators.saveChangesButton).toBeDisabled();
      });
      await validationRulesPage.closeDialog();
    });

    test('TC:23 Verify Archive requires confirmation and explains it is irreversible', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(120_000);
      const l = validationRulesPage.locators;
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      await test.step('Click Archive — confirmation dialog with the permanent-action warning', async () => {
        await validationRulesPage.startArchive();
        await expect(l.archiveConfirmDialog).toContainText('Archive this rule?');
        await expect(l.archiveConfirmDialog).toContainText(
          'Archiving is permanent. The rule stops gating submissions and can never be edited or re-activated.',
        );
        await expect(l.archiveConfirmCancelButton).toBeVisible();
        await expect(l.archiveConfirmButton).toBeVisible();
      });
      await test.step('Cancel backs out — the rule is still Active', async () => {
        await l.archiveConfirmCancelButton.click();
        await expect(l.archiveConfirmDialog).toBeHidden();
        await validationRulesPage.closeDialog();
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Active');
      });
    });

    test('TC:24 Verify an Archived rule can no longer be edited or reactivated', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(180_000);
      await validationRulesPage.open();
      await validationRulesPage.openRule(rule.name);
      await test.step('Confirm-archive the rule', async () => {
        await validationRulesPage.startArchive();
        await validationRulesPage.confirmArchive();
        await validationRulesPage.closeDialog();
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Archived');
      });
      await test.step('Re-opened: Status Archived, only Cancel and Close remain', async () => {
        await validationRulesPage.openRule(rule.name);
        expect((await validationRulesPage.dialogStatusAndVersion()).status).toBe('Archived');
        expect(await validationRulesPage.dialogActionButtons()).toEqual(['Cancel', 'Close']);
        await validationRulesPage.closeDialog();
      });
    });
  });

  // ─── TC:25: what Disable actually does, on its own disposable rule ───

  test.describe('Disable lifecycle on a second disposable rule (TC:25)', () => {
    test.describe.configure({ mode: 'serial' });
    const rule = disposableRule('disable');

    test.afterAll(async ({ browser }) => {
      const context = await browser.newContext();
      const outcome = await new ValidationRulesPage(await context.newPage()).archiveIfNotArchived(
        rule.name,
      );
      console.log(`[06-validation-rules] cleanup of "${rule.name}": ${outcome}`);
      await context.close();
    });

    test('TC:25 Verify Disable moves an Active rule to Disabled, and a Disabled rule can be re-activated', async ({
      validationRulesPage,
    }) => {
      test.setTimeout(300_000);
      const l = validationRulesPage.locators;
      await validationRulesPage.open();

      await test.step('Create + Activate a disposable rule', async () => {
        await validationRulesPage.createRule(rule);
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Draft');
        await validationRulesPage.openRule(rule.name);
        await validationRulesPage.activate();
        await validationRulesPage.closeDialog();
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Active');
      });

      await test.step('Click Disable — the rule moves to Disabled', async () => {
        await validationRulesPage.openRule(rule.name);
        await l.disableButton.click();
        await expect(l.toast(/Validation rule disabled/i)).toBeVisible({ timeout: 20_000 });
        await validationRulesPage.closeDialog();
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Disabled');
      });

      const disabledButtons =
        await test.step('Re-open the Disabled rule and read its actions', async () => {
          await validationRulesPage.openRule(rule.name);
          const buttons = await validationRulesPage.dialogActionButtons();
          console.log(
            `[TC:25] Disabled rule dialog: ${JSON.stringify(await validationRulesPage.dialogStatusAndVersion())} actions=${JSON.stringify(buttons)}`,
          );
          await allure.attachment(
            'disabled-rule-actions.json',
            JSON.stringify(buttons),
            'application/json',
          );
          return buttons;
        });

      await test.step('An Activate action is offered again, and re-activates it', async () => {
        expect(disabledButtons, 'actions on a Disabled rule').toContain('Activate');
        await validationRulesPage.activate();
        await validationRulesPage.closeDialog();
        await validationRulesPage.expectRuleColumn(rule.name, 'Status', 'Active');
      });
    });
  });

  // ─── TC:22: the known version-bump bug, on the real rule it was found on ───

  test('TC:22 [Known-issue watch] Saving without changes on a pre-existing rule must not bump its version', async ({
    validationRulesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abxb4p', 'TC:22 bug (ClickUp)');
    // ClickUp z941abxb4p (dev team working on it, per the user 2026-09-30).
    // Needs EVERLANE-INTERLINING-COLOR-DARK specifically — the rule the bug
    // was found and re-confirmed on; it did NOT reproduce on a freshly
    // created rule (TC:21). Asserts the CORRECT behavior (no version bump);
    // if the bug still reproduces this is a real, understood Fail — do not
    // weaken it to match the broken behavior (same stance as
    // 03-create-techpack-ai-mode.spec.ts TC:8). If "Save changes" is
    // disabled with zero edits, a no-op save simply can't happen, which is
    // also correct behavior and passes.
    test.setTimeout(180_000);
    const RULE_ID = 'EVERLANE-INTERLINING-COLOR-DARK';
    await validationRulesPage.open();

    const before = await test.step(`Read ${RULE_ID}'s current version`, async () => {
      const row = await validationRulesPage.findRule(RULE_ID);
      expect(row, `${RULE_ID} must exist for this check`).not.toBeNull();
      return Number(row?.['Version']);
    });

    const saveWasEnabled =
      await test.step('Open it and, without touching anything, click Save changes (if enabled)', async () => {
        await validationRulesPage.openRule(RULE_ID);
        const enabled = await validationRulesPage.locators.saveChangesButton.isEnabled();
        if (enabled) {
          await validationRulesPage.locators.saveChangesButton.click();
          await validationRulesPage.locators
            .toast('Validation rule updated')
            .waitFor({ state: 'visible', timeout: 15_000 })
            .catch(() => {});
        }
        await validationRulesPage.closeDialog();
        return enabled;
      });
    console.log(
      `[TC:22] ${RULE_ID} version before=${before}, "Save changes" enabled with zero edits=${saveWasEnabled}`,
    );
    await allure.attachment(
      'tc22-observed.json',
      JSON.stringify({ before, saveWasEnabled }),
      'application/json',
    );

    await test.step('Version is unchanged', async () => {
      await page.reload();
      await validationRulesPage.expectLoaded();
      const after = Number((await validationRulesPage.findRule(RULE_ID))?.['Version']);
      console.log(`[TC:22] ${RULE_ID} version after=${after}`);
      expect(
        after,
        `Saving ${RULE_ID} with zero changes bumped its version v${before} -> v${after} ` +
          `("Save changes" was ${saveWasEnabled ? 'ENABLED with no edits' : 'disabled'}) — ` +
          'known bug z941abxb4p: https://app.clickup.com/t/z941abxb4p',
      ).toBe(before);
    });
  });

  // ─── TC:27: no UI path exists ───

  test('TC:27 [Not yet confirmed] Origin of the "Suggested" status', async () => {
    test.skip(
      true,
      'No user-facing way to create a Suggested rule exists — "New rule" only ever creates Drafts ' +
        '("New rules are created as drafts"), and Suggested has sat at 0 on every session. Likely a ' +
        'system/AI-generated state; nothing to drive here without fabricating one. See validation-rules.md.',
    );
  });

  // ─── Non-Admin (bob, Qc-lead) — dev only ───

  test.describe('Non-Admin role (bob, Qc-lead) — dev only', () => {
    const second = secondUserCredentials('TECHPACK');
    test.beforeEach(() => {
      test.skip(
        !second,
        `Needs a second, non-admin login: set TECHPACK_SECOND_USER_${env.testEnv.toUpperCase()} / TECHPACK_SECOND_PASSWORD_${env.testEnv.toUpperCase()} (bob on dev; none exists on uat)`,
      );
    });
    const loginAsSecondUser = (browser: Browser) =>
      loginAsUser(browser, second?.username ?? '', second?.password ?? '');

    test('TC:26 Verify a non-Admin Techpack role can reach the screen', async ({ browser }) => {
      test.setTimeout(180_000);
      const bob = await loginAsSecondUser(browser);
      try {
        const vr = new ValidationRulesPage(bob.page);
        await test.step('bob navigates straight to /techpacks/admin/validation-rules', async () => {
          await vr.open();
        });
        await test.step('Same screen as an Admin: heading, tabs, populated grid, no access error', async () => {
          const shell = new ShellHeaderPage(bob.page);
          await expect(shell.locators.userMenuButton).toContainText('Bob');
          await expect(vr.locators.statusTab('All')).toBeVisible();
          await expect(vr.locators.dataRows.first()).toBeVisible();
          await expect(shell.locators.accessRestrictedText).toHaveCount(0);
        });
      } finally {
        await bob.close();
      }
    });

    test('TC:28 Verify a non-Admin role\'s left-nav visibility for "Validation rules"', async ({
      browser,
    }) => {
      test.setTimeout(180_000);
      const bob = await loginAsSecondUser(browser);
      try {
        const vr = new ValidationRulesPage(bob.page);
        await test.step('Open the Techpack nav drawer as bob and click "Validation rules"', async () => {
          await vr.openViaTechpackNav();
        });
        await expect(bob.page).toHaveURL(/\/techpacks\/admin\/validation-rules\/?$/);
      } finally {
        await bob.close();
      }
    });

    test("TC:29 Verify a non-Admin role's write affordance on this screen (not just read)", async ({
      browser,
    }) => {
      await allure.tms('https://app.clickup.com/t/z941abxkur', 'TC:29 clarification (ClickUp)');
      test.setTimeout(180_000);
      const bob = await loginAsSecondUser(browser);
      try {
        const vr = new ValidationRulesPage(bob.page);
        await vr.open();
        // The doc's expectation: if this screen is Admin-only for writes, a
        // Qc-lead's "New rule" should be disabled, the way his own Techpacks
        // List "New Techpack" is. Recorded as ❌ "not gated" on 2026-10-01 —
        // flagged to the dev team as a possible permission gap, not a
        // confirmed bug (no spec says it must be Admin-only).
        await expect(
          vr.locators.newRuleButton,
          'bob (Qc-lead) has an ENABLED "New rule" — no Admin gate on Validation Rules writes, unlike the Techpacks List',
        ).toBeDisabled({ timeout: 10_000 });
      } finally {
        await bob.close();
      }
    });
  });
});
