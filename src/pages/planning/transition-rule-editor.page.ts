import { type Locator, type Page, type Response, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { TransitionRuleEditorLocators } from '../../locators/planning/transition-rules.locators';
import { toast } from '../../locators/planning/form-field.locators';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

export const TRANSITION_RULES_ROUTE = '/planning/master-data/transition-rules';

export type ChangeClass = 'Repeat' | 'Similar' | 'New style' | 'New product';
export const CHANGE_CLASSES: ChangeClass[] = ['Repeat', 'Similar', 'New style', 'New product'];

export interface ConditionValues {
  side: 'From' | 'To' | 'Same';
  /** "Item attribute" (default) or "Buyer". */
  dimension?: 'Item attribute' | 'Buyer';
  /** Style, Style class, Construction, Wash type, Colour family, Fabric weight. */
  attribute?: string;
  operator?: '=' | '≠' | 'in';
  /** One value for = / ≠, any number of chips for "in"; none for Same. */
  values?: string[];
}

export interface RuleDetails {
  name?: string;
  description?: string;
  /** A centre type ("Sewing lines") or one centre (its "<code> · <name>" option, or a pattern). */
  centreType?: string;
  centre?: string | RegExp;
  priority?: number;
  active?: boolean;
  changeClass?: ChangeClass;
}

export interface CurveValues {
  day1?: number;
  days?: number;
  rate?: number;
}

export interface PointValues {
  day?: number;
  pct?: number;
  lineDays?: number;
}

/** What the API returns for a saved rule (the fields the suite reads). */
export interface SavedRule {
  id: string;
  code: string;
  name: string;
  version: number;
  priority: number;
  isActive: boolean;
  carryOverRamp: boolean;
  description: string | null;
  subtitle: string;
  warnings: string[];
  ambiguousWith: unknown;
  conditions: { side: string; dimension: string; operator: string | null; values: string[] }[];
  penalty: { changeoverMinutes: string; consumesCapacity: boolean } | null;
  curve: {
    inputMode: 'parameters' | 'day_by_day';
    day1PctOfTarget: string;
    daysToStandard: number;
    wrightRatePct: string;
    lostMinutes: number;
    stdDayMinutes: number;
    refitByName: string | null;
    refitAt: string | null;
  } | null;
  authoredTable: { day: number; pct: number | string }[];
  measuredPoints: { day: number; pct: number | string; lineDays: number }[];
}

const isRulesApi = (method: string, path: RegExp) => (response: Response) =>
  response.request().method() === method && path.test(new URL(response.url()).pathname);

/**
 * The transition-rule editor (/transition-rules/new and /<id>/edit), two
 * steps since dev's 2026-10-28 redesign: step 1 "Rule details" (name,
 * auto-generated code, Applies to, priority, Active, description, change
 * class), step 2 "Conditions and ramp" (Applies when, Changeover, Learning
 * curve, Evidence, Ramp panel). Continue saves nothing; Create / Save on
 * step 2 writes the whole rule at once. The footer names the first thing
 * that blocks saving ("Can't save yet · <reason> (+N more)").
 */
export class TransitionRuleEditorPage extends BasePage {
  readonly l: TransitionRuleEditorLocators;

  constructor(page: Page) {
    super(page);
    this.l = new TransitionRuleEditorLocators(page);
  }

  async openNew(): Promise<void> {
    const route = `${TRANSITION_RULES_ROUTE}/new`;
    await this.gotoAuthenticated(route);
    await ensureRoute(this.page, route);
    await this.expectOnNewPage();
  }

  async openEdit(id: string): Promise<void> {
    const route = `${TRANSITION_RULES_ROUTE}/${id}/edit`;
    await this.gotoAuthenticated(route);
    await ensureRoute(this.page, route);
    await expect(this.l.name).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    // The saved rule loads into the form after the page renders.
    await expect(this.l.name).not.toHaveValue('', { timeout: WAIT.SERVER });
  }

  async expectOnNewPage(): Promise<void> {
    await expect(this.l.heading).toHaveText('New transition rule', { timeout: WAIT.PAGE_LOAD });
    await expect(this.l.name).toBeVisible();
  }

  /** Goes to a rule's edit URL without expecting a working editor (a read-only user). */
  async openEditUrl(id: string): Promise<void> {
    await this.gotoAuthenticated(`${TRANSITION_RULES_ROUTE}/${id}/edit`);
  }

  async expectEditing(id: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/transition-rules/${id}/edit$`), {
      timeout: WAIT.NAVIGATION,
    });
  }

  async expectOnEditPage(name: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/transition-rules\/[^/]+\/edit$/, {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.l.name).toHaveValue(name, { timeout: WAIT.SERVER });
  }

  // ── Header and footer ────────────────────────────────────────────────

  async expectTitle(text: string): Promise<void> {
    await expect(this.l.heading).toHaveText(text);
  }

  /** The header's code, class pill, badges and derived subtitle, beside the title. */
  async expectHeaderShows(text: string | RegExp): Promise<void> {
    await expect(this.l.header).toContainText(text);
  }

  async expectHeaderLacks(text: string | RegExp): Promise<void> {
    await expect(this.l.header).not.toContainText(text);
  }

  async expectNotSavedBadge(shown: boolean): Promise<void> {
    await expect(this.l.notSavedBadge).toHaveCount(shown ? 1 : 0);
  }

  /** The footer's first blocker ("Can't save yet · <reason>", maybe "(+N more)"). */
  async expectBlocker(reason: string): Promise<void> {
    await expect(this.l.blocker).toHaveText(
      new RegExp(`^Can't save yet · ${escape(reason)}( \\(\\+\\d+ more\\))?$`),
    );
  }

  /** The footer's blocker, with the "(+N more)" count. */
  async expectBlockerWithMore(reason: string, more: number): Promise<void> {
    await expect(this.l.blocker).toHaveText(`Can't save yet · ${reason} (+${more} more)`);
  }

  async expectNoBlocker(): Promise<void> {
    await expect(this.l.blocker).toHaveCount(0);
  }

  async expectStep(n: 1 | 2): Promise<void> {
    await expect(this.l.stepLabel).toHaveText(new RegExp(`^STEP ${n} OF 2 · `, 'i'));
  }

  async continue(): Promise<void> {
    await this.l.continueButton.click();
    await this.expectStep(2);
  }

  async backToDetails(): Promise<void> {
    await this.l.stepRuleDetails.click();
    await this.expectStep(1);
  }

  async goToConditions(): Promise<void> {
    await this.l.stepConditions.click();
    await this.expectStep(2);
  }

  // ── Step 1: rule details ─────────────────────────────────────────────

  async fillDetails(values: RuleDetails): Promise<void> {
    if (values.name !== undefined) await this.l.name.fill(values.name);
    if (values.description !== undefined) await this.l.description.fill(values.description);
    if (values.centreType !== undefined) {
      await this.l.centreTypeRadio.click();
      await this.pick(this.l.scopePicker, values.centreType);
    }
    if (values.centre !== undefined) {
      await this.l.oneCentreRadio.click();
      await this.pick(this.l.scopePicker, values.centre);
    }
    if (values.priority !== undefined) await this.l.priority.fill(String(values.priority));
    if (values.changeClass !== undefined) await this.l.classPill(values.changeClass).click();
    if (values.active !== undefined) await this.setActive(values.active);
  }

  /** On a never-saved rule the switch flips at once; on a saved one switching off opens the Deactivate dialog. */
  async setActive(on: boolean): Promise<void> {
    if ((await this.l.activeSwitch.getAttribute('aria-checked')) !== String(on))
      await this.l.activeSwitch.click();
  }

  async clickActiveSwitch(): Promise<void> {
    await this.l.activeSwitch.click();
  }

  async expectActive(on: boolean): Promise<void> {
    await expect(this.l.activeSwitch).toHaveAttribute('aria-checked', String(on));
  }

  async expectName(value: string): Promise<void> {
    await expect(this.l.name).toHaveValue(value);
  }

  async expectPriority(value: number): Promise<void> {
    await expect(this.l.priority).toHaveValue(String(value));
  }

  async expectDescription(value: string): Promise<void> {
    await expect(this.l.description).toHaveValue(value);
  }

  /** Code can't be typed: it's generated when the rule is first saved. */
  async expectCodeGenerated(code?: string): Promise<void> {
    await expect(this.l.code).toBeDisabled();
    await expect(this.l.codeHelp).toBeVisible();
    if (code) await expect(this.l.code).toHaveValue(code);
    else await expect(this.l.code).toHaveAttribute('placeholder', 'Auto-generated');
  }

  async expectAppliesToModes(): Promise<void> {
    await expect(this.l.centreTypeRadio).toBeVisible();
    await expect(this.l.oneCentreRadio).toBeVisible();
    await expect(this.l.appliesTo.getByRole('radio')).toHaveCount(2);
  }

  async chooseOneCentre(): Promise<void> {
    await this.l.oneCentreRadio.click();
    await expect(this.l.oneCentreRadio).toHaveAttribute('aria-checked', 'true');
  }

  async chooseCentreType(): Promise<void> {
    await this.l.centreTypeRadio.click();
    await expect(this.l.centreTypeRadio).toHaveAttribute('aria-checked', 'true');
  }

  /** The texts the Applies to picker offers in its current mode. */
  async scopeOptions(): Promise<string[]> {
    return this.optionsOf(this.l.scopePicker);
  }

  async pickScope(option: string | RegExp): Promise<void> {
    await this.pick(this.l.scopePicker, option);
  }

  async expectScopeValue(text: string | RegExp): Promise<void> {
    await expect(this.l.scopePicker).toHaveText(text);
  }

  async pickClass(name: ChangeClass): Promise<void> {
    await this.l.classPill(name).click();
  }

  async expectClassPills(names: string[]): Promise<void> {
    await expect(this.l.changeClass.getByRole('button', { name: /^(?!Changes take)/ })).toHaveText(
      names,
    );
  }

  /** No class picked yet: the note under the pills only shows once one is. */
  async expectNoClassPicked(): Promise<void> {
    await expect(this.l.classNote).toHaveCount(0);
  }

  async expectAppliesToHint(): Promise<void> {
    await expect(
      this.l.appliesTo.getByRole('button', { name: /Sewing only for now\.$/ }),
    ).toBeVisible();
  }

  async expectClassNote(text: string): Promise<void> {
    await expect(this.l.classNote).toHaveText(text);
  }

  // ── Step 2: Applies when ─────────────────────────────────────────────

  async expectConditionCount(n: number): Promise<void> {
    await expect(this.l.removeConditionButtons).toHaveCount(n);
  }

  /** An incomplete row is outlined in amber. */
  async expectRowFlagged(row: Locator, flagged: boolean): Promise<void> {
    if (flagged) await expect(row).toHaveClass(/amber/);
    else await expect(row).not.toHaveClass(/amber/);
  }

  async conditionCount(): Promise<number> {
    return this.l.removeConditionButtons.count();
  }

  /** Adds a condition row and fills what `values` gives; returns the row. */
  async addCondition(values?: ConditionValues): Promise<Locator> {
    const before = await this.conditionCount();
    await this.l.addConditionButton.click();
    await expect(this.l.removeConditionButtons).toHaveCount(before + 1);
    const row = this.l.conditionRow(before);
    if (values) await this.fillCondition(row, values);
    return row;
  }

  conditionRow(index: number): Locator {
    return this.l.conditionRow(index);
  }

  async fillCondition(row: Locator, values: ConditionValues): Promise<void> {
    await this.l.side(row, values.side).click();
    await expect(this.l.side(row, values.side)).toHaveAttribute('aria-checked', 'true');
    const pickers = this.l.rowPickers(row);
    if (values.dimension && values.dimension !== 'Item attribute')
      await this.pick(pickers.first(), values.dimension);
    if (values.attribute) await this.pick(pickers.nth(1), values.attribute);
    if (values.side === 'Same') return;
    if (values.operator && values.operator !== '=')
      await this.pick(pickers.nth(2), values.operator);
    if (!values.values?.length) return;
    if (values.operator === 'in') {
      for (const value of values.values) await this.toggleChip(row, value);
    } else {
      await this.pick(pickers.nth(3), values.values[0]!);
    }
  }

  async toggleChip(row: Locator, value: string): Promise<void> {
    await this.l.valueChip(row, value).click();
  }

  /** A chip is on (selected) — read from aria-pressed or the chip's selected styling. */
  async expectChipSelected(row: Locator, value: string, selected = true): Promise<void> {
    const chip = this.l.valueChip(row, value);
    await expect
      .poll(async () => {
        const pressed = await chip.getAttribute('aria-pressed');
        if (pressed !== null) return pressed === 'true';
        return /(?:^|\s)(bg-primary|bg-fos-bg-brand|selected|border-primary)/.test(
          (await chip.getAttribute('class')) ?? '',
        );
      })
      .toBe(selected);
  }

  async removeCondition(index: number): Promise<void> {
    const before = await this.conditionCount();
    await this.l.removeConditionButtons.nth(index).click();
    await expect(this.l.removeConditionButtons).toHaveCount(before - 1);
  }

  /** The row's pickers' texts, in order (dimension, attribute, operator, value). */
  async rowPickerTexts(row: Locator): Promise<string[]> {
    return (await this.l.rowPickers(row).allInnerTexts()).map((t) => t.trim());
  }

  async expectRowSide(row: Locator, side: 'From' | 'To' | 'Same'): Promise<void> {
    await expect(this.l.side(row, side)).toHaveAttribute('aria-checked', 'true');
  }

  async expectRowStaysTheSame(row: Locator): Promise<void> {
    await expect(this.l.stays(row)).toBeVisible();
  }

  async optionsOfRowPicker(row: Locator, index: number): Promise<string[]> {
    return this.optionsOf(this.l.rowPickers(row).nth(index));
  }

  async expectNoConditionsNote(scope: string): Promise<void> {
    await expect(this.l.noConditions).toHaveText(
      `No conditions — matches every change on ${scope}.`,
    );
  }

  // ── Changeover ───────────────────────────────────────────────────────

  async setChangeoverOn(on: boolean): Promise<void> {
    if ((await this.l.changeoverSwitch.getAttribute('aria-checked')) !== String(on))
      await this.l.changeoverSwitch.click();
    await expect(this.l.changeoverSwitch).toHaveAttribute('aria-checked', String(on));
  }

  async setChangeover(hours: number, minutes: number): Promise<void> {
    await this.setChangeoverOn(true);
    await this.typeNumber(this.l.changeoverHours, hours);
    await this.typeNumber(this.l.changeoverMinutes, minutes);
  }

  async expectChangeover(hours: number | string, minutes: number | string): Promise<void> {
    await expect(this.l.changeoverHours).toHaveValue(String(hours));
    await expect(this.l.changeoverMinutes).toHaveValue(String(minutes));
  }

  async expectChangeoverTotal(text: string): Promise<void> {
    await expect(this.l.changeoverTotal).toHaveText(text);
  }

  async expectChangeoverOff(): Promise<void> {
    await expect(this.l.changeoverSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(this.l.changeoverOff).toBeVisible();
  }

  async expectLostTime(on: boolean): Promise<void> {
    await expect(this.l.lostTimeSwitch).toHaveAttribute('aria-checked', String(on));
  }

  async expectActivity(text: string): Promise<void> {
    await expect(this.l.activityPicker).toHaveText(text);
  }

  async setActivity(option: string | RegExp): Promise<void> {
    await this.pick(this.l.activityPicker, option);
  }

  async activityOptions(): Promise<string[]> {
    return this.optionsOf(this.l.activityPicker);
  }

  async expectNoActuals(): Promise<void> {
    await expect(this.l.noActuals).toBeVisible();
  }

  // ── Learning curve ───────────────────────────────────────────────────

  async setCurveOn(on: boolean): Promise<void> {
    if ((await this.l.curveSwitch.getAttribute('aria-checked')) !== String(on))
      await this.l.curveSwitch.click();
    await expect(this.l.curveSwitch).toHaveAttribute('aria-checked', String(on));
  }

  async expectCurveOff(): Promise<void> {
    await expect(this.l.curveSwitch).toHaveAttribute('aria-checked', 'false');
    await expect(this.l.curveOff).toBeVisible();
  }

  async setCurve(values: CurveValues): Promise<void> {
    await this.setCurveOn(true);
    if (values.day1 !== undefined) await this.typeNumber(this.l.day1, values.day1);
    if (values.days !== undefined) await this.typeNumber(this.l.daysToStandard, values.days);
    if (values.rate !== undefined) await this.typeNumber(this.l.learningRate, values.rate);
  }

  async expectCurve(values: Required<CurveValues>): Promise<void> {
    await expect(this.l.day1).toHaveValue(String(values.day1));
    await expect(this.l.daysToStandard).toHaveValue(String(values.days));
    await expect(this.l.learningRate).toHaveValue(String(values.rate));
  }

  async expectParametersMode(): Promise<void> {
    await expect(this.l.parametersRadio).toHaveAttribute('aria-checked', 'true');
  }

  async expectDayByDayMode(): Promise<void> {
    await expect(this.l.dayByDayRadio).toHaveAttribute('aria-checked', 'true');
  }

  async useDayByDay(): Promise<void> {
    await this.l.dayByDayRadio.click();
    await this.expectDayByDayMode();
    await expect(this.l.dayTable).toBeVisible();
  }

  async useParameters(): Promise<void> {
    await this.l.parametersRadio.click();
    await this.expectParametersMode();
  }

  /** "492 min ≈ 0.91 d" → { minutes: 492, days: 0.91 } (minutes undefined if not shown). */
  async rampLoss(): Promise<{ minutes?: number; days: number; text: string }> {
    const text = (await this.l.rampLoss.innerText()).replace(/\s+/g, ' ').trim();
    const match = text.match(/(?:(\d+) min ≈ )?([\d.]+) d/);
    if (!match) throw new Error(`Unexpected ramp loss "${text}"`);
    return { minutes: match[1] ? Number(match[1]) : undefined, days: Number(match[2]), text };
  }

  async expectRampLossDerived(): Promise<void> {
    await expect(this.l.rampLoss).toContainText(/\d+ min ≈ [\d.]+ d/);
    await expect(this.l.rampLoss).toContainText(
      /Derived — on a \d+-minute day \(.+\)\. Never typed\./,
    );
    await expect(this.l.rampLoss.getByRole('textbox')).toHaveCount(0);
    await expect(this.l.rampLoss.getByRole('spinbutton')).toHaveCount(0);
  }

  /** The standard-day minutes in the Ramp loss hint ("on a 540-minute day"). */
  async standardDayMinutes(): Promise<number> {
    const text = await this.l.rampLoss.innerText();
    return Number(text.match(/on a (\d+)-minute day/)![1]);
  }

  async expectDay1(value: string): Promise<void> {
    await expect(this.l.day1).toHaveValue(value);
  }

  async expectDaysToStandard(value: string): Promise<void> {
    await expect(this.l.daysToStandard).toHaveValue(value);
  }

  async setDay1(value: number): Promise<void> {
    await this.typeNumber(this.l.day1, value);
  }

  async setDays(value: number | string): Promise<void> {
    await this.typeNumber(this.l.daysToStandard, value);
  }

  async setRate(value: number): Promise<void> {
    await this.typeNumber(this.l.learningRate, value);
  }

  /** In Day by day mode: the three curve numbers are read-only, the rate marked "· fitted". */
  async expectFittedReadOnly(): Promise<void> {
    await expect(this.l.fittedDay1).toBeVisible();
    await expect(this.l.fittedDays).toBeVisible();
    await expect(this.l.fittedRate).toContainText(/\d+ % · fitted/);
    for (const group of [this.l.fittedDay1, this.l.fittedDays, this.l.fittedRate]) {
      await expect(group.getByRole('spinbutton')).toHaveCount(0);
      await expect(group.getByRole('textbox')).toHaveCount(0);
    }
  }

  async expectFitted(day1: string, days: string): Promise<void> {
    await expect(this.l.fittedDay1).toContainText(`${day1} %`);
    await expect(this.l.fittedDays).toContainText(days);
  }

  /** The table's values once they settle (after a removal the boxes refresh a moment later). */
  async expectTableValues(values: number[]): Promise<void> {
    await expect.poll(() => this.tableValues()).toEqual(values);
  }

  async tableValues(): Promise<number[]> {
    return (
      await this.l.dayCells.evaluateAll((cells) =>
        cells.map((c) => (c as unknown as { value: string }).value),
      )
    ).map(Number);
  }

  /** Day numbers in the table's first column. */
  async tableDays(): Promise<number[]> {
    const rows = this.l.dayTable.getByRole('rowgroup').nth(1).getByRole('row');
    const days: number[] = [];
    for (const row of await rows.all())
      days.push(Number((await row.getByRole('cell').first().innerText()).trim()));
    return days;
  }

  /** Each value cell carries a "%" after its box. */
  async expectTablePercentSigns(): Promise<void> {
    const rows = this.l.dayTable.getByRole('rowgroup').nth(1).getByRole('row');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1)
      await expect(rows.nth(i).getByRole('cell').nth(1)).toContainText('%');
  }

  async setTable(values: number[]): Promise<void> {
    while ((await this.l.dayCells.count()) < values.length) await this.addDay();
    while ((await this.l.dayCells.count()) > values.length)
      await this.removeDay((await this.l.dayCells.count()) - 2);
    for (const [i, value] of values.entries()) await this.typeNumber(this.l.dayCell(i + 1), value);
  }

  async setDayValue(day: number, value: number): Promise<void> {
    await this.typeNumber(this.l.dayCell(day), value);
  }

  async addDay(): Promise<void> {
    const before = await this.l.dayCells.count();
    await this.l.addDayButton.click();
    await expect(this.l.dayCells).toHaveCount(before + 1);
  }

  /** Removes the day at `index` (0-based) with its "Remove this day". */
  async removeDay(index: number): Promise<void> {
    const before = await this.l.dayCells.count();
    await this.l.removeDayButtons.nth(index).click();
    await expect(this.l.dayCells).toHaveCount(before - 1);
  }

  async expectOnlyRemoveDisabled(): Promise<void> {
    await expect(this.l.removeDayButtons).toHaveCount(1);
    await expect(this.l.removeDayButtons.first()).toBeDisabled();
  }

  async fitReadback(): Promise<string> {
    return (await this.l.fitReadback.innerText()).trim();
  }

  /** Amber (warning) or the neutral blue readback, from its colour classes. */
  async fitReadbackTone(): Promise<'amber' | 'neutral'> {
    const cls = (await this.l.fitReadback.getAttribute('class')) ?? '';
    return /amber|warning/.test(cls) ? 'amber' : 'neutral';
  }

  async expectModeHelp(text: string): Promise<void> {
    await expect(this.l.modeHelp).toHaveAccessibleName(text);
  }

  async expectTableRemovedNote(shown: boolean): Promise<void> {
    await expect(this.l.tableRemovedNote).toHaveCount(shown ? 1 : 0);
  }

  async expectCarryOver(state: { enabled: boolean; on?: boolean }): Promise<void> {
    if (state.enabled) await expect(this.l.carryOverSwitch).toBeEnabled();
    else await expect(this.l.carryOverSwitch).toBeDisabled();
    if (state.on !== undefined)
      await expect(this.l.carryOverSwitch).toHaveAttribute('aria-checked', String(state.on));
  }

  async setCarryOver(on: boolean): Promise<void> {
    if ((await this.l.carryOverSwitch.getAttribute('aria-checked')) !== String(on))
      await this.l.carryOverSwitch.click();
    await expect(this.l.carryOverSwitch).toHaveAttribute('aria-checked', String(on));
  }

  // ── Evidence ─────────────────────────────────────────────────────────

  async expectEvidenceCount(n: number): Promise<void> {
    await expect(this.l.evidenceHeading).toHaveText(`Evidence · measured (${n})`);
  }

  async pointCount(): Promise<number> {
    return this.l.pointRows().count();
  }

  /** Adds a point and returns its 1-based row number; fills what `values` gives. */
  async addPoint(values: PointValues = {}): Promise<number> {
    const n = (await this.pointCount()) + 1;
    await this.l.addPointButton.click();
    await expect(this.l.pointRows()).toHaveCount(n);
    await this.fillPoint(n, values);
    return n;
  }

  async fillPoint(n: number, values: PointValues): Promise<void> {
    if (values.day !== undefined) await this.typeNumber(this.l.pointDay(n), values.day);
    if (values.pct !== undefined) await this.typeNumber(this.l.pointPct(n), values.pct);
    if (values.lineDays !== undefined)
      await this.typeNumber(this.l.pointLineDays(n), values.lineDays);
  }

  async point(n: number): Promise<{ day: string; pct: string; lineDays: string }> {
    return {
      day: await this.l.pointDay(n).inputValue(),
      pct: await this.l.pointPct(n).inputValue(),
      lineDays: await this.l.pointLineDays(n).inputValue(),
    };
  }

  async deletePoint(n: number): Promise<void> {
    const before = await this.pointCount();
    await this.l.deletePoint(n).click();
    await expect(this.l.pointRows()).toHaveCount(before - 1);
  }

  async expectRefitDisabled(): Promise<void> {
    await expect(this.l.refitButton).toBeDisabled();
  }

  async openRefit(): Promise<void> {
    await this.l.refitButton.click();
    await expect(this.l.refitDialog).toBeVisible();
  }

  async expectRefitDialog(points: number): Promise<void> {
    await expect(this.l.refitDialog).toContainText(
      `Weighted by line-days across ${points} measured points.`,
    );
    for (const label of ['Day 1 output', 'Days to standard', 'Learning rate (Wright)'])
      await expect(
        this.l.refitDialog.getByRole('row', { name: new RegExp(`^${escape(label)} `) }),
      ).toBeVisible();
    await expect(
      this.l.refitDialog.getByRole('columnheader', { name: 'Now', exact: true }),
    ).toBeVisible();
    await expect(
      this.l.refitDialog.getByRole('columnheader', { name: 'Refitted', exact: true }),
    ).toBeVisible();
  }

  async expectRefitDialogText(text: string): Promise<void> {
    await expect(this.l.refitDialog).toContainText(text);
  }

  /** The refit dialog's "Refitted" values, by parameter. */
  async refittedValues(): Promise<Record<string, string>> {
    const rows = this.l.refitDialog.getByRole('rowgroup').nth(1).getByRole('row');
    const values: Record<string, string> = {};
    for (const row of await rows.all()) {
      const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      values[cells[0]!] = cells[2]!;
    }
    return values;
  }

  async cancelRefit(): Promise<void> {
    await this.l.refitDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.l.refitDialog).toBeHidden();
  }

  async applyRefit(): Promise<void> {
    await this.l.applyRefitButton.click();
    await expect(this.l.refitDialog).toBeHidden();
  }

  async expectDivergenceWarning(text: string | RegExp | null): Promise<void> {
    if (text === null) await expect(this.l.divergenceWarning).toHaveCount(0);
    else await expect(this.l.divergenceWarning.first()).toHaveText(text);
  }

  async expectLastRefitted(pattern: RegExp): Promise<void> {
    await expect(this.l.lastRefitted.first()).toContainText(pattern);
  }

  // ── Ramp panel ───────────────────────────────────────────────────────

  async expectReferenceLine(value: number): Promise<void> {
    await expect(this.l.referenceLine).toHaveValue(String(value));
  }

  async setReferenceLine(value: number): Promise<void> {
    await this.typeNumber(this.l.referenceLine, value);
  }

  /** The Ramp panel's day table: one { day, pct, pieces, lost } per row. */
  async rampTable(): Promise<{ day: string; pct: string; pieces: string; lost: string }[]> {
    const header = (await this.l.rampTable.getByRole('columnheader').allInnerTexts()).map((h) =>
      h.trim(),
    );
    expect(header).toEqual(['Working day', '% of target held', 'Pieces', 'Day lost']);
    const rows = this.l.rampTable.getByRole('rowgroup').nth(1).getByRole('row');
    const out: { day: string; pct: string; pieces: string; lost: string }[] = [];
    for (const row of await rows.all()) {
      const [day, pct, pieces, lost] = (await row.getByRole('cell').allInnerTexts()).map((c) =>
        c.trim(),
      );
      out.push({ day: day!, pct: pct!, pieces: pieces!, lost: lost! });
    }
    return out;
  }

  async narrative(): Promise<string> {
    return (await this.l.narrative.innerText()).trim();
  }

  async expectChartLegend(text: string | RegExp): Promise<void> {
    await expect(this.l.rampChart).toContainText(text);
  }

  // ── Warnings ─────────────────────────────────────────────────────────

  async expectWarning(text: string): Promise<void> {
    await expect(this.l.text(text).first()).toBeVisible();
  }

  async expectNoWarning(text: string | RegExp): Promise<void> {
    await expect(this.l.text(text)).toHaveCount(0);
  }

  // ── Save, leave, deactivate ──────────────────────────────────────────

  async expectCreateDisabled(): Promise<void> {
    await expect(this.l.createButton).toBeDisabled();
  }

  /** Create on step 2 → the POST's saved rule; the page then opens the rule's view page. */
  async create(): Promise<SavedRule> {
    await expect(this.l.createButton).toBeEnabled();
    const [response] = await Promise.all([
      this.page.waitForResponse(isRulesApi('POST', /\/transition-rules$/), {
        timeout: WAIT.NAVIGATION,
      }),
      this.l.createButton.click(),
    ]);
    expect(response.status(), `create rule: ${await response.text()}`).toBe(201);
    return (await response.json()) as SavedRule;
  }

  /** Create, expecting the server to refuse it; returns the status. */
  async createRefused(): Promise<number> {
    const [response] = await Promise.all([
      this.page.waitForResponse(isRulesApi('POST', /\/transition-rules$/), {
        timeout: WAIT.NAVIGATION,
      }),
      this.l.createButton.click(),
    ]);
    return response.status();
  }

  /** Save on step 2 → the PUT's response (status and body). */
  async save(): Promise<{ status: number; body: SavedRule & { code?: string } }> {
    await expect(this.l.saveButton).toBeEnabled();
    const [response] = await Promise.all([
      this.page.waitForResponse(isRulesApi('PUT', /\/transition-rules\/[^/]+$/), {
        timeout: WAIT.NAVIGATION,
      }),
      this.l.saveButton.click(),
    ]);
    return { status: response.status(), body: (await response.json()) as SavedRule };
  }

  /**
   * Save with nothing changed: no write is sent, and it goes back to the
   * page it came from. Returns the write requests seen meanwhile.
   */
  async saveUnchanged(): Promise<string[]> {
    const writes: string[] = [];
    const watch = (request: { method(): string; url(): string }) => {
      if (/transition-rules/.test(request.url()) && /^(PUT|PATCH|POST)$/.test(request.method()))
        if (!/\/preview$/.test(request.url())) writes.push(`${request.method()} ${request.url()}`);
    };
    this.page.on('request', watch);
    try {
      await this.l.saveButton.click();
      await expect(this.page).not.toHaveURL(/\/edit$/, { timeout: WAIT.NAVIGATION });
    } finally {
      this.page.off('request', watch);
    }
    return writes;
  }

  async expectSaveToast(text: string): Promise<void> {
    await expect(toast(this.page, text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(toast(this.page, text).first()).toBeVisible({ timeout: WAIT.SERVER });
  }

  async cancel(): Promise<void> {
    await this.l.cancelButton.click();
  }

  async expectLeaveDialog(text: string): Promise<void> {
    await expect(this.l.leaveDialog).toBeVisible();
    await expect(this.l.leaveDialog).toContainText(text);
  }

  async keepEditing(): Promise<void> {
    await this.l.keepEditingButton.click();
    await expect(this.l.leaveDialog).toBeHidden();
  }

  async discardAndLeave(): Promise<void> {
    await this.l.discardButton.click();
    await expect(this.l.leaveDialog).toBeHidden();
    await expect(this.page).not.toHaveURL(/\/(new|edit)$/, { timeout: WAIT.NAVIGATION });
  }

  async expectDeactivateDialogOpen(): Promise<void> {
    await expect(this.l.deactivateDialog).toBeVisible();
  }

  async expectNoDeactivateDialog(): Promise<void> {
    await expect(this.l.deactivateDialog).toHaveCount(0);
  }

  async expectActiveHint(): Promise<void> {
    await expect(this.l.activeHint).toBeVisible();
  }

  async expectDeactivateAvailable(available: boolean): Promise<void> {
    await expect(this.l.deactivateButton).toHaveCount(available ? 1 : 0);
  }

  async openDeactivate(): Promise<void> {
    await this.l.deactivateButton.click();
    await expect(this.l.deactivateDialog).toBeVisible();
  }

  async expectDeactivateDialog(name: string, texts: (string | RegExp)[]): Promise<void> {
    await expect(this.l.deactivateDialog.getByRole('heading')).toHaveText(`Deactivate ${name}`);
    for (const text of texts) await expect(this.l.deactivateDialog).toContainText(text);
  }

  async expectNoDeactivateDialogText(text: string): Promise<void> {
    await expect(this.l.deactivateDialog).not.toContainText(text);
  }

  async cancelDeactivate(): Promise<void> {
    await this.l.deactivateDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.l.deactivateDialog).toBeHidden();
  }

  /** Confirms the dialog; returns every rules write sent meanwhile (expected: only the status PATCH). */
  async confirmDeactivate(): Promise<string[]> {
    const writes: string[] = [];
    const watch = (request: { method(): string; url(): string; postData(): string | null }) => {
      if (/transition-rules/.test(request.url()) && /^(PUT|PATCH|POST)$/.test(request.method()))
        if (!/\/preview$/.test(request.url()))
          writes.push(
            `${request.method()} ${new URL(request.url()).pathname} ${request.postData()}`,
          );
    };
    this.page.on('request', watch);
    try {
      const [response] = await Promise.all([
        this.page.waitForResponse(isRulesApi('PATCH', /\/transition-rules\/.*status$/), {
          timeout: WAIT.NAVIGATION,
        }),
        this.l.confirmDeactivateButton.click(),
      ]);
      expect(response.ok(), `deactivate: ${response.status()}`).toBe(true);
      await expect(this.l.deactivateDialog).toBeHidden();
    } finally {
      this.page.off('request', watch);
    }
    return writes;
  }

  async expectConflictBanner(): Promise<void> {
    await expect(this.l.conflictBanner).toBeVisible({ timeout: WAIT.SERVER });
    await expect(this.l.reloadLatestButton).toBeVisible();
  }

  /** A user without write access doesn't get a working editor on the edit URL. */
  async expectNoWorkingEditor(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.l.accessRestricted
            .first()
            .isVisible()
            .catch(() => false)) || !/\/edit$/.test(this.page.url()),
        { message: 'edit URL refused or redirected', timeout: WAIT.PAGE_LOAD },
      )
      .toBe(true);
    await expect(this.l.saveButton).toHaveCount(0);
    await expect(this.l.createButton).toHaveCount(0);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  /** A number box: fill, then leave it so the editor applies clamps / rounding. */
  async typeNumber(box: Locator, value: number | string): Promise<void> {
    await box.fill(String(value));
    await box.blur();
  }

  async valueOf(box: 'day1' | 'days' | 'rate' | 'hours' | 'minutes' | 'priority'): Promise<string> {
    const map = {
      day1: this.l.day1,
      days: this.l.daysToStandard,
      rate: this.l.learningRate,
      hours: this.l.changeoverHours,
      minutes: this.l.changeoverMinutes,
      priority: this.l.priority,
    };
    return map[box].inputValue();
  }

  /** Opens a picker, picks the option, and waits for the list to close. */
  async pick(picker: Locator, option: string | RegExp): Promise<void> {
    await expect(async () => {
      await picker.click({ timeout: WAIT.RETRY_STEP });
      await expect(this.l.option(option).first()).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
    await this.l.option(option).first().click();
    await expect(this.l.options()).toHaveCount(0);
  }

  /** Opens a picker, reads its options, and closes it again. */
  async optionsOf(picker: Locator): Promise<string[]> {
    await expect(async () => {
      await picker.click({ timeout: WAIT.RETRY_STEP });
      await expect(this.l.options().first()).toBeVisible({ timeout: WAIT.RETRY_STEP });
    }).toPass({ timeout: WAIT.SERVER });
    const options = (await this.l.options().allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    await expect(this.l.options()).toHaveCount(0);
    return options;
  }
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
