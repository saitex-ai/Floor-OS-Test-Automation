import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the routing-template editor:
 * /planning/master-data/routing-templates/new (a never-saved draft with an
 * inline header form) and /routing-templates/<uuid>[/edit] (a saved one,
 * whose header is edited in the "Edit routing template" dialog). The steps
 * table, its row menus ("Step N actions") and the dialogs they open (activity
 * picker, link editor, "waits on" list, parallel group, condition builder)
 * all live here. No actions or assertions, see
 * src/pages/planning/routing-template-editor.page.ts.
 */
export class RoutingTemplateEditorLocators {
  readonly heading: Locator;
  readonly backLink: Locator;
  /** "Unsaved · not in the list until you Save draft" on a never-saved draft. */
  readonly unsavedBadge: Locator;
  /** The status badge in the header ("Draft · rev 0", "Active · rev 1 → pending rev 2", …). */
  readonly statusBadge: Locator;
  readonly aiProposedBadge: Locator;
  readonly editHeaderButton: Locator;
  readonly editTemplateButton: Locator;
  readonly cancelRevisionButton: Locator;
  readonly addStepButton: Locator;
  readonly saveDraftButton: Locator;
  readonly discardButton: Locator;
  readonly validateButton: Locator;
  /** "Send for approval", on a Draft and on a pending revision. */
  readonly sendForApprovalButton: Locator;
  /** "Withdraw", while a request is pending. */
  readonly withdrawButton: Locator;
  /** The footer badge: "Not validated", "Valid" or "N issues" (opens the issue list). */
  readonly validationBadge: Locator;
  /** The bottom-left issue list (also what a refused Save draft shows). */
  readonly issueList: Locator;
  readonly criticalPathFooter: Locator;
  readonly stepsHeading: Locator;
  readonly stepsTable: Locator;
  readonly stepsViewTable: Locator;
  readonly stepsViewVisual: Locator;
  readonly emptyStepsMessage: Locator;
  readonly liveTab: Locator;
  readonly pendingTab: Locator;
  readonly changesLine: Locator;
  /** The Approvals block's "Approval chain" box (label plus one box per level). */
  readonly approvalChain: Locator;
  /** "… waiting for approval in APR-…. It cannot be changed until the request is decided." */
  readonly pendingBanner: Locator;
  readonly liveReadOnlyNote: Locator;
  readonly criticalPathToggle: Locator;
  readonly graph: Locator;
  readonly graphCaption: Locator;
  readonly approvalsText: Locator;
  readonly headerDialog: Locator;
  readonly activityPicker: Locator;
  readonly linkDialog: Locator;
  readonly waitsOnDialog: Locator;
  readonly groupDialog: Locator;
  readonly conditionDialog: Locator;
  readonly cancelRevisionDialog: Locator;
  /** The toast(s) a refused save leaves, "N validation errors — nothing was saved.". */
  readonly refusalToasts: Locator;
  /** The "Leave without saving?" guard. */
  readonly leaveDialog: Locator;
  readonly stepMenu: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 }).last();
    this.backLink = page.getByRole('link', { name: 'All routing templates' });
    this.unsavedBadge = page.getByText('Unsaved · not in the list until you Save draft');
    this.statusBadge = page.getByText(/^(Draft|Active|Retired)( · rev \d+.*)?$/).first();
    this.aiProposedBadge = page.getByText('AI proposed', { exact: true });
    this.editHeaderButton = page.getByRole('button', { name: 'Edit header' });
    this.editTemplateButton = page.getByRole('button', { name: 'Edit template' });
    this.cancelRevisionButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: 'Cancel revision' });
    this.addStepButton = page.getByRole('button', { name: 'Add step' });
    this.saveDraftButton = page.getByRole('button', { name: 'Save draft' });
    this.discardButton = page.getByRole('button', { name: 'Discard changes' });
    this.validateButton = page.getByRole('button', { name: 'Validate', exact: true });
    this.sendForApprovalButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: 'Send for approval' });
    this.withdrawButton = page
      .getByRole('main')
      .last()
      .getByRole('button', { name: 'Withdraw', exact: true });
    this.validationBadge = page.getByRole('button', {
      name: /^(Not validated|Valid|\d+ issues?)$/,
    });
    this.issueList = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('listitem') })
      .filter({ hasText: /^●/ });
    this.criticalPathFooter = page.getByText(/^Critical path ≈ [\d.]+ d/);
    this.stepsHeading = page.getByRole('heading', { name: /^Steps \(\d+\)$/, level: 2 });
    this.stepsTable = page.getByRole('table', { name: 'Steps' });
    const viewTabs = page.getByRole('tablist', { name: 'Steps view' });
    this.stepsViewTable = viewTabs.getByRole('tab', { name: 'Table' });
    this.stepsViewVisual = viewTabs.getByRole('tab', { name: 'Visual' });
    this.emptyStepsMessage = page.getByText(/^No steps yet\./);
    const revisionTabs = page.getByRole('tablist', { name: 'Revision shown' });
    this.liveTab = revisionTabs.getByRole('tab', { name: /^Live · rev \d+$/ });
    this.pendingTab = revisionTabs.getByRole('tab', { name: /^Pending · rev \d+$/ });
    // The label sits beside the change chips ("1 steps added", …): the line is its parent.
    this.changesLine = page.getByText(/^Changes vs revision \d+/).locator('..');
    this.approvalChain = page.getByText('Approval chain', { exact: true }).locator('..');
    this.pendingBanner = page.getByText(/waiting for approval in APR-\d{4}-\d{6}\./i).first();
    this.liveReadOnlyNote = page.getByText(/^Live · revision \d+ - what orders derive from\./);
    this.criticalPathToggle = page.getByRole('button', { name: 'Critical path', exact: true });
    this.graph = page.getByRole('group', { name: 'Step dependency graph' });
    this.graphCaption = page.getByText(/^Flows left to right\./);
    this.approvalsText = page.getByRole('main').last().getByText('Approval chain', { exact: true });
    this.headerDialog = page.getByRole('dialog', { name: 'Edit routing template' });
    this.activityPicker = page.getByRole('dialog', { name: 'Choose the activity' });
    this.linkDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('combobox', { name: 'Waits on (predecessor)' }) });
    this.waitsOnDialog = page.getByRole('dialog', { name: /^Step \d+ · .+ waits on$/ });
    this.groupDialog = page.getByRole('dialog', { name: /^Parallel group · step \d+$/ });
    this.conditionDialog = page.getByRole('dialog', { name: 'Include this step when…' });
    this.cancelRevisionDialog = page.getByRole('alertdialog', {
      name: 'Cancel the pending revision?',
    });
    this.refusalToasts = page.getByText(/validation errors? — nothing was saved\./);
    this.leaveDialog = page
      .getByRole('alertdialog', { name: 'Leave without saving?' })
      .or(page.getByRole('dialog', { name: 'Leave without saving?' }));
    this.stepMenu = page.getByRole('menu', { name: /^Step \d+ actions$/ });
  }

  /** A header field: on the inline form (`scope` = page) or in the Edit header dialog. */
  cycleKind(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('combobox', { name: /^Cycle kind/ });
  }

  productType(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('combobox', { name: 'Product type' });
  }

  washType(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('combobox', { name: 'Wash type' });
  }

  templateCode(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('textbox', { name: 'Template code' });
  }

  templateName(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('textbox', { name: 'Template name *' });
  }

  description(scope: Page | Locator = this.page): Locator {
    return scope.getByRole('textbox', { name: 'Description' });
  }

  /** An open select's option (Radix Select / combobox listbox). */
  option(name: string | RegExp): Locator {
    return this.page.getByRole('option', { name, exact: typeof name === 'string' });
  }

  options(): Locator {
    return this.page.getByRole('option');
  }

  /** The steps table's body rows (step 1 is index 0). */
  stepRows(): Locator {
    return this.stepsTable.getByRole('rowgroup').nth(1).getByRole('row');
  }

  stepRow(step: number): Locator {
    return this.stepRows().nth(step - 1);
  }

  /** The "Choose activity…" trigger of a step that has no activity yet. */
  chooseActivity(step: number): Locator {
    return this.stepRow(step).getByText('Choose activity…');
  }

  /** The step's "Add a step this one waits on" button (opens a new link). */
  addWaitsOn(step: number): Locator {
    return this.stepRow(step).getByRole('button', { name: 'Add a step this one waits on' });
  }

  stepActions(step: number): Locator {
    return this.page.getByRole('button', { name: `Step ${step} actions`, exact: true });
  }

  menuItem(name: string | RegExp): Locator {
    return this.stepMenu.getByRole('menuitem', { name });
  }

  optionalSwitch(step: number): Locator {
    return this.stepRow(step).getByRole('switch', { name: 'Optional step' });
  }

  recipeTab(step: number, name: 'Wash' | 'OB' | 'Params' | 'None'): Locator {
    return this.stepRow(step)
      .getByRole('tablist', { name: 'Recipe binding' })
      .getByRole('tab', { name, exact: true });
  }

  tooltip(): Locator {
    return this.page.getByRole('tooltip');
  }

  pickerSearch(): Locator {
    return this.activityPicker.getByRole('combobox');
  }

  pickerOptions(): Locator {
    return this.activityPicker.getByRole('option');
  }

  /** A department group of the activity picker ("CUTTING", "WASH", …). */
  pickerGroups(): Locator {
    return this.activityPicker.getByRole('group');
  }

  /** A picker option by its activity code (options read "<code> <name> <dept> <type>"). */
  pickerOption(code: string): Locator {
    return this.activityPicker.getByRole('option', {
      name: new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `),
    });
  }

  linkPredecessor(): Locator {
    return this.linkDialog.getByRole('combobox', { name: 'Waits on (predecessor)' });
  }

  linkWaitingStep(): Locator {
    return this.linkDialog.getByRole('combobox', { name: 'Step that waits' });
  }

  linkTab(name: 'After finish' | 'Start together' | 'Custom' | 'Elapsed' | 'Working'): Locator {
    return this.linkDialog.getByRole('tab', { name, exact: true });
  }

  linkUnitTab(name: '%' | 'pcs'): Locator {
    return this.linkDialog
      .getByRole('tablist', { name: 'Threshold unit' })
      .getByRole('tab', { name, exact: true });
  }

  linkThreshold(): Locator {
    return this.linkDialog.getByRole('textbox', { name: 'Threshold' });
  }

  linkHours(): Locator {
    return this.linkDialog.getByRole('textbox', { name: 'Hours' });
  }

  linkMinutes(): Locator {
    return this.linkDialog.getByRole('textbox', { name: 'Minutes' });
  }

  linkAnyOfGroup(): Locator {
    return this.linkDialog.getByRole('combobox', { name: 'Any-of group' });
  }

  linkSubmit(): Locator {
    return this.linkDialog.getByRole('button', { name: /^(Add link|Save link|Save)$/ });
  }

  linkCancel(): Locator {
    return this.linkDialog.getByRole('button', { name: 'Cancel', exact: true });
  }

  /** The refusal the link editor shows inline (loops, duplicate links). */
  linkError(text: string | RegExp): Locator {
    return this.linkDialog.getByText(text);
  }

  conditionField(name: 'Attribute' | 'Operator' | 'Value' | 'Sample order'): Locator {
    return this.conditionDialog.getByRole('combobox', { name });
  }

  conditionButton(name: 'Always include (clear)' | 'Cancel' | 'Apply condition'): Locator {
    return this.conditionDialog.getByRole('button', { name, exact: true });
  }

  /** The step's Condition cell button ("always", or the rule in words). */
  conditionCell(step: number, columnIndex: number): Locator {
    return this.stepRow(step).getByRole('cell').nth(columnIndex).getByRole('button');
  }

  /** The text of a dialog's button (e.g. Publish revision 1, Keep it). */
  dialogButton(dialog: Locator, name: string | RegExp): Locator {
    return dialog.getByRole('button', { name, exact: typeof name === 'string' });
  }

  stepsColumnHeaders(): Locator {
    return this.stepsTable.getByRole('columnheader');
  }

  /** The graph node for step `step` ("1 · CUT-BUFFER, CUT"). */
  graphNode(step: number): Locator {
    return this.graph.getByRole('button', { name: new RegExp(`^${step} · `) });
  }

  dragHandle(step: number): Locator {
    return this.page.getByRole('button', { name: `Drag to reorder step ${step}`, exact: true });
  }
}
