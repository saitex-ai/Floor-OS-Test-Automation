import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for the Techpack canvas (`/techpacks/canvas/{id}`
 * on dev, `/techpacks/{id}` on local) — the review screen landed on right
 * after creating a techpack (Classic or AI Mode), or after clicking an
 * existing row from the list. No actions or assertions here, see
 * src/pages/techpack/canvas.page.ts for those.
 */
export class CanvasLocators {
  readonly heading: Locator;
  readonly backButton: Locator;

  // Toolbar
  readonly fileViewToggle: Locator;
  readonly standardViewToggle: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageIndicatorText: Locator;
  readonly zoomOutButton: Locator;
  readonly zoomInButton: Locator;
  readonly addPinButton: Locator;
  readonly openCommentsTabButton: Locator;
  readonly hideResolvedButton: Locator;
  readonly enterFullscreenButton: Locator;
  readonly functionsButton: Locator;
  readonly reportsButton: Locator;
  readonly copyAsNewButton: Locator;
  readonly forceReleaseButton: Locator;

  // Right panel tabs
  readonly detailsTab: Locator;
  readonly commentsTab: Locator;
  readonly historyTab: Locator;

  // Techpack Details tabpanel — section headers
  readonly detailsSectionHeader: Locator;
  readonly headersSectionHeader: Locator;
  readonly uploadsSectionHeader: Locator;
  readonly operationsSectionHeader: Locator;
  readonly operationsTable: Locator;
  readonly headersApprovalSummary: Locator;

  readonly commentsTabEmptyState: Locator;

  // Pin/annotation flow (toolbar "Add Pin") — confirmed live via ariaSnapshot
  // dumps, not guessed. See canvas.page.ts's postPinAnnotation() doc
  // comment for the full mechanism.
  readonly cancelPinButton: Locator;
  readonly annotationDialog: Locator;
  readonly annotationOverlay: Locator;

  // Multi-user presence widget (top-right of the toolbar) — see
  // test-cases/techpack/multi-user-presence.md for the full DOM structure
  // this was confirmed against.
  readonly ownIdentityLabel: Locator;
  readonly otherParticipantsIndicator: Locator;

  // "Canvas not found" state — shown for a malformed or well-formed-but-
  // nonexistent canvas ID (`/techpacks/canvas/{id}`) instead of the empty
  // canvas + developer hint originally reported. ClickUp z941abxb80,
  // confirmed fixed 2026-09-29/30 — see CanvasPage.gotoCanvasById()'s doc
  // comment.
  readonly canvasNotFoundHeading: Locator;
  readonly loadErrorText: Locator;
  readonly openingCanvasText: Locator;
  readonly techpackUploadTag: Locator;
  readonly reExtractButton: Locator;
  readonly askAboutTechpackButton: Locator;
  readonly anyReExtractText: Locator;
  readonly anyAskAboutTechpackText: Locator;
  readonly canvasNotFoundMessage: Locator;

  // Force Release confirmation dialog + resulting banner. Real shape
  // confirmed live via a real ariaSnapshot() dump (not guessed): dialog
  // accessible name "Force-release canvas lock", a "Reason" textbox, a
  // "Type RELEASE to confirm" textbox (placeholder "RELEASE"), and
  // Cancel/"Release lock"/Close buttons — "Release lock" starts disabled.
  // ClickUp z941abxb3u. See CanvasPage.forceRelease()'s doc comment.
  readonly forceReleaseDialog: Locator;
  readonly forceReleaseReasonInput: Locator;
  readonly forceReleaseConfirmInput: Locator;
  readonly forceReleaseConfirmButton: Locator;
  readonly forceReleaseCancelButton: Locator;
  // Real, known cosmetic bug: this banner shows a raw backend user UUID
  // instead of the releasing user's resolved display name — the same UUID
  // already found unresolved in the Export CSV bug (techpack-list.md's own
  // TC:19). See canvas-review.md's TC:19 notes.
  readonly forceReleaseBanner: Locator;

  // Approve confirmation dialog (Functions > Approve). Real shape
  // confirmed live via a real ariaSnapshot() dump: dialog accessible name
  // "Approve techpack", a "reviewed and approve" checkbox gating its own
  // "Approve techpack" button (starts disabled), plus Cancel/Close.
  // ClickUp z941abxb7p. See CanvasPage.approveTechpack()'s doc comment.
  readonly approveDialog: Locator;
  readonly approveConfirmCheckbox: Locator;
  readonly approveConfirmButton: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Techpack canvas', level: 1 });
    this.backButton = page.getByRole('button', { name: 'Back to techpacks' });

    this.fileViewToggle = page.getByRole('button', { name: 'File', exact: true });
    this.standardViewToggle = page.getByRole('button', { name: 'Standard', exact: true });
    this.previousPageButton = page.getByRole('button', { name: 'Previous page' });
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.pageIndicatorText = page.getByText(/Page \d+ of/);
    this.zoomOutButton = page.getByRole('button', { name: 'Zoom out' });
    this.zoomInButton = page.getByRole('button', { name: 'Zoom in' });
    this.addPinButton = page.getByRole('button', { name: 'Add Pin' });
    this.openCommentsTabButton = page.getByRole('button', { name: 'Open comments tab' });
    this.hideResolvedButton = page.getByRole('button', { name: 'Hide resolved' });
    this.enterFullscreenButton = page.getByRole('button', { name: 'Enter fullscreen' });
    this.functionsButton = page.getByRole('button', { name: 'Functions' });
    this.reportsButton = page.getByRole('button', { name: 'Reports' });
    this.copyAsNewButton = page.getByRole('button', { name: 'Copy as New' });
    this.forceReleaseButton = page.getByRole('button', { name: 'Force release' });

    this.detailsTab = page.getByRole('tab', { name: 'Techpack Details' });
    // The Comments tab's own accessible name grows a live count badge once
    // at least one pin annotation exists ("Comments" -> "Comments (1)") —
    // confirmed live by submitting a pin annotation and re-reading the tab.
    // A per-field comment (postFieldComment()) does NOT add this badge in
    // the same way (TC:7 posts one and still matches plain "Comments"),
    // so the count looks scoped to canvas pins specifically, not every
    // comment. A prefix match keeps this locator valid in both states.
    this.commentsTab = page.getByRole('tab', { name: /^Comments/ });
    this.historyTab = page.getByRole('tab', { name: 'History' });

    this.detailsSectionHeader = page.getByRole('button', { name: 'Details', exact: true });
    this.headersSectionHeader = page.getByRole('button', { name: 'Headers', exact: true });
    this.uploadsSectionHeader = page.getByRole('button', { name: 'Uploads', exact: true });
    this.operationsSectionHeader = page.getByRole('button', { name: 'Operations', exact: true });
    // Scoped by content (not position) since it's the only table on the
    // page with these labels. Note this is genuinely the same real
    // Operations table even when it has far more than 4 rows — see
    // canvas-review.md's notes: a fully-approved ("Open") techpack showed
    // 34 checkboxes here instead of the original 4, which looks like the
    // section becoming editable (more service types selectable) once
    // Open, not a locator/scoping bug.
    this.operationsTable = page
      .getByRole('table')
      .filter({ hasText: 'EMBROIDRY' })
      .filter({ hasText: 'WASHTYPE' });
    // Matches either shape: "N approved / M pending for approval" when at
    // least one field is still pending, or just "N approved" when every
    // field auto-approved on creation — see canvas-review.md's notes on
    // this per-record variability. Callers check .innerText() for whether
    // "pending for approval" is also present rather than assuming it is.
    this.headersApprovalSummary = page.getByText(/approved/);

    this.commentsTabEmptyState = page.getByText('No comments yet');

    // "Add Pin" is a toggle: clicking it renames the SAME button to
    // "Cancel Pin" (pressed) to enter pin-placement mode — confirmed live,
    // not a separate button. addPinButton (declared above) only matches
    // the pre-click state; this one is for the active-placement state.
    this.cancelPinButton = page.getByRole('button', { name: 'Cancel Pin' });
    // The dialog's own accessible name is "Annotation" (confirmed via a
    // real ariaSnapshot() dump), but scoping by its visible content text
    // instead ("New annotation on page N") is what was actually proven
    // live during exploration — kept as the filter to match that.
    this.annotationDialog = page.getByRole('dialog').filter({ hasText: 'New annotation on page' });
    this.annotationOverlay = page.getByRole('region', { name: 'Annotation overlay' });

    // This session's own identity is always shown, e.g. "Signed in as
    // Alice". The "other participants" container is ALSO always present
    // in the DOM, even alone — its own aria-label reads "0 other
    // participants, plus you" in that case (confirmed live via a real
    // failure dump; an earlier ariaSnapshot() capture had simply not
    // printed this particular wrapper when the count was zero, which
    // looked like — but wasn't — the element being absent). Read
    // otherParticipantsCount() rather than checking this locator's own
    // visibility/count.
    this.ownIdentityLabel = page.getByLabel(/^Signed in as /);
    this.otherParticipantsIndicator = page.getByLabel(/other participant/i);

    // Confirmed live via a real ariaSnapshot() dump: "Canvas not found" is
    // rendered as a plain paragraph, not a heading role — getByRole('heading')
    // never matches it despite looking visually like a heading (same class
    // of surprise as this module's own "Techpack canvas" H1, which IS a
    // real heading but renders at zero visible width — the opposite
    // mismatch, same lesson: don't assume ARIA role from visual styling).
    this.canvasNotFoundHeading = page.getByText('Canvas not found', { exact: true });
    this.loadErrorText = page.getByText('Could not load techpack');
    this.openingCanvasText = page.getByText('Opening canvas…');
    this.techpackUploadTag = page.getByText('TECHPACK', { exact: true });
    // AI-Mode-only toolbar actions (see canvas-review.md TC:15/TC:16).
    this.reExtractButton = page.getByRole('button', { name: 'Re-extract' });
    this.askAboutTechpackButton = page.getByRole('button', { name: 'Ask about this techpack' });
    this.anyReExtractText = page.getByText(/re-?extract/i);
    this.anyAskAboutTechpackText = page.getByText(/ask about this techpack/i);
    this.canvasNotFoundMessage = page.getByText(
      'No techpack file matches this link. It may have been deleted, or the URL is wrong.',
    );

    this.forceReleaseDialog = page.getByRole('dialog', { name: 'Force-release canvas lock' });
    this.forceReleaseReasonInput = this.forceReleaseDialog.getByRole('textbox', { name: 'Reason' });
    this.forceReleaseConfirmInput = this.forceReleaseDialog.getByRole('textbox', {
      name: 'Type RELEASE to confirm',
    });
    this.forceReleaseConfirmButton = this.forceReleaseDialog.getByRole('button', {
      name: 'Release lock',
      exact: true,
    });
    this.forceReleaseCancelButton = this.forceReleaseDialog.getByRole('button', {
      name: 'Cancel',
      exact: true,
    });
    this.forceReleaseBanner = page.getByText(/force-released by/i);

    this.approveDialog = page.getByRole('dialog', { name: 'Approve techpack' });
    this.approveConfirmCheckbox = this.approveDialog.getByRole('checkbox', {
      name: 'I have reviewed this techpack and approve it.',
    });
    this.approveConfirmButton = this.approveDialog.getByRole('button', {
      name: 'Approve techpack',
      exact: true,
    });
  }

  /**
   * Locates a field's row (in either the Details or Headers section) by walking up from its
   * label text to the shared `<li>` — same "find the row from an unlinked label" technique used
   * throughout this module's other page objects, confirmed live via a real click revealing the
   * inline comment input directly below the right row.
   */
  /** Any text on the canvas — a posted comment, a pin note, a toast. */
  text(content: string | RegExp): Locator {
    return this.page.getByText(content);
  }

  fieldRow(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('xpath=ancestor::li[1]');
  }

  /** Locates an uploaded file's row in the Uploads section by its file name. */
  uploadedFile(fileName: string): Locator {
    return this.page.getByText(fileName, { exact: false });
  }

  /**
   * Another currently-viewing user's avatar button, by their full display
   * name (e.g. "Bob QCLead") — its own accessible name, unambiguous, no
   * substring-collision risk. Scoped inside `otherParticipantsIndicator`.
   */
  otherParticipantAvatar(fullName: string): Locator {
    return this.otherParticipantsIndicator.getByRole('button', { name: fullName });
  }
}
