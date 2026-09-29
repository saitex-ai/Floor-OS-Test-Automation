import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the "Lead Qualification screen" (CRM, Sprint 4
 * user story) — no actions or assertions here, see
 * src/pages/crm/lead-qualification.page.ts for those.
 *
 * Confirmed against the running app (2026-09-25):
 * - It's a sub-tab of Customer Details ("Lead Qualification", alongside
 *   Overview/Biz Docs/Communication/Contacts), not a separate screen.
 * - The review form is a single, ungated set of fields (Department*,
 *   Manager*, Manager's score* 1-10, Manager's review*) with its own
 *   "Save" button — every saved review appends to a plain list below (no
 *   `<section>`/dialog wrapper), one row per submission.
 * - The four Department options are exactly: Fabric Mill, Merchandise,
 *   Costing, Sales — matching TC:2's "four chips" premise.
 * - Contradicting that premise, though: "Convert Lead to Qualified Lead"
 *   enables after the FIRST saved review, for ANY one department — not
 *   after all four. Confirmed directly (saved one review, checked the
 *   button was no longer `disabled`).
 * - The Manager combobox is **not actually filtered by Department**,
 *   contradicting TC:1's "select a manager filtered to that department"
 *   premise: the same 5 managers (Alice Planner, Banupriya Palanivel, CRM
 *   Manager, SamuelRaj Suresh, Sathish Nagarajan) appear regardless of
 *   which department is selected — confirmed directly by opening the
 *   Manager dropdown after picking each of the 4 departments in turn.
 * - The Lead Qualification tab button **does not render at all** once a
 *   Customer's CRM Stage has moved past "Lead" (confirmed for "Qualified
 *   Lead" and "Prospect") — it isn't merely locked/gated with an
 *   empty-state message, it's absent from the tab strip entirely. This
 *   matters for TC:3 — see lead-qualification.page.ts's class doc.
 * - Submitting the top-of-form fields again for a department that
 *   **already has a saved review creates a second, duplicate row** — it
 *   does NOT edit the existing one. The only way to edit a review in
 *   place (matching TC:1's expectation) is to click that row's own "Edit
 *   review" button, which turns the row itself into an inline edit widget
 *   (score radiogroup + review textbox + Cancel/Save, no Department/Manager
 *   fields) — confirmed this widget is scoped to a `div.border-t...`
 *   ancestor of its own Cancel button (a second, unrelated
 *   `radiogroup`/`textbox` pair to the top form's, so the top-level
 *   `scoreRadiogroup`/`reviewTextbox` locators become ambiguous once a row
 *   is being edited — use `editingRowContainer()` to scope into it).
 * - The disabled Convert button (zero reviews saved) IS wrapped in a real
 *   Radix/shadcn tooltip (`data-slot="tooltip-trigger"`) — confirmed
 *   `getByRole('tooltip')` has zero matches before hovering and exactly
 *   one after, reading "At least one Manager's Review and Score must
 *   exist." (a plain ASCII apostrophe) — not "all four department
 *   reviews are required" as TC:5's ClickUp text implies. `title`/
 *   `aria-describedby` on the button itself are both null; the tooltip
 *   only shows up in the accessibility tree on hover.
 * - Logged in as the seeded Executive user (`fayaz.ahmad`, role "Member"),
 *   the Convert button is **not present at all** (not merely disabled) —
 *   replaced by the explanatory text "Conversion is limited to Managers.
 *   You can read the dossier and add reviews, but not convert this lead."
 *   Confirmed the Executive can still submit reviews.
 * - No green completion banner, stage-log entry, or in-app notification
 *   was observed anywhere after a real conversion (Lead Qualification tab,
 *   Customer Overview tab, or the shell's notification panel) — see
 *   lead-qualification.page.ts's class doc for what TC:2 fixmes.
 */
export class LeadQualificationLocators {
  readonly tabButton: Locator;

  readonly departmentCombobox: Locator;
  readonly managerCombobox: Locator;
  readonly scoreRadiogroup: Locator;
  readonly reviewTextbox: Locator;
  readonly saveReviewButton: Locator;
  readonly departmentSelectError: Locator;
  readonly managerSelectError: Locator;
  readonly scoreError: Locator;
  readonly reviewError: Locator;

  readonly reviewsSummaryText: Locator;
  readonly editReviewButtons: Locator;

  readonly convertButton: Locator;
  readonly convertRequirementNote: Locator;
  readonly convertRestrictionNote: Locator;

  readonly noDossierHeading: Locator;
  readonly noDossierParagraph: Locator;

  constructor(private readonly page: Page) {
    this.tabButton = page.getByRole('button', { name: 'Lead Qualification', exact: true });

    this.departmentCombobox = page.getByRole('combobox', { name: 'Department', exact: true });
    this.managerCombobox = page.getByRole('combobox', { name: 'Manager', exact: true });
    this.scoreRadiogroup = page.getByRole('radiogroup', { name: "Manager's score" });
    this.reviewTextbox = page.getByRole('textbox', { name: "Manager's review" });
    this.saveReviewButton = page.getByRole('button', { name: 'Save', exact: true });
    this.departmentSelectError = page.getByText('Select a department', { exact: true });
    this.managerSelectError = page.getByText('Select a manager', { exact: true });
    this.scoreError = page.getByText('Score out of 10 is required', { exact: true });
    this.reviewError = page.getByText("Manager's review is required", { exact: true });

    // "N review(s) saved. Any manager may add another..." / "No reviews
    // yet. Any manager may review, for any department." — same text node,
    // just a different count in front.
    this.reviewsSummaryText = page.getByText(/review\(s\) saved|No reviews yet/);
    // Newest-first (confirmed directly) — .first() is the most recently
    // saved/edited row.
    this.editReviewButtons = page.getByRole('button', { name: 'Edit review' });

    this.convertButton = page.getByRole('button', { name: 'Convert Lead to Qualified Lead' });
    // Only appears in the accessibility tree once the button is actually
    // hovered (a real Radix/shadcn tooltip, not an always-visible caption
    // — confirmed directly, see the class doc above).
    this.convertRequirementNote = page.getByRole('tooltip');
    this.convertRestrictionNote = page.getByText(
      'Conversion is limited to Managers. You can read the dossier and add reviews, but not convert this lead.',
    );

    this.noDossierHeading = page.getByRole('heading', { name: 'No dossier for this account yet' });
    this.noDossierParagraph = page.getByText('Nothing has analysed this account.');
  }

  scoreRadio(value: number): Locator {
    return this.scoreRadiogroup.getByRole('radio', { name: String(value), exact: true });
  }

  /**
   * The inline edit widget a review row turns into after clicking its own
   * "Edit review" button — has its own score radiogroup + review textbox
   * + Cancel/Save, separate from (and ambiguous with, if not scoped) the
   * top-of-form new-review fields. Located via its Cancel button's
   * closest `border-t`-classed ancestor (confirmed unique — the row's
   * own container; a further-out ancestor carries `border-b` instead, a
   * different class string).
   */
  editingRowContainer(): Locator {
    return this.page
      .getByRole('button', { name: 'Cancel', exact: true })
      .locator('xpath=ancestor::div[contains(@class, "border-t")][1]');
  }
}
