import { type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from './master-data-list.locators';

/**
 * Raw element locators for Planning > Master Data > Transition rules
 * (/planning/master-data/transition-rules): the list's own parts on top of
 * the shared grid (summary cards, Rule cells, the split preview), the
 * read-only view page (/transition-rules/<id>) and the two-step editor
 * (/transition-rules/new, /transition-rules/<id>/edit). No actions or
 * assertions here, see src/pages/planning/transition-rules-list.page.ts,
 * transition-rule-view.page.ts and transition-rule-editor.page.ts.
 */

/** A rule's code at the end of its Rule cell, which reads "<name> <subtitle> · <CODE>[· ambiguous]". */
function codeSuffix(code: string): RegExp {
  // A row's text runs its cells together ("· TR-0037Similar…"): only a digit would make a longer code.
  return new RegExp(`· ${escapeRegExp(code)}(?!\\d)`);
}

export class TransitionRulesListLocators {
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly newButton: Locator;
  /** One caption per summary card ("3 rules · 3–4 days to standard" reads "rules · 3–4 days to standard"). */
  readonly cardCaptions: Locator;
  readonly emptyState: Locator;
  readonly emptyStateHint: Locator;
  readonly noMatchState: Locator;
  readonly noMatchHint: Locator;
  /** Split preview's "Edit" button (opens the editor for the selected rule). */
  readonly previewEditButton: Locator;
  /** The bulk bar shown once rows are selected. */
  readonly clearSelectionButton: Locator;
  readonly bulkDeactivateButton: Locator;
  readonly bulkActivateButton: Locator;
  readonly duplicateAction: Locator;
  /** A row's right-click menu. */
  readonly rowMenu: Locator;
  /** The split views' preview pane (the page's main area). */
  readonly previewPane: Locator;
  /** The split views' "N records" count (the List view has a table instead). */
  readonly splitRecords: Locator;
  /** The Master Data hub's Transition rules tile. */
  readonly hubTile: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Transition rules', level: 1 });
    this.subtitle = page.getByText(/^What it costs a work centre when the thing it runs changes/);
    this.newButton = page.getByRole('button', { name: 'New rule', exact: true });
    this.cardCaptions = page
      .getByRole('main')
      .last()
      .getByText(/^rules? · /);
    this.emptyState = page.getByText('No transition rules', { exact: true });
    this.emptyStateHint = page.getByText(/^Start with one per centre type for a repeat/);
    this.noMatchState = page.getByText('No transition rules match your filters', { exact: true });
    this.noMatchHint = page.getByText(/^Try a different search, or clear the filters/);
    this.previewEditButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: /^Edit( rule)?$/ });
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.bulkDeactivateButton = page.getByRole('button', { name: 'Deactivate', exact: true });
    this.bulkActivateButton = page.getByRole('button', { name: 'Activate', exact: true });
    this.duplicateAction = page
      .getByRole('menuitem', { name: /^Duplicate/ })
      .or(page.getByRole('button', { name: /^Duplicate/ }));
    this.rowMenu = page.getByRole('menu');
    this.previewPane = page.getByRole('main').last();
    this.splitRecords = page.getByText(/^\d+ records?$/);
    this.hubTile = page.getByRole('link', { name: /^Transition rules/ });
  }

  /** A summary card's big number, next to its caption. */
  cardCount(caption: Locator): Locator {
    return caption.locator('xpath=preceding-sibling::span[1]');
  }

  /** A summary card's class label, above its count. */
  cardLabel(caption: Locator): Locator {
    return caption.locator('xpath=preceding-sibling::div[1]');
  }

  /** A grid row by the code at the end of its Rule cell (the code has no cell of its own). */
  row(table: Locator, code: string): Locator {
    return table.getByRole('row').filter({ hasText: codeSuffix(code) });
  }

  /** The "· ambiguous" flag inside a row's Rule cell. */
  ambiguousFlag(row: Locator): Locator {
    return row.getByText('· ambiguous', { exact: true });
  }

  /** The Loss cell's hover text lives in its span's `title`. */
  titled(cell: Locator): Locator {
    return cell.locator('[title]').first();
  }

  /** A card in the split view's list ("Select row <name> <class> · <scope> <CODE>"). */
  splitCard(code: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^Select row .* ${escapeRegExp(code)}$`),
    });
  }

  /** A field's "Value..." picker in the Filters side sheet, by its label. */
  filterField(dialog: Locator, label: string): Locator {
    return dialog
      .getByText(label, { exact: true })
      .locator('xpath=following::*[@role="combobox"][1]');
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', {
      name,
      exact: typeof name === 'string' ? true : undefined,
    });
  }
}

export class TransitionRuleViewLocators {
  readonly main: Locator;
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly editButton: Locator;
  readonly note: Locator;
  readonly conditionsHeading: Locator;
  readonly conditions: Locator;
  readonly noConditions: Locator;
  readonly usage: Locator;
  readonly noActuals: Locator;
  readonly lastRefitted: Locator;
  readonly rampChart: Locator;
  readonly narrative: Locator;
  readonly dayTable: Locator;
  readonly editable: Locator;

  constructor(page: Page) {
    this.main = page.getByRole('main').last();
    this.heading = this.main.getByRole('heading', { level: 1 });
    this.backLink = this.main.getByRole('link', { name: 'Transition rules' });
    this.editButton = this.main.getByRole('button', { name: 'Edit', exact: true });
    // "Note · " is a span inside the paragraph that holds the description.
    this.note = this.main.getByRole('paragraph').filter({ hasText: /^Note · / });
    this.conditionsHeading = this.main.getByRole('heading', { name: 'Applies when', level: 3 });
    this.conditions = this.main.getByRole('listitem');
    this.noConditions = this.main.getByText(/^No conditions — matches every change on /);
    this.usage = this.main.getByText(/^Used by \d+ · Default curve for \d+/);
    this.noActuals = this.main.getByText('No completed changeovers recorded on this rule yet.');
    // The "Last refitted" label and its value are sibling spans.
    this.lastRefitted = this.main.getByText('Last refitted', { exact: true }).locator('xpath=..');
    this.rampChart = this.main.getByRole('img').last();
    this.narrative = this.main.getByText(/^(A line on this curve|No ramp)/);
    this.dayTable = this.main.getByRole('table').last();
    this.editable = this.main
      .getByRole('textbox')
      .or(this.main.getByRole('spinbutton'))
      .or(this.main.getByRole('switch'))
      .or(this.main.getByRole('combobox'));
  }
}

export class TransitionRuleEditorLocators {
  readonly main: Locator;
  readonly heading: Locator;
  /** The title's block: name, code, class pill, badges and the derived subtitle. */
  readonly header: Locator;
  readonly notSavedBadge: Locator;
  readonly stepRuleDetails: Locator;
  readonly stepConditions: Locator;
  readonly stepLabel: Locator;
  readonly name: Locator;
  readonly code: Locator;
  readonly codeHelp: Locator;
  readonly appliesTo: Locator;
  readonly centreTypeRadio: Locator;
  readonly oneCentreRadio: Locator;
  readonly scopePicker: Locator;
  readonly priority: Locator;
  readonly activeSwitch: Locator;
  readonly description: Locator;
  readonly changeClass: Locator;
  readonly classNote: Locator;
  readonly blocker: Locator;
  readonly usageLine: Locator;
  readonly cancelButton: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly createButton: Locator;
  readonly saveButton: Locator;
  readonly deactivateButton: Locator;
  readonly activeHint: Locator;

  // Applies when
  readonly addConditionButton: Locator;
  readonly removeConditionButtons: Locator;
  readonly noConditions: Locator;

  // Changeover
  readonly changeoverSwitch: Locator;
  readonly changeoverOff: Locator;
  readonly changeoverHours: Locator;
  readonly changeoverMinutes: Locator;
  readonly changeoverTotal: Locator;
  readonly lostTimeSwitch: Locator;
  readonly activityPicker: Locator;
  readonly noActuals: Locator;

  // Learning curve
  readonly curveSwitch: Locator;
  readonly curveOff: Locator;
  readonly parametersRadio: Locator;
  readonly dayByDayRadio: Locator;
  readonly modeHelp: Locator;
  readonly day1Slider: Locator;
  readonly day1: Locator;
  readonly daysToStandard: Locator;
  readonly learningRate: Locator;
  readonly rampLoss: Locator;
  readonly fittedDay1: Locator;
  readonly fittedDays: Locator;
  readonly fittedRate: Locator;
  readonly dayTable: Locator;
  readonly dayCells: Locator;
  readonly addDayButton: Locator;
  readonly removeDayButtons: Locator;
  readonly fitReadback: Locator;
  readonly tableRemovedNote: Locator;
  readonly carryOverSwitch: Locator;

  // Evidence
  readonly evidenceHeading: Locator;
  readonly refitButton: Locator;
  readonly evidenceTable: Locator;
  readonly addPointButton: Locator;
  readonly divergenceWarning: Locator;
  readonly lastRefitted: Locator;

  // Ramp panel
  readonly rampChart: Locator;
  readonly narrative: Locator;
  readonly referenceLine: Locator;
  readonly rampTable: Locator;

  // Dialogs and banners
  readonly leaveDialog: Locator;
  readonly keepEditingButton: Locator;
  readonly discardButton: Locator;
  readonly deactivateDialog: Locator;
  readonly confirmDeactivateButton: Locator;
  readonly refitDialog: Locator;
  readonly applyRefitButton: Locator;
  readonly conflictBanner: Locator;
  readonly reloadLatestButton: Locator;
  readonly accessRestricted: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').last();
    this.heading = this.main.getByRole('heading', { level: 1 });
    // Title row (name, code, class, badges) and the derived subtitle under it.
    this.header = this.heading.locator('xpath=../..');
    this.notSavedBadge = this.main.getByText('Not saved yet', { exact: true });
    this.stepRuleDetails = this.main.getByRole('button', { name: /^Rule details/ });
    this.stepConditions = this.main.getByRole('button', { name: /^Conditions and ramp/ });
    this.stepLabel = this.main.getByText(/^STEP \d OF 2 · /i);
    this.name = this.main.getByRole('textbox', { name: 'Name *' });
    this.code = this.main.getByRole('textbox', { name: 'Code', exact: true });
    this.codeHelp = this.main.getByRole('button', {
      name: 'Assigned automatically when the rule is saved.',
    });
    this.appliesTo = this.main.getByRole('group', { name: 'Applies to *' });
    this.centreTypeRadio = this.appliesTo.getByRole('radio', { name: 'A centre type' });
    this.oneCentreRadio = this.appliesTo.getByRole('radio', { name: 'One centre' });
    this.scopePicker = this.appliesTo.getByRole('combobox');
    this.priority = this.main.getByRole('spinbutton', { name: 'Priority' });
    this.activeSwitch = this.main.getByRole('switch', { name: /^Active/ });
    this.description = this.main.getByRole('textbox', { name: 'Description' });
    this.changeClass = this.main.getByRole('group', { name: 'Change class *' });
    this.classNote = this.changeClass.getByRole('paragraph');
    this.blocker = this.main.getByText(/^Can't save yet · /);
    this.usageLine = this.main.getByText(/^Used by \d+ · Default curve for \d+$/);
    this.cancelButton = this.main.getByRole('button', { name: 'Cancel', exact: true });
    this.continueButton = this.main.getByRole('button', { name: 'Continue', exact: true });
    this.backButton = this.main.getByRole('button', { name: 'Back', exact: true });
    this.createButton = this.main.getByRole('button', { name: 'Create', exact: true });
    this.saveButton = this.main.getByRole('button', { name: 'Save', exact: true });
    this.deactivateButton = this.main.getByRole('button', { name: 'Deactivate', exact: true });
    this.activeHint = this.main.getByRole('button', {
      name: 'Inactive rules stop matching. Blocks already on them keep their ramp.',
    });

    this.addConditionButton = this.main.getByRole('button', { name: '+ Add condition' });
    this.removeConditionButtons = this.main.getByRole('button', { name: 'Remove condition' });
    this.noConditions = this.main.getByText(/^No conditions — matches every change on /);

    this.changeoverSwitch = this.main.getByRole('switch', { name: 'Costs time at the boundary' });
    this.changeoverOff = this.main.getByText('Off — this change costs no time at the boundary.');
    this.changeoverHours = this.main.getByRole('spinbutton', { name: /^Changeover h/ });
    // The minutes box has no name of its own: it sits beside the hours box.
    this.changeoverMinutes = this.changeoverHours.locator('xpath=../input[2]');
    this.changeoverTotal = this.changeoverHours.locator('xpath=../following-sibling::span[1]');
    this.lostTimeSwitch = this.main.getByRole('switch', { name: /^Shows on the board as lost/ });
    this.activityPicker = this.main.getByRole('combobox', { name: 'Performed as an activity' });
    this.noActuals = this.main.getByText('No completed changeovers recorded on this rule yet.');

    this.curveSwitch = this.main.getByRole('switch', { name: 'Efficiency ramps after the change' });
    this.curveOff = this.main.getByText('Off — output is at target from the first day.');
    this.parametersRadio = this.main.getByRole('radio', { name: 'Parameters' });
    this.dayByDayRadio = this.main.getByRole('radio', { name: 'Day by day' });
    this.modeHelp = this.main.getByRole('button', { name: /^Type the / });
    this.day1Slider = this.main.getByRole('slider', { name: /^Day 1 output/ });
    // The number box beside the slider has no name of its own.
    this.day1 = this.day1Slider.locator('xpath=following::input[1]');
    this.daysToStandard = this.main.getByRole('spinbutton', { name: 'Days to standard' });
    this.learningRate = this.main.getByRole('spinbutton', { name: 'Learning rate (Wright)' });
    this.rampLoss = this.main.getByRole('group', { name: 'Ramp loss' });
    this.fittedDay1 = this.main.getByRole('group', { name: 'Day 1 output' });
    this.fittedDays = this.main.getByRole('group', { name: 'Days to standard' });
    this.fittedRate = this.main.getByRole('group', { name: 'Learning rate (Wright)' });
    this.dayTable = this.main.getByRole('table', { name: 'Day by day' });
    this.dayCells = this.dayTable.getByRole('textbox', { name: /^% of target \d+$/ });
    this.addDayButton = this.main.getByRole('button', { name: 'Add day' });
    this.removeDayButtons = this.dayTable.getByRole('button', { name: 'Remove this day' });
    this.fitReadback = this.main.getByText(/^Fits a /);
    this.tableRemovedNote = this.main.getByText('The day-by-day table is removed on save.');
    this.carryOverSwitch = this.main.getByRole('switch', { name: 'Repeat carries the ramp over' });

    this.evidenceHeading = this.main.getByRole('heading', { name: /^Evidence · measured/ });
    this.refitButton = this.main.getByRole('button', { name: 'Refit curve from points' });
    this.evidenceTable = this.main.getByRole('table', { name: 'Evidence' });
    this.addPointButton = this.main.getByRole('button', { name: 'Add point' });
    this.divergenceWarning = this.main.getByText(/consider refitting\.$/);
    // One line under Evidence: "Last refitted by <name> · <date>".
    this.lastRefitted = this.main.getByText(/^Last refitted by /);

    this.rampChart = this.main.getByRole('img').last();
    this.narrative = this.main.getByText(/^(A line on this curve|No ramp)/);
    this.referenceLine = this.main.getByRole('spinbutton', { name: /^Reference line/ });
    this.rampTable = this.main.getByRole('table').last();

    this.leaveDialog = page.getByRole('alertdialog', { name: 'Leave without saving?' });
    this.keepEditingButton = this.leaveDialog.getByRole('button', { name: 'Keep editing' });
    this.discardButton = this.leaveDialog.getByRole('button', { name: 'Discard and leave' });
    this.deactivateDialog = page.getByRole('alertdialog', { name: /^Deactivate / });
    this.confirmDeactivateButton = this.deactivateDialog.getByRole('button', {
      name: 'Deactivate rule',
    });
    this.refitDialog = page.getByRole('alertdialog', { name: 'Refit curve from points' });
    this.applyRefitButton = this.refitDialog.getByRole('button', { name: 'Apply refit' });
    this.conflictBanner = this.main.getByText(/Someone else changed this rule/);
    this.reloadLatestButton = this.main.getByRole('button', { name: 'Reload latest' });
    this.accessRestricted = page.getByText(/Access restricted/i);
  }

  /** A change-class pill (Repeat / Similar / New style / New product). */
  classPill(name: string): Locator {
    return this.changeClass.getByRole('button', { name, exact: true });
  }

  /**
   * One condition row: the card around its From / To / Same switch and
   * "Remove condition" button (the row has no role or name of its own).
   */
  conditionRow(index: number): Locator {
    return this.removeConditionButtons.nth(index).locator('xpath=../..');
  }

  /** A row's pickers in order: dimension, then attribute (item attributes), operator, value. */
  rowPickers(row: Locator): Locator {
    return row.getByRole('combobox');
  }

  side(row: Locator, side: 'From' | 'To' | 'Same'): Locator {
    return row.getByRole('radio', { name: side, exact: true });
  }

  /** An "in" value chip inside a condition row. */
  valueChip(row: Locator, value: string): Locator {
    return row.getByRole('button', { name: value, exact: true });
  }

  stays(row: Locator): Locator {
    return row.getByText('stays the same', { exact: true });
  }

  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', {
      name,
      exact: typeof name === 'string' ? true : undefined,
    });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  dayCell(day: number): Locator {
    return this.dayTable.getByRole('textbox', { name: `% of target ${day}`, exact: true });
  }

  pointDay(n: number): Locator {
    return this.evidenceTable.getByRole('textbox', { name: `Working day ${n}`, exact: true });
  }

  pointPct(n: number): Locator {
    return this.evidenceTable.getByRole('textbox', { name: `% of target held ${n}`, exact: true });
  }

  pointLineDays(n: number): Locator {
    return this.evidenceTable.getByRole('textbox', {
      name: `Line-days observed ${n}`,
      exact: true,
    });
  }

  deletePoint(n: number): Locator {
    return this.evidenceTable.getByRole('button', { name: new RegExp(`^Delete row 0*${n}$`) });
  }

  pointRows(): Locator {
    return this.evidenceTable.getByRole('textbox', { name: /^Working day \d+$/ });
  }

  /** A warning / note paragraph by its text. */
  text(text: string | RegExp): Locator {
    return this.main.getByText(text);
  }
}
