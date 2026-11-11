import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Costing screens reached from the left
 * navigation — no actions or assertions here, see
 * src/pages/costing/costing.page.ts for those.
 *
 * Confirmed live on dev, 2026-11-10 (2026-10-22 design system). List
 * screens share the data-grid toolbar; status filters are Radix tabs whose
 * name includes a count ("All 129"), hence the prefix regexes. Quotation
 * Template and Quotations are left out on purpose: the quotation flow has
 * its own suite and owner.
 */
export class CostingScreensLocators {
  /** Any list screen's data rows (rows with cells, so not the header row). */
  readonly tableRows: Locator;

  // Company Costing Setup (/costing/company-costing-setup)
  readonly createSetupButton: Locator;
  // Create Setup wizard (/costing/company-costing-setup/new)
  readonly selectCompanyHeading: Locator;
  readonly selectCompanyPicker: Locator;
  readonly decimalPositionPicker: Locator;
  readonly setupContinueButton: Locator;
  /** Wizard steps 2–5, locked until a company is picked. */
  readonly lockedSetupSteps: Locator;
  readonly cancelSetupButton: Locator;

  // Overhead & Wash Config (/costing/overhead-wash-config)
  readonly addFieldButton: Locator;

  // Costing list (/costing/costing-requests)
  readonly allTab: Locator;
  readonly unassignedTab: Locator;
  readonly assignedTab: Locator;
  readonly newRequestButton: Locator;
  readonly importButton: Locator;
  readonly firstRowCheckbox: Locator;
  readonly sendForApprovalButton: Locator;
  readonly clearSelectionButton: Locator;

  // New Costing Request (/costing/costing-requests/new)
  readonly newCostingRequestHeading: Locator;
  readonly sampleRequestPicker: Locator;
  readonly techpackPicker: Locator;

  /** The open picker popup's options (company, decimals, sample request). */
  readonly pickerOptions: Locator;

  // Import costings from Excel (/costing/costing-requests/imports/new)
  readonly importHeading: Locator;
  readonly chooseFileButton: Locator;
  readonly importUploadStep: Locator;

  // Cost sheet (/costing/costing-requests/{CST id}) — its tab strip's tabs, in order
  readonly costSheetTabs: Locator;

  // Fabric Yield Requests / Fabric Cost Requests
  readonly newTab: Locator;
  readonly inProgressTab: Locator;
  readonly submittedTab: Locator;
  readonly confirmedTab: Locator;
  readonly overdueTab: Locator;
  readonly searchBox: Locator;
  /** The first row's request ID button ("FYR-2026-00929"), which opens it. */
  readonly firstFyrIdButton: Locator;
  readonly firstFcrIdButton: Locator;

  // Approvals (/costing/approvals) and an approval's detail page
  readonly pendingTab: Locator;
  readonly cmApprovedTab: Locator;
  readonly commonDetailsHeading: Locator;
  readonly costingSummaryHeading: Locator;

  // Costing Report (/costing/costing-report)
  readonly savedViewsButton: Locator;
  readonly downloadButton: Locator;

  constructor(private readonly page: Page) {
    this.tableRows = page.getByRole('row').filter({ has: page.getByRole('cell') });

    this.createSetupButton = page.getByRole('button', { name: 'Create Setup' });
    this.selectCompanyHeading = page.getByRole('heading', {
      level: 1,
      name: 'Select the company to set up',
    });
    this.selectCompanyPicker = page.getByRole('button', { name: 'Select a company' });
    this.decimalPositionPicker = page.getByRole('combobox', {
      name: /^Costing calculation decimal position/,
    });
    this.setupContinueButton = page.getByRole('button', { name: 'Continue', exact: true });
    this.lockedSetupSteps = page.getByRole('list', { name: 'Steps' }).getByRole('button', {
      name: /^(Overhead & Rates|Wash Types & Cost|SLA Configuration|Preview)/,
    });
    this.cancelSetupButton = page.getByRole('button', { name: 'Cancel setup' });

    this.addFieldButton = page.getByRole('button', { name: 'Add Field' });

    this.allTab = page.getByRole('tab', { name: /^All\s*\d/ });
    this.unassignedTab = page.getByRole('tab', { name: /^Unassigned\s*\d/ });
    this.assignedTab = page.getByRole('tab', { name: /^Assigned\s*\d/ });
    this.newRequestButton = page.getByRole('button', { name: 'New Request' });
    this.importButton = page.getByRole('button', { name: 'Import', exact: true });
    this.firstRowCheckbox = page.getByRole('checkbox', { name: /^Select row/ }).first();
    this.sendForApprovalButton = page.getByRole('button', { name: /^Send for approval/ });
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });

    this.newCostingRequestHeading = page.getByRole('heading', {
      level: 1,
      name: 'New Costing Request',
    });
    // Named by their field labels ("Sample request *", "Existing Techpack *").
    this.sampleRequestPicker = page.getByRole('button', { name: /^Sample request/ });
    this.techpackPicker = page.getByRole('button', { name: /^Existing Techpack/ });

    this.pickerOptions = page.getByRole('option');

    this.importHeading = page.getByRole('heading', {
      level: 1,
      name: 'Import costings from Excel',
    });
    // exact: the drop zone around it is a button whose name ends in "Choose file" too.
    this.chooseFileButton = page.getByRole('button', { name: 'Choose file', exact: true });
    this.importUploadStep = page.getByRole('button', { name: /^1 · Upload/ });

    this.costSheetTabs = page.getByRole('tablist').getByRole('tab');

    this.newTab = page.getByRole('tab', { name: /^New\s*\d/ });
    this.inProgressTab = page.getByRole('tab', { name: /^In Progress\s*\d/ });
    this.submittedTab = page.getByRole('tab', { name: /^Submitted\s*\d/ });
    this.confirmedTab = page.getByRole('tab', { name: /^Confirmed\s*\d/ });
    this.overdueTab = page.getByRole('tab', { name: /^Overdue\s*\d/ });
    this.searchBox = page.getByRole('textbox', { name: 'Search' });
    this.firstFyrIdButton = page.getByRole('button', { name: /^FYR-\d{4}-\d+$/ }).first();
    this.firstFcrIdButton = page.getByRole('button', { name: /^FCR-\d{4}-\d+$/ }).first();

    this.pendingTab = page.getByRole('tab', { name: /^Pending\s*\d/ });
    this.cmApprovedTab = page.getByRole('tab', { name: /^CM Approved\s*\d/ });
    this.commonDetailsHeading = page.getByRole('heading', { name: 'Common details' });
    this.costingSummaryHeading = page.getByRole('heading', { name: /^Costing summary/ });

    this.savedViewsButton = page.getByRole('button', { name: 'Saved views' });
    this.downloadButton = page.getByRole('button', { name: 'Download' });
  }

  /** A screen's link in the Costing left navigation, e.g. "Approvals". */
  navLink(label: string): Locator {
    return this.page.getByRole('link', { name: label, exact: true }).filter({ visible: true });
  }

  /** A screen's own <h1>, e.g. "Fabric Yield Requests". */
  screenHeading(name: string): Locator {
    return this.page.getByRole('heading', { level: 1, name, exact: true });
  }

  /**
   * A plain-text cell (the third: after the row checkbox and Buyer) of a
   * list's first row — clicking it opens the row, and it holds no button
   * of its own (e.g. the Costing list's "Assign analyst").
   */
  get firstRowCell(): Locator {
    return this.tableRows.first().getByRole('cell').nth(2);
  }
}
