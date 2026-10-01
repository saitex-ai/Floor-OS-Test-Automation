import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { CanvasLocators } from '../../locators/techpack/canvas.locators';

/**
 * Techpack canvas (`/techpacks/canvas/{id}` on dev, `/techpacks/{id}` on local) — the review
 * screen landed on right after creating a techpack (Classic or AI Mode), or after clicking an
 * existing row from the list. Owned by the Techpack QA.
 *
 * Element locators live in CanvasLocators (`this.locators`) — this class only holds
 * flows/actions/assertions built on top of them.
 *
 * Unlike the other Techpack page objects, this one has no `openFromX()` navigation method of its
 * own — it's always reached as a side effect of another action (a successful
 * `CreateTechpackPage.create()`, `AiModeCopilotPage`'s draft creation, or clicking a list row),
 * so tests wrap this page object around the *same* `page` right after one of those, rather than
 * navigating here directly.
 *
 * Real lifecycle, confirmed via the Functions menu's own disabled-reason text (not guessed):
 * Draft/Open -> (every Headers field individually approved) -> Open -> Approved -> (Create new
 * Rev / Lock). The Reports menu's "Techpack Report" and the Functions menu's "Create new
 * Techpack Rev"/"Lock techpack" are reliably gated on "Approved" regardless of a fresh record's
 * exact sub-state. What is NOT reliably predictable: how many Headers fields end up pending on a
 * given creation, or whether that correlates with the record's Status (Draft vs Open) — live
 * evidence directly contradicted an initial assumption twice. See
 * `test-cases/techpack/canvas-review.md`'s notes for the full account; don't reintroduce a
 * pending-count-based prediction without new evidence.
 */
export class CanvasPage extends BasePage {
  readonly locators: CanvasLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new CanvasLocators(page);
  }

  /**
   * The "Techpack canvas" H1 is real in the accessible tree but renders at
   * effectively zero visible width in this layout (confirmed: `toBeVisible()`
   * reported "hidden" every poll across a real 30s window while the rest of
   * the page was fully interactive) — the Techpack Details tab is the
   * reliable "has this loaded" signal instead.
   */
  async expectLoaded(timeout = 30_000): Promise<void> {
    await expect(this.locators.detailsTab).toBeVisible({ timeout });
    await expect(this.locators.detailsSectionHeader).toBeVisible({ timeout });
  }

  /** Reads a field row's full text (label + value together, e.g. "Status Draft"). */
  async fieldRowText(label: string): Promise<string> {
    return this.locators.fieldRow(label).innerText();
  }

  /** 'Approved' or 'Pending' — read from the field row's own status icon (img alt text). */
  async headerFieldStatus(label: string): Promise<'Approved' | 'Pending'> {
    const approved = await this.locators.fieldRow(label).locator('img[alt="Approved"]').count();
    return approved > 0 ? 'Approved' : 'Pending';
  }

  async openFieldComment(label: string): Promise<void> {
    await this.locators.fieldRow(label).getByRole('button', { name: 'Comments' }).click();
  }

  /**
   * Opens a field's inline comment box, types and submits a comment. The input's placeholder
   * may render its trailing ellipsis as a single `…` glyph rather than three literal periods —
   * matching on a shorter substring (no ellipsis at all) sidesteps a silent mismatch either way.
   *
   * Submitting is a dedicated icon-only "Send comment" button (aria-label only, no visible
   * text) next to the input — confirmed live via outerHTML/aria-label inspection, not guessed.
   * Pressing Enter does NOT submit; it only inserts a newline into the textarea (confirmed via
   * an earlier strict-mode error dump showing the textarea's own value ending in a literal
   * newline character after Enter) — a comment "submitted" that way is never actually persisted,
   * it just sits unsent in the box, which made an earlier version of this method pass its own
   * inline visibility check for entirely the wrong reason.
   */
  async postFieldComment(label: string, text: string): Promise<void> {
    const row = this.locators.fieldRow(label);
    await this.openFieldComment(label);
    const input = this.page.getByPlaceholder('Add a comment on this field');
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.fill(text);
    await row.getByRole('button', { name: 'Send comment' }).click();
    // Submitting is an async round-trip — wait for the comment to actually
    // render before returning, rather than assuming the click was instant.
    await this.page.getByText(text).first().waitFor({ state: 'visible', timeout: 15_000 });
  }

  async functionsMenuItems(): Promise<string[]> {
    await this.locators.functionsButton.click();
    const items = await this.page.getByRole('menuitem').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return items;
  }

  /**
   * Opens the Functions menu and clicks whichever menu item's accessible
   * name matches `namePattern`, if it exists and is actually clickable.
   * Returns which of the three happened rather than throwing, since a
   * fresh record's exact Draft/Open sub-state (and therefore which
   * lifecycle action is currently actionable) isn't reliably predictable
   * up front — see this class's own doc comment. A gated menu item is a
   * real Radix `disabled` menuitem (not just styled to look disabled):
   * Playwright's actionability check on `.click()` times out against it
   * rather than silently no-op'ing, which is what 'disabled' below
   * detects.
   */
  async clickFunctionsMenuItemIfEnabled(
    namePattern: RegExp,
    timeout = 8_000,
  ): Promise<'clicked' | 'disabled' | 'not-found'> {
    // Bounded on purpose: an unbounded .click() here can wait on the
    // test's own overall timeout (confirmed live — a lifecycle-progression
    // exploration run once hung 30+ minutes on this exact line after an
    // "Approve" click triggered a real page reload of the canvas that took
    // longer than expected to settle) instead of failing fast and letting
    // the caller retry/investigate.
    await this.locators.functionsButton.click({ timeout: 45_000 });
    const item = this.page.getByRole('menuitem', { name: namePattern }).first();
    const exists = await item.count();
    if (!exists) {
      await this.page.keyboard.press('Escape');
      return 'not-found';
    }
    try {
      await item.click({ timeout });
      return 'clicked';
    } catch {
      await this.page.keyboard.press('Escape').catch(() => {});
      return 'disabled';
    }
  }

  async reportsMenuItems(): Promise<string[]> {
    await this.locators.reportsButton.click();
    const items = await this.page.getByRole('menuitem').allInnerTexts();
    await this.page.keyboard.press('Escape');
    return items;
  }

  /** Reads the Techpack Code shown in the Details section (distinct from the toolbar/page title). */
  async detailsTechpackCode(): Promise<string> {
    return this.locators
      .fieldRow('Techpack Code')
      .getByText(/^TP\d+-\d+$/)
      .innerText();
  }

  /** Locates an uploaded file's row in the Uploads section by its file name. */
  uploadedFile(fileName: string): Locator {
    return this.locators.uploadedFile(fileName);
  }

  /**
   * Clicks somewhere inside the document viewer pane — computed relative to
   * `main`'s own real bounding box (not a hardcoded absolute pixel pair),
   * so this isn't tied to one specific viewport size. Confirmed live: a
   * point well inside the left ~60% of `main` (offset 300,300 from its
   * top-left) reliably lands on the rendered PDF content, not the
   * toolbar or the right-hand panel.
   */
  private async clickDocumentViewer(offsetX = 300, offsetY = 300): Promise<void> {
    const main = this.page.locator('main').first();
    const box = await main.boundingBox();
    if (!box)
      throw new Error('Could not find the canvas main content area to click for pin placement');
    await this.page.mouse.click(box.x + offsetX, box.y + offsetY);
  }

  /**
   * Full "Add Pin" flow: enters pin-placement mode, clicks a point in the
   * document viewer (opens a "New annotation on page N" dialog), types a
   * note, and submits.
   *
   * Confirmed live, not guessed:
   * - "Add Pin" is a toggle on the SAME button — clicking it renames it to
   *   "Cancel Pin" (pressed) rather than opening a separate control.
   * - Clicking the document viewer while in placement mode opens a real
   *   `dialog` (accessible name "Annotation", visible text "New annotation
   *   on page N") with a `textbox` (visible placeholder "Type your
   *   note…" — note the single "…" glyph, not three periods, matching
   *   this module's other comment inputs) and a "Submit" button that
   *   stays disabled until the textbox has content.
   * - **Pin-placement mode does NOT auto-exit after a successful
   *   submit** — the toolbar button stays "Cancel Pin", so multiple pins
   *   can be dropped in a row without re-clicking "Add Pin" each time.
   *   Call cancelPinMode() explicitly afterward to leave placement mode.
   * - The new pin renders as a numbered marker directly on the document
   *   (confirmed via screenshot: a circular "1" badge at the clicked
   *   point) and a `region "Annotation overlay"` gains a
   *   `button "N Annotation by <author>"`.
   * - The pin's text also surfaces in the aggregated Comments tab, whose
   *   own tab name grows a count badge ("Comments" -> "Comments (1)") —
   *   see commentsTab's own doc comment for why per-field comments don't
   *   do the same.
   */
  /**
   * Waits until the PDF viewer has loaded the document: its page indicator
   * only shows the total ("Page 1 of 33") once it has, and reads "Page 1 of …"
   * while still loading. A pin click at a fixed point needs real content under it.
   */
  async waitForDocumentRendered(timeout = 45_000): Promise<void> {
    await expect(this.locators.pageIndicatorText).toHaveText(/Page \d+ of \d+/, { timeout });
  }

  async postPinAnnotation(text: string): Promise<void> {
    await this.locators.addPinButton.click();
    await expect(this.locators.cancelPinButton).toBeVisible({ timeout: 10_000 });
    await this.clickDocumentViewer();
    await expect(this.locators.annotationDialog).toBeVisible({ timeout: 10_000 });
    await this.locators.annotationDialog.getByRole('textbox').fill(text);
    await this.locators.annotationDialog.getByRole('button', { name: 'Submit' }).click();
    await expect(this.locators.annotationDialog).toBeHidden({ timeout: 10_000 });
  }

  /**
   * Exits pin-placement mode via "Cancel Pin" without placing a pin.
   * Confirmed live: this cleanly reverts the toolbar button back to
   * "Add Pin" and leaves the Comments tab in its prior (no new pin) state
   * — clicking "Add Pin" then immediately "Cancel Pin" is a safe no-op.
   */
  async cancelPinMode(): Promise<void> {
    await this.locators.cancelPinButton.click();
  }

  /** Reads "N" out of otherParticipantsIndicator's own "N other participant(s), plus you" label. */
  async otherParticipantsCount(): Promise<number> {
    const label = await this.locators.otherParticipantsIndicator.getAttribute('aria-label');
    const match = label?.match(/(\d+) other participant/);
    if (!match) throw new Error(`Could not read a participant count out of aria-label "${label}"`);
    return Number(match[1]);
  }

  /**
   * Navigates directly to a canvas URL by ID (not via a list-row click) —
   * used for TC:17's invalid-canvas-ID checks. Confirmed live 2026-09-29/30
   * on uat: both a malformed ID (e.g. "not-a-uuid") and a syntactically-
   * valid-but-nonexistent UUID resolve to this same route shape
   * (`/techpacks/canvas/{id}`, the dev/uat shape — see this class's own doc
   * comment on the dev-vs-local route difference) and both now show a real
   * "Canvas not found" page. This is ClickUp z941abxb80 — a previously-
   * reported "opens an empty canvas with a developer hint instead of an
   * error" bug — now confirmed fixed rather than reproduced.
   * gotoAuthenticated() handles the login gate the same as every other
   * navigation in this module.
   */
  async gotoCanvasById(id: string): Promise<void> {
    await this.gotoAuthenticated(`/techpacks/canvas/${id}`);
  }

  /** Asserts the "Canvas not found" state (invalid/nonexistent canvas ID) is shown. */
  async expectNotFound(): Promise<void> {
    await expect(this.locators.canvasNotFoundHeading).toBeVisible();
    await expect(this.locators.canvasNotFoundMessage).toBeVisible();
    await expect(this.locators.backButton).toBeVisible();
  }

  /**
   * TC:17's real check: navigates to an invalid canvas ID and confirms
   * "Canvas not found", with a generous timeout to match this app's
   * established cold-start patterns elsewhere.
   *
   * Debugging note kept deliberately, since it was a real dead end worth
   * not repeating: an earlier version of this method saw real, repeated
   * failures against uat and initially suspected a transient "Access
   * restricted — You do not have permission to view this canvas." state
   * flashing briefly after navigation (a real, separate, already-
   * documented intermittent access-service degradation elsewhere in this
   * app — see environment-notes.md). That theory was wrong: a failure
   * screenshot showed "Canvas not found" rendered correctly on screen at
   * the exact moment the assertion timed out — the actual bug was this
   * class's own `canvasNotFoundHeading` locator using
   * `getByRole('heading', ...)`, when a real ariaSnapshot() dump showed
   * "Canvas not found" is a plain paragraph, not a heading role (fixed in
   * CanvasLocators). No retry/race logic was needed once that was fixed.
   */
  async expectNotFoundForInvalidId(id: string, timeout = 30_000): Promise<void> {
    await this.gotoCanvasById(id);
    await expect(this.locators.canvasNotFoundHeading).toBeVisible({ timeout });
    await expect(this.locators.canvasNotFoundMessage).toBeVisible();
    await expect(this.locators.backButton).toBeVisible();
  }

  /** Accessible name of whichever right-panel tab currently has `aria-selected="true"`. */
  async activeSidebarTabName(): Promise<string> {
    const text = await this.page.getByRole('tab', { selected: true }).innerText();
    return text.trim();
  }

  /**
   * Full Force Release flow: opens the confirmation dialog, fills Reason +
   * the literal "RELEASE" confirm text, and clicks "Release lock" until the
   * banner actually appears. Confirmed live (2026-09-29/30, ClickUp
   * z941abxb3u): the dialog's own "Release lock" button gates on BOTH
   * fields having real content — neither alone is enough, and there's no
   * business rule restricting *who* can force-release whose lock (per the
   * user, confirmed intended), so this doesn't check permissions, only the
   * flow + gating themselves. Real dialog shape (ariaSnapshot-confirmed,
   * not guessed): dialog "Force-release canvas lock" > textbox "Reason" +
   * textbox "Type RELEASE to confirm" (placeholder "RELEASE") +
   * Cancel/"Release lock"/Close.
   *
   * **Retries on a real, separate transient backend error, confirmed live
   * 2026-09-30**: clicking "Release lock" can show "Could not release. Try
   * again or refresh the page." inside the still-open dialog (both fields
   * stay filled) instead of releasing — not every attempt, and simply
   * clicking "Release lock" again resolved it live every time it was hit.
   * This is a release-action-specific backend hiccup, unrelated to the
   * gating logic itself.
   */
  async forceRelease(reason: string, maxAttempts = 3): Promise<void> {
    await this.locators.forceReleaseButton.click();
    await expect(this.locators.forceReleaseDialog).toBeVisible({ timeout: 10_000 });
    await expect(this.locators.forceReleaseConfirmButton).toBeDisabled();
    await this.locators.forceReleaseReasonInput.fill(reason);
    await expect(this.locators.forceReleaseConfirmButton).toBeDisabled();
    await this.locators.forceReleaseConfirmInput.fill('RELEASE');
    await expect(this.locators.forceReleaseConfirmButton).toBeEnabled({ timeout: 5_000 });

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.locators.forceReleaseConfirmButton.click();
      const outcome = await Promise.race([
        this.locators.forceReleaseBanner
          .waitFor({ state: 'visible', timeout: 10_000 })
          .then((): 'released' => 'released')
          .catch(() => null),
        this.page
          .getByText('Could not release')
          .waitFor({ state: 'visible', timeout: 10_000 })
          .then((): 'transient-error' => 'transient-error')
          .catch(() => null),
      ]);
      if (outcome === 'released') return;
      if (attempt === maxAttempts - 1) {
        throw new Error(
          `forceRelease: no force-release banner after ${maxAttempts} attempts ` +
            `(last outcome: ${outcome ?? 'neither the banner nor an error appeared'})`,
        );
      }
    }
  }

  /**
   * Opens Functions > Approve and confirms via the real "Approve techpack"
   * dialog (ariaSnapshot-confirmed shape: heading "Approve techpack", a
   * "I have reviewed this techpack and approve it." checkbox gating its own
   * "Approve techpack" button, Cancel/Close). Returns 'not-available' if
   * Functions doesn't currently offer an enabled Approve — e.g. the record
   * hasn't reached Open yet, or a Headers field is still pending (see this
   * module's own doc comment on why a fresh record's exact sub-state isn't
   * reliably predictable). If "Move to Open" is currently enabled (all
   * Headers already approved, just not yet moved), this takes that step
   * first so Approve has a chance to appear, matching the real user flow.
   */
  async approveTechpack(): Promise<'approved' | 'not-available'> {
    const moveResult = await this.clickFunctionsMenuItemIfEnabled(/Move to Open/);
    let approveResult = await this.clickFunctionsMenuItemIfEnabled(/^Approve/);
    // Right after "Move to Open" the status change can take a moment to land,
    // so Approve may still read disabled on the first look — retry a few times.
    for (let i = 0; moveResult === 'clicked' && approveResult !== 'clicked' && i < 3; i++) {
      approveResult = await this.clickFunctionsMenuItemIfEnabled(/^Approve/);
    }
    if (approveResult !== 'clicked') return 'not-available';
    await expect(this.locators.approveDialog).toBeVisible({ timeout: 10_000 });
    await this.locators.approveConfirmCheckbox.check();
    await expect(this.locators.approveConfirmButton).toBeEnabled({ timeout: 5_000 });
    await this.locators.approveConfirmButton.click();
    return 'approved';
  }
}
