import { type Locator, type Page, type Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { RoutingTemplateEditorLocators } from '../../locators/planning/routing-template-editor.locators';
import { toast } from '../../locators/planning/form-field.locators';
import { WAIT } from './waits';

const NEW_ROUTE = '/planning/master-data/routing-templates/new';

/** One option of the activity picker, split into its parts. */
export interface ActivityOption {
  group: string;
  code: string;
  name: string;
  dept: string;
}

export interface HeaderValues {
  /** A cycle kind's label ("Proto 2"); its option reads "<label> · <stage group>". */
  cycleKind?: string;
  productType?: string;
  washType?: string;
  name?: string;
  description?: string;
}

export interface LinkValues {
  /** The predecessor's step number. */
  from: number;
  startAfter?: 'After finish' | 'Start together' | 'Custom';
  threshold?: string;
  unit?: '%' | 'pcs';
  hours?: string;
  minutes?: string;
  lagCounts?: 'Elapsed' | 'Working';
  /** "Mandatory", "New group…", "Group 1", … */
  anyOf?: string;
}

export type SaveOutcome = { outcome: 'saved'; code: string } | { outcome: 'refused' };

const API = /\/api\/planning\/routing-templates/;
const isSave = (r: Response) =>
  r.request().method() !== 'GET' &&
  API.test(r.url()) &&
  (/routing-templates$/.test(r.url()) ||
    /routing-templates\/[0-9a-f-]{36}(\/working-copy)?$/.test(r.url()));

/**
 * The routing-template editor: a never-saved draft at /routing-templates/new
 * (inline header form, "Unsaved" badge) or a saved template at
 * /routing-templates/<uuid>. Owned by the Planning QA. The code is
 * generated on the first Save draft (RT-0001…). Active templates are read-only
 * until "Edit template" starts a pending revision (Live / Pending tabs,
 * "Cancel revision"). A template goes Active through "Send for approval"
 * (the policy's approvers decide); the panel itself is ApprovalPanelPage.
 *
 * Radix gotchas on this screen (see the test-case doc's notes): the row menus
 * need a real click; the activity trigger needs dispatchEvent (a real click
 * can retry forever under the picker's overlay); Recipe binding, Start after
 * and Lag counts are tabs; the first click on "Edit template" right after the
 * page renders is sometimes dropped.
 */
export class RoutingTemplateEditorPage extends BasePage {
  readonly locators: RoutingTemplateEditorLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new RoutingTemplateEditorLocators(page);
  }

  // ── Opening ───────────────────────────────────────────────────────────

  async openNew(): Promise<void> {
    await this.gotoAuthenticated(NEW_ROUTE);
    await this.expectOnNewPage();
    // The heading follows the Name field once something is typed, so "Untitled" holds only on arrival.
    await expect(this.locators.heading).toHaveText('Untitled', { timeout: WAIT.PAGE_LOAD });
  }

  async expectOnNewPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/routing-templates\/new$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.unsavedBadge).toBeVisible();
    await expect(this.locators.saveDraftButton).toBeVisible();
  }

  /** A saved template's editor has loaded (its name as the heading, its code in the header). */
  async expectLoaded(code: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/routing-templates\/[0-9a-f-]{36}/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.page.getByText(code, { exact: true }).first()).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    await expect(this.locators.statusBadge).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    // The approvals panel loads after the page (its first load is slow) and the header /
    // revision buttons come with it: wait for one of them, or for a Retired template (which has none).
    await expect(
      this.locators.editHeaderButton
        .or(this.locators.editTemplateButton)
        .or(this.locators.withdrawButton)
        .or(this.locators.statusBadge.filter({ hasText: /Retired/ }))
        .first(),
    ).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /**
   * A saved Draft opens read-only (November build): "Edit template" switches
   * it to editing ("Edit header", Add step, Save draft). A no-op for any
   * other state — Active templates' "Edit template" starts a revision
   * (startRevision), and a pending one has no such button.
   */
  async startEditingDraft(): Promise<void> {
    if (!/Draft/.test(await this.headerText())) return;
    if (!(await this.locators.editTemplateButton.isVisible())) return;
    await this.locators.editTemplateButton.click();
    await expect(this.locators.editHeaderButton).toBeVisible({ timeout: WAIT.SERVER });
  }

  async url(): Promise<string> {
    return this.page.url();
  }

  async reload(code: string): Promise<void> {
    await this.page.reload();
    await this.expectLoaded(code);
  }

  async backToList(): Promise<void> {
    await this.locators.backLink.click();
    await expect(this.page).toHaveURL(/\/routing-templates$/, { timeout: WAIT.NAVIGATION });
  }

  // ── Header ────────────────────────────────────────────────────────────

  private async choose(combobox: Locator, option: string | RegExp): Promise<void> {
    await combobox.click();
    await this.locators.option(option).first().click();
    await expect(this.locators.options()).toHaveCount(0);
  }

  /** Fills the inline header of a never-saved draft. */
  async fillHeader(values: HeaderValues, scope?: Locator): Promise<void> {
    const l = this.locators;
    if (values.name !== undefined) await l.templateName(scope).fill(values.name);
    if (values.description !== undefined) await l.description(scope).fill(values.description);
    if (values.cycleKind)
      await this.choose(l.cycleKind(scope), new RegExp(`^${escape(values.cycleKind)} ·`));
    if (values.productType) await this.choose(l.productType(scope), values.productType);
    if (values.washType) await this.choose(l.washType(scope), values.washType);
  }

  /** The inline header shows exactly the v2.5 field set (code auto-generated, disabled). */
  async expectInlineHeader(): Promise<void> {
    const l = this.locators;
    await expect(l.cycleKind()).toHaveText(/Choose a cycle kind first/);
    await expect(l.productType()).toHaveText('Any product');
    await expect(l.washType()).toHaveText('Any wash');
    await expect(l.templateCode()).toBeDisabled();
    await expect(l.templateCode()).toHaveAttribute('placeholder', 'Auto-generated');
    await expect(l.templateCode()).toHaveValue('');
    await expect(l.templateName()).toBeEditable();
    await expect(l.description()).toBeEditable();
    await expect(l.headerDialog).toHaveCount(0);
  }

  /** A saved template shows no inline header fields, only "Edit header". */
  async expectNoInlineHeader(): Promise<void> {
    await expect(this.locators.editHeaderButton).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.templateName()).toHaveCount(0);
    await expect(this.locators.cycleKind()).toHaveCount(0);
  }

  async openHeaderDialog(): Promise<void> {
    await expect(async () => {
      await this.locators.editHeaderButton.click({ timeout: WAIT.RETRY_STEP });
      await expect(this.locators.headerDialog).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.NAVIGATION });
  }

  /**
   * Each named field of the Edit header dialog is enabled (true) or disabled
   * (false). Field names as on screen.
   */
  async expectHeaderDialogFields(
    expected: Partial<
      Record<'cycleKind' | 'productType' | 'washType' | 'code' | 'name' | 'description', boolean>
    >,
  ): Promise<void> {
    const d = this.locators.headerDialog;
    const l = this.locators;
    const fields: Record<string, Locator> = {
      cycleKind: l.cycleKind(d),
      productType: l.productType(d),
      washType: l.washType(d),
      code: l.templateCode(d),
      name: l.templateName(d),
      description: l.description(d),
    };
    for (const [field, enabled] of Object.entries(expected)) {
      const locator = fields[field]!;
      if (enabled) await expect(locator, `${field} enabled`).toBeEnabled();
      else await expect(locator, `${field} disabled`).toBeDisabled();
    }
  }

  async headerDialogText(): Promise<string> {
    return (await this.locators.headerDialog.innerText()).replace(/\s+/g, ' ');
  }

  async headerDialogValue(field: 'code' | 'name' | 'description'): Promise<string> {
    const d = this.locators.headerDialog;
    const l = this.locators;
    const locator =
      field === 'code'
        ? l.templateCode(d)
        : field === 'name'
          ? l.templateName(d)
          : l.description(d);
    return locator.inputValue();
  }

  async headerDialogSelection(field: 'cycleKind' | 'productType' | 'washType'): Promise<string> {
    const d = this.locators.headerDialog;
    const l = this.locators;
    const locator =
      field === 'cycleKind'
        ? l.cycleKind(d)
        : field === 'productType'
          ? l.productType(d)
          : l.washType(d);
    return (await locator.innerText()).trim();
  }

  /** Fills name / description in the Edit header dialog and saves them (waits for the save call). */
  async saveHeaderDialog(values: Pick<HeaderValues, 'name' | 'description'>): Promise<void> {
    const d = this.locators.headerDialog;
    if (values.name !== undefined) await this.locators.templateName(d).fill(values.name);
    if (values.description !== undefined)
      await this.locators.description(d).fill(values.description);
    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() !== 'GET' && API.test(r.url()), {
        timeout: WAIT.NAVIGATION,
      }),
      this.locators.dialogButton(d, 'Save changes').click(),
    ]);
    expect(response.status(), 'save header').toBeLessThan(300);
    await expect(d).toBeHidden({ timeout: WAIT.SERVER });
  }

  async closeHeaderDialog(): Promise<void> {
    await this.locators.dialogButton(this.locators.headerDialog, 'Cancel').click();
    await expect(this.locators.headerDialog).toBeHidden();
  }

  async expectHeading(text: string): Promise<void> {
    await expect(this.locators.heading).toHaveText(text, { timeout: WAIT.SERVER });
  }

  async expectStatus(text: string | RegExp): Promise<void> {
    await expect(this.locators.statusBadge).toHaveText(text, { timeout: WAIT.SERVER });
  }

  /** The header line's text (code, cycle kind, product / wash type, source, status). */
  async headerText(): Promise<string> {
    return (await this.locators.statusBadge.locator('xpath=..').innerText()).replace(/\s+/g, ' ');
  }

  async expectPageText(text: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('main').last()).toContainText(text, { timeout: WAIT.SERVER });
  }

  async expectNoApprovalsBlock(): Promise<void> {
    await expect(this.locators.approvalsText).toHaveCount(0);
  }

  async expectAiProposed(): Promise<void> {
    await expect(this.locators.aiProposedBadge.first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  // ── Steps ─────────────────────────────────────────────────────────────

  /**
   * Closes the bottom-left issue list if it's open (it covers "Add step").
   * Escape closes it after a short exit animation; a click on the footer
   * badge would toggle it open again, so the fallback clicks the heading.
   */
  async dismissIssues(): Promise<void> {
    const list = this.locators.issueList;
    if (!(await list.isVisible().catch(() => false))) return;
    await this.page.keyboard.press('Escape');
    const closed = await list
      .waitFor({ state: 'hidden', timeout: WAIT.RETRY_STEP })
      .then(() => true)
      .catch(() => false);
    if (!closed) await this.locators.heading.click();
    await expect(list).toBeHidden({ timeout: WAIT.RETRY_STEP });
  }

  async stepCount(): Promise<number> {
    if (await this.locators.emptyStepsMessage.isVisible().catch(() => false)) return 0;
    return this.locators.stepRows().count();
  }

  async expectStepCount(n: number): Promise<void> {
    if (n === 0) await expect(this.locators.emptyStepsMessage).toBeVisible();
    else await expect(this.locators.stepRows()).toHaveCount(n, { timeout: WAIT.SERVER });
    await expect(this.locators.stepsHeading).toHaveText(`Steps (${n})`);
  }

  async expectEmptySteps(message: string | RegExp): Promise<void> {
    await expect(this.locators.emptyStepsMessage).toHaveText(message);
    await expect(this.locators.stepsHeading).toHaveText('Steps (0)');
  }

  /**
   * Clicks "Add step". Since dev's November build the activity picker opens
   * for the new step straight away (its modal hides the steps table from
   * the accessibility tree); returns whether it did.
   */
  private async clickAddStep(): Promise<{ step: number; pickerOpen: boolean }> {
    await this.dismissIssues();
    const before = await this.stepCount();
    await this.locators.addStepButton.click();
    const newRow = this.locators.stepRows().nth(before);
    await expect(this.locators.activityPicker.or(newRow)).toBeVisible({ timeout: WAIT.SERVER });
    return { step: before + 1, pickerOpen: await this.locators.activityPicker.isVisible() };
  }

  /** "Add step" without choosing an activity; returns the new step's number. */
  async addStep(): Promise<number> {
    const { step, pickerOpen } = await this.clickAddStep();
    if (pickerOpen) await this.closeActivityPicker();
    await expect(this.locators.stepRows()).toHaveCount(step, { timeout: WAIT.SERVER });
    return step;
  }

  async expectStepAwaitsActivity(step: number): Promise<void> {
    await expect(this.locators.chooseActivity(step)).toBeVisible();
    await this.expectCellContains(step, '#', String(step));
  }

  async openActivityPicker(step: number): Promise<void> {
    await expect(async () => {
      await this.locators.chooseActivity(step).dispatchEvent('click');
      await expect(this.locators.activityPicker).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
  }

  async closeActivityPicker(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.activityPicker).toBeHidden();
  }

  /** Whether the open picker lists any activity at all ("No activity matches." otherwise). */
  async pickerHasActivities(): Promise<boolean> {
    const picker = this.locators.activityPicker;
    await expect(
      this.locators.pickerOptions().first().or(picker.getByText('No activity matches.')),
    ).toBeVisible({ timeout: WAIT.SERVER });
    return (await this.locators.pickerOptions().count()) > 0;
  }

  /** Every option of the open picker, with its department group. */
  async pickerCatalogue(): Promise<ActivityOption[]> {
    const groups = this.locators.pickerGroups();
    const result: ActivityOption[] = [];
    for (const group of await groups.all()) {
      const groupName = await groupLabel(group);
      for (const text of await group.getByRole('option').allInnerTexts()) {
        const [code = '', name = '', dept = ''] = text.split('\n').map((s) => s.trim());
        result.push({ group: groupName, code, name, dept });
      }
    }
    return result;
  }

  async pickerGroupNames(): Promise<string[]> {
    const names: string[] = [];
    for (const group of await this.locators.pickerGroups().all())
      names.push(await groupLabel(group));
    return names;
  }

  /** Types `term` in the open picker's search and returns the options' codes once settled. */
  async searchPicker(term: string): Promise<ActivityOption[]> {
    await this.locators.pickerSearch().fill(term);
    let options: ActivityOption[] = [];
    await expect
      .poll(
        async () => {
          options = await this.pickerCatalogue();
          return options.every((o) =>
            `${o.code} ${o.name} ${o.dept} ${o.group}`.toLowerCase().includes(term.toLowerCase()),
          );
        },
        { message: `picker options should match "${term}"`, timeout: WAIT.SERVER },
      )
      .toBe(true);
    return options;
  }

  async expectPickerEmpty(): Promise<void> {
    await expect(this.locators.activityPicker.getByText('No activity matches.')).toBeVisible({
      timeout: WAIT.SERVER,
    });
    await expect(this.locators.pickerOptions()).toHaveCount(0);
  }

  /** Picks `code` in the open activity picker. */
  private async pickInPicker(step: number, code: string): Promise<void> {
    await this.locators.pickerSearch().fill(code);
    await this.locators.pickerOption(code).first().click();
    await expect(this.locators.activityPicker).toBeHidden({ timeout: WAIT.SERVER });
    await expect(this.locators.stepRow(step)).toContainText(code);
  }

  /** Picks `code` for a step that has no activity yet. */
  async chooseActivity(step: number, code: string): Promise<void> {
    await this.openActivityPicker(step);
    await this.pickInPicker(step, code);
  }

  /** "Add step" and pick `code` for it; returns the step's number. */
  async addStepWith(code: string): Promise<number> {
    const { step, pickerOpen } = await this.clickAddStep();
    if (pickerOpen) await this.pickInPicker(step, code);
    else await this.chooseActivity(step, code);
    return step;
  }

  /** "Add step" and leave its activity picker open (opening it if needed); returns the step. */
  async addStepAndOpenPicker(): Promise<number> {
    const { step, pickerOpen } = await this.clickAddStep();
    if (!pickerOpen) await this.openActivityPicker(step);
    return step;
  }

  /** Column headers of the steps table, re-read on each lookup (Live rows have no drag column). */
  private headers: string[] = [];

  private async col(name: string): Promise<number> {
    this.headers = (await this.locators.stepsColumnHeaders().allInnerTexts()).map((h) => h.trim());
    const i = this.headers.indexOf(name);
    if (i < 0) throw new Error(`No "${name}" column in ${this.headers.join(', ')}`);
    return i;
  }

  /** One cell of a step row, by column header. */
  async cell(step: number, column: string): Promise<Locator> {
    return this.locators
      .stepRow(step)
      .getByRole('cell')
      .nth(await this.col(column));
  }

  async cellText(step: number, column: string): Promise<string> {
    return (await (await this.cell(step, column)).innerText()).replace(/\s+/g, ' ').trim();
  }

  async expectCell(step: number, column: string, text: string | RegExp): Promise<void> {
    await expect(await this.cell(step, column)).toHaveText(text, { timeout: WAIT.SERVER });
  }

  async expectCellContains(step: number, column: string, text: string | RegExp): Promise<void> {
    await expect(await this.cell(step, column)).toContainText(text, { timeout: WAIT.SERVER });
  }

  async expectCellNotContains(step: number, column: string, text: string | RegExp): Promise<void> {
    await expect(await this.cell(step, column)).not.toContainText(text, { timeout: WAIT.SERVER });
  }

  /** The step row offers no control of its own for the department (no combobox / textbox). */
  async expectNoDepartmentControl(step: number): Promise<void> {
    const dept = await this.cell(step, 'Dept');
    await expect(dept.getByRole('combobox')).toHaveCount(0);
    await expect(dept.getByRole('button')).toHaveCount(0);
    await expect(dept.getByRole('textbox')).toHaveCount(0);
  }

  /** Each step's activity code, in table order. */
  async stepActivities(): Promise<string[]> {
    const n = await this.stepCount();
    const codes: string[] = [];
    for (let i = 1; i <= n; i++) {
      const text = await this.cellText(i, 'Activity');
      codes.push(text.split(' ')[0] ?? '');
    }
    return codes;
  }

  // ── Row menu ──────────────────────────────────────────────────────────

  async openStepMenu(step: number): Promise<void> {
    await this.dismissIssues();
    await expect(async () => {
      await this.locators.stepActions(step).click({ timeout: WAIT.RETRY_STEP });
      await expect(this.locators.stepMenu).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
  }

  async stepMenuItems(step: number): Promise<string[]> {
    await this.openStepMenu(step);
    const items = (await this.locators.stepMenu.getByRole('menuitem').allInnerTexts()).map((t) =>
      t.trim(),
    );
    await this.page.keyboard.press('Escape');
    await expect(this.locators.stepMenu).toBeHidden();
    return items;
  }

  async stepAction(
    step: number,
    item: 'Details' | 'Waits on…' | 'Group with…' | 'Duplicate step' | 'Remove step' | 'Restore',
  ): Promise<void> {
    await this.openStepMenu(step);
    await this.locators.menuItem(item).click();
    await expect(this.locators.stepMenu).toBeHidden();
  }

  /** Removes a step via its menu (hard-deletes it in a draft, marks it "removed" mid-revision). */
  async removeStep(step: number): Promise<void> {
    await this.stepAction(step, 'Remove step');
  }

  async expectStepMarkedRemoved(step: number): Promise<void> {
    await expect(await this.cell(step, 'Activity')).toContainText('removed');
  }

  async expectStepNotMarkedRemoved(step: number): Promise<void> {
    await expect(await this.cell(step, 'Activity')).not.toContainText('removed');
  }

  async setParallelGroup(step: number, group: string): Promise<void> {
    await this.stepAction(step, 'Group with…');
    const d = this.locators.groupDialog;
    await expect(d).toBeVisible();
    await d.getByRole('textbox', { name: 'Group name' }).fill(group);
    await d.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(d).toBeHidden();
  }

  // ── Recipe binding / Optional ─────────────────────────────────────────

  async expectRecipeSelected(step: number, name: 'Wash' | 'OB' | 'Params' | 'None'): Promise<void> {
    await expect(this.locators.recipeTab(step, name)).toHaveAttribute('aria-selected', 'true');
  }

  async selectRecipe(step: number, name: 'Wash' | 'OB' | 'Params' | 'None'): Promise<void> {
    await this.locators.recipeTab(step, name).click();
    await this.expectRecipeSelected(step, name);
  }

  /**
   * The tooltip a Recipe binding option shows on hover. Radix tooltips only
   * open on a fresh hover: the mouse leaves the table first, and the hover is
   * retried until a tooltip reads.
   */
  async recipeTooltip(step: number, name: 'Wash' | 'OB' | 'Params' | 'None'): Promise<string> {
    const tab = this.locators.recipeTab(step, name);
    let text = '';
    await expect(async () => {
      await this.page.mouse.move(0, 0);
      await expect(this.locators.tooltip()).toHaveCount(0, { timeout: WAIT.RETRY_STEP });
      await tab.hover();
      await expect(this.locators.tooltip().first()).toBeVisible({ timeout: WAIT.RETRY_STEP });
      text = (await this.locators.tooltip().first().innerText()).trim();
    }).toPass({ timeout: WAIT.SERVER });
    await this.page.mouse.move(0, 0);
    return text;
  }

  async expectOptional(step: number, on: boolean): Promise<void> {
    await expect(this.locators.optionalSwitch(step)).toHaveAttribute(
      'aria-checked',
      on ? 'true' : 'false',
    );
  }

  async toggleOptional(step: number): Promise<void> {
    await this.locators.optionalSwitch(step).click();
  }

  // ── Links ─────────────────────────────────────────────────────────────

  /** Opens a new link into `step` from its "Add a step this one waits on" button. */
  async openNewLink(step: number): Promise<void> {
    await this.dismissIssues();
    await this.locators.addWaitsOn(step).click();
    await expect(this.locators.linkDialog).toBeVisible({ timeout: WAIT.SERVER });
  }

  async linkDialogText(): Promise<string> {
    return (await this.locators.linkDialog.innerText()).replace(/\s+/g, ' ');
  }

  async expectLinkWaitingStep(text: string | RegExp): Promise<void> {
    await expect(this.locators.linkWaitingStep()).toBeDisabled();
    await expect(this.locators.linkWaitingStep()).toHaveText(text);
  }

  async expectLinkTabSelected(
    name: 'After finish' | 'Start together' | 'Custom' | 'Elapsed' | 'Working',
  ): Promise<void> {
    await expect(this.locators.linkTab(name)).toHaveAttribute('aria-selected', 'true');
  }

  async selectLinkTab(
    name: 'After finish' | 'Start together' | 'Custom' | 'Elapsed' | 'Working',
  ): Promise<void> {
    await this.locators.linkTab(name).click();
    await this.expectLinkTabSelected(name);
  }

  async expectThresholdEditable(): Promise<void> {
    await expect(this.locators.linkThreshold()).toBeEditable();
    await expect(this.locators.linkUnitTab('%')).toBeVisible();
    await expect(this.locators.linkUnitTab('pcs')).toBeVisible();
  }

  async expectNoThreshold(): Promise<void> {
    await expect(this.locators.linkThreshold()).toHaveCount(0);
  }

  async selectThresholdUnit(unit: '%' | 'pcs'): Promise<void> {
    await this.locators.linkUnitTab(unit).click();
    await expect(this.locators.linkUnitTab(unit)).toHaveAttribute('aria-selected', 'true');
  }

  async expectLag(hours: string, minutes: string): Promise<void> {
    await expect(this.locators.linkHours()).toHaveValue(hours);
    await expect(this.locators.linkMinutes()).toHaveValue(minutes);
  }

  /** The options of the link's predecessor picker ("1 · CUT-BUFFER", …), opened and closed again. */
  async predecessorOptions(): Promise<string[]> {
    return this.readOptions(this.locators.linkPredecessor());
  }

  async anyOfOptions(): Promise<string[]> {
    return this.readOptions(this.locators.linkAnyOfGroup());
  }

  private async readOptions(combobox: Locator): Promise<string[]> {
    await combobox.click();
    await expect(this.locators.options().first()).toBeVisible({ timeout: WAIT.SERVER });
    const texts = (await this.locators.options().allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    await expect(this.locators.options()).toHaveCount(0);
    return texts;
  }

  /** Sets the open link editor's fields. */
  async fillLink(values: LinkValues): Promise<void> {
    const l = this.locators;
    await this.choose(l.linkPredecessor(), new RegExp(`^${values.from} · `));
    if (values.startAfter) await this.selectLinkTab(values.startAfter);
    if (values.threshold !== undefined) await l.linkThreshold().fill(values.threshold);
    if (values.unit) await this.selectThresholdUnit(values.unit);
    if (values.hours !== undefined) await l.linkHours().fill(values.hours);
    if (values.minutes !== undefined) await l.linkMinutes().fill(values.minutes);
    if (values.lagCounts) await this.selectLinkTab(values.lagCounts);
    if (values.anyOf) await this.choose(l.linkAnyOfGroup(), values.anyOf);
  }

  async submitLink(): Promise<void> {
    await this.locators.linkSubmit().click();
    await expect(this.locators.linkDialog).toBeHidden({ timeout: WAIT.SERVER });
  }

  /** Submits the link expecting the editor to refuse it with `error`, staying open. */
  async submitLinkRefused(error: string | RegExp): Promise<string> {
    await this.locators.linkSubmit().click();
    const message = this.locators.linkError(error).first();
    await expect(message).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.locators.linkDialog).toBeVisible();
    return (await message.innerText()).trim();
  }

  async cancelLink(): Promise<void> {
    await this.locators.linkCancel().click();
    await expect(this.locators.linkDialog).toBeHidden();
  }

  /** Adds a link `from` → `to` (to waits on from), via `to`'s waits-on button. */
  async addLink(to: number, values: LinkValues): Promise<void> {
    await this.openNewLink(to);
    await this.fillLink(values);
    await this.submitLink();
  }

  /** Opens an existing link's editor from the waits-on chip in `step`'s row ("1 · 100 %"). */
  async openExistingLink(step: number, from: number): Promise<void> {
    await this.dismissIssues();
    const chip = (await this.cell(step, 'Waits on')).getByRole('button', {
      name: new RegExp(`^${from} · `),
    });
    await chip.click();
    await expect(this.locators.linkDialog).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** The waits-on chips in a step's row ("1 · 100 %", "2 · 100 % · any-of", …). */
  async waitsOnChips(step: number): Promise<string[]> {
    const cell = await this.cell(step, 'Waits on');
    return (await cell.getByRole('button').allInnerTexts())
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => /^\d+ · /.test(t));
  }

  /** Opens "Step N actions → Waits on…" and returns the dialog's predecessor entries. */
  async openWaitsOnList(step: number): Promise<string[]> {
    await this.stepAction(step, 'Waits on…');
    const d = this.locators.waitsOnDialog;
    await expect(d).toBeVisible({ timeout: WAIT.SERVER });
    return (await d.getByRole('listitem').allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
  }

  async expectWaitsOnList(step: number, activity: string, predecessors: number): Promise<void> {
    const d = this.locators.waitsOnDialog;
    await expect(d).toHaveAccessibleName(`Step ${step} · ${activity} waits on`);
    await expect(d.getByRole('listitem')).toHaveCount(predecessors);
    for (const item of await d.getByRole('listitem').all()) {
      await expect(item.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      await expect(item.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
    }
    await expect(d.getByRole('button', { name: '+ Add predecessor' })).toBeVisible();
  }

  async closeWaitsOnList(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.locators.waitsOnDialog).toBeHidden();
  }

  // ── Condition ─────────────────────────────────────────────────────────

  async openCondition(step: number): Promise<void> {
    await this.dismissIssues();
    const cell = await this.cell(step, 'Condition');
    await cell.getByRole('button').click();
    await expect(this.locators.conditionDialog).toBeVisible({ timeout: WAIT.SERVER });
  }

  async conditionAttributes(): Promise<string[]> {
    return this.readOptions(this.locators.conditionField('Attribute'));
  }

  async expectConditionAttributeIsClosedList(): Promise<void> {
    const d = this.locators.conditionDialog;
    await expect(this.locators.conditionField('Attribute')).toBeVisible();
    await expect(d.getByRole('textbox')).toHaveCount(0);
  }

  /** Picks an attribute by its label ("Has dry process"); options read "<label> <key>". */
  async chooseConditionAttribute(label: string): Promise<void> {
    await this.choose(this.locators.conditionField('Attribute'), new RegExp(`^${escape(label)} `));
  }

  async chooseConditionValue(value: string): Promise<void> {
    await this.choose(this.locators.conditionField('Value'), value);
  }

  async conditionCaption(): Promise<string> {
    return (await this.locators.conditionDialog.innerText()).replace(/\s+/g, ' ');
  }

  async expectConditionControls(operator: string, values: string[]): Promise<void> {
    await expect(this.locators.conditionField('Operator')).toHaveText(operator);
    expect(await this.readOptions(this.locators.conditionField('Value'))).toEqual(values);
  }

  async conditionValueOptions(): Promise<string[]> {
    return this.readOptions(this.locators.conditionField('Value'));
  }

  async sampleOrders(): Promise<string[]> {
    return this.readOptions(this.locators.conditionField('Sample order'));
  }

  /** Picks a sample order and returns the verdict shown for it ("Included" / "Excluded"). */
  async testAgainstSample(sample: string): Promise<'Included' | 'Excluded'> {
    await this.choose(this.locators.conditionField('Sample order'), sample);
    const d = this.locators.conditionDialog;
    const verdict = d.getByText(/^(✓ |○ )?(Included|Excluded)$/).first();
    await expect(verdict).toBeVisible({ timeout: WAIT.SERVER });
    return (await verdict.innerText()).includes('Included') ? 'Included' : 'Excluded';
  }

  async applyCondition(): Promise<void> {
    await this.locators.conditionButton('Apply condition').click();
    await expect(this.locators.conditionDialog).toBeHidden();
  }

  async cancelCondition(): Promise<void> {
    await this.locators.conditionButton('Cancel').click();
    await expect(this.locators.conditionDialog).toBeHidden();
  }

  async clearCondition(): Promise<void> {
    await this.locators.conditionButton('Always include (clear)').click();
    await expect(this.locators.conditionDialog).toBeHidden();
  }

  // ── Validate / Save / Publish ─────────────────────────────────────────

  /** Runs Validate and returns the issues it lists ([] when it reads "Valid"). */
  async validate(): Promise<string[]> {
    await this.dismissIssues();
    await this.locators.validateButton.click();
    await expect(this.locators.validationBadge).toHaveText(/^(Valid|\d+ issues?)$/, {
      timeout: WAIT.SERVER,
    });
    const badge = (await this.locators.validationBadge.innerText()).trim();
    if (badge === 'Valid') return [];
    return this.readIssues();
  }

  private async readIssues(): Promise<string[]> {
    if (!(await this.locators.issueList.isVisible().catch(() => false)))
      await this.locators.validationBadge.click();
    await expect(this.locators.issueList).toBeVisible({ timeout: WAIT.SERVER });
    const items = (await this.locators.issueList.getByRole('listitem').allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
    await this.dismissIssues();
    return items;
  }

  /**
   * Clicks "Save draft" and reports whether it saved (with the template's
   * code, from the save response) or was refused before anything was stored
   * ("N validation errors — nothing was saved." with the issue list).
   */
  async saveDraft(): Promise<SaveOutcome> {
    await this.dismissIssues();
    // A toast left by an earlier refused save would read as this save's refusal.
    await expect(this.locators.refusalToasts).toHaveCount(0, { timeout: WAIT.NAVIGATION });
    const saved = this.page
      .waitForResponse(isSave, { timeout: WAIT.NAVIGATION })
      .then((r) => r)
      .catch(() => null);
    const refused = this.locators.refusalToasts
      .first()
      .waitFor({ timeout: WAIT.NAVIGATION })
      .then(() => 'refused' as const)
      .catch(() => null);
    await this.locators.saveDraftButton.click();
    // The loser of the race settles on its own timeout (both are caught).
    const winner = await Promise.race([saved, refused]);
    if (winner === null || winner === 'refused' || !winner.ok()) return { outcome: 'refused' };
    return this.afterSave(winner);
  }

  private async afterSave(response: Response): Promise<SaveOutcome> {
    const body = (await response.json().catch(() => ({}))) as { template?: { code?: string } };
    const code = body.template?.code ?? '';
    await expect(this.page).toHaveURL(/\/routing-templates\/[0-9a-f-]{36}/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.saveDraftButton).toBeDisabled({ timeout: WAIT.SERVER });
    return { outcome: 'saved', code };
  }

  async expectRefusalMessage(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** The issues listed after a refused save (the list opens on its own). */
  async refusedIssues(): Promise<string[]> {
    return this.readIssues();
  }

  /** "Send for approval" isn't offered, or is offered disabled. */
  async expectSendForApprovalUnavailable(): Promise<void> {
    await expectAbsentOrDisabled(this.locators.sendForApprovalButton);
  }

  /** Pending approval (or decided): the header, steps and Save are not offered. */
  async expectLockedForEditing(): Promise<void> {
    for (const control of [
      this.locators.editHeaderButton,
      this.locators.addStepButton,
      this.locators.saveDraftButton,
      this.locators.sendForApprovalButton,
    ])
      await expectAbsentOrDisabled(control);
  }

  async expectSendForApprovalEnabled(): Promise<void> {
    await expect(this.locators.sendForApprovalButton).toBeEnabled({ timeout: WAIT.SERVER });
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(toast(this.page, text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  // ── Revisions ─────────────────────────────────────────────────────────

  /**
   * "Edit template" on an Active template: starts a pending revision. The
   * first click right after the page renders is sometimes dropped (no
   * request at all), so it is retried until "Cancel revision" shows.
   */
  async startRevision(): Promise<void> {
    await expect(async () => {
      if (await this.locators.editTemplateButton.isVisible())
        await this.locators.editTemplateButton.click({ timeout: WAIT.RETRY_STEP });
      await expect(this.locators.cancelRevisionButton).toBeVisible({
        timeout: WAIT.PERMISSION_SETTLE,
      });
    }).toPass({ timeout: WAIT.NAVIGATION * 2 });
    await expect(this.locators.pendingTab).toHaveAttribute('aria-selected', 'true');
  }

  async openCancelRevision(): Promise<string> {
    await this.dismissIssues();
    await this.locators.cancelRevisionButton.click();
    await expect(this.locators.cancelRevisionDialog).toBeVisible({ timeout: WAIT.SERVER });
    return (await this.locators.cancelRevisionDialog.innerText()).replace(/\s+/g, ' ');
  }

  async keepRevision(): Promise<void> {
    await this.locators.dialogButton(this.locators.cancelRevisionDialog, 'Keep it').click();
    await expect(this.locators.cancelRevisionDialog).toBeHidden();
    await expect(this.locators.cancelRevisionButton).toBeVisible();
  }

  /**
   * Confirms "Cancel revision". Dev then raises a "Leave without saving?" guard
   * although the revision was just dropped; it is discarded here so the case
   * can check the outcome. Returns whether the guard appeared.
   */
  async confirmCancelRevision(): Promise<boolean> {
    await this.locators.dialogButton(this.locators.cancelRevisionDialog, 'Cancel revision').click();
    await expect(this.locators.cancelRevisionDialog).toBeHidden({ timeout: WAIT.SERVER });
    await expect(
      this.locators.editTemplateButton.or(this.locators.leaveDialog).first(),
    ).toBeVisible({ timeout: WAIT.SERVER });
    const guarded = await this.locators.leaveDialog.isVisible();
    if (guarded) {
      await this.locators.dialogButton(this.locators.leaveDialog, 'Discard and leave').click();
      await expect(this.locators.leaveDialog).toBeHidden({ timeout: WAIT.SERVER });
    }
    await expect(this.locators.editTemplateButton).toBeVisible({ timeout: WAIT.SERVER });
    return guarded;
  }

  async showLive(): Promise<void> {
    await this.locators.liveTab.click();
    await expect(this.locators.liveTab).toHaveAttribute('aria-selected', 'true');
  }

  async showPending(): Promise<void> {
    await this.locators.pendingTab.click();
    await expect(this.locators.pendingTab).toHaveAttribute('aria-selected', 'true');
  }

  async expectChanges(text: string | RegExp): Promise<void> {
    await expect(this.locators.changesLine).toContainText(text, { timeout: WAIT.SERVER });
  }

  async expectLiveReadOnly(): Promise<void> {
    await expect(this.locators.liveReadOnlyNote).toBeVisible();
    await expect(this.locators.addStepButton).toHaveCount(0);
    await expect(this.locators.dragHandle(1)).toHaveCount(0);
  }

  async expectReadOnlySteps(): Promise<void> {
    await expect(this.locators.addStepButton).toHaveCount(0);
    await expect(this.locators.optionalSwitch(1)).toBeDisabled();
  }

  // ── Visual / graph ────────────────────────────────────────────────────

  async showVisual(): Promise<void> {
    await this.locators.stepsViewVisual.click();
    await expect(this.locators.graph).toBeVisible({ timeout: WAIT.SERVER });
  }

  async showTable(): Promise<void> {
    await this.locators.stepsViewTable.click();
    await expect(this.locators.stepsTable).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectGraphNodes(n: number): Promise<void> {
    await expect(this.locators.graph.getByRole('button', { name: /^\d+ · / })).toHaveCount(n);
  }

  async expectGraphFlowsLeftToRight(): Promise<void> {
    await expect(this.locators.graphCaption).toBeVisible();
    const first = await this.locators.graphNode(1).boundingBox();
    const last = await this.locators
      .graphNode(await this.locators.graph.getByRole('button', { name: /^\d+ · / }).count())
      .boundingBox();
    expect(first && last && last.x > first.x, 'the last step sits right of the first').toBe(true);
  }

  async expectGraphText(text: string | RegExp): Promise<void> {
    await expect(this.locators.graph).toContainText(text);
  }

  async expectCriticalPathPressed(pressed: boolean): Promise<void> {
    await expect(this.locators.criticalPathToggle).toHaveAttribute(
      'aria-pressed',
      pressed ? 'true' : 'false',
    );
  }

  async toggleCriticalPath(): Promise<void> {
    await this.locators.criticalPathToggle.click();
  }

  async criticalPathDays(): Promise<number> {
    const text = await this.locators.criticalPathFooter.innerText();
    return Number(text.match(/≈ ([\d.]+) d/)?.[1] ?? NaN);
  }

  // ── Reorder ───────────────────────────────────────────────────────────

  /**
   * Moves step `from` up by `places` with the drag handle's keyboard
   * controls (pick up with Space, arrows, drop with Space) — the mouse drag
   * doesn't register under automation.
   */
  async moveStepUp(from: number, places: number): Promise<void> {
    const handle = this.locators.dragHandle(from);
    await handle.focus();
    await this.page.keyboard.press('Space');
    for (let i = 0; i < places; i++) {
      await this.page.keyboard.press('ArrowUp');
    }
    await this.page.keyboard.press('Space');
  }
}

/** A picker group's name: its aria-label, or the text of the heading it is labelled by. */
async function groupLabel(group: Locator): Promise<string> {
  const label = await group.getAttribute('aria-label');
  if (label) return label.trim();
  const by = await group.getAttribute('aria-labelledby');
  if (!by) return '';
  return ((await group.page().locator(`[id="${by}"]`).textContent()) ?? '').trim();
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
