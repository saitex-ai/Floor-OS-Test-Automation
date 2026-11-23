import * as allure from 'allure-js-commons';
import { test, expect } from './support/approvals.fixtures';
import { ApprovalPoliciesPage } from '../../../src/pages/planning/approval-policies.page';
import { RecipeDetailPage } from '../../../src/pages/planning/recipe-detail.page';
import { ApprovalPanelPage } from '../../../src/pages/planning/approval-panel.page';
import { ApprovalsInboxPage } from '../../../src/pages/planning/approvals-inbox.page';
import { ApprovalRequestPage } from '../../../src/pages/planning/approval-request.page';
import { partial } from '../../../src/utils/test-annotations';
import {
  addOperation,
  asPersona,
  createRecipe,
  knownBug,
  personaCredentials,
  personaSkipReason,
  setupPage,
  uniqueTag,
} from './support/test-data';
import { cleanUpAfterAll } from './support/cleanup';
import {
  ALICE,
  CAROL,
  DAVE,
  GA_TAG,
  type CreatedActivity,
  cleanUpApprovalsAfterAll,
  createActivity,
  oncePerRun,
  watchPolicies,
  createPolicy,
  editPolicy,
  gaName,
  policyName,
  sendFresh,
  sendUnder,
} from './support/approvals';

/**
 * Planning — Setup Generic Approval workflow (Sprint 4, ClickUp z941abvzym).
 *
 * Source of truth for these cases: test-cases/planning/generic-approval.md
 * (ClickUp "Test Cases and Runs" › Planning - Generic Approval Workflow,
 * z941abyu87). The screens moved from Control Center into the Approvals app
 * on 2026-11-12 (Policies at /approvals/policies, the Inbox at /approvals),
 * and Source app / Entity type became pickers, so the first consumer used
 * here is Planning › Activity (dev's "Recipe approvals" is priority 0 and
 * can't be outranked by a test policy).
 *
 * Policies are shared state. Every policy this file touches is its own,
 * created inactive, and switched on only around its own sends
 * (support/approvals.ts). alice (Approvals admin) sends; carol (the
 * READONLY persona, approval.user) approves.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;

const APPLIES_TO = 'planning · activity';
const READONLY_SKIP = personaSkipReason('READONLY');

test.describe('Planning - Generic Approval Workflow', () => {
  // Withdraws / deletes / deactivates this file's QA-AUTO approval data, then
  // the regression suite's usual cleanup (the XAP-05 recipe).
  cleanUpApprovalsAfterAll();
  cleanUpAfterAll();

  test.beforeEach(async () => {
    // Cases create their own QA-AUTO policies and activities through the UI.
    test.setTimeout(300_000);
    await allure.epic('Planning');
    await allure.feature('Generic Approval Workflow');
    await allure.owner('Planning QA');
  });

  // ── Policies (inactive QA-AUTO policies only; runs in parallel) ─────────

  test.describe('Policies', () => {
    /** A one-level policy (L1 "QA review" = Carol), inactive: this worker's fixture. */
    let policyA = '';

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      // One per parallel slot (cases here edit and re-read it), kept across worker restarts.
      policyA = await oncePerRun(`A-${process.env.TEST_PARALLEL_INDEX ?? '0'}`, async () => {
        const page = await setupPage(browser);
        const name = await createPolicy(page, {
          name: policyName('A'),
          levels: [{ name: 'QA review', from: 'Users', who: [CAROL] }],
        });
        await page.close();
        return name;
      });
      watchPolicies(policyA);
    });

    // ── List Approval Policies ──

    test('TC-LAP-01 Policies opens from the Approvals app navigation', async ({
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu89'), 'TC-LAP-01 (ClickUp)');
      // Moved 2026-11-12: Approvals is its own app (Inbox + Policies), no longer Control Center.
      await approvalPoliciesPage.openFromApprovalsNav();
      await approvalPoliciesPage.expectNavLinks();
      await approvalPoliciesPage.expectOnPolicies();
    });

    test('TC-LAP-02 The policy grid shows the expected columns', async ({
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu8a'), 'TC-LAP-02 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.expectColumnHeaders([
        'Policy',
        'Applies to',
        'Priority (lower wins)',
        'Levels',
        'Self-approval',
        'Submitter can withdraw',
        'Description',
        'Version',
        'Status',
      ]);
      for (const value of await approvalPoliciesPage.columnValues('Self-approval'))
        expect(['Blocked', 'Allowed']).toContain(value);
      for (const value of await approvalPoliciesPage.columnValues('Submitter can withdraw'))
        expect(['Yes', 'No']).toContain(value);
      // The suite's own policy, rather than the seeded ones (they differ per environment).
      await approvalPoliciesPage.findRow(policyA);
      await approvalPoliciesPage.expectCell(policyA, 'Applies to', APPLIES_TO);
      await approvalPoliciesPage.expectCell(policyA, 'Priority (lower wins)', '100');
      await approvalPoliciesPage.expectCell(policyA, 'Levels', '1');
      await approvalPoliciesPage.expectCell(policyA, 'Self-approval', 'Blocked');
      await approvalPoliciesPage.expectCell(policyA, 'Submitter can withdraw', 'Yes');
      await approvalPoliciesPage.expectCell(policyA, 'Version', /^\d+$/);
      await approvalPoliciesPage.expectCell(policyA, 'Status', 'Inactive');
    });

    test('TC-LAP-03 All / Active / Inactive tabs count and filter the policies', async ({
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu8b'), 'TC-LAP-03 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.expectTabs(['All', 'Active', 'Inactive']);
      await approvalPoliciesPage.expectTabCountsAddUp(['Active', 'Inactive']);
      await approvalPoliciesPage.selectTab('Inactive');
      await approvalPoliciesPage.expectEveryRowHas('Status', 'Inactive');
      await approvalPoliciesPage.search(policyA);
      await approvalPoliciesPage.expectRowVisible(policyA);
      await approvalPoliciesPage.clearSearch();
      await approvalPoliciesPage.selectTab('Active');
      await approvalPoliciesPage.expectEveryRowHas('Status', 'Active');
    });

    test('TC-LAP-04 Search finds a policy by name, source app or entity type', async ({
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu8c'), 'TC-LAP-04 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.expectSearchPlaceholder('Search by policy, app or entity type');
      await approvalPoliciesPage.search(policyA);
      await approvalPoliciesPage.expectRowVisible(policyA);
      await approvalPoliciesPage.expectEveryRowMatches(policyA);
      for (const term of ['activity', 'planning']) {
        await test.step(`"${term}" matches on the app / entity type`, async () => {
          await approvalPoliciesPage.search(term);
          await approvalPoliciesPage.expectEveryRowMatches(term);
        });
      }
      await approvalPoliciesPage.search(`no-such-policy-${Date.now()}`);
      await approvalPoliciesPage.expectNoMatchState();
    });

    test('TC-LAP-05 Per-column cell filters narrow the grid', async ({ approvalPoliciesPage }) => {
      await allure.tms(cu('z941abyu8d'), 'TC-LAP-05 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      const all = (await approvalPoliciesPage.showing()).total;
      await approvalPoliciesPage.showCellFilters();
      expect(await approvalPoliciesPage.columnFilterOptions('Self-approval')).toEqual(
        expect.arrayContaining(['Allowed', 'Blocked']),
      );
      expect(await approvalPoliciesPage.columnFilterOptions('Submitter can withdraw')).toEqual(
        expect.arrayContaining(['Yes', 'No']),
      );
      expect(await approvalPoliciesPage.columnFilterOptions('Status')).toEqual(
        expect.arrayContaining(['Active', 'Inactive']),
      );
      await approvalPoliciesPage.filterColumn('Applies to', 'activity');
      await approvalPoliciesPage.expectEveryRowMatches('activity');
      await approvalPoliciesPage.filterColumnBy('Status', 'Inactive');
      await approvalPoliciesPage.expectEveryRowHas('Status', 'Inactive');
      await approvalPoliciesPage.filterColumn('Applies to', '');
      await approvalPoliciesPage.filterColumnBy('Status', 'All Status');
      await expect.poll(async () => (await approvalPoliciesPage.showing()).total).toBe(all);
    });

    test('TC-LAP-06 Sortable columns sort the policies', async ({ approvalPoliciesPage }) => {
      await allure.tms(cu('z941abyu8e'), 'TC-LAP-06 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      const column = 'Priority (lower wins)';
      // Rows scrolled out of the grid's viewport render empty cells: skip those.
      const priorities = async () =>
        (await approvalPoliciesPage.columnValues(column)).filter(Boolean).map(Number);
      await approvalPoliciesPage.sortAndWait(column);
      await expect
        .poll(
          async () => {
            const values = await priorities();
            return values.join() === [...values].sort((a, b) => a - b).join();
          },
          { message: 'priorities ascending, as numbers' },
        )
        .toBe(true);
      await approvalPoliciesPage.sortAndWait(column);
      await expect
        .poll(
          async () => {
            const values = await priorities();
            return values.join() === [...values].sort((a, b) => b - a).join();
          },
          { message: 'priorities descending, as numbers' },
        )
        .toBe(true);
      for (const plain of ['Levels', 'Self-approval', 'Description', 'Version', 'Status'])
        await approvalPoliciesPage.expectNotSortable(plain);
    });

    test('TC-LAP-07 Clicking a policy row opens Edit policy', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8f'), 'TC-LAP-07 (ClickUp)');
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.expectOnEdit();
      await approvalPolicyFormPage.expectValue('policyName', policyA);
      await approvalPolicyFormPage.backToPolicies();
    });

    test('TC-LAP-08 Columns, best-fit and split-view controls work on the policy grid', async ({
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu8g'), 'TC-LAP-08 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      try {
        await approvalPoliciesPage.hideColumn('Description');
        await approvalPoliciesPage.expectColumnHidden('Description');
        await approvalPoliciesPage.open();
        await approvalPoliciesPage.expectLoaded();
        await approvalPoliciesPage.expectColumnHidden('Description');
      } finally {
        await approvalPoliciesPage.resetColumns();
      }
      await approvalPoliciesPage.expectColumnVisible('Description');
      // Best-fit toggles on (columns sized to content) and off again.
      await approvalPoliciesPage.toggleBestFit(true);
      await approvalPoliciesPage.toggleBestFit(false);
      await approvalPoliciesPage.expectColumnVisible('Policy');
      // The split views list the policies as cards beside / above the selected one's detail.
      for (const view of ['Vertical split', 'Horizontal split'] as const) {
        await approvalPoliciesPage.switchView(view);
        await approvalPoliciesPage.expectViewActive(view);
        await approvalPoliciesPage.expectSplitDetail();
      }
      await approvalPoliciesPage.switchView('No split');
      await approvalPoliciesPage.expectViewActive('No split');
      await approvalPoliciesPage.expectGridVisible();
    });

    test('TC-LAP-09 Paging controls on the policy grid', async ({ approvalPoliciesPage }) => {
      await allure.tms(cu('z941abyu8h'), 'TC-LAP-09 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await expect(approvalPoliciesPage.grid.rowsPerPage).toContainText('25');
      const { from, to, total } = await approvalPoliciesPage.showing();
      expect(from).toBe(1);
      expect(to).toBe(Math.min(25, total));
      if (total <= 25) await expect(approvalPoliciesPage.grid.nextPageButton).toBeDisabled();
      else await expect(approvalPoliciesPage.grid.nextPageButton).toBeEnabled();
      await expect(approvalPoliciesPage.grid.previousPageButton).toBeDisabled();
    });

    test("TC-LAP-10 A user without Approvals admin rights can't reach Policies", async ({
      personas,
    }) => {
      await allure.tms(cu('z941abyu8j'), 'TC-LAP-10 (ClickUp)');
      // carol holds approval.user (Inbox only), not Approvals admin.
      test.skip(!personaCredentials('READONLY'), READONLY_SKIP);
      await asPersona(personas, 'READONLY', async (page) => {
        await new ApprovalPoliciesPage(page).expectNoPolicyAccess();
      });
    });

    // ── Create Approval Policy ──

    test('TC-CAP-01 New policy opens with the documented defaults', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8k'), 'TC-CAP-01 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.expectOnNew();
      await approvalPolicyFormPage.expectDefaults();
    });

    test('TC-CAP-02 Saving an empty form flags the required fields and sends nothing', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8m'), 'TC-CAP-02 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.saveExpectingBlocked();
      await approvalPolicyFormPage.expectInvalid('policyName');
      await approvalPolicyFormPage.expectInvalid('levelName');
      await approvalPolicyFormPage.expectRequiredCount(3);
    });

    test("TC-CAP-03 A level can't be saved without any approver", async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8p'), 'TC-CAP-03 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.fillNew({
        name: policyName('no approver'),
        active: false,
        levels: [{ name: 'L1' }],
      });
      await test.step('Users with nobody added', async () => {
        await approvalPolicyFormPage.setApproverSource('Users');
        await approvalPolicyFormPage.saveExpectingBlocked();
        await approvalPolicyFormPage.expectPickSomeoneMessage();
      });
      for (const from of ['A permission', 'A group'] as const) {
        await test.step(`${from} with nothing picked`, async () => {
          await approvalPolicyFormPage.setApproverSource(from);
          await approvalPolicyFormPage.saveExpectingBlocked();
          await approvalPolicyFormPage.expectRequiredCount(1);
        });
      }
    });

    test('TC-CAP-04 Create a one-level policy with named users', async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8q'), 'TC-CAP-04 (ClickUp)');
      const name = await createPolicy(page, {
        name: policyName('one level'),
        levels: [{ name: 'QA review', quorum: 'Any one approves', from: 'Users', who: [CAROL] }],
      });
      await approvalPoliciesPage.findRow(name);
      await approvalPoliciesPage.expectCell(name, 'Applies to', APPLIES_TO);
      await approvalPoliciesPage.expectCell(name, 'Priority (lower wins)', '100');
      await approvalPoliciesPage.expectCell(name, 'Levels', '1');
      await approvalPoliciesPage.expectCell(name, 'Self-approval', 'Blocked');
      await approvalPoliciesPage.expectCell(name, 'Submitter can withdraw', 'Yes');
      await approvalPoliciesPage.expectCell(name, 'Description', GA_TAG);
      await approvalPoliciesPage.expectCell(name, 'Version', '1');
      await approvalPoliciesPage.openPolicy(name);
      expect(await approvalPolicyFormPage.levelSummary(1)).toBe('L1 QA review · 1 user');
      await approvalPolicyFormPage.expandLevel(1);
      await approvalPolicyFormPage.expectApproverChip(CAROL);
      await approvalPolicyFormPage.cancel();
    });

    test('TC-CAP-05 "Approvers come from" offers a permission, a group or users, each with its own picker', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8r'), 'TC-CAP-05 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      expect(await approvalPolicyFormPage.approverSourceOptions()).toEqual([
        'A permission',
        'A group',
        'Users',
      ]);
      await test.step('A permission: roles with their descriptions', async () => {
        await approvalPolicyFormPage.expectWhoPlaceholder('Select a permission…');
        const roles = await approvalPolicyFormPage.whoSuggestions();
        expect(roles.length).toBeGreaterThan(0);
        for (const role of roles) expect(role).toMatch(/^\S+ — .+/);
      });
      await test.step('A group: its own picker and the direct-members hint', async () => {
        await approvalPolicyFormPage.setApproverSource('A group');
        await approvalPolicyFormPage.expectWhoPlaceholder('Select a group…');
        await approvalPolicyFormPage.expectGroupHint();
      });
      await test.step('Users: each added person shows as a chip', async () => {
        await approvalPolicyFormPage.setApproverSource('Users');
        await approvalPolicyFormPage.expectWhoPlaceholder('Add a person…');
        await approvalPolicyFormPage.addApprover(CAROL);
        await approvalPolicyFormPage.expectApproverChip(CAROL);
      });
    });

    test('TC-CAP-06 Picking a role that cannot approve shows a warning', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8t'), 'TC-CAP-06 (ClickUp)');
      // BA on z941abyqjn (2026-10-15): every role is offered by design; one
      // without approval.user is flagged with a warning instead.
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.addApprover('app.bom');
      await approvalPolicyFormPage.expectApproverWarning(
        /The permission "app\.bom" doesn't include approval\.user/,
      );
    });

    test('TC-CAP-07 Quorum offers any-one and everyone', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8u'), 'TC-CAP-07 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      expect(await approvalPolicyFormPage.quorumOptions()).toEqual([
        'Any one approves',
        'Everyone must approve',
      ]);
    });

    test('TC-CAP-08 Turning Remind on reveals the reminder settings', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8w'), 'TC-CAP-08 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.pickApp('Planning', 'Activity');
      await approvalPolicyFormPage.expectSwitch('Remind', false, 'No');
      await approvalPolicyFormPage.toggleSwitch('Remind');
      await approvalPolicyFormPage.expectSwitch('Remind', true, 'Yes');
      await approvalPolicyFormPage.expectMaxRemindersDefault();
      await approvalPolicyFormPage.expectFieldVisible('remindEvery');
    });

    test('TC-CAP-09 Turning Escalate on reveals the escalation settings and requires a target', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8x'), 'TC-CAP-09 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.fillNew({
        name: policyName('escalate'),
        active: false,
        levels: [{ name: 'L1', from: 'Users', who: [CAROL] }],
      });
      await approvalPolicyFormPage.toggleSwitch('Escalate');
      await approvalPolicyFormPage.expectSwitch('Escalate', true, 'Yes');
      await approvalPolicyFormPage.expectEscalationMode('add approvers');
      expect(await approvalPolicyFormPage.escalationModeOptions()).toEqual([
        'add approvers',
        'replace approvers',
      ]);
      // Dev later added "A resolver"; the three original kinds must stay offered.
      expect(await approvalPolicyFormPage.escalateToOptions()).toEqual(
        expect.arrayContaining(['A permission', 'A group', 'Users']),
      );
      // The step has no name or target yet: refused, nothing saved.
      await approvalPolicyFormPage.saveExpectingBlocked();
      await approvalPolicyFormPage.expectEscalationStepMessage();
    });

    test('TC-CAP-10 Turning Expire on reveals what happens on expiry', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8y'), 'TC-CAP-10 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.pickApp('Planning', 'Activity');
      await approvalPolicyFormPage.toggleSwitch('Expire');
      await approvalPolicyFormPage.expectSwitch('Expire', true, 'Yes');
      await approvalPolicyFormPage.expectOnExpiry('expire - end the request');
      expect(await approvalPolicyFormPage.onExpiryOptions()).toEqual([
        'hold - mark it late, decide anyway',
        'expire - end the request',
        'auto-reject - end it as rejected',
      ]);
      await approvalPolicyFormPage.expectFieldVisible('expireAfter');
    });

    test('TC-CAP-11 Timing unlocks once the source app and entity type are picked', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu8z'), 'TC-CAP-11 (ClickUp)');
      // Since 2026-11-12 a level's timing is per policy: the note says level 1
      // uses the shared planning / activity timing until this policy gets its own.
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.expectTimingLocked();
      await approvalPolicyFormPage.pickApp('Planning', 'Activity');
      await approvalPolicyFormPage.expectTimingUnlocked();
      await approvalPolicyFormPage.expectSharedTiming(1, 'planning / activity');
      const calendars = await approvalPolicyFormPage.calendarOptions();
      expect(calendars[0]).toBe('None - every hour counts');
      expect(await approvalPolicyFormPage.daysUnitOptions()).toEqual(['days', 'hours']);
    });

    test('TC-CAP-12 Add a level and remove a level', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu90'), 'TC-CAP-12 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.expandLevel(1);
      await approvalPolicyFormPage.fillLevel({ name: 'QA L1' });
      await approvalPolicyFormPage.expectRemoveLevelButtons(0);
      await approvalPolicyFormPage.addLevel();
      await approvalPolicyFormPage.expectRemoveLevelButtons(2);
      await approvalPolicyFormPage.expandLevel(2);
      await approvalPolicyFormPage.fillLevel({ name: 'QA L2', from: 'Users', who: [CAROL] });
      await approvalPolicyFormPage.removeLevel(2);
      await approvalPolicyFormPage.expectRemoveLevelButtons(0);
      await approvalPolicyFormPage.expandLevel(1);
      await expect(approvalPolicyFormPage.locators.levelName).toHaveValue('QA L1');
    });

    test('TC-CAP-13 Create a two-level policy with "Everyone must approve" on L2', async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu91'), 'TC-CAP-13 (ClickUp)');
      const name = await createPolicy(page, {
        name: policyName('two levels'),
        selfApproval: true,
        levels: [
          { name: 'QA L1', from: 'Users', who: [CAROL] },
          { name: 'QA L2', quorum: 'Everyone must approve', from: 'Users', who: [CAROL, ALICE] },
        ],
      });
      await approvalPoliciesPage.findRow(name);
      await approvalPoliciesPage.expectCell(name, 'Levels', '2');
      await approvalPoliciesPage.openPolicy(name);
      expect(await approvalPolicyFormPage.levelSummary(1)).toBe('L1 QA L1 · 1 user');
      expect(await approvalPolicyFormPage.levelSummary(2)).toBe('L2 QA L2 · 2 users');
      await approvalPolicyFormPage.expandLevel(2);
      await approvalPolicyFormPage.expectQuorum('Everyone must approve');
      await approvalPolicyFormPage.cancel();
    });

    test('TC-CAP-14 Priority accepts only a sensible whole number', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu92'), 'TC-CAP-14 (ClickUp)');
      await allure.tms(cu('z941abyqjp'), 'TC-CAP-14 bug (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await approvalPolicyFormPage.fillNew({
        name: policyName('priority'),
        active: false,
        levels: [{ name: 'L1', from: 'Users', who: [CAROL] }],
      });
      await test.step('Blank is refused', async () => {
        await approvalPolicyFormPage.setPriority('');
        await approvalPolicyFormPage.saveExpectingBlocked();
        await approvalPolicyFormPage.expectRequiredCount(1);
      });
      await test.step('"abc" is refused', async () => {
        await approvalPolicyFormPage.typePriority('abc');
        await approvalPolicyFormPage.saveExpectingBlocked();
        await approvalPolicyFormPage.expectRequiredCount(1);
      });
      await test.step('"1.5" is refused with the range message', async () => {
        await approvalPolicyFormPage.typePriority('1.5');
        await approvalPolicyFormPage.saveExpectingBlocked();
        await approvalPolicyFormPage.expectPriorityRangeMessage();
      });
      // ClickUp z941abyqjp (blank, "abc" and "-5" all saved wrongly) is fixed on dev, so no knownBug().
      await test.step('"-5" is refused, not saved as 5', async () => {
        await approvalPolicyFormPage.typePriority('-5');
        const outcome = await approvalPolicyFormPage.save();
        expect(outcome.saved, `"-5" saved with priority ${outcome.priority}`).toBe(false);
      });
    });

    test('TC-CAP-15 Source app and entity type are picked from the registered ones', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu94'), 'TC-CAP-15 (ClickUp)');
      // Clarification z941abyqjt closed 2026-11-12: both are now pickers of
      // registered apps / entity types, so a typo can't be entered.
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      await expect(approvalPolicyFormPage.locators.entityType).toBeDisabled();
      const apps = await approvalPolicyFormPage.sourceAppOptions();
      expect(apps).toContain('Planning');
      expect(apps).not.toContain('planing');
      await approvalPolicyFormPage.pickApp('Planning', 'Activity');
      expect(await approvalPolicyFormPage.entityTypeOptions()).toEqual(
        expect.arrayContaining(['Recipe', 'Activity']),
      );
    });

    test('TC-CAP-16 Two policies for the same app and entity type', async ({
      page,
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu95'), 'TC-CAP-16 (ClickUp)');
      const second = await createPolicy(page, {
        name: policyName('A2'),
        priority: '50',
        levels: [{ name: 'QA review', from: 'Users', who: [CAROL] }],
      });
      for (const [name, priority] of [
        [policyA, '100'],
        [second, '50'],
      ] as const) {
        await approvalPoliciesPage.findRow(name);
        await approvalPoliciesPage.expectCell(name, 'Applies to', APPLIES_TO);
        await approvalPoliciesPage.expectCell(name, 'Priority (lower wins)', priority);
      }
    });

    test('TC-CAP-17 Switch labels follow their state', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu96'), 'TC-CAP-17 (ClickUp)');
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.openNew();
      const switches = [
        ['Active', true, 'Yes', 'No'],
        ['Self-approval', false, 'Blocked', 'Allowed'],
        ['Submitter can withdraw', true, 'Yes', 'No'],
        ['Approvers may add levels', true, 'Yes', 'No'],
      ] as const;
      for (const [name, on, label, flipped] of switches) {
        await test.step(name, async () => {
          await approvalPolicyFormPage.expectSwitch(name, on, label);
          await approvalPolicyFormPage.toggleSwitch(name);
          await approvalPolicyFormPage.expectSwitch(name, !on, flipped);
          await approvalPolicyFormPage.toggleSwitch(name);
          await approvalPolicyFormPage.expectSwitch(name, on, label);
        });
      }
    });

    test('TC-CAP-18 Cancel and Back discard a new policy', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu98'), 'TC-CAP-18 (ClickUp)');
      for (const leave of ['Cancel', 'Back to policies'] as const) {
        await test.step(leave, async () => {
          const name = gaName(`${uniqueTag('GA-X')} discard me`);
          await approvalPoliciesPage.open();
          await approvalPoliciesPage.expectLoaded();
          await approvalPoliciesPage.openNew();
          await approvalPolicyFormPage.pickApp('Planning', 'Activity');
          await approvalPolicyFormPage.applyChanges({ name });
          if (leave === 'Cancel') await approvalPolicyFormPage.cancel();
          else await approvalPolicyFormPage.backToPolicies();
          await approvalPoliciesPage.search(name);
          await approvalPoliciesPage.expectNoMatchState();
        });
      }
    });

    // ── Edit Approval Policy ──

    test('TC-EAP-01 Edit policy shows the policy with source app and entity type locked', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu99'), 'TC-EAP-01 (ClickUp)');
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.expectOnEdit();
      await approvalPolicyFormPage.expectIdentityLocked('Planning', 'Activity');
      expect(await approvalPolicyFormPage.levelSummary(1)).toBe('L1 QA review · 1 user');
      await approvalPolicyFormPage.expandLevel(1);
      await approvalPolicyFormPage.expectApproverChip(CAROL);
      await approvalPolicyFormPage.expectSharedTiming(1, 'planning / activity');
      await approvalPolicyFormPage.cancel();
    });

    test('TC-EAP-02 Saving a change bumps the version', async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu9a'), 'TC-EAP-02 (ClickUp)');
      await approvalPoliciesPage.findRow(policyA);
      const before = await approvalPoliciesPage.version(policyA);
      const description = `${GA_TAG} (edited ${uniqueTag('E')})`;
      const version = await editPolicy(page, policyA, { description });
      expect(version).toBe(before + 1);
      await approvalPoliciesPage.findRow(policyA);
      await approvalPoliciesPage.expectCell(policyA, 'Version', String(before + 1));
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.expectValue('description', description);
      await approvalPolicyFormPage.cancel();
    });

    test("TC-EAP-03 Saving with no changes doesn't bump the version", async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu9b'), 'TC-EAP-03 (ClickUp)');
      // z941abyqjq closed 2026-11-12: Save stays disabled until something changes.
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.expectSaveDisabled();
      await approvalPolicyFormPage.applyChanges({ description: `${GA_TAG} (unsaved)` });
      await approvalPolicyFormPage.expectSaveEnabled();
      await approvalPolicyFormPage.cancel();
    });

    test('TC-EAP-06 Remove a level from an existing policy', async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu9f'), 'TC-EAP-06 (ClickUp)');
      const name = await createPolicy(page, {
        name: policyName('B two levels'),
        levels: [
          { name: 'QA L1', from: 'Users', who: [CAROL] },
          { name: 'QA L2', from: 'Users', who: [CAROL] },
        ],
      });
      await approvalPoliciesPage.openPolicy(name);
      await approvalPolicyFormPage.removeLevel(2);
      const { version } = await approvalPolicyFormPage.saveOk();
      expect(version).toBe(2);
      await approvalPoliciesPage.findRow(name);
      await approvalPoliciesPage.expectCell(name, 'Levels', '1');
      await approvalPoliciesPage.expectCell(name, 'Version', '2');
      await approvalPoliciesPage.openPolicy(name);
      expect(await approvalPolicyFormPage.levelSummary(1)).toBe('L1 QA L1 · 1 user');
      await approvalPolicyFormPage.cancel();
    });

    test("TC-EAP-07 A policy's own timing doesn't retime the other policies for the same app and entity type", async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu9m'), 'TC-EAP-07 (ClickUp)');
      // Changed 2026-11-12 (dev): timing used to be shared per app / entity
      // type; it is now per policy ("A change here gives this policy its own").
      const timed = await createPolicy(page, {
        name: policyName('own timing'),
        levels: [
          {
            name: 'QA review',
            from: 'Users',
            who: [CAROL],
            daysToComplete: { value: '7', unit: 'hours' },
          },
        ],
      });
      await approvalPoliciesPage.openPolicy(timed);
      await approvalPolicyFormPage.expandLevel(1);
      await approvalPolicyFormPage.expectOwnTiming(1);
      expect(await approvalPolicyFormPage.daysToComplete()).toEqual({ value: '7', unit: 'hours' });
      await approvalPolicyFormPage.cancel();
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.expandLevel(1);
      await approvalPolicyFormPage.expectSharedTiming(1, 'planning / activity');
      expect(await approvalPolicyFormPage.daysToComplete()).not.toEqual({
        value: '7',
        unit: 'hours',
      });
      await approvalPolicyFormPage.cancel();
    });

    test('TC-EAP-08 Cancel discards edits', async ({
      approvalPoliciesPage,
      approvalPolicyFormPage,
    }) => {
      await allure.tms(cu('z941abyu9v'), 'TC-EAP-08 (ClickUp)');
      await approvalPoliciesPage.findRow(policyA);
      const before = await approvalPoliciesPage.version(policyA);
      await approvalPoliciesPage.openPolicy(policyA);
      await approvalPolicyFormPage.applyChanges({ name: `${policyA} SHOULD NOT PERSIST` });
      await approvalPolicyFormPage.cancel();
      await approvalPoliciesPage.findRow(policyA);
      await approvalPoliciesPage.expectCell(policyA, 'Version', String(before));
      await approvalPoliciesPage.search('SHOULD NOT PERSIST');
      await approvalPoliciesPage.expectNoMatchState();
    });
  });

  // ── Requests and the approval lifecycle (one worker, in order) ──────────

  test.describe('Lifecycle', () => {
    // Each case switches the file's own policies on around its own sends, so
    // the cases run one after another in one worker: two cases' policies
    // must never be active together.
    test.describe.configure({ mode: 'default' });
    test.skip(!personaCredentials('READONLY'), READONLY_SKIP);

    const LEVEL_CAROL = 'QA L1 carol';
    const LEVEL_ALICE = 'QA L1 alice';
    const LEVEL_BOTH = 'QA L1 alice and carol';
    const LEVEL_L2 = 'QA L2 carol';
    const LEVEL_PERMISSION = 'QA L1 approval.user';
    /** L1 = Carol (any one), 2 hours to complete, priority 20. */
    let pCarol = '';
    /** L1 = Alice, self-approval allowed, priority 10 (wins over pCarol). */
    let pAlice = '';
    /** L1 = Alice, L2 = Carol, self-approval allowed. */
    let pTwo = '';
    /** L1 = Alice + Carol, everyone must approve, self-approval allowed. */
    let pBoth = '';
    /** L1 = the approval.user permission. */
    let pPermission = '';
    /** A request left pending under pCarol for the read-only cases. */
    let r0: CreatedActivity & { request: string };

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(600_000);
      const page = await setupPage(browser);
      // Created once per run and reused after a worker restart (see oncePerRun).
      ({ pCarol, pAlice, pTwo, pBoth, pPermission } = await oncePerRun('lifecycle', async () => ({
        pCarol: await createPolicy(page, {
          name: policyName('carol'),
          priority: '20',
          levels: [
            {
              name: LEVEL_CAROL,
              from: 'Users',
              who: [CAROL],
              daysToComplete: { value: '2', unit: 'hours' },
            },
          ],
        }),
        pAlice: await createPolicy(page, {
          name: policyName('alice'),
          priority: '10',
          selfApproval: true,
          levels: [{ name: LEVEL_ALICE, from: 'Users', who: [ALICE] }],
        }),
        pTwo: await createPolicy(page, {
          name: policyName('two levels'),
          priority: '20',
          selfApproval: true,
          levels: [
            { name: LEVEL_ALICE, from: 'Users', who: [ALICE] },
            { name: LEVEL_L2, from: 'Users', who: [CAROL] },
          ],
        }),
        pBoth: await createPolicy(page, {
          name: policyName('everyone'),
          priority: '20',
          selfApproval: true,
          levels: [
            {
              name: LEVEL_BOTH,
              quorum: 'Everyone must approve',
              from: 'Users',
              who: [ALICE, CAROL],
            },
          ],
        }),
        pPermission: await createPolicy(page, {
          name: policyName('permission'),
          priority: '20',
          levels: [{ name: LEVEL_PERMISSION, from: 'A permission', who: ['approval.user'] }],
        }),
      })));
      watchPolicies(pCarol, pAlice, pTwo, pBoth, pPermission);
      r0 = await sendFresh(page, [pCarol]);
      await page.close();
    });

    /** The pending request's page, opened from the Inbox. */
    async function openR0(page: import('@playwright/test').Page): Promise<ApprovalRequestPage> {
      const request = new ApprovalRequestPage(page);
      await request.openFromInbox(r0.request);
      return request;
    }

    // ── With no policy in force ──

    test('TC-XAP-13 Sending for approval with no active policy gives a clear message', async ({
      page,
      approvalPoliciesPage,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyun9'), 'TC-XAP-13 (ClickUp)');
      const others = await approvalPoliciesPage.activePoliciesFor(APPLIES_TO);
      test.skip(
        others.length > 0,
        `An active ${APPLIES_TO} policy not created by this suite is in force (${others.join(', ')}), so a send would go through.`,
      );
      const activity = await createActivity(page);
      await approvalPanelPage.open(activity.path);
      await approvalPanelPage.sendExpectingNoPolicy();
      await approvalPanelPage.reload();
      await approvalPanelPage.expectRecordStatus('Draft');
      await approvalPanelPage.expectEditableAgain();
    });

    // ── The pending request (r0) ──

    test('TC-XAP-01 Send for approval creates a request and locks the record', async ({
      approvalPanelPage,
      approvalsInboxPage,
    }) => {
      await allure.tms(cu('z941abyuah'), 'TC-XAP-01 (ClickUp)');
      // First consumer here is Planning › Activity (see the file comment).
      await approvalPanelPage.open(r0.path);
      await approvalPanelPage.expectRecordStatus('Pending approval');
      await approvalPanelPage.expectPendingBanner(r0.request);
      await approvalPanelPage.expectRequestStatus(`${r0.request} Pending`);
      await approvalPanelPage.expectChain(`L1 · ${LEVEL_CAROL} Reviewing`);
      await approvalPanelPage.expectChain('Carol Pending');
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.selectTab('Pending');
      await approvalsInboxPage.search(r0.request);
      await approvalsInboxPage.expectRowContains(r0.request, 'Pending');
    });

    test("TC-XAP-02 A pending record can't be edited", async ({ approvalPanelPage }) => {
      await allure.tms(cu('z941abyuaj'), 'TC-XAP-02 (ClickUp)');
      await approvalPanelPage.open(r0.path);
      await approvalPanelPage.expectPendingBanner(r0.request);
      await approvalPanelPage.expectLocked();
      await approvalPanelPage.expectEditRouteRefused(r0.path);
    });

    test('TC-XAP-03 The approver sees decision buttons; the submitter sees Withdraw', async ({
      personas,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyuak'), 'TC-XAP-03 (ClickUp)');
      await asPersona(personas, 'READONLY', async (page) => {
        const panel = new ApprovalPanelPage(page);
        await panel.open(r0.path);
        await panel.expectDecisionButtons(['Approve', 'Approve and add levels', 'Reject']);
      });
      // alice is also an Approvals admin, who may decide any request (Approvals
      // app story z941ac172n), so only her Withdraw is checked here.
      await approvalPanelPage.open(r0.path);
      await expect(approvalPanelPage.locators.withdrawButton).toBeVisible();
    });

    test('TC-LAR-01 The Inbox opens from the Approvals app', async ({
      approvalsInboxPage,
      approvalPoliciesPage,
    }) => {
      await allure.tms(cu('z941abyu9z'), 'TC-LAR-01 (ClickUp)');
      // "All requests" in Control Center became the Approvals Inbox on 2026-11-12.
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectAdminInbox();
      await approvalPoliciesPage.expectNavLinks();
    });

    test('TC-LAR-02 The request grid shows the expected columns', async ({
      approvalsInboxPage,
    }) => {
      await allure.tms(cu('z941abyua0'), 'TC-LAR-02 (ClickUp)');
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.expectColumnHeaders([
        'Request',
        'Subject',
        'From',
        'Your part',
        'Submitted by',
        'Submitted',
        'Due',
        'Status',
      ]);
      await approvalsInboxPage.expectNewestFirst();
      await approvalsInboxPage.search(r0.request);
      await approvalsInboxPage.expectRowVisible(r0.request);
      expect(await approvalsInboxPage.cellValue(r0.request, 'Subject')).toBe(
        `Activity ${r0.code} revision 1 - ${r0.name}`,
      );
      expect(await approvalsInboxPage.cellValue(r0.request, 'From')).toBe(APPLIES_TO);
      expect(await approvalsInboxPage.cellValue(r0.request, 'Submitted by')).toBe(ALICE);
      expect(await approvalsInboxPage.cellValue(r0.request, 'Submitted')).toMatch(
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
      );
      expect(await approvalsInboxPage.cellValue(r0.request, 'Status')).toBe('Pending');
    });

    test('TC-LAR-03 Status tabs, including the overflow, count and filter correctly', async ({
      approvalsInboxPage,
    }) => {
      await allure.tms(cu('z941abyua1'), 'TC-LAR-03 (ClickUp)');
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.expectTabs(['All', 'Pending', 'Approved', 'Rejected']);
      await approvalsInboxPage.expectStatusCountsAddUp(
        ['Pending', 'Approved', 'Rejected'],
        ['Withdrawn', 'Expired'],
      );
      await approvalsInboxPage.selectTab('Pending');
      await approvalsInboxPage.expectTabCountMatchesRows('Pending');
      await approvalsInboxPage.expectEveryRowMatches('Pending');
      await approvalsInboxPage.selectMoreTab('Withdrawn');
      await approvalsInboxPage.expectEveryRowMatches('Withdrawn');
    });

    test('TC-LAR-04 Search finds a request by code, subject or record code', async ({
      approvalsInboxPage,
    }) => {
      await allure.tms(cu('z941abyua2'), 'TC-LAR-04 (ClickUp)');
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.expectSearchPlaceholder('Search by request, subject or record code');
      for (const term of [r0.request, r0.code, r0.name.split(' — ')[0]!]) {
        await test.step(`"${term}"`, async () => {
          await approvalsInboxPage.search(term);
          await approvalsInboxPage.expectRowVisible(r0.request);
          await approvalsInboxPage.expectEveryRowMatches(term);
        });
      }
      await approvalsInboxPage.search(`no-such-request-${Date.now()}`);
      await approvalsInboxPage.expectNoMatchState();
    });

    test('TC-LAR-05 Filters panel narrows requests', async ({ approvalsInboxPage }) => {
      await allure.tms(cu('z941abyua3'), 'TC-LAR-05 (ClickUp)');
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.addRule('Record code', r0.code);
      await approvalsInboxPage.expectFiltersBadge(1);
      await approvalsInboxPage.expectRowVisible(r0.request);
      await approvalsInboxPage.expectEveryRowMatches(r0.code);
      await approvalsInboxPage.clearRule();
      await approvalsInboxPage.expectNoFiltersBadge();
    });

    test('TC-LAR-06 Due shows time left on pending requests and a dash once decided', async ({
      approvalsInboxPage,
    }) => {
      await allure.tms(cu('z941abyua4'), 'TC-LAR-06 (ClickUp)');
      // r0's policy gives level 1 two hours; the countdown rounds up to days.
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      await approvalsInboxPage.search(r0.request);
      await approvalsInboxPage.expectRowVisible(r0.request);
      expect(await approvalsInboxPage.cellValue(r0.request, 'Due')).toMatch(
        /^[A-Z][a-z]{2} \d{1,2}\s+(\d+[dhm] left|\d+[dhm] overdue)$/,
      );
      await approvalsInboxPage.clearSearch();
      await approvalsInboxPage.selectTab('Approved');
      await expect
        .poll(async () =>
          (await approvalsInboxPage.columnValues('Due')).filter((d) => d && d !== '—'),
        )
        .toEqual([]);
    });

    test('TC-LAR-07 Clicking a request opens its page', async ({
      approvalsInboxPage,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyua5'), 'TC-LAR-07 (ClickUp)');
      await approvalsInboxPage.findRow(r0.request);
      await approvalsInboxPage.openRow(r0.request);
      await approvalRequestPage.expectLoaded(r0.request);
    });

    test('TC-LAR-08 An approver finds what waits on them in their own Inbox', async ({
      personas,
    }) => {
      await allure.tms(cu('z941abyua6'), 'TC-LAR-08 (ClickUp)');
      // Skipped in October (approver inbox not built yet, z941abyqhx); the
      // Approvals app (z941ac172n, 2026-11-12) gives approval.user an Inbox.
      await asPersona(personas, 'READONLY', async (page) => {
        const inbox = new ApprovalsInboxPage(page);
        await inbox.findRow(r0.request);
        expect(await inbox.cellValue(r0.request, 'Your part')).toBe('Waiting on you');
        expect(await inbox.cellValue(r0.request, 'Status')).toBe('Pending');
      });
    });

    test('TC-VAR-01 Request header: code, status, policy version, subject and record link', async ({
      page,
    }) => {
      await allure.tms(cu('z941abyua8'), 'TC-VAR-01 (ClickUp)');
      const request = await openR0(page);
      await request.expectStatus('Pending', pCarol);
      await request.expectSubject(`Activity ${r0.code} revision 1 - ${r0.name}`);
      await request.expectTextContains(`planning activity ${r0.code}`);
      await request.expectRecordLink(new RegExp(`^${r0.path}\\?returnTo=`));
    });

    test('TC-VAR-05 "Back to inbox" goes to the Inbox', async ({ page, approvalsInboxPage }) => {
      await allure.tms(cu('z941abyuad'), 'TC-VAR-05 (ClickUp)');
      const request = await openR0(page);
      await request.backToInbox();
      await approvalsInboxPage.expectAdminInbox();
    });

    test('TC-VAR-06 The request page offers no actions; decisions are on the record', async ({
      page,
    }) => {
      await allure.tms(cu('z941abyuae'), 'TC-VAR-06 (ClickUp)');
      const request = await openR0(page);
      await request.expectNoActions();
    });

    test('TC-VAR-08 "Open the record" lands on the record with its approval panel', async ({
      page,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyuag'), 'TC-VAR-08 (ClickUp)');
      const request = await openR0(page);
      await request.openRecord();
      await expect(page).toHaveURL(new RegExp(`${r0.path}\\?returnTo=`));
      await approvalPanelPage.expectPendingBanner(r0.request);
      await approvalPanelPage.expectChain(`L1 · ${LEVEL_CAROL}`);
      await expect(approvalPanelPage.locators.backToApproval).toBeVisible();
    });

    test('TC-XAP-18 Due date follows Days to complete', async ({ approvalsInboxPage }) => {
      await allure.tms(cu('z941abyune'), 'TC-XAP-18 (ClickUp)');
      partial(
        'Business-hours calendar half not automated: its due time depends on the hour the case runs.',
      );
      await approvalsInboxPage.open();
      await approvalsInboxPage.expectLoaded();
      const item = await approvalsInboxPage.apiItem(r0.request);
      expect(item.dueAt, 'a due time').toBeTruthy();
      const start = Date.parse(item.levelActivatedAt ?? item.submittedAt);
      // Level 1: 2 hours, calendar None (every hour counts).
      // The server stamps the due time a few ms after the activation time.
      expect(Math.abs(Date.parse(item.dueAt!) - start - 2 * 60 * 60 * 1000)).toBeLessThan(60_000);
    });

    test('TC-XAP-22 Send-back for changes and the comment thread', async () => {
      // No ClickUp subtask yet (the case is from the approach document), so no allure.tms.
      test.skip(
        true,
        'Not built on dev or uat: the approval panel offers Approve / Approve and add levels / Reject / Withdraw only, with no send-back and no comment thread. Enable once the feature ships.',
      );
    });

    test('TC-XAP-23 Approvers and the submitter are notified', async ({
      page,
      personas,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyunj'), 'TC-XAP-23 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      const reason = `QA-AUTO reject reason ${uniqueTag('R')}`;
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.expectNotification(sent.code, 'for approval', `You are on ${LEVEL_CAROL}`);
        await panel.reject(reason);
      });
      await approvalPanelPage.open(sent.path);
      // The bell shortens long items, so the reason is checked by its label only.
      await approvalPanelPage.expectNotification(sent.code, `${CAROL} rejected`, 'Reason:');
    });

    // ── Decisions ──

    test("TC-XAP-04 Someone who isn't an assignee can't decide", async ({ page, personas }) => {
      await allure.tms(cu('z941abyuam'), 'TC-XAP-04 (ClickUp)');
      const sent = await sendFresh(page, [pAlice]);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.expectPendingBanner(sent.request);
        // Observation: on dev a reader who isn't on the chain gets no "Approval chain"
        // block on the activity page (the case text expects one); not asserted either way.
        await panel.expectDecisionButtons([]);
      });
    });

    test('TC-XAP-05 Approving a recipe shows the approver by name', async ({
      page,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyuan'), 'TC-XAP-05 (ClickUp)');
      await allure.tms(cu('z941abyqjm'), 'TC-XAP-05 bug (ClickUp)');
      // The recipe goes through the environment's own planning · recipe policy
      // (dev: "Recipe approvals", priority 0 — not this suite's, never edited);
      // alice decides it at once, as an Approvals admin if she isn't on it.
      const recipe = await createRecipe(page);
      await addOperation(page, { step: '10', name: 'QA-AUTO approval op', cycleTime: '30' });
      // Operations are added on step 2 of Edit recipe; Done returns to the detail page.
      await new RecipeDetailPage(page).finishEditing();
      const request = await approvalPanelPage.trySendForApproval();
      test.skip(!request, 'No planning · recipe approval policy is active on this environment.');
      await approvalPanelPage.reload();
      await approvalPanelPage.approve();
      await approvalPanelPage.reload();
      await approvalPanelPage.expectRequestStatus(`${request} Approved by ${ALICE}`);
      await approvalPanelPage.expectRecordStatus('Active');
      // Confirmed bug, ClickUp z941abyqjm (2026-10-14; still seen 2026-10-23):
      // the recipe's own "Approved by" (summary and Versions) shows the raw
      // user ID. Marked after the parts that work.
      knownBug('z941abyqjm');
      await approvalPanelPage.expectPanelText(`Approved by ${ALICE}`);
      expect(
        await page.getByRole('main').last().innerText(),
        `${recipe}: no raw user ID after "Approved by"`,
      ).not.toMatch(/Approved by [0-9a-f]{8}-[0-9a-f]{4}-/);
    });

    test('TC-XAP-06 Reject ends the request and records the reason', async ({
      page,
      personas,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyuap'), 'TC-XAP-06 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      const reason = `QA-AUTO reject reason ${uniqueTag('R')}`;
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.openRejectExpectingReasonRequired();
        await panel.reject(reason);
      });
      await approvalPanelPage.open(sent.path);
      await approvalPanelPage.expectRequestStatus(`${sent.request} Rejected by ${CAROL}`);
      await approvalPanelPage.expectReturnedBanner(sent.request);
      await approvalPanelPage.expectPanelText(reason);
      await approvalPanelPage.expectEditableAgain();
    });

    test('TC-XAP-07 The submitter can withdraw a pending request', async ({
      page,
      personas,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyuaq'), 'TC-XAP-07 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      await approvalPanelPage.open(sent.path);
      await approvalPanelPage.withdraw('QA-AUTO withdraw');
      await approvalPanelPage.reload();
      await approvalPanelPage.expectRequestStatus(`${sent.request} Withdrawn by ${ALICE}`);
      await approvalPanelPage.expectEditableAgain();
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.expectRequestStatus(/Withdrawn/);
        await panel.expectDecisionButtons([]);
      });
    });

    test("TC-XAP-08 Withdraw is hidden when the policy doesn't allow it", async () => {
      await allure.tms(cu('z941abyuar'), 'TC-XAP-08 (ClickUp)');
      // Bug z941abyqjh is Closed (2026-11-13). The only Planning login that can
      // send a record for approval here is alice, an Approvals admin, who may
      // withdraw any request (Approvals app story z941ac172n) whatever the
      // policy says — so the submitter rule can't be told apart from admin rights.
      test.skip(
        true,
        'Needs a submitter who is not an Approvals admin; the only Planning writer login (alice) is an admin, who may withdraw any request.',
      );
    });

    test('TC-XAP-09 Self-approval is blocked by default', async ({ page, approvalRequestPage }) => {
      await allure.tms(cu('z941abyuat'), 'TC-XAP-09 (ClickUp)');
      // L1 = Alice + Carol with Self-approval Blocked: alice's own request
      // should seat only Carol (as on 2026-10-13).
      const sent = await sendFresh(page, [pBoth], { selfApproval: false });
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectTextContains('Carol Pending');
      await approvalRequestPage.expectTextLacks(/Alice (Pending|Approved)/);
    });

    test('TC-XAP-10 Self-approval allowed lets the submitter approve', async ({
      page,
      approvalPanelPage,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyuau'), 'TC-XAP-10 (ClickUp)');
      const sent = await sendFresh(page, [pAlice]);
      await approvalPanelPage.open(sent.path);
      await approvalPanelPage.expectChain('Alice Pending');
      await approvalPanelPage.approve();
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Approved', pAlice);
      // On her own seat, not "as administrator".
      await approvalRequestPage.expectHistoryEntry(`Approved by ${ALICE} (${LEVEL_ALICE})`);
    });

    test('TC-XAP-11 Approve and add levels routes the request to an extra level', async ({
      page,
      personas,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyumh'), 'TC-XAP-11 (ClickUp)');
      const sent = await sendFresh(page, [pCarol], { level1AddLevels: true });
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.approveAndAddLevel('QA-AUTO added level', [DAVE]);
      });
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Pending', pCarol);
      await approvalRequestPage.expectTextContains(`L1 · ${LEVEL_CAROL} Approved`);
      await approvalRequestPage.expectTextContains('L2 · QA-AUTO added level Reviewing');
      await approvalRequestPage.expectTextContains('Dave Pending');
      await approvalRequestPage.expectTextContains('Added during review');
      await approvalRequestPage.expectHistoryEntry(
        `Approved and routed by ${CAROL} (${LEVEL_CAROL})`,
      );
    });

    test('TC-XAP-12 "Approve and add levels" is hidden when the policy doesn\'t allow it', async ({
      page,
      personas,
    }) => {
      await allure.tms(cu('z941abyun5'), 'TC-XAP-12 (ClickUp)');
      try {
        const sent = await sendFresh(page, [pCarol], { level1AddLevels: false });
        await asPersona(personas, 'READONLY', async (carol) => {
          const panel = new ApprovalPanelPage(carol);
          await panel.open(sent.path);
          await panel.expectDecisionButtons(['Approve', 'Reject']);
        });
      } finally {
        await editPolicy(page, pCarol, { level1AddLevels: true });
      }
    });

    test('TC-XAP-14 Two levels run in order', async ({ page, personas, approvalPanelPage }) => {
      await allure.tms(cu('z941abyuna'), 'TC-XAP-14 (ClickUp)');
      const sent = await sendFresh(page, [pTwo]);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.expectDecisionButtons([]);
      });
      await approvalPanelPage.open(sent.path);
      await approvalPanelPage.approve();
      await approvalPanelPage.reload();
      await approvalPanelPage.expectRequestStatus(`${sent.request} Pending`);
      await approvalPanelPage.expectChain(`L2 · ${LEVEL_L2} Reviewing`);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.expectDecisionButtons(['Approve', 'Approve and add levels', 'Reject']);
        await panel.approve();
        await panel.reload();
        await panel.expectRequestStatus(/Approved/);
      });
    });

    test('TC-XAP-15 Everyone must approve waits for every seat; one reject ends it', async ({
      page,
      personas,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyunb'), 'TC-XAP-15 (ClickUp)');
      const both = { selfApproval: true };
      const first = await sendFresh(page, [pBoth], both);
      const second = await sendFresh(page, [pBoth], both);
      for (const sent of [first, second]) {
        await approvalPanelPage.open(sent.path);
        await approvalPanelPage.approve();
        await approvalPanelPage.reload();
        await approvalPanelPage.expectRequestStatus(`${sent.request} Pending`);
        await approvalPanelPage.expectChain('Alice Approved');
        await approvalPanelPage.expectChain('Carol Pending');
      }
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(first.path);
        await panel.approve();
        await panel.reload();
        await panel.expectRequestStatus(/Approved/);
        await panel.open(second.path);
        await panel.reject('QA-AUTO everyone-must-approve reject');
        await panel.reload();
        await panel.expectRequestStatus(new RegExp(`Rejected by ${CAROL}`));
      });
    });

    test('TC-XAP-16 The lowest priority number wins when several policies match', async ({
      page,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyunc'), 'TC-XAP-16 (ClickUp)');
      // pCarol (priority 20) and pAlice (10) are both in force for the send.
      const sent = await sendFresh(page, [pCarol, pAlice]);
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Pending', pAlice);
      await approvalRequestPage.expectTextContains(`L1 · ${LEVEL_ALICE}`);
    });

    test('TC-XAP-17 Resubmitting after a reject opens a new request', async ({
      page,
      personas,
      approvalPanelPage,
      activityFormPage,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyund'), 'TC-XAP-17 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.reject('QA-AUTO reject before resubmit');
      });
      await approvalPanelPage.open(sent.path);
      await activityFormPage.startEditing();
      await activityFormPage.fill({ name: `${sent.name} (resubmitted)` });
      expect(await activityFormPage.saveChanges()).toBe('submitted');
      const again = await sendUnder(page, [pCarol], sent);
      expect(again).not.toBe(sent.request);
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Rejected', pCarol);
      await approvalRequestPage.openFromInbox(again);
      await approvalRequestPage.expectStatus('Pending', pCarol);
    });

    test('TC-XAP-19 Reminders repeat until the level is decided, up to the max', async () => {
      await allure.tms(cu('z941abyunf'), 'TC-XAP-19 (ClickUp)');
      test.skip(
        true,
        'Timer-driven: the shortest interval the form takes is 1 hour. Verified by hand on dev 2026-11-12 (z941abyqjk, closed).',
      );
    });

    test('TC-XAP-20 Escalation adds or replaces approvers when the level runs late', async () => {
      await allure.tms(cu('z941abyung'), 'TC-XAP-20 (ClickUp)');
      test.skip(
        true,
        'Timer-driven: the shortest interval the form takes is 1 hour. Verified by hand on dev 2026-11-12 (z941abyqjk, closed).',
      );
    });

    test('TC-XAP-21 Expiry: hold, expire and auto-reject', async () => {
      await allure.tms(cu('z941abyunh'), 'TC-XAP-21 (ClickUp)');
      test.skip(
        true,
        'Timer-driven: the shortest interval the form takes is 1 hour. Verified by hand on dev 2026-11-12 (z941abyqjk, closed).',
      );
    });

    test('TC-XAP-24 Permission approvers resolve to the people who hold it', async ({
      page,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyunk'), 'TC-XAP-24 (ClickUp)');
      partial(
        'Group half not automated: no test group with a known direct member on both environments.',
      );
      const sent = await sendFresh(page, [pPermission]);
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Pending', pPermission);
      await approvalRequestPage.expectTextContains('Carol Pending');
    });

    // ── Request page after decisions ──

    test('TC-VAR-02 The snapshot is frozen at submission', async ({
      page,
      personas,
      approvalPanelPage,
      activityFormPage,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyua9'), 'TC-VAR-02 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.reject('QA-AUTO reject before rename');
      });
      await approvalPanelPage.open(sent.path);
      await activityFormPage.startEditing();
      await activityFormPage.fill({ name: `${sent.name} RENAMED` });
      expect(await activityFormPage.saveChanges()).toBe('submitted');
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectSubject(`Activity ${sent.code} revision 1 - ${sent.name}`);
      await approvalRequestPage.expectTextLacks('RENAMED');
    });

    test('TC-VAR-03 Approval chain shows each level and seat', async ({
      page,
      approvalPanelPage,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyuaa'), 'TC-VAR-03 (ClickUp)');
      const sent = await sendFresh(page, [pTwo]);
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectTextContains(`L1 · ${LEVEL_ALICE} Reviewing`);
      await approvalRequestPage.expectTextContains('Alice Pending');
      await approvalRequestPage.expectTextContains(`L2 · ${LEVEL_L2}`);
      await approvalPanelPage.open(sent.path);
      await approvalPanelPage.approve();
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectTextContains(`L1 · ${LEVEL_ALICE} Approved`);
      await approvalRequestPage.expectTextContains('Alice Approved');
      await approvalRequestPage.expectTextContains(`L2 · ${LEVEL_L2} Reviewing`);
      await approvalRequestPage.expectTextContains('Carol Pending');
    });

    test('TC-VAR-04 History lists each event with actor and time', async ({
      page,
      personas,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyuab'), 'TC-VAR-04 (ClickUp)');
      const sent = await sendFresh(page, [pCarol]);
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.approve();
      });
      await approvalRequestPage.openFromInbox(sent.request);
      const history = await approvalRequestPage.history();
      const expected = [
        `Sent for approval by ${ALICE}`,
        `Waiting on ${LEVEL_CAROL}`,
        `Approved by ${CAROL} (${LEVEL_CAROL})`,
        `${LEVEL_CAROL} complete`,
        'Approved',
      ];
      expect(history.map((h) => expected.find((e) => h.startsWith(e)) ?? h)).toEqual(expected);
      for (const entry of history)
        expect(entry).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2}/);
    });

    test('TC-VAR-07 A rejected request shows who rejected it and why', async ({
      page,
      personas,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyuaf'), 'TC-VAR-07 (ClickUp)');
      await allure.tms(cu('z941abyqjr'), 'TC-VAR-07 bug (ClickUp)');
      // Bug z941abyqjr (2026-10-14) is still open in ClickUp, but dev shows
      // the reason in History since the Approvals app moved (APR-2026-000058
      // and the 2026-11-13 Approvals app run), so no knownBug() here.
      const sent = await sendFresh(page, [pCarol]);
      const reason = `QA-AUTO reject reason ${uniqueTag('R')}`;
      await asPersona(personas, 'READONLY', async (carol) => {
        const panel = new ApprovalPanelPage(carol);
        await panel.open(sent.path);
        await panel.reject(reason);
      });
      await approvalRequestPage.openFromInbox(sent.request);
      await approvalRequestPage.expectStatus('Rejected', pCarol);
      await approvalRequestPage.expectHistoryEntry(`Rejected by ${CAROL} (${LEVEL_CAROL})`);
      await approvalRequestPage.expectHistoryEntry(`Reason: ${reason}`);
    });

    // ── Editing and deactivating a policy in use ──

    test('TC-EAP-04 A review already under way keeps the policy version it started with', async ({
      page,
      approvalRequestPage,
    }) => {
      await allure.tms(cu('z941abyu9c'), 'TC-EAP-04 (ClickUp)');
      const renamed = `${LEVEL_CAROL} (v2)`;
      const first = await sendFresh(page, [pCarol], { level1Name: LEVEL_CAROL });
      let second: string;
      try {
        second = (await sendFresh(page, [pCarol], { level1Name: renamed })).request;
      } finally {
        await editPolicy(page, pCarol, { level1Name: LEVEL_CAROL });
      }
      await approvalRequestPage.openFromInbox(first.request);
      const firstVersion = await approvalRequestPage.policyVersion();
      await approvalRequestPage.expectTextContains(`L1 · ${LEVEL_CAROL} Reviewing`);
      await approvalRequestPage.expectTextLacks(renamed);
      await approvalRequestPage.openFromInbox(second);
      expect(await approvalRequestPage.policyVersion()).toBeGreaterThan(firstVersion);
      await approvalRequestPage.expectTextContains(`L1 · ${renamed} Reviewing`);
    });

    test('TC-EAP-05 Deactivating a policy stops new submissions but not reviews under way', async ({
      page,
      approvalPoliciesPage,
      approvalPolicyFormPage,
      approvalPanelPage,
    }) => {
      await allure.tms(cu('z941abyu9d'), 'TC-EAP-05 (ClickUp)');
      await editPolicy(page, pAlice, { active: true });
      try {
        await approvalPoliciesPage.openPolicy(pAlice);
        await approvalPolicyFormPage.applyChanges({ active: false });
        await approvalPolicyFormPage.saveOk();
      } finally {
        await editPolicy(page, pAlice, { active: false });
      }
      await approvalPoliciesPage.open();
      await approvalPoliciesPage.expectLoaded();
      await approvalPoliciesPage.selectTab('Inactive');
      await approvalPoliciesPage.search(pAlice);
      await approvalPoliciesPage.expectCell(pAlice, 'Status', 'Inactive');
      // r0 started under pCarol, which is inactive between sends: still under review.
      await approvalPanelPage.open(r0.path);
      await approvalPanelPage.expectRequestStatus(`${r0.request} Pending`);
      const others = await approvalPoliciesPage.activePoliciesFor(APPLIES_TO);
      test.skip(
        others.length > 0,
        `An active ${APPLIES_TO} policy not created by this suite is in force (${others.join(', ')}).`,
      );
      const activity = await createActivity(page);
      await approvalPanelPage.open(activity.path);
      await approvalPanelPage.sendExpectingNoPolicy();
    });
  });
});
