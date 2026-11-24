import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/planning.fixtures';
import { openQuestion } from '../../../src/utils/test-annotations';
import { type RoutingTemplatesSnapshot } from '../../../src/pages/planning/routing-templates-list.page';
import { knownBug, trackCode } from './support/test-data';
import {
  NO_CATALOGUE,
  PREFIX,
  anyCycleKind,
  approvePending,
  buildDraft,
  cleanUpRoutingTemplates,
  createActive,
  createPolicy,
  createTemplate,
  freeTriple,
  oncePerRun,
  openTemplate,
  policyName,
  readCatalogue,
  rtName,
  sendForApproval,
  setupPage,
  snapshot,
  sweepActivePolicies,
  type BuiltTemplate,
  type Catalogue,
  watchPolicy,
} from './support/routing-templates';

/**
 * Planning — Routing Templates & Steps: List / Create / Edit Routing
 * Template and Create / Edit Step, at /planning/master-data/routing-templates.
 *
 * Source of truth for these cases: test-cases/planning/routing-templates.md
 * (ClickUp "Planning - Routing Templates & Steps", story 86eypv6d9). Every
 * template is this file's own (QA-AUTO, see support/routing-templates.ts);
 * seeded templates are only read. Templates are only published on a cycle
 * kind × product type × wash type no live template uses — publishing on a
 * taken one would retire it.
 *
 * beforeAll (per worker) reads the activity picker and builds `draft` (3
 * steps in a chain, any product, with a description) and `active` (2 steps,
 * published). Cases that change a template build their own. On an
 * environment whose picker lists no activity (uat, 2026-11-17) only the
 * cases that need no step run; the rest skip with NO_CATALOGUE.
 *
 * Templates go Active through "Send for approval": the suite's own
 * (inactive) "Routing template" approval policy is switched on only for a send
 * (support/routing-templates.ts) and the logged-in user, an Approvals admin,
 * approves. Cases written for the prototype's department sign-off (TC-ERT-06,
 * TC-ERT-08) are read against the shipped generic policy chain, or skipped.
 */
const cu = (id: string) => `https://app.clickup.com/t/${id}`;
const DESC = 'QA-AUTO — routing-templates test data (pw-hybrid-framework). Safe to delete.';

/** Records the part of a case that can't run yet (e.g. its approval-flow half). */
function notCovered(description: string): void {
  test.info().annotations.push({ type: 'not covered', description });
}

test.describe('Planning - Routing Templates & Steps', () => {
  // Retires this file's Active templates once its cases are done (drafts can't be removed).
  cleanUpRoutingTemplates();

  let snap: RoutingTemplatesSnapshot;
  let cat: Catalogue | null = null;
  let draft: BuiltTemplate;
  let active: BuiltTemplate;
  /** A first submission left waiting for approval (decided by no case; withdrawn in afterAll). */
  let pending: BuiltTemplate;
  /** This worker's inactive "Routing template" approval policy. */
  let policy = '';
  /** Activity codes from three departments (only set when the picker lists activities). */
  let A: [string, string, string];
  const needCatalogue = () => test.skip(!cat, NO_CATALOGUE);
  const deptOf = (code: string) => cat!.options.find((o) => o.code === code)!.dept;

  test.beforeAll(async ({ browser }) => {
    // Reads the picker, then builds this worker's fixtures: a policy, a Draft, an Active and a pending template (~2–3 min on dev).
    test.setTimeout(600_000);
    const page = await setupPage(browser);
    try {
      snap = await snapshot(page);
      cat = await readCatalogue(page);
      if (cat) {
        A = cat.codes;
        // A killed run can leave this suite's policy Active for everyone: switch it off first (once per run).
        await oncePerRun('sweep', () => sweepActivePolicies(page));
        // One per parallel slot, kept across worker restarts (policies can't be deleted).
        policy = await oncePerRun(`P-${process.env.TEST_PARALLEL_INDEX ?? '0'}`, () =>
          createPolicy(page, policyName('P')),
        );
        watchPolicy(policy);
        draft = await createTemplate(page, {
          triple: anyCycleKind(snap),
          steps: [A[0], A[1], A[2]],
          description: DESC,
        });
        active = await createActive(page, policy, {
          triple: await freeTriple(page),
          steps: [A[0], A[1]],
        });
        pending = await createTemplate(page, {
          triple: await freeTriple(page),
          steps: [A[0], A[1]],
        });
        await sendForApproval(page, policy);
        console.log(`FIXTURES draft=${draft.code} active=${active.code} pending=${pending.code}`);
      }
    } finally {
      await page.close();
    }
  });

  test.beforeEach(async () => {
    // Cases build their own templates through the UI (~30–90 s each on dev).
    test.setTimeout(300_000);
    await allure.epic('Planning');
    await allure.feature('Routing Templates & Steps');
    await allure.owner('Planning QA');
  });

  // ── List Routing Templates ────────────────────────────────────────────

  test('TC-LRT-01 Draft and Active tabs filter the grid to their own statuses', async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby960'), 'TC-LRT-01 (ClickUp)');
    needCatalogue();
    await list.open();
    await list.expectLoaded();
    await list.expectRowInTab(draft.code, 'Draft', true);
    await list.expectRowInTab(draft.code, 'Active', false);
    await list.expectRowInTab(active.code, 'Active', true);
    await list.expectRowInTab(active.code, 'Draft', false);
  });

  test('TC-LRT-01 The Pending approval tab holds a first submission and the tab counts add up', async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby960'), 'TC-LRT-01 (ClickUp)');
    needCatalogue();
    // Bug z941ac2d4a: dev shows only All / Draft / Active / Retired, so a template
    // awaiting its first decision is in no status tab and the counts don't add up
    // (2026-11-24: All 290 vs Draft 119 + Active 72 + Retired 48). Left asserting the
    // correct behaviour; the Draft / Active tab checks are in the test above.
    knownBug('z941ac2d4a');
    await list.open();
    await list.expectLoaded();
    await list.expectTabCountsAddUp(['Draft', 'Pending approval', 'Active', 'Retired']);
    await list.expectRowInTab(pending.code, 'Pending approval', true);
    await list.expectRowInTab(pending.code, 'Draft', false);
    await list.expectRowInTab(pending.code, 'Active', false);
    await list.expectRowInTab(active.code, 'Pending approval', false);
  });

  test('TC-LRT-02 Columns render the lifecycle state correctly', async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby961'), 'TC-LRT-02 (ClickUp)');
    needCatalogue();
    await list.findRow(active.code);
    const cell = async (code: string, column: string) =>
      (await list.cellValue(code, column)).replace(/\s+/g, ' ').trim();
    expect(await cell(active.code, 'Cycle kind')).toBe(active.triple.cycleKind);
    expect(await cell(active.code, 'Product type × wash type')).toBe(
      `${active.triple.productType} ${active.triple.washType}`,
    );
    expect(await cell(active.code, 'Status')).toBe('Active');
    expect(await cell(active.code, 'Rev')).toBe('1');
    expect(await cell(active.code, 'Steps')).toBe('2');
    expect(await cell(active.code, 'Critical path')).toMatch(/^≈ [\d.]+ d$/);
    expect(await cell(active.code, 'Source')).toBe('Manual');

    await list.findRow(draft.code);
    expect(await cell(draft.code, 'Product type × wash type')).toBe('Any product Any wash');
    expect(await cell(draft.code, 'Status')).toBe('Draft');
    expect(await cell(draft.code, 'Rev')).toBe('0');
    expect(await cell(draft.code, 'Steps')).toBe('3');
    // The "Active · pending rev N" / "N → N+1" reading is checked in TC-ERT-11.
    await list.findRow(pending.code);
    expect(await cell(pending.code, 'Status')).toMatch(/^Pending approval/);
    expect(await cell(pending.code, 'Rev')).toBe('0');
  });

  test('TC-LRT-03 Cycle kind filter pills narrow the grid', async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby962'), 'TC-LRT-03 (ClickUp)');
    needCatalogue();
    const kind = active.triple.cycleKind;
    await list.open();
    await list.expectLoaded();
    const pills = await list.cycleKindPillLabels();
    expect(pills[0]).toBe('All');
    expect(pills).toContain(kind);
    await list.expectCycleKindSelected('All');

    await list.selectCycleKind(kind);
    await list.expectEveryRowOfCycleKind(kind);
    await list.selectTab('Active');
    await test.step('the pill stays selected across a tab switch', async () => {
      await list.expectCycleKindSelected(kind);
      await list.expectEveryRowOfCycleKind(kind);
    });

    await list.selectCycleKind('All');
    await list.selectTab('All');
    await list.expectTabCountMatchesRows('All');
  });

  test('TC-LRT-04 "New template" opens the editor directly on a never-saved draft, not an auto-coded one', async ({
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby963'), 'TC-LRT-04 (ClickUp)');
    await list.open();
    await list.expectLoaded();
    await list.openNew();
    await editor.expectOnNewPage();
    await editor.expectInlineHeader();
    await editor.expectStepCount(0);
  });

  test('TC-LRT-05 Retired — written against an ask dialog that does not exist in the prototype', async () => {
    await allure.tms(cu('z941aby964'), 'TC-LRT-05 (ClickUp)');
    test.skip(
      true,
      'Retired 2026-10-08: the prototype\'s "ask" dialog is dead code and never ships',
    );
  });

  test('TC-LRT-06 Row actions — "Duplicate" always available, "Retire" only on settled Active rows', async ({
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby966'), 'TC-LRT-06 (ClickUp)');
    await allure.tms(cu('z941aby952'), 'Bug z941aby952 (closed 2026-10-12)');
    needCatalogue();
    const own = await createActive(page, policy, {
      triple: await freeTriple(page),
      steps: [A[0], A[1]],
    });

    await test.step('Draft row: Duplicate, no Retire', async () => {
      await list.findRow(draft.code);
      await list.expectRowAction(draft.code, 'Duplicate');
      await list.expectNoRowAction(draft.code, 'Retire');
    });
    await test.step('Active row: Duplicate and Retire', async () => {
      await list.findRow(own.code);
      await list.expectRowAction(own.code, 'Duplicate');
      await list.expectRowAction(own.code, 'Retire');
    });
    await test.step('Active mid-revision: Retire is refused until the revision is cancelled', async () => {
      await openTemplate(page, own.code);
      await editor.startRevision();
      await list.findRow(own.code);
      await list.expectRowAction(own.code, 'Duplicate');
      await list.openRetire(own.code);
      await list.expectCantRetire(own.code, 'Revision 2 is pending. Withdraw or cancel it first.');
      await list.closeCantRetire();
    });
    await test.step('Retired row: Duplicate, no Retire', async () => {
      await openTemplate(page, own.code);
      await editor.openCancelRevision();
      await editor.confirmCancelRevision();
      await list.findRow(own.code);
      await list.openRetire(own.code);
      await list.expectRetireDialog(own.code);
      await list.confirmRetire();
      await list.findRow(own.code);
      await list.expectRowContains(own.code, 'Retired');
      await list.expectRowAction(own.code, 'Duplicate');
      await list.expectNoRowAction(own.code, 'Retire');
    });
  });

  test('TC-LRT-07 Search matches Code and Name only, not Product type or Wash type', async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby967'), 'TC-LRT-07 (ClickUp)');
    needCatalogue();
    await list.open();
    await list.expectLoaded();
    await list.search(draft.code);
    await list.expectRowVisible(draft.code);
    await list.expectEveryRowCodeOrNameMatches(draft.code);

    await list.search(draft.tag);
    await list.expectRowVisible(draft.code);
    await list.expectEveryRowCodeOrNameMatches(draft.tag);

    // `active`'s name holds only its tag, so its product type can only match through that field.
    const product = active.triple.productType!;
    await list.search(product);
    await list.expectEveryRowCodeOrNameMatches(product);
    await list.expectNoRow(active.code);
  });

  test('TC-LRT-08 AI-proposed templates show a distinct tag, both in the list and inside the editor', async ({
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby968'), 'TC-LRT-08 (ClickUp)');
    const ai = snap.templates.find((t) => t.sourceCode === 'ai_proposed');
    test.skip(
      !ai,
      'No AI-proposed template on this environment to read (only seeded, never created by the UI)',
    );
    await list.findRow(ai!.code);
    expect(await list.cellValue(ai!.code, 'Source')).toBe('AI proposed');
    if (cat) {
      await list.findRow(draft.code);
      expect(await list.cellValue(draft.code, 'Source')).toBe('Manual');
      await list.findRow(ai!.code);
    }
    // Opening the editor only reads the seeded template; nothing is changed.
    await list.openRow(ai!.code);
    await editor.expectLoaded(ai!.code);
    await editor.expectAiProposed();
  });

  test("TC-LRT-09 The split preview pane mirrors the editor's Table/Visual steps view", async ({
    routingTemplatesListPage: list,
  }) => {
    await allure.tms(cu('z941aby969'), 'TC-LRT-09 (ClickUp)');
    needCatalogue();
    await list.findRow(active.code);
    // The view choice isn't persisted across tests (each starts on the list view), so there is nothing to reset.
    await list.switchView('Vertical split');
    await list.selectRow(active.code);
    await list.expectPreview(active.name, [
      active.code,
      active.triple.cycleKind,
      active.triple.productType!,
      active.triple.washType!,
      'Steps (2)',
    ]);
    await list.previewShowVisual(active.name);
  });

  test('TC-LRT-10 Retired — no zero-template environment exists to test this', async () => {
    await allure.tms(cu('z941aby96a'), 'TC-LRT-10 (ClickUp)');
    test.skip(
      true,
      'Retired 2026-10-08: the empty-list message needs an environment with no templates at all',
    );
  });

  // ── Create Routing Template ───────────────────────────────────────────

  test('TC-CRT-01 A never-saved draft uses an inline header form; an already-saved draft uses the "Edit header" modal', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96c'), 'TC-CRT-01 (ClickUp)');
    await editor.openNew();
    await editor.expectInlineHeader();
    test.skip(!cat, `Saved-draft half: ${NO_CATALOGUE}`);
    await openTemplate(page, draft.code);
    await editor.expectNoInlineHeader();
    await editor.openHeaderDialog();
    await editor.expectHeaderDialogFields({
      cycleKind: true,
      productType: true,
      washType: true,
      code: false,
      name: true,
      description: true,
    });
    expect(await editor.headerDialogValue('code')).toBe(draft.code);
    expect(await editor.headerDialogValue('name')).toBe(draft.name);
    await editor.closeHeaderDialog();
  });

  test('TC-CRT-02 A never-saved draft\'s first "Save draft" validates name, cycle kind and steps before anything else', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96d'), 'TC-CRT-02 (ClickUp)');
    // Since dev's 2026-10-16 deploy the code is generated on save, so the
    // code checks ("Type a template code first", "Code X is already taken") are gone.
    const NAME = 'Give the template a name';
    const KIND = 'Choose a cycle kind first';
    const STEP = 'Add at least one step';
    const has = (issues: string[], text: string) => issues.some((i) => i.includes(text));
    await editor.openNew();

    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    await editor.expectRefusalMessage('3 validation errors — nothing was saved.');
    let issues = await editor.refusedIssues();
    expect(issues.map((i) => [NAME, KIND, STEP].findIndex((t) => i.includes(t)))).toEqual([
      0, 1, 2,
    ]);
    await editor.expectOnNewPage();

    await editor.fillHeader({ name: rtName(`${PREFIX}-UNSAVED`) });
    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    issues = await editor.refusedIssues();
    expect(has(issues, NAME)).toBe(false);
    expect(has(issues, KIND) && has(issues, STEP)).toBe(true);

    await editor.fillHeader(anyCycleKind(snap));
    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    issues = await editor.refusedIssues();
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain(STEP);
    await editor.expectOnNewPage();

    test.skip(!cat, `Final save: ${NO_CATALOGUE}`);
    await editor.addStepWith(A[0]);
    const saved = await editor.saveDraft();
    expect(saved.outcome).toBe('saved');
    if (saved.outcome === 'saved') trackCode(PREFIX, saved.code);
  });

  test("TC-CRT-03 A new draft's steps and links carry through its first save, which assigns the code", async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96e'), 'TC-CRT-03 (ClickUp)');
    // Adapted: the code can no longer be typed (generated on save since dev's
    // 2026-10-16 deploy); what's left of the case is that nothing added before
    // the first save is lost when the record gets its code.
    await editor.openNew();
    await editor.expectInlineHeader();
    needCatalogue();
    const { name } = await buildDraft(page, { triple: anyCycleKind(snap), steps: [A[0], A[1]] });
    const saved = await editor.saveDraft();
    expect(saved.outcome).toBe('saved');
    if (saved.outcome !== 'saved') return;
    trackCode(PREFIX, saved.code);
    expect(saved.code).toMatch(/^RT-\d+$/);
    await editor.reload(saved.code);
    await editor.expectHeading(name);
    await editor.expectStepCount(2);
    expect(await editor.stepActivities()).toEqual([A[0], A[1]]);
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);
    await editor.openHeaderDialog();
    await editor.expectHeaderDialogFields({ code: false });
    expect(await editor.headerDialogValue('code')).toBe(saved.code);
    await editor.closeHeaderDialog();
  });

  test("TC-CRT-04 A brand-new draft's Steps pane starts empty with the spec's own prompt", async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96f'), 'TC-CRT-04 (ClickUp)');
    await editor.openNew();
    // Prototype: "No steps yet. Add the first step, or go back and duplicate…";
    // dev: "No steps yet. Use Add step below." — copy only.
    await editor.expectEmptySteps(/^No steps yet\./);
  });

  test('TC-CRT-05 The Approvals block is entirely absent until the template has been submitted', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96g'), 'TC-CRT-05 (ClickUp)');
    await editor.openNew();
    await editor.expectNoApprovalsBlock();
    needCatalogue();
    await openTemplate(page, draft.code);
    await editor.expectNoApprovalsBlock();
    // Once submitted, the chain appears.
    await openTemplate(page, pending.code);
    await editor.expectApprovalChainShown();
  });

  test('TC-CRT-06 A 0-step template can not be saved, and can not be sent for approval', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96h'), 'TC-CRT-06 (ClickUp)');
    await editor.openNew();
    await editor.fillHeader({ ...anyCycleKind(snap), name: rtName(`${PREFIX}-ZERO`) });
    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    expect(await editor.refusedIssues()).toEqual([
      expect.stringContaining('Add at least one step'),
    ]);
    await editor.expectOnNewPage();
    await editor.expectSendForApprovalUnavailable();
  });

  test('TC-CRT-07 Duplicate copies header, steps, and links into a fully independent new draft — Description included', async ({
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96j'), 'TC-CRT-07 (ClickUp)');
    await allure.tms(cu('z941aby98n'), 'Bug z941aby98n (closed 2026-10-12)');
    needCatalogue();
    await list.findRow(draft.code);
    const copy = await list.duplicate(draft.code);
    trackCode(PREFIX, copy);
    expect(copy).not.toBe(draft.code);

    await openTemplate(page, copy);
    await editor.expectHeading(`Copy of ${draft.name}`);
    await editor.expectStatus('Draft · rev 0');
    expect(await editor.stepActivities()).toEqual([A[0], A[1], A[2]]);
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);
    expect(await editor.waitsOnChips(3)).toEqual(['2 · 100 %']);
    await editor.openHeaderDialog();
    expect(await editor.headerDialogValue('description')).toBe(DESC);
    expect(await editor.headerDialogSelection('cycleKind')).toMatch(
      new RegExp(`^${draft.triple.cycleKind} ·`),
    );

    await test.step('renaming the copy persists (bug z941aby98n) and leaves the original alone', async () => {
      const renamed = rtName(`${draft.tag}-COPY`);
      await editor.saveHeaderDialog({ name: renamed });
      await editor.reload(copy);
      await editor.expectHeading(renamed);
      await openTemplate(page, draft.code);
      await editor.expectHeading(draft.name);
      await editor.expectStepCount(3);
    });
  });

  test('TC-CRT-08 Send for approval (never-published path) locks the draft and files a request', async ({
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96k'), 'TC-CRT-08 (ClickUp)');
    needCatalogue();
    const own = await createTemplate(page, { triple: await freeTriple(page), steps: [A[0], A[1]] });
    const request = await sendForApproval(page, policy);
    expect(request).toMatch(/^APR-\d{4}-\d{6}$/);
    await editor.expectPendingBannerText('It cannot be changed until the request is decided.');
    await editor.expectStatus(/^Draft · rev 0 · pending approval$/);
    await editor.expectLockedForEditing();
    await list.findRow(own.code);
    expect(await list.cellValue(own.code, 'Status')).toMatch(/Pending approval/);
  });

  // ── Edit Routing Template ─────────────────────────────────────────────

  test('TC-ERT-01 Code, Cycle kind, Product type and Wash type lock once published; Name and Description stay editable', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96v'), 'TC-ERT-01 (ClickUp)');
    needCatalogue();
    await test.step('a saved draft (rev 0): only the generated code is fixed', async () => {
      await openTemplate(page, draft.code);
      await editor.openHeaderDialog();
      await editor.expectHeaderDialogFields({
        cycleKind: true,
        productType: true,
        washType: true,
        code: false,
      });
      await editor.closeHeaderDialog();
    });
    await test.step('a published template (rev 1): the triple and code lock', async () => {
      await openTemplate(page, active.code);
      await editor.expectStatus('Active · rev 1');
      await editor.openHeaderDialog();
      await editor.expectHeaderDialogFields({
        cycleKind: false,
        productType: false,
        washType: false,
        code: false,
        name: true,
        description: true,
      });
      expect(await editor.headerDialogText()).toContain('Locked after first publish');
    });
    await test.step('Description saves in place, with no new revision', async () => {
      const description = `${DESC} [edited ${Date.now()}]`;
      await editor.saveHeaderDialog({ description });
      await editor.reload(active.code);
      await editor.expectStatus('Active · rev 1');
      await editor.openHeaderDialog();
      expect(await editor.headerDialogValue('description')).toBe(description);
      await editor.closeHeaderDialog();
    });
  });

  test('TC-ERT-02 Validate surfaces every distinct issue type in one pass, including the any-of-group-of-one check', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96w'), 'TC-ERT-02 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.fillHeader({ ...anyCycleKind(snap), name: rtName(`${PREFIX}-VALIDATE`) });
    await editor.addStepWith(A[0]);
    await editor.addStepWith(A[1]);
    await editor.addStep(); // step 3: no activity, waits on nothing
    await editor.addLink(2, { from: 1, anyOf: 'New group…' });
    const issues = await editor.validate();
    expect(
      issues.find((i) => /Step 3\b/.test(i) && /activity/i.test(i)),
      'missing activity',
    ).toBeTruthy();
    expect(
      issues.find((i) => /Step 3\b/.test(i) && /waits on nothing/.test(i)),
      'waits on nothing',
    ).toBeTruthy();
    expect(
      issues.find((i) => /any-of group \d+ has only one member/.test(i)),
      'any-of group of one',
    ).toBeTruthy();
    notCovered(
      'An activity no longer in the catalogue and an unparseable condition: both pickers are closed ' +
        'registries, so neither state can be built through the UI',
    );
  });

  test('TC-ERT-03 Retired — no Subcontractors or Mill department exists to test this', async () => {
    await allure.tms(cu('z941aby96x'), 'TC-ERT-03 (ClickUp)');
    test.skip(
      true,
      'Retired 2026-10-08: no Subcontractors or Mill department in the activity catalogue',
    );
  });

  test('TC-ERT-04 "Save draft" is refused while any Validate issue exists', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96y'), 'TC-ERT-04 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.fillHeader({ ...anyCycleKind(snap), name: rtName(`${PREFIX}-REFUSE`) });
    await editor.addStepWith(A[0]);
    await editor.addStepWith(A[1]); // no link: step 2 waits on nothing
    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    await editor.expectRefusalMessage(/^1 validation errors? — nothing was saved\.$/);
    expect(await editor.refusedIssues()).toEqual([
      expect.stringMatching(/Step 2 .*waits on nothing/),
    ]);
    await editor.expectOnNewPage();
  });

  test('TC-ERT-05 The approval chain is read-only everywhere in the editor', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby96z'), 'TC-ERT-05 (ClickUp)');
    needCatalogue();
    for (const own of [pending, active]) {
      await openTemplate(page, own.code);
      // The chain is plain text: nothing in it can be typed into or picked from.
      await editor.expectApprovalChainReadOnly();
    }
    await openTemplate(page, pending.code);
    await editor.expectLockedForEditing();
  });

  test('TC-ERT-06 Only an approver of the pending request gets a decision panel', async ({
    approvalPanelPage: panel,
    page,
  }) => {
    await allure.tms(cu('z941aby970'), 'TC-ERT-06 (ClickUp)');
    needCatalogue();
    // Pending: the approver decides (the shipped flow has one policy chain, not one panel per department).
    await openTemplate(page, pending.code);
    await panel.expectDecisionButtons(['Approve', 'Approve and add levels', 'Reject', 'Withdraw']);
    expect(await panel.chain()).toContain('L1 · QA review');
    // Decided or never submitted: no decision panel.
    await openTemplate(page, active.code);
    await panel.expectDecisionButtons([]);
    await openTemplate(page, draft.code);
    await panel.expectDecisionButtons([]);
  });

  test('TC-ERT-07 Rejecting a request requires a non-empty reason and reopens the record for editing', async ({
    approvalPanelPage: panel,
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby971'), 'TC-ERT-07 (ClickUp)');
    needCatalogue();
    const own = await createTemplate(page, { triple: await freeTriple(page), steps: [A[0], A[1]] });
    await sendForApproval(page, policy);
    await panel.openRejectExpectingReasonRequired();
    const reason = `QA-AUTO reject reason ${own.tag}`;
    await panel.reject(reason);
    await panel.expectRequestStatus(/Rejected/);
    await panel.expectPanelText(reason);
    // The record is a Draft again: editable and can be sent once more.
    await editor.expectStatus(/^Draft · rev 0$/);
    await editor.expectSendForApprovalEnabled();
    await editor.expectEditHeaderAvailable();
  });

  test('TC-ERT-08 Adding a step from a new department only recomputes the required department list', async () => {
    await allure.tms(cu('z941aby972'), 'TC-ERT-08 (ClickUp)');
    test.skip(
      true,
      'Not applicable to the shipped flow: approval follows the "Routing template" policy chain, ' +
        'not a per-department sign-off list, so adding a step from another department changes no approver',
    );
  });

  test('TC-ERT-09 "Send for approval" is unavailable until the template is saved', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby974'), 'TC-ERT-09 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.expectSendForApprovalUnavailable();
    await createTemplate(page, { triple: anyCycleKind(snap), steps: [A[0], A[1]] });
    await editor.expectSendForApprovalEnabled();
    // An unsaved change takes it away again until it is saved.
    await editor.addStepWith(A[2]);
    await editor.addLink(3, { from: 2 });
    await editor.expectSendForApprovalUnavailable();
    expect((await editor.saveDraft()).outcome).toBe('saved');
    await editor.expectSendForApprovalEnabled();
  });

  test('TC-ERT-10 Approval makes the template Active at revision 1', async ({
    approvalPanelPage: panel,
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby975'), 'TC-ERT-10 (ClickUp)');
    needCatalogue();
    const own = await createTemplate(page, { triple: await freeTriple(page), steps: [A[0], A[1]] });
    await editor.expectStatus('Draft · rev 0');
    expect(await editor.validate()).toEqual([]);
    await editor.expectSendForApprovalEnabled();
    await sendForApproval(page, policy);
    // Waiting for the decision: not live yet.
    await list.findRow(own.code);
    expect(await list.cellValue(own.code, 'Status')).toMatch(/Pending approval/);
    await openTemplate(page, own.code);
    await approvePending(page);
    await editor.expectStatus('Active · rev 1');
    await panel.expectRequestStatus(/Approved/);
    await list.findRow(own.code);
    expect((await list.cellValue(own.code, 'Status')).trim()).toBe('Active');
    expect(await list.cellValue(own.code, 'Rev')).toBe('1');
  });

  test('TC-ERT-11 Editing an Active template starts a pending revision without affecting the live one', async ({
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby976'), 'TC-ERT-11 (ClickUp)');
    needCatalogue();
    const own = await createActive(page, policy, {
      triple: await freeTriple(page),
      steps: [A[0], A[1]],
    });
    await editor.startRevision();
    await editor.expectStatus('Active · rev 1 → pending rev 2');
    await editor.addStepWith(A[2]);
    await editor.addLink(3, { from: 2 });
    expect((await editor.saveDraft()).outcome).toBe('saved');
    await editor.showLive();
    await editor.expectLiveReadOnly();
    await editor.expectStepCount(2);

    await list.findRow(own.code);
    expect((await list.cellValue(own.code, 'Status')).replace(/\s+/g, ' ')).toBe(
      'Active pending rev 2',
    );
    expect(await list.cellValue(own.code, 'Rev')).toBe('1 → 2');
    // The pending revision goes live only once its approval is granted.
    await openTemplate(page, own.code);
    await sendForApproval(page, policy);
    await editor.expectStatus('Active · rev 1 → rev 2 pending approval');
    await approvePending(page);
    await editor.expectStatus('Active · rev 2');
    await editor.expectStepCount(3);
  });

  test('TC-ERT-12 "Cancel revision" asks for confirmation and restores the published revision', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby977'), 'TC-ERT-12 (ClickUp)');
    needCatalogue();
    await createActive(page, policy, { triple: await freeTriple(page), steps: [A[0], A[1]] });
    await editor.startRevision();
    await editor.addStepWith(A[2]);
    await editor.expectChanges('1 steps added');

    const text = await editor.openCancelRevision();
    expect(text).toContain(
      'Every change in the pending revision is dropped. The published revision stays as it is.',
    );
    await editor.keepRevision();
    await editor.expectStepCount(3);

    await editor.openCancelRevision();
    const guarded = await editor.confirmCancelRevision();
    if (guarded)
      openQuestion(
        'Candidate bug: after confirming "Cancel revision" the editor raises a "Leave without saving? This template has changes that are not saved" guard, although the revision was just dropped.',
      );
    await editor.expectStatus('Active · rev 1');
    await editor.expectStepCount(2);
  });

  test('TC-ERT-13 Withdrawing a request returns the template to where it was, still editable', async ({
    approvalPanelPage: panel,
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby978'), 'TC-ERT-13 (ClickUp)');
    needCatalogue();
    await test.step("a never-published template's first submission returns it to a Draft", async () => {
      await createTemplate(page, { triple: await freeTriple(page), steps: [A[0], A[1]] });
      await sendForApproval(page, policy);
      await panel.withdraw('QA-AUTO withdraw');
      await editor.expectStatus(/^Draft · rev 0$/);
      await editor.expectSendForApprovalEnabled();
      await editor.expectEditHeaderAvailable();
    });
    await test.step("a pending revision's submission returns it to the pending revision", async () => {
      await createActive(page, policy, { triple: await freeTriple(page), steps: [A[0], A[1]] });
      await editor.startRevision();
      await editor.addStepWith(A[2]);
      await editor.addLink(3, { from: 2 });
      expect((await editor.saveDraft()).outcome).toBe('saved');
      await sendForApproval(page, policy);
      await panel.withdraw('QA-AUTO withdraw');
      await editor.expectStatus('Active · rev 1 → pending rev 2');
      await editor.expectCancelRevisionAvailable();
      await editor.expectSendForApprovalEnabled();
    });
  });

  test('TC-ERT-14 The Live / Pending toggle shows the live revision vs. the staged one, with a real diff', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby979'), 'TC-ERT-14 (ClickUp)');
    needCatalogue();
    await createActive(page, policy, { triple: await freeTriple(page), steps: [A[0], A[1], A[2]] });
    await editor.startRevision();
    await editor.expectChanges('none yet');

    await editor.addStepWith(A[0]); // step 4, new
    await editor.addLink(4, { from: 3 });
    await editor.removeStep(2); // published: only marked removed
    await editor.expectChanges(/1 steps added/);
    await editor.expectChanges(/1 steps removed/);
    await editor.expectCellContains(4, 'Activity', 'new');
    await editor.expectStepMarkedRemoved(2);

    await editor.showLive();
    await editor.expectLiveReadOnly();
    await editor.expectStepCount(3);
    await editor.expectStepNotMarkedRemoved(2);
    await editor.expectNoChangesLine();

    await editor.showPending();
    await editor.expectStepCount(4);
    await editor.expectStepMarkedRemoved(2);
    notCovered('The Viewer role pinned to Live: no read-only persona is wired for this screen');
  });

  test('TC-ERT-15 Retire matches on cycle kind + product type + wash type, allows no successor, and is blocked while a revision is pending', async ({
    page,
    routingTemplatesListPage: list,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97a'), 'TC-ERT-15 (ClickUp)');
    await allure.tms(cu('z941aby952'), 'Bug z941aby952 (closed 2026-10-12)');
    needCatalogue();
    const triple = await freeTriple(page);
    const own = await createActive(page, policy, { triple, steps: [A[0], A[1]] });
    // A Draft on the same triple must never be offered as the successor.
    const sameTriple = await createTemplate(page, { triple, steps: [A[0]] });

    await test.step('(a)/(b) the dialog: successor optional, live templates on the same triple only', async () => {
      await list.findRow(own.code);
      await list.openRetire(own.code);
      await list.expectRetireDialog(own.code);
      expect(await list.retireDialogText()).toContain(
        'A live template for the same cycle kind, product type and wash type.',
      );
      await list.expectSuccessor('No successor — no longer made');
      const options = await list.successorOptions();
      expect(options[0]).toBe('No successor — no longer made');
      expect(options.some((o) => o.includes(sameTriple.code))).toBe(false);
      await list.cancelRetire();
    });
    await test.step('(c) refused while a revision is pending', async () => {
      await openTemplate(page, own.code);
      await editor.startRevision();
      await list.findRow(own.code);
      await list.openRetire(own.code);
      await list.expectCantRetire(own.code, 'Revision 2 is pending. Withdraw or cancel it first.');
      await list.closeCantRetire();
      await openTemplate(page, own.code);
      await editor.openCancelRevision();
      await editor.confirmCancelRevision();
    });
    await test.step('(b) retiring without a successor', async () => {
      await list.findRow(own.code);
      await list.openRetire(own.code);
      await list.confirmRetire();
      await list.findRow(own.code);
      expect(await list.cellValue(own.code, 'Status')).toBe('Retired');
    });
    notCovered(
      '(a) retiring onto another live template with the same triple: dev keeps one live template per ' +
        'triple (publishing a second one retires the first), so no such pair can exist',
    );
  });

  test('TC-ERT-16 Retired — "View as" was prototype-only scaffolding, not a feature meant to ship', async () => {
    await allure.tms(cu('z941aby97b'), 'TC-ERT-16 (ClickUp)');
    test.skip(true, 'Retired 2026-10-08: the "View as" selector is prototype-review scaffolding');
  });

  // ── Create Step ───────────────────────────────────────────────────────

  test('TC-CRS-01 "Add step" appends a row with no activity chosen yet', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97c'), 'TC-CRS-01 (ClickUp)');
    await editor.openNew();
    expect(await editor.addStep()).toBe(1);
    await editor.expectStepAwaitsActivity(1);
    expect(await editor.addStep()).toBe(2);
    await editor.expectStepAwaitsActivity(2);
    await editor.expectStepCount(2);
  });

  test('TC-CRS-02 The Activity picker is grouped by department and searchable', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97d'), 'TC-CRS-02 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepAndOpenPicker();
    const groups = await editor.pickerGroupNames();
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups) expect(g, 'department headers are upper case').toBe(g.toUpperCase());

    const byCode = await editor.searchPicker(A[1]);
    expect(byCode.map((o) => o.code)).toContain(A[1]);

    const group = cat!.options.find((o) => o.code === A[1])!.group;
    const byDept = await editor.searchPicker(group.toLowerCase());
    expect(byDept.map((o) => o.code)).toContain(A[1]);

    await editor.searchPicker(`no-such-activity-${Date.now()}`);
    await editor.expectPickerEmpty();
    await editor.closeActivityPicker();
    notCovered(
      'Retired activities left out: no retired activity is pinned on every environment to search for',
    );
  });

  test("TC-CRS-03 Picking an activity derives the step's Department — there is no independent Department field", async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97e'), 'TC-CRS-03 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const [i, code] of A.entries()) {
      await editor.addStepWith(code);
      await editor.expectCell(i + 1, 'Dept', deptOf(code));
      await editor.expectNoDepartmentControl(i + 1);
    }
  });

  test('TC-CRS-04 Recipe binding gives each option its own distinct tooltip', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97f'), 'TC-CRS-04 (ClickUp)');
    await allure.tms(cu('z941aby951'), 'Bug z941aby951 (closed 2026-10-12)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    expect(await editor.recipeTooltip(1, 'Wash')).toMatch(/^Matched on wash code$/i);
    expect(await editor.recipeTooltip(1, 'OB')).toMatch(
      /^Operation bulletin\s*[-–—]\s*the sewing recipe$/i,
    );
    expect(await editor.recipeTooltip(1, 'Params')).toMatch(/^Matched on tech-pack parameters$/i);
    expect(await editor.recipeTooltip(1, 'None')).toMatch(
      /^No recipe · duration from the activity standard$/i,
    );
  });

  test('TC-CRS-05 A new step defaults Recipe binding to "None" with the new caption text', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97g'), 'TC-CRS-05 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.expectRecipeSelected(1, 'None');
    await editor.expectCellContains(1, 'Recipe', 'no recipe · duration from the activity standard');
  });

  test('TC-CRS-06 The Optional toggle defaults off and is independent of Recipe binding and Condition', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97h'), 'TC-CRS-06 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.expectOptional(1, false);
    await editor.toggleOptional(1);
    await editor.expectOptional(1, true);
    await editor.selectRecipe(1, 'OB');
    await editor.openCondition(1);
    await editor.cancelCondition();
    await editor.expectOptional(1, true);
    await editor.expectRecipeSelected(1, 'OB');
    await editor.expectCell(1, 'Condition', 'always');
  });

  test('TC-CRS-07 Duplicating a step via its row menu inserts an immediate, independent copy', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97j'), 'TC-CRS-07 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const code of A) await editor.addStepWith(code);
    await editor.selectRecipe(2, 'OB');
    await editor.stepAction(2, 'Duplicate step');
    await editor.expectStepCount(4);
    expect(await editor.stepActivities()).toEqual([A[0], A[1], A[1], A[2]]);
    await editor.expectRecipeSelected(3, 'OB');
    await editor.selectRecipe(3, 'Wash');
    await editor.expectRecipeSelected(2, 'OB');
  });

  // ── Edit Step ─────────────────────────────────────────────────────────

  test('TC-ERS-01 Reordering steps renumbers them on Save, without breaking existing links', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97k'), 'TC-ERS-01 (ClickUp)');
    needCatalogue();
    // 1 → 2 and 1 → 3, so any order keeps every link valid.
    const own = await createTemplate(page, {
      triple: anyCycleKind(snap),
      steps: [A[0], A[1], A[2]],
      links: [
        [1, 2],
        [1, 3],
      ],
    });
    await editor.moveStepUp(3, 1);
    expect(await editor.stepActivities()).toEqual([A[0], A[2], A[1]]);
    expect((await editor.saveDraft()).outcome).toBe('saved');
    await editor.reload(own.code);
    expect(await editor.stepActivities()).toEqual([A[0], A[2], A[1]]);
    await editor.expectCell(2, '#', '2');
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);
    expect(await editor.waitsOnChips(3)).toEqual(['1 · 100 %']);
  });

  test('TC-ERS-02 "Waits on" on a predecessor-less step opens the link editor directly, with quick presets', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97m'), 'TC-ERS-02 (ClickUp)');
    await allure.tms(cu('z941aby953'), 'Bug z941aby953 (closed 2026-10-12)');
    needCatalogue();
    await editor.openNew();
    for (const code of [A[0], A[1], A[2], A[0]]) await editor.addStepWith(code);

    await editor.openNewLink(2);
    await editor.expectLinkWaitingStep(`2 · ${A[1]}`);
    await editor.expectLinkTabSelected('After finish');
    await editor.expectNoThreshold();
    expect(await editor.linkDialogText()).toContain(
      '1,000 pcs = after a thousand pieces regardless of order size',
    );
    await editor.fillLink({ from: 1 });
    await editor.submitLink();
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);

    await editor.addLink(3, { from: 1, startAfter: 'Start together' });
    expect(await editor.waitsOnChips(3)).toEqual(['1 · 0 %']);

    await editor.openNewLink(4);
    await editor.fillLink({ from: 1, startAfter: 'Custom' });
    await editor.expectThresholdEditable();
    await editor.fillLink({ from: 1, threshold: '1000', unit: 'pcs' });
    await editor.submitLink();
    expect(await editor.waitsOnChips(4)).toEqual([expect.stringMatching(/^1 · 1,?000 pcs$/)]);
  });

  test('TC-ERS-03 A step\'s row menu "Waits on…" opens a dialog listing every predecessor', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97n'), 'TC-ERS-03 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const code of A) await editor.addStepWith(code);
    await editor.addLink(2, { from: 1 });
    await editor.addLink(3, { from: 1 });
    await editor.addLink(3, { from: 2 });
    const entries = await editor.openWaitsOnList(3);
    expect(entries).toEqual([
      expect.stringMatching(new RegExp(`^1 · ${A[0]} 100 %`)),
      expect.stringMatching(new RegExp(`^2 · ${A[1]} 100 %`)),
    ]);
    await editor.expectWaitsOnList(3, A[2], 2);
    await editor.closeWaitsOnList();
  });

  test('TC-ERS-04 Minimum lag is hours + minutes, with an Elapsed vs. Working time toggle', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97p'), 'TC-ERS-04 (ClickUp)');
    await allure.tms(cu('z941aby953'), 'Bug z941aby953 (closed 2026-10-12)');
    needCatalogue();
    await buildDraft(page, { triple: anyCycleKind(snap), steps: [A[0], A[1]], links: [] });
    await editor.openNewLink(2);
    await editor.fillLink({ from: 1 });
    await editor.expectLinkTabSelected('Working');
    expect(await editor.linkDialogText()).toContain(
      'Working time - a handover queue obeys the calendar.',
    );
    await editor.selectLinkTab('Elapsed');
    expect(await editor.linkDialogText()).toContain(
      'Wall-clock time - chemistry does not stop overnight.',
    );
    await editor.fillLink({ from: 1, hours: '1', minutes: '30', lagCounts: 'Elapsed' });
    await editor.submitLink();

    const saved = await editor.saveDraft();
    expect(saved.outcome).toBe('saved');
    if (saved.outcome !== 'saved') return;
    trackCode(PREFIX, saved.code);
    await editor.reload(saved.code);
    await editor.openExistingLink(2, 1);
    await editor.expectLag('1', '30');
    await editor.expectLinkTabSelected('Elapsed');
    await editor.cancelLink();
  });

  test('TC-ERS-05 An "Any-of group" is chosen from a managed dropdown, not typed as a free number', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97q'), 'TC-ERS-05 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const code of A) await editor.addStepWith(code);
    await editor.addLink(2, { from: 1 });

    await editor.openNewLink(3);
    await editor.fillLink({ from: 1 });
    expect(await editor.anyOfOptions()).toEqual(['Mandatory', 'New group…']);
    await editor.fillLink({ from: 1, anyOf: 'New group…' });
    await editor.submitLink();

    await editor.openNewLink(3);
    await editor.fillLink({ from: 2 });
    expect(await editor.anyOfOptions()).toEqual(['Mandatory', 'Group 1', 'New group…']);
    await editor.fillLink({ from: 2, anyOf: 'Group 1' });
    expect(await editor.linkDialogText()).toContain(
      'Links into the same step that share a group satisfy each other — any one is enough.',
    );
    await editor.submitLink();
    const chips = await editor.waitsOnChips(3);
    expect(chips).toHaveLength(2);
    for (const chip of chips) expect(chip).toContain('any-of');
  });

  test('TC-ERS-06 A link that would close a cycle is refused with the exact cycle path named', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97r'), 'TC-ERS-06 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const code of A) await editor.addStepWith(code);
    await editor.addLink(2, { from: 1 });
    await editor.addLink(3, { from: 2 });
    await editor.openNewLink(1);
    await editor.fillLink({ from: 3 });
    const message = await editor.submitLinkRefused(/^Refused — would create a loop: /);
    expect(message).toBe(
      `Refused — would create a loop: 1 · ${A[0]} → 2 · ${A[1]} → 3 · ${A[2]} → 1 · ${A[0]}`,
    );
    await editor.cancelLink();
    expect(await editor.waitsOnChips(1)).toEqual([]);
  });

  test('TC-ERS-07 A duplicate link is refused rather than creating a second edge', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97t'), 'TC-ERS-07 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.addStepWith(A[1]);
    await editor.addLink(2, { from: 1 });
    await editor.openNewLink(2);
    await editor.fillLink({ from: 1 });
    await editor.submitLinkRefused('That link already exists — click the arrow to edit it');
    await editor.cancelLink();
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);
  });

  test("TC-ERS-08 A Condition's attribute comes from a fixed tech-pack attribute registry", async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97u'), 'TC-ERS-08 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.openCondition(1);
    // Stricter than the spec: a closed list, so an invented attribute can't even be typed.
    await editor.expectConditionAttributeIsClosedList();
    const attributes = await editor.conditionAttributes();
    for (const a of attributes) expect(a, 'label + registry key').toMatch(/^.+ [a-z][a-z0-9_]*$/);
    expect(attributes).toContain('Has dry process has_dry_process');
    await editor.chooseConditionAttribute('Has dry process');
    await editor.expectConditionControls('is', ['true', 'false']);
    await editor.cancelCondition();
  });

  test('TC-ERS-09 A Condition can be tested live against sample tech packs before saving', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97v'), 'TC-ERS-09 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.openCondition(1);
    await editor.chooseConditionAttribute('Has dry process');
    await editor.chooseConditionValue('true');
    const samples = await editor.sampleOrders();
    expect(samples.length).toBeGreaterThan(0);
    const whenTrue: string[] = [];
    for (const s of samples) whenTrue.push(await editor.testAgainstSample(s));
    await editor.chooseConditionValue('false');
    const whenFalse: string[] = [];
    for (const s of samples) whenFalse.push(await editor.testAgainstSample(s));
    // Each sample is either dry-processed or not: flipping the value flips every verdict.
    expect(whenFalse).toEqual(whenTrue.map((v) => (v === 'Included' ? 'Excluded' : 'Included')));
    await editor.cancelCondition();
    await editor.expectCell(1, 'Condition', 'always'); // nothing applied
  });

  test('TC-ERS-10 "Always include (clear)" removes a condition entirely, distinct from Cancel', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97w'), 'TC-ERS-10 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.addStepWith(A[0]);
    await editor.openCondition(1);
    await editor.chooseConditionAttribute('Has dry process');
    await editor.chooseConditionValue('true');
    await editor.applyCondition();
    await editor.expectCellNotContains(1, 'Condition', /^always$/);

    await editor.openCondition(1);
    await editor.cancelCondition();
    await editor.expectCellNotContains(1, 'Condition', /^always$/);

    await editor.openCondition(1);
    await editor.clearCondition();
    await editor.expectCell(1, 'Condition', 'always');
  });

  test('TC-ERS-11 Parallel group names are normalised to uppercase and drawn as lanes', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97x'), 'TC-ERS-11 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    for (const code of A) await editor.addStepWith(code);
    await editor.addLink(3, { from: 1 });
    await editor.addLink(3, { from: 2 });
    await editor.setParallelGroup(1, 'prep');
    await editor.setParallelGroup(2, 'prep');
    await editor.expectCell(1, 'Parallel', 'PREP');
    await editor.expectCell(2, 'Parallel', /PREP$/); // the 2nd member reads "↳ PREP"
    await editor.showVisual();
    await editor.expectGraphText('PREP');
  });

  test('TC-ERS-12 Removing a step from a Draft deletes it and its own links', async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97y'), 'TC-ERS-12 (ClickUp)');
    needCatalogue();
    const own = await createTemplate(page, {
      triple: anyCycleKind(snap),
      steps: [A[0], A[1], A[2]],
      links: [
        [1, 2],
        [2, 3],
        [1, 3],
      ],
    });
    await editor.removeStep(2);
    await editor.expectStepCount(2);
    expect(await editor.stepActivities()).toEqual([A[0], A[2]]);
    await editor.expectStepNotMarkedRemoved(2);
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']); // 2 → 3 went with step 2
    expect((await editor.saveDraft()).outcome).toBe('saved');
    await editor.reload(own.code);
    await editor.expectStepCount(2);
    expect(await editor.waitsOnChips(2)).toEqual(['1 · 100 %']);
  });

  test("TC-ERS-13 Removing a step during a pending revision only marks it, and it's restorable", async ({
    page,
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby97z'), 'TC-ERS-13 (ClickUp)');
    needCatalogue();
    await createActive(page, policy, { triple: await freeTriple(page), steps: [A[0], A[1], A[2]] });
    await editor.startRevision();
    const full = ['Details', 'Waits on…', 'Group with…', 'Duplicate step', 'Remove step'];
    expect(await editor.stepMenuItems(3)).toEqual(full);
    await editor.removeStep(3);
    await editor.expectStepCount(3);
    await editor.expectStepMarkedRemoved(3);
    await editor.expectChanges('1 steps removed');
    expect(await editor.stepMenuItems(3)).toEqual(['Details', 'Restore']);
    await editor.stepAction(3, 'Restore');
    await editor.expectStepNotMarkedRemoved(3);
    expect(await editor.stepMenuItems(3)).toEqual(full);
    await editor.openCancelRevision();
    await editor.confirmCancelRevision();
  });

  test('TC-ERS-14 The "Critical path" graph toggle on a left-to-right graph', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby980'), 'TC-ERS-14 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.fillHeader({ ...anyCycleKind(snap), name: rtName(`${PREFIX}-GRAPH`) });
    for (const code of A) await editor.addStepWith(code);
    await editor.addLink(2, { from: 1 });
    await editor.addLink(3, { from: 1 });
    expect(await editor.validate()).toEqual([]);
    expect(await editor.criticalPathDays()).toBeGreaterThan(0);
    await editor.showVisual();
    await editor.expectGraphNodes(3);
    await editor.expectGraphFlowsLeftToRight();
    await editor.expectCriticalPathPressed(false);
    await editor.toggleCriticalPath();
    await editor.expectCriticalPathPressed(true);
    await editor.showTable();
    notCovered('Which chain is highlighted (colour only, no accessible marker)');
  });

  test('TC-ERS-15 A non-first step with zero predecessors blocks Save draft; step 1 is exempt', async ({
    routingTemplateEditorPage: editor,
  }) => {
    await allure.tms(cu('z941aby981'), 'TC-ERS-15 (ClickUp)');
    needCatalogue();
    await editor.openNew();
    await editor.fillHeader({ ...anyCycleKind(snap), name: rtName(`${PREFIX}-NOPRED`) });
    for (const code of [A[0], A[1], A[2], A[0]]) await editor.addStepWith(code);
    const issues = await editor.validate();
    expect(issues).toHaveLength(3);
    for (const step of [2, 3, 4])
      expect(
        issues.some((i) => i.includes(`Step ${step} `) && i.includes('waits on nothing')),
      ).toBe(true);
    expect(issues.some((i) => i.includes('Step 1 '))).toBe(false);
    expect(await editor.saveDraft()).toEqual({ outcome: 'refused' });
    await editor.expectRefusalMessage('3 validation errors — nothing was saved.');
    await editor.expectSendForApprovalUnavailable();
  });
});
