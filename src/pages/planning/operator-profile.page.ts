import { type Locator, type Page, type Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { OperatorProfileLocators } from '../../locators/planning/operator-profile.locators';
import { detailValue, toast } from '../../locators/planning/form-field.locators';
import { pressDone } from './form-submit';
import { WAIT } from './waits';

/** Step 1's fields. A picker value is the option's text, or a pattern for it. */
export interface OperatorFieldValues {
  /** Typed into the Employee picker's search before the option is picked. */
  employeeSearch?: string;
  employee?: string | RegExp;
  homeWorkCentreSearch?: string;
  homeWorkCentre?: string | RegExp;
  usualShift?: string | RegExp;
  skillGrade?: string | RegExp;
  deployment?: 'Fixed to one centre' | 'Floating across the department' | 'Rotating crew';
  /** '' clears the field. */
  efficiency?: string;
  /** Day `day` of the month the picker opens on, `monthOffset` months before (-) or after. */
  onFloorSince?: { day: number; monthOffset?: number };
  active?: boolean;
}

/** One qualification row (the add row, or a saved row open for editing). */
export interface QualificationValues {
  task?: string | RegExp;
  activity?: string | RegExp;
  qualified?: boolean;
  efficiency?: string;
  measuredMinutes?: string;
  assessedBy?: string | RegExp;
  /** Day of the month before this one ("past"), or 'clear' for "Does not expire". */
  validUntil?: { day: number; monthOffset: number } | 'clear';
  clearLastAssessed?: boolean;
  active?: boolean;
}

interface LookupItem {
  code: string;
  label: string;
  active?: boolean;
}

export interface OperatorLookups {
  workCenters: LookupItem[];
  shifts: LookupItem[];
  skillGrades: LookupItem[];
}

export interface QualificationLookups {
  activities: LookupItem[];
  tasks: LookupItem[];
  sources: LookupItem[];
}

/** What pressing a save control led to: the write request's status, or null if none was sent. */
export type WriteStatus = number | null;

const PROFILE_WRITE = /\/api\/planning\/operator-profiles(\/[0-9a-f-]{36})?$/;
const QUALIFICATION_WRITE = /\/api\/planning\/qualifications(\/[0-9a-f-]{36})?$/;

/**
 * An operator on Planning > Master Data > Operators & Qualifications: the
 * read-only view, the stepped New / Edit form (step 1 the profile, step 2
 * its qualifications table) — see OperatorProfileLocators. Owned by the
 * Planning QA. Qualifications aren't records of their own any more (dev
 * deploy 2026-10-14): they're rows of the profile, added in its step 2.
 */
export class OperatorProfilePage extends BasePage {
  readonly locators: OperatorProfileLocators;

  /** The latest qualification lookups the page loaded (its add row's pickers come from them). */
  private qualificationLookups: QualificationLookups | null = null;

  constructor(page: Page) {
    super(page);
    this.locators = new OperatorProfileLocators(page);
    page.on('response', (r) => {
      if (new URL(r.url()).pathname !== '/api/planning/qualifications/lookups' || !r.ok()) return;
      r.json()
        .then((body: QualificationLookups) => {
          this.qualificationLookups = body;
        })
        .catch(() => {});
    });
  }

  /**
   * Waits for the operator's qualifications to load: the table starts as
   * "Qualifications (0)" with the empty message, and only fills once
   * GET /api/planning/qualifications answers.
   */
  private async loadingQualifications<T>(navigate: () => Promise<T>): Promise<T> {
    const [, result] = await Promise.all([
      this.page
        .waitForResponse(
          (r) =>
            new URL(r.url()).pathname === '/api/planning/qualifications' &&
            r.request().method() === 'GET',
          { timeout: WAIT.PAGE_LOAD + WAIT.NAVIGATION },
        )
        .catch(() => null),
      navigate(),
    ]);
    await expect(
      this.locators.dataRows().first().or(this.locators.qualificationsEmpty),
    ).toBeVisible({
      timeout: WAIT.PAGE_LOAD,
    });
    return result;
  }

  // ── View ────────────────────────────────────────────────────────────

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/operators\/[0-9a-f-]+$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.qualificationsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.editProfileButton).toBeVisible();
  }

  /** Opens an operator's view by its profile id. */
  async openView(id: string): Promise<void> {
    await this.loadingQualifications(() =>
      this.gotoAuthenticated(`/planning/master-data/operators/${id}`),
    );
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** Opens an operator's edit form (step 1) by its profile id. */
  async openEdit(id: string): Promise<void> {
    await this.gotoAuthenticated(`/planning/master-data/operators/${id}/edit`);
    await expect(this.locators.qualificationsStep).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async headingText(): Promise<string> {
    return (await this.locators.heading.innerText()).trim();
  }

  async metaLine(): Promise<string> {
    return (await this.locators.metaLine.innerText()).trim();
  }

  async expectMetaLine(text: string): Promise<void> {
    await expect(this.locators.metaLine).toHaveText(text, { timeout: WAIT.SERVER });
  }

  /** The view's value for `label` (Operator, Department, Home work centre, …). */
  async detail(label: string): Promise<string> {
    const value = detailValue(this.page, label);
    await expect(value).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return (await value.innerText()).trim();
  }

  /** The info-tooltip text beside a field's label (its button's accessible name). */
  async expectFieldHint(hint: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('button', { name: hint }).first()).toBeVisible();
  }

  async expectHeaderBadge(text: string): Promise<void> {
    await expect(this.locators.text(text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectNoHeaderBadge(text: string): Promise<void> {
    await expect(this.locators.text(text)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** The view shows no form controls outside the qualifications table's search and pager. */
  async expectDetailsReadOnly(): Promise<void> {
    const main = this.page.getByRole('main').last();
    for (const name of ['Employee', 'Home work centre', 'Usual shift', 'Skill grade', 'Deployment'])
      await expect(main.getByRole('combobox', { name, exact: true })).toHaveCount(0);
    await expect(main.getByRole('textbox')).toHaveCount(0);
    await expect(main.getByRole('switch')).toHaveCount(0);
  }

  async ownershipNote(): Promise<string> {
    return (await this.locators.ownershipNote.innerText()).trim();
  }

  async startEditing(): Promise<void> {
    await this.locators.editProfileButton.click();
    await expect(this.page).toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
  }

  async expectNoEditProfile(): Promise<void> {
    await expect(this.locators.heading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.editProfileButton).toHaveCount(0);
  }

  // ── Form ────────────────────────────────────────────────────────────

  async expectOnNewForm(): Promise<void> {
    await expect(this.page).toHaveURL(/\/planning\/master-data\/operators\/new$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.newHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.deployment).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async openNew(): Promise<void> {
    await this.gotoAuthenticated('/planning/master-data/operators/new');
    await this.expectOnNewForm();
  }

  /** Reloads the New form (its pickers' lookups are read when it opens). */
  async reloadNew(): Promise<void> {
    await this.page.reload();
    await this.expectOnNewForm();
  }

  /** Opens New and returns the lookups its pickers are built from (operators, work centres, shifts, grades). */
  async openNewWithLookups(): Promise<OperatorLookups> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => new URL(r.url()).pathname === '/api/planning/operator-profiles/lookups',
        { timeout: WAIT.PAGE_LOAD + WAIT.NAVIGATION },
      ),
      this.gotoAuthenticated('/planning/master-data/operators/new'),
    ]);
    await this.expectOnNewForm();
    return (await response.json()) as OperatorLookups;
  }

  /**
   * Opens an operator's edit form at step 2 and returns the lookups its
   * qualification pickers are built from (activities, tasks, sources).
   */
  async openQualificationsWithLookups(id: string): Promise<QualificationLookups> {
    // The lookups may be fetched on opening the form or on reaching step 2; the
    // response listener (see the constructor) keeps whichever arrives.
    await this.openEdit(id);
    await this.openQualificationsStep();
    await expect
      .poll(() => this.qualificationLookups !== null, { timeout: WAIT.PAGE_LOAD + WAIT.NAVIGATION })
      .toBe(true);
    return this.qualificationLookups!;
  }

  /** The text a step-1 picker shows ("Select…" while nothing is picked). */
  async fieldValue(
    name: 'Employee' | 'Home work centre' | 'Usual shift' | 'Skill grade' | 'Deployment',
  ): Promise<string> {
    const combo = this.combo(name);
    await expect(combo).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    // An edit form fills its pickers once the lookups arrive; wait for that (a field left empty stays "Select…").
    await expect
      .poll(async () => (await combo.innerText()).trim(), { timeout: 10_000 })
      .not.toBe('Select…')
      .catch(() => undefined);
    return (await combo.innerText()).trim();
  }

  private combo(
    name: 'Employee' | 'Home work centre' | 'Usual shift' | 'Skill grade' | 'Deployment',
  ): Locator {
    return {
      Employee: this.locators.employee,
      'Home work centre': this.locators.homeWorkCentre,
      'Usual shift': this.locators.usualShift,
      'Skill grade': this.locators.skillGrade,
      Deployment: this.locators.deployment,
    }[name];
  }

  async efficiencyValue(): Promise<string> {
    return this.locators.efficiency.inputValue();
  }

  async onFloorSinceLabel(): Promise<string> {
    return (await this.locators.onFloorSince.innerText()).trim();
  }

  async isActiveOn(): Promise<boolean> {
    return (await this.locators.activeSwitch.getAttribute('aria-checked')) === 'true';
  }

  async expectEmployeeLocked(hint: string): Promise<void> {
    await expect(this.locators.employee).toBeDisabled({ timeout: WAIT.PAGE_LOAD });
    await this.expectFieldHint(hint);
  }

  async changesStatus(): Promise<string> {
    return (await this.locators.changesStatus.innerText()).trim();
  }

  async expectChangesStatus(text: 'No changes' | 'Unsaved changes'): Promise<void> {
    await expect(this.locators.changesStatus).toHaveText(text, { timeout: WAIT.SERVER });
  }

  /**
   * The options a step-1 picker offers, then closes it. `search` is typed
   * first where the list is long (Employee, Home work centre).
   */
  async optionsOf(
    name: 'Employee' | 'Home work centre' | 'Usual shift' | 'Skill grade' | 'Deployment',
    search?: string,
  ): Promise<string[]> {
    await this.combo(name).click();
    if (search) await this.page.keyboard.type(search);
    const options = this.locators.options();
    await expect(options.first()).toBeVisible({ timeout: WAIT.SERVER });
    // The typed search filters as it goes: read once two reads agree.
    if (search) {
      let previous = '';
      await expect
        .poll(
          async () => {
            const now = (await options.allInnerTexts()).join('\n');
            const settled = now === previous;
            previous = now;
            return settled;
          },
          { intervals: [300], timeout: WAIT.SERVER },
        )
        .toBe(true);
    }
    const texts = (await options.allInnerTexts()).map((o) => o.trim());
    await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return texts;
  }

  private async pick(combo: Locator, option: string | RegExp, search?: string): Promise<void> {
    await expect(async () => {
      if ((await this.locators.options().count()) === 0) await combo.click();
      if (search) {
        await this.page.keyboard.press('ControlOrMeta+a');
        await this.page.keyboard.type(search);
      }
      await this.locators
        .option(option)
        .first()
        .click({ timeout: WAIT.RETRY_STEP * 2 });
    }).toPass({ timeout: WAIT.NAVIGATION });
    await expect(this.locators.options()).toHaveCount(0);
  }

  async fill(values: OperatorFieldValues): Promise<void> {
    const l = this.locators;
    if (values.employee !== undefined)
      await this.pick(l.employee, values.employee, values.employeeSearch);
    if (values.homeWorkCentre !== undefined)
      await this.pick(l.homeWorkCentre, values.homeWorkCentre, values.homeWorkCentreSearch);
    if (values.usualShift !== undefined) await this.pick(l.usualShift, values.usualShift);
    if (values.skillGrade !== undefined) await this.pick(l.skillGrade, values.skillGrade);
    if (values.deployment !== undefined) await this.pick(l.deployment, values.deployment);
    if (values.efficiency !== undefined) await l.efficiency.fill(values.efficiency);
    if (values.onFloorSince !== undefined)
      await this.typeDate(
        l.onFloorSince,
        values.onFloorSince.day,
        values.onFloorSince.monthOffset ?? 0,
      );
    if (values.active !== undefined && (await this.isActiveOn()) !== values.active)
      await l.activeSwitch.click();
  }

  /** Types into Overall efficiency and returns what the field then holds. */
  async typeEfficiency(text: string): Promise<string> {
    await this.locators.efficiency.fill('');
    await this.locators.efficiency.pressSequentially(text);
    return this.locators.efficiency.inputValue();
  }

  /** The "Required" (or other) message under a step-1 field, '' if none. */
  async fieldMessage(
    name: 'Employee' | 'Home work centre' | 'Usual shift' | 'Skill grade' | 'Deployment',
  ): Promise<string> {
    const alert = this.locators.fieldAlert(this.combo(name));
    return (await alert.count()) > 0 ? (await alert.first().innerText()).trim() : '';
  }

  /** Every validation message on step 1. */
  async stepMessages(): Promise<string[]> {
    return (await this.locators.alerts(this.page.getByRole('main').last()).allInnerTexts()).map(
      (m) => m.trim(),
    );
  }

  /**
   * Presses step 1's "Save & continue" and reports the profile write it
   * sent (POST on New, PUT on Edit): its status, or null when the form
   * refused before sending one. A saved step 1 opens step 2.
   */
  async saveAndContinue(): Promise<{ status: WriteStatus; body: Record<string, unknown> | null }> {
    const alerts = this.locators.alerts(this.page.getByRole('main').last());
    const alertsBefore = await alerts.count();
    const response = this.page
      .waitForResponse(
        (r) =>
          PROFILE_WRITE.test(new URL(r.url()).pathname) &&
          /^(POST|PUT)$/.test(r.request().method()),
        { timeout: WAIT.NAVIGATION },
      )
      .catch(() => null);
    // The floating "Ask FloorOS AI" button covers the right of footer
    // buttons (TC-XOQ-12): click near the left edge.
    await this.locators.saveAndContinueButton.click({ position: { x: 14, y: 14 } });
    // A form the client refuses sends nothing and flags its fields at once:
    // stop waiting for a request then (a few seconds' grace for one in flight),
    // so the "Fill the N highlighted field(s)" toast is still up for the caller.
    const refused = expect
      .poll(
        async () =>
          (await alerts.count()) > alertsBefore || (await this.toastShowing(/highlighted field/)),
        {
          timeout: WAIT.NAVIGATION,
        },
      )
      .toBe(true)
      .then(() => 'refused' as const)
      .catch(() => null);
    const first = await Promise.race([response.then((r) => r ?? ('none' as const)), refused]);
    const settled =
      first === 'refused' || first === null
        ? await Promise.race([
            response,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_000)),
          ])
        : first === 'none'
          ? null
          : first;
    if (!settled) return { status: null, body: null };
    const body = (await settled.json().catch(() => null)) as Record<string, unknown> | null;
    if (settled.ok())
      await expect(this.locators.doneButton).toBeVisible({ timeout: WAIT.NAVIGATION });
    return { status: settled.status(), body };
  }

  private async toastShowing(text: RegExp): Promise<boolean> {
    return toast(this.page, text)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Step 2's Done: back on the operator's view. */
  async done(): Promise<void> {
    await this.loadingQualifications(() => pressDone(this.locators.doneButton));
    await this.expectLoaded();
  }

  /** Cancel; answers "Leave without saving?" with `answer` when it's asked. Returns whether it was asked. */
  async cancel(answer: 'discard' | 'keep' = 'discard'): Promise<boolean> {
    await this.locators.cancelButton.click({ position: { x: 10, y: 10 } });
    return this.answerLeaveDialog(answer);
  }

  /** The view's back link (or the form's "All operators & qualifications"); answers the leave dialog. */
  async backToList(answer: 'discard' | 'keep' = 'discard'): Promise<boolean> {
    await this.locators.backLink.first().click();
    return this.answerLeaveDialog(answer);
  }

  private async answerLeaveDialog(answer: 'discard' | 'keep'): Promise<boolean> {
    const asked = await this.locators.leaveDialog
      .waitFor({ state: 'visible', timeout: WAIT.PERMISSION_SETTLE })
      .then(() => true)
      .catch(() => false);
    if (asked)
      await (
        answer === 'discard' ? this.locators.discardAndLeaveButton : this.locators.keepEditingButton
      ).click();
    return asked;
  }

  async leaveDialogText(): Promise<string> {
    await expect(this.locators.leaveDialog).toBeVisible({ timeout: WAIT.SERVER });
    return (await this.locators.leaveDialog.innerText()).trim();
  }

  /** Leaves the edit form without saving and lands back on the read-only profile. */
  async cancelEditing(): Promise<void> {
    await this.cancel('discard');
    await expect(this.page).not.toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
    await expect(this.locators.editProfileButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /**
   * The edit form's step 2, opened from the step list (not step 1's "Save &
   * continue"). With unsaved step-1 changes this saves them first (dev and
   * uat, 2026-11-17).
   */
  async openQualificationsStep(): Promise<void> {
    await this.loadingQualifications(() => this.locators.qualificationsStep.click());
    await expect(this.locators.doneButton).toBeVisible({ timeout: WAIT.NAVIGATION });
    // The add row renders with the loaded table (a user who can't write gets none).
    await this.locators.addRow
      .first()
      .waitFor({ state: 'visible', timeout: WAIT.PAGE_LOAD })
      .catch(() => {});
  }

  /** Step 2's qualifications table ends in an "Add a qualification" row. */
  async expectAddQualificationRow(): Promise<void> {
    await expect(this.locators.addQualificationButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.newRowActivity).toBeVisible();
    await expect(this.locators.newRowTask).toBeVisible();
    await expect(this.locators.doneButton).toBeVisible();
  }

  async toastVisible(text: string | RegExp): Promise<void> {
    await expect(toast(this.page, text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  /**
   * Counts the profile / qualification writes (POST / PUT) the page sends
   * from now on — for cases that check nothing was saved.
   */
  watchWrites(): { count(): number; stop(): void } {
    let n = 0;
    const onRequest = (r: { url(): string; method(): string }) => {
      if (
        /\/api\/planning\/(operator-profiles|qualifications)/.test(r.url()) &&
        r.method() !== 'GET'
      )
        n += 1;
    };
    this.page.on('request', onRequest);
    return { count: () => n, stop: () => this.page.off('request', onRequest) };
  }

  /** No English "Pick date" left on the form (the On the floor since placeholder). */
  async expectNoEnglishPickDate(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Pick date', exact: true })).toHaveCount(0);
  }

  /** The page's heading reads `text` (a translated screen, where the English locators don't apply). */
  async expectHeading(text: string): Promise<void> {
    await expect(this.locators.heading).toHaveText(text, { timeout: WAIT.PAGE_LOAD });
  }

  /** Opens New with a plain goto (no English sign-in markers: works in any language). */
  async gotoNew(): Promise<void> {
    await this.page.goto('/planning/master-data/operators/new');
  }

  /** Delete / Remove controls anywhere on the page (there should be none for saved records). */
  async deleteControls(): Promise<number> {
    return this.page.getByRole('button', { name: /^(Delete|Remove)\b/i }).count();
  }

  // ── Qualifications table ────────────────────────────────────────────

  /** The N in "Qualifications (N)". */
  async qualificationCount(): Promise<number> {
    await expect(this.locators.qualificationsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    const text = (await this.locators.qualificationsHeading.textContent()) ?? '';
    return Number(/\((\d+)\)/.exec(text)?.[1] ?? NaN);
  }

  async expectQualificationCount(n: number): Promise<void> {
    await expect.poll(() => this.qualificationCount(), { timeout: WAIT.SERVER }).toBe(n);
  }

  async qualificationHeaders(): Promise<string[]> {
    await expect(this.locators.qualificationsTable).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    return (await this.locators.qualificationsTable.getByRole('columnheader').allInnerTexts()).map(
      (h) => h.trim(),
    );
  }

  /** The saved rows, each as its cells' texts (the add row and empty message left out). */
  async qualificationRows(): Promise<string[][]> {
    const rows = await this.locators.dataRows().all();
    const out: string[][] = [];
    for (const row of rows)
      out.push((await row.getByRole('cell').allInnerTexts()).map((c) => c.trim()));
    return out;
  }

  /** One saved row's cells by column header, found by its task or activity code. */
  async qualification(code: string): Promise<Record<string, string>> {
    const headers = await this.qualificationHeaders();
    const row = this.locators.qualificationRow(code).first();
    await expect(row).toBeVisible({ timeout: WAIT.SERVER });
    const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  }

  async expectQualificationRow(code: string): Promise<void> {
    await expect(this.locators.qualificationRow(code).first()).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  async expectNoQualificationRow(code: string): Promise<void> {
    await expect(this.locators.qualificationRow(code)).toHaveCount(0, { timeout: WAIT.SERVER });
  }

  /** The view's table has no add row, no row actions and no Actions column. */
  async expectQualificationsReadOnly(): Promise<void> {
    await expect(this.locators.qualificationsTable).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.addQualificationButton).toHaveCount(0);
    await expect(
      this.locators.qualificationsTable.getByRole('button', { name: /qualification/i }),
    ).toHaveCount(0);
    expect(await this.qualificationHeaders()).not.toContain('Actions');
  }

  async searchQualifications(term: string): Promise<void> {
    await this.locators.qualificationsSearch.fill(term);
  }

  async expectQualificationsEmptyMessage(text: string): Promise<void> {
    await expect(this.locators.qualificationsTable.getByText(text)).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  async sortQualificationsBy(column: string): Promise<void> {
    await this.locators.qualificationsTable
      .getByRole('columnheader', { name: column, exact: true })
      .getByRole('button', { name: column, exact: true })
      .click();
  }

  /** One column's cells, top to bottom (saved rows only). */
  async qualificationColumn(column: string): Promise<string[]> {
    const headers = await this.qualificationHeaders();
    const index = headers.indexOf(column);
    if (index < 0) throw new Error(`No "${column}" column in ${headers.join(', ')}`);
    return (await this.qualificationRows()).map((cells) => cells[index] ?? '');
  }

  async qualificationsShowing(): Promise<string> {
    return (await this.locators.qualificationsShowing.innerText()).trim();
  }

  async expectQualificationsShowing(text: RegExp): Promise<void> {
    await expect(this.locators.qualificationsShowing).toHaveText(text, { timeout: WAIT.SERVER });
  }

  async qualificationsRowsPerPage(): Promise<string> {
    return (await this.locators.qualificationsRowsPerPage.innerText()).trim();
  }

  async setQualificationsRowsPerPage(rows: number): Promise<void> {
    await this.locators.qualificationsRowsPerPage.click();
    await this.page.getByRole('option', { name: String(rows), exact: true }).click();
  }

  async nextQualificationsPage(): Promise<void> {
    await this.locators.qualificationsNextPage.click();
  }

  /** The row inputs go in: the row open for editing, or else the add row. */
  private async inputRow(): Promise<Locator> {
    return (await this.locators.editingRow.count()) > 0
      ? this.locators.editingRow
      : this.locators.addRow;
  }

  /** The texts a row picker offers ("—" first), then closes it without changing it. */
  async rowOptions(name: 'Activity' | 'Task' | 'Assessed by'): Promise<string[]> {
    // The pickers fill once the qualification lookups arrive; until then they hold only "—".
    await expect
      .poll(() => this.qualificationLookups !== null, { timeout: WAIT.PAGE_LOAD })
      .toBe(true);
    const row = await this.inputRow();
    const combo = this.locators.rowCombo(row, name);
    // No Activity picker at all where the environment offers no activities.
    if (name === 'Activity' && (await combo.count()) === 0) return [];
    const current = (await combo.innerText()).trim();
    await combo.click();
    const options = this.locators.options();
    await expect(options.first()).toBeVisible({ timeout: WAIT.SERVER });
    const texts = (await options.allInnerTexts()).map((o) => o.trim());
    // Escape would also cancel a row being edited: re-pick what it showed.
    const same = texts.indexOf(current);
    if (same >= 0) await options.nth(same).click();
    else await this.page.keyboard.press('Escape');
    await expect(options).toHaveCount(0);
    return texts;
  }

  async rowValue(name: 'Activity' | 'Task' | 'Assessed by'): Promise<string> {
    const row = await this.inputRow();
    const combo = this.locators.rowCombo(row, name);
    // No Activity picker where the build has no activity qualifications.
    if (name === 'Activity' && (await combo.count()) === 0) return '—';
    const text = (await combo.innerText()).trim();
    // An empty Task / Activity picker reads "Select…" (it read "—" before 2026-11-20).
    return name !== 'Assessed by' && text === 'Select…' ? '—' : text;
  }

  /** Fills the add row (or the row being edited). */
  async fillQualification(values: QualificationValues): Promise<void> {
    const l = this.locators;
    const row = await this.inputRow();
    if (values.activity !== undefined)
      await this.pick(l.rowCombo(row, 'Activity'), values.activity);
    if (values.task !== undefined) await this.pick(l.rowCombo(row, 'Task'), values.task);
    if (values.qualified !== undefined)
      await this.setSwitch(l.rowSwitch(row, 'Qualified'), values.qualified);
    if (values.efficiency !== undefined)
      await l.rowTextbox(row, 'Efficiency').fill(values.efficiency);
    if (values.measuredMinutes !== undefined)
      await l.rowTextbox(row, 'Measured minutes').fill(values.measuredMinutes);
    if (values.assessedBy !== undefined)
      await this.pick(l.rowCombo(row, 'Assessed by'), values.assessedBy);
    if (values.clearLastAssessed) await l.rowClearDate(row, 'Last assessed').click();
    if (values.validUntil === 'clear') {
      const clear = l.rowClearDate(row, 'Valid until');
      if (await clear.isVisible()) await clear.click();
      await expect(l.rowDate(row, 'Valid until')).toHaveText('Does not expire');
    } else if (values.validUntil !== undefined)
      await this.typeDate(
        l.rowDate(row, 'Valid until'),
        values.validUntil.day,
        values.validUntil.monthOffset,
      );
    if (values.active !== undefined)
      await this.setSwitch(l.rowSwitch(row, 'Active'), values.active);
  }

  /**
   * Sets a date field to day `day`, `monthOffset` months from this month, by
   * typing it into the picker's "Date" box and pressing Apply. The popover
   * can open upward with its month buttons clipped off-screen (1280×720,
   * 2026-11-17), so it isn't navigated by month.
   */
  private async typeDate(trigger: Locator, day: number, monthOffset: number): Promise<void> {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, day);
    const text = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = this.page.getByRole('dialog', { name: 'Choose a date' });
    await expect(dialog).toBeVisible({ timeout: WAIT.SERVER });
    await dialog.getByRole('textbox', { name: 'Date' }).fill(text);
    await dialog.getByRole('textbox', { name: 'Date' }).press('Enter');
    const apply = dialog.getByRole('button', { name: 'Apply', exact: true });
    if (await apply.isVisible().catch(() => false)) await apply.click();
    await expect(dialog).toBeHidden({ timeout: WAIT.SERVER });
    await expect(trigger).toContainText(text, { timeout: WAIT.SERVER });
  }

  private async setSwitch(control: Locator, on: boolean): Promise<void> {
    if (((await control.getAttribute('aria-checked')) === 'true') !== on) await control.click();
    await expect(control).toHaveAttribute('aria-checked', String(on));
  }

  async rowEfficiency(): Promise<string> {
    return this.locators.rowTextbox(await this.inputRow(), 'Efficiency').inputValue();
  }

  async rowValidUntil(): Promise<string> {
    return (await this.locators.rowDate(await this.inputRow(), 'Valid until').innerText()).trim();
  }

  /** Types into a row number field and returns what it then holds. */
  async typeInRow(name: 'Efficiency' | 'Measured minutes', text: string): Promise<string> {
    const box = this.locators.rowTextbox(await this.inputRow(), name);
    await box.fill('');
    await box.pressSequentially(text);
    return box.inputValue();
  }

  /** The validation messages in the add row (or the row being edited). */
  async rowMessages(): Promise<string[]> {
    return (await this.locators.alerts(await this.inputRow()).allInnerTexts()).map((m) => m.trim());
  }

  async isAddEnabled(): Promise<boolean> {
    return this.locators.addQualificationButton.isEnabled();
  }

  /**
   * Presses "Add a qualification" and reports the qualification POST it
   * sent: its status, or null when the row refused before sending one.
   */
  async addQualification(): Promise<WriteStatus> {
    return this.writeQualification(this.locators.addQualificationButton, 'POST');
  }

  async startQualificationEdit(code: string): Promise<void> {
    await this.locators
      .qualificationRow(code)
      .first()
      .getByRole('button', { name: 'Edit qualification', exact: true })
      .click();
    await expect(this.locators.editingRow).toBeVisible({ timeout: WAIT.NAVIGATION });
  }

  /** The editing row's Save: the PUT's status, or null when nothing was sent. */
  async saveQualificationRow(): Promise<WriteStatus> {
    return this.writeQualification(
      this.locators.rowButton(this.locators.editingRow, 'Save'),
      'PUT',
    );
  }

  async cancelQualificationRow(): Promise<void> {
    await this.locators.rowButton(this.locators.editingRow, 'Cancel').click();
    await expect(this.locators.editingRow).toHaveCount(0);
  }

  async clearAddRow(): Promise<void> {
    const clear = this.locators.rowButton(this.locators.addRow, 'Clear');
    if (await clear.isVisible()) await clear.click();
    await expect(clear).toHaveCount(0);
  }

  private async writeQualification(button: Locator, method: 'POST' | 'PUT'): Promise<WriteStatus> {
    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (r: Response) =>
            QUALIFICATION_WRITE.test(new URL(r.url()).pathname) && r.request().method() === method,
          { timeout: WAIT.SERVER },
        )
        .catch(() => null),
      button.click(),
    ]);
    if (!response) return null;
    if (response.ok()) {
      // A saved add row resets (its Clear goes); a saved edit row closes.
      if (method === 'POST')
        // The row spins until the table refetches (over 15 s on a slow dev, 2026-11-18).
        await expect(this.locators.rowButton(this.locators.addRow, 'Clear')).toHaveCount(0, {
          timeout: WAIT.PAGE_LOAD,
        });
      else await expect(this.locators.editingRow).toHaveCount(0, { timeout: WAIT.PAGE_LOAD });
    }
    return response.status();
  }

  /** Step 2's Done, expecting it to be refused with `message` (a pending row). */
  async doneRefused(message: string | RegExp): Promise<void> {
    await this.locators.doneButton.click({ position: { x: 10, y: 10 } });
    await this.toastVisible(message);
    await expect(this.locators.doneButton).toBeVisible();
  }

  /** Whether the footer's primary button is what's under its centre (nothing floats over it). */
  async isUnobstructedAtCentre(button: 'Save & continue' | 'Done'): Promise<boolean> {
    const target =
      button === 'Done' ? this.locators.doneButton : this.locators.saveAndContinueButton;
    const box = await target.boundingBox();
    if (!box) return false;
    return this.page.evaluate(
      ({ x, y, name }) => {
        const doc = (
          globalThis as unknown as {
            document: {
              elementFromPoint(
                x: number,
                y: number,
              ): { closest(s: string): { textContent: string | null } | null } | null;
            };
          }
        ).document;
        const el = doc.elementFromPoint(x, y);
        return (el?.closest('button')?.textContent ?? '').includes(name);
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2, name: button },
    );
  }
}
