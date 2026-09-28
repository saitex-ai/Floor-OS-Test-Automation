import { type Locator, type Page } from '@playwright/test';

/**
 * Techpacks list (the module landing view) — element locators only, see
 * src/pages/techpack/techpack.page.ts for actions/assertions. Confirmed
 * against the real running app (dumped via ariaSnapshot() against both a
 * local `tilt up` stack and dev.flooros.app), not guessed.
 *
 * - "New Techpack" is a split button: the main button always opens **AI
 *   Mode** (`/techpacks/new/copilot`, a Saitex AI copilot that extracts
 *   data from an uploaded PDF/Excel); the chevron next to it opens a menu
 *   to explicitly choose "AI Mode" or "Classic" (`/techpacks/new`, a
 *   manual form). See newTechpackDropdown/aiModeMenuItem/classicMenuItem.
 * - Clicking a row navigates to that techpack's canvas
 *   (`/techpacks/canvas/{id}`). As of this writing that route is
 *   noticeably slower to first-render on dev.flooros.app (10-20s+ on a
 *   cold browser profile) than locally, and locally it has intermittently
 *   404'd on `GET /api/techpacks/{id}` for records that are clearly
 *   listed and clickable — see test-cases/techpack/techpack-list.md.
 */
export class TechpackLocators {
  readonly heading: Locator;

  // Status tabs (label includes a live count, e.g. "Open 11" — match by
  // prefix so the count doesn't need to be hardcoded).
  readonly allTab: Locator;
  readonly draftTab: Locator;
  readonly openTab: Locator;
  readonly approvedTab: Locator;

  // Toolbar
  readonly searchInput: Locator;
  readonly filtersButton: Locator;
  readonly toggleCellFiltersButton: Locator;
  readonly exportCsvButton: Locator;
  readonly configureColumnsButton: Locator;
  readonly bestFitColumnsButton: Locator;
  readonly noSplitButton: Locator;
  readonly verticalSplitButton: Locator;
  readonly horizontalSplitButton: Locator;

  // Filters panel (the funnel-icon button — distinct from "Toggle cell
  // filters", which shows per-column inline inputs instead, see below)
  readonly addRuleButton: Locator;
  readonly filterMatchCountText: Locator;
  readonly applyButton: Locator;

  // Configure columns side panel
  readonly columnsPanelHeading: Locator;
  readonly showAllColumnsButton: Locator;
  readonly hideAllColumnsButton: Locator;

  // Row selection bar
  readonly itemsSelectedText: Locator;
  readonly clearSelectionButton: Locator;
  readonly compareButton: Locator;

  // New Techpack split button
  readonly newTechpackButton: Locator;
  readonly newTechpackDropdown: Locator;
  readonly aiModeMenuItem: Locator;
  readonly classicMenuItem: Locator;

  readonly table: Locator;
  readonly selectAllRowsCheckbox: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'TechPacks', level: 1 });

    this.allTab = page.getByRole('button', { name: /^All \d+/ });
    this.draftTab = page.getByRole('button', { name: /^Draft \d+/ });
    this.openTab = page.getByRole('button', { name: /^Open \d+/ });
    this.approvedTab = page.getByRole('button', { name: /^Approved \d+/ });

    this.searchInput = page.getByRole('textbox', { name: 'Search' });
    // Two distinct controls, easy to confuse: "Filters" (funnel icon)
    // opens a rule-builder panel; "Toggle cell filters" (separate icon)
    // shows per-column inline text inputs under the headers instead —
    // confirmed live, not guessed, and an unscoped name match on "Filters"
    // alone is a strict-mode violation since "Toggle cell filters" also
    // contains that substring.
    this.filtersButton = page.getByRole('button', { name: 'Filters', exact: true });
    this.toggleCellFiltersButton = page.getByRole('button', { name: 'Toggle cell filters' });
    this.exportCsvButton = page.getByRole('button', { name: 'Export CSV' });
    this.configureColumnsButton = page.getByRole('button', { name: 'Configure columns' });
    this.bestFitColumnsButton = page.getByRole('button', { name: 'Best-fit columns' });
    this.noSplitButton = page.getByRole('button', { name: 'No split' });
    this.verticalSplitButton = page.getByRole('button', { name: 'Vertical split' });
    this.horizontalSplitButton = page.getByRole('button', { name: 'Horizontal split' });

    this.addRuleButton = page.getByRole('button', { name: /Add rule/ });
    this.filterMatchCountText = page.getByText(/techpack match/);
    // Both the Filters panel and the Configure columns panel have their
    // own "Apply" button, but never open at the same time in normal use —
    // safe to keep unscoped as long as tests don't open both at once.
    this.applyButton = page.getByRole('button', { name: 'Apply', exact: true });

    this.columnsPanelHeading = page.getByRole('heading', { name: 'Columns', exact: true });
    this.showAllColumnsButton = page.getByRole('button', { name: 'Show all' });
    this.hideAllColumnsButton = page.getByRole('button', { name: 'Hide all' });

    this.itemsSelectedText = page.getByText(/item(s)? selected/);
    this.clearSelectionButton = page.getByRole('button', { name: 'Clear selection' });
    this.compareButton = page.getByRole('button', { name: 'Compare' });

    this.newTechpackButton = page.getByRole('button', { name: 'New Techpack' });
    // The chevron is a second, separate button right after "New Techpack"
    // with no accessible name of its own — "More options" is how it's
    // exposed to the accessibility tree.
    this.newTechpackDropdown = page.getByRole('button', { name: 'More options' }).first();
    this.aiModeMenuItem = page.getByRole('menuitem', { name: /AI Mode/ });
    this.classicMenuItem = page.getByRole('menuitem', { name: /Classic/ });

    this.table = page.getByRole('table');
    this.selectAllRowsCheckbox = page.getByRole('checkbox', { name: 'Select all rows' });
  }

  rowLink(techpackCode: string): Locator {
    return this.page.getByRole('link', { name: techpackCode, exact: true });
  }

  /**
   * The per-column inline filter input revealed by "Toggle cell filters" —
   * located from its own placeholder text, e.g. "Filter Techpack Code".
   */
  cellFilterInput(columnLabel: string): Locator {
    return this.page.getByPlaceholder(`Filter ${columnLabel}`);
  }

  /**
   * A column's checkbox in the "Configure columns" panel. Each one carries
   * its own unambiguous accessible name ("Toggle <label>", or "<label> is
   * always visible" for the locked Techpack Code column) — confirmed live;
   * no need for the "find the row from an unlinked label" ancestor-climbing
   * technique used elsewhere in this module, and climbing just one level
   * here isn't scoped enough (it matched all 20 columns' checkboxes at once).
   */
  columnCheckbox(columnLabel: string): Locator {
    return this.page.getByRole('checkbox', { name: `Toggle ${columnLabel}` });
  }

  /** A row checkbox by 0-based row index (not counting the header "select all" checkbox). */
  rowCheckboxAt(index: number): Locator {
    return this.page.getByRole('checkbox').nth(index + 1);
  }

  /**
   * Whether the split-view detail panel is currently showing (Vertical or
   * Horizontal split) — its "HEADER" section label is a reliable signal,
   * absent entirely in "No split"'s plain grid. Deliberately not matching
   * on the panel's "Open" button text since that string collides with the
   * "Open" status tab elsewhere on this same screen.
   *
   * This renders visibly as all-caps "HEADER" but is almost certainly
   * lowercase text styled with CSS `text-transform: uppercase` (matching
   * the visual style of its sibling labels — REVISION/CUSTOMER/SEASON/
   * TYPE/CREATED, a classic small-caps section-label pattern) — an
   * `exact: true` match on literal uppercase "HEADER" found zero DOM
   * matches despite the text being clearly visible on screen in the
   * failure screenshot, twice in a row under different dev conditions
   * (ruling out flakiness). Case-insensitive match sidesteps this
   * regardless of which element actually carries the transform.
   */
  detailPanelHeaderLabel(): Locator {
    return this.page.getByText(/^header$/i);
  }

  /** Live count badge on a status tab's own locator, e.g. "Open 11" -> the "Open" tab. */
  statusTab(tab: 'All' | 'Draft' | 'Open' | 'Approved'): Locator {
    return {
      All: this.allTab,
      Draft: this.draftTab,
      Open: this.openTab,
      Approved: this.approvedTab,
    }[tab];
  }
}
