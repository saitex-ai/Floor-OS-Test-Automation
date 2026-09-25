import { type Page, expect, test } from '@playwright/test';
import { BasePage } from '../base.page';
import { KeyMeetingNotesLocators } from '../../locators/crm/key-meeting-notes.locators';

/** Customer Detail route (confirmed elsewhere — see customer-detail.page.ts). */
const CUSTOMER_DETAIL_PATH = (customerId: string) => `/crm/customers/${customerId}`;

/**
 * "Key Meeting Notes" (CRM, Sprint 2) — covers THREE related user stories
 * that all revolve around the same conceptual record: Generate Key Meeting
 * Notes, View Key Meeting Notes, and Notify about a Key Meeting Notes. Same
 * precedent as customer-detail.page.ts covering
 * activate-customer/deactivate-customer/edit-customer-contact — one shared
 * page/locators pair, three test-case docs, three spec files.
 *
 * NOT yet confirmed against the running app — see the note atop
 * KeyMeetingNotesLocators and the three test-case docs
 * (test-cases/crm/generate-key-meeting-notes.md, view-key-meeting-notes.md,
 * notify-key-meeting-notes.md) for what's guessed vs. confirmed. Written
 * the same way log-communication.page.ts started (best-guess actions on
 * top of best-guess locators), to be corrected after the first live run
 * rather than left unautomated.
 */
export interface KeyMeetingNotesDraftDetails {
  title?: string;
}

export class KeyMeetingNotesPage extends BasePage {
  readonly locators: KeyMeetingNotesLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new KeyMeetingNotesLocators(page);
  }

  /**
   * Opens the generation dialog from an existing Customer's Details
   * screen. Confirmed directly on local (2026-09-22): Customer Details is
   * a tabbed screen (Overview is the default tab) — the Communication
   * tab has to be selected first, or generateFromCommunicationButton
   * never exists to click.
   *
   * Also confirmed directly (same run): the Communication tab itself is
   * currently an unbuilt scaffold on this environment ("Tab content —
   * not built yet."). Rather than every caller time out for 30s waiting
   * on a button that can never appear, this checks for that placeholder
   * right after switching tabs and test.skip()s with a clear reason —
   * same "don't force a false pass/fail" discipline as the fixme()s
   * elsewhere in this suite, just applied via a runtime skip instead
   * since this is an environment-state check, not a per-TC judgment call.
   */
  async openGenerateFromCustomerDetail(customerId: string): Promise<void> {
    await this.gotoAuthenticated(CUSTOMER_DETAIL_PATH(customerId));
    await this.locators.communicationTabButton.click();
    const notBuilt = await this.locators.communicationTabNotBuiltPlaceholder
      .isVisible()
      .catch(() => false);
    test.skip(
      notBuilt,
      'Communication tab is an unbuilt scaffold placeholder on this environment (confirmed 2026-09-22 — "Tab content — not built yet.")',
    );
    await this.locators.generateFromCommunicationButton.click();
  }

  async expectGenerateDialogVisible(): Promise<void> {
    await expect(this.locators.generateDialog).toBeVisible();
  }

  /**
   * Uploads a source file for generation (TC:2, Generate story). Built as
   * an in-memory buffer rather than a path on disk, so this test carries no
   * external fixture-file dependency — unconfirmed whether the real screen
   * accepts arbitrary text files or requires a specific type (audio/video
   * recording, transcript, ...).
   */
  async uploadSourceFile(
    fileName = 'meeting-notes-source.txt',
    content = 'Discussed Q3 sample approval timeline and next steps.',
  ): Promise<void> {
    await this.locators.fileUploadInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(content),
    });
  }

  async expectReadyToGenerate(): Promise<void> {
    await expect(this.locators.readyToGenerateIndicator).toBeVisible();
  }

  /**
   * Triggers AI generation of the structured draft. This only performs the
   * click and waits for the draft sections to render — it makes no claim
   * about generation *timing* or the *correctness* of generated content,
   * since neither is groundable without seeing the real feature run (see
   * TC:3 in 14-generate-key-meeting-notes.spec.ts, marked fixme).
   */
  async generateDraft(): Promise<void> {
    await this.locators.generateDraftButton.click();
    // AI generation is a real async job (the UI's own "Generating notes…"
    // copy says it keeps running even if you leave the page) — confirmed
    // against the running app taking 6-10s+ per call against a local
    // model, well past the config's default 5s expect timeout, and up to
    // 30s+ under concurrent workers all hitting the same single-threaded
    // local model at once (confirmed: this exact 30s cap was tripped under
    // 5-worker parallel runs even with the caller's test.slow() tripling
    // the OVERALL test timeout — that doesn't raise an explicit per-call
    // timeout like this one). 60s leaves headroom under test.slow()'s 90s
    // without silently swallowing a genuinely broken generation.
    await expect(this.locators.summaryOrAgendaSection).toBeVisible({ timeout: 60_000 });
  }

  async expectDraftSectionsVisible(): Promise<void> {
    await expect(this.locators.summaryOrAgendaSection).toBeVisible();
    await expect(this.locators.discussionPointsSection).toBeVisible();
    await expect(this.locators.actionItemsSection).toBeVisible();
  }

  async expectActionItemVisible(text: string, owner?: string): Promise<void> {
    await expect(this.locators.actionItem(text)).toBeVisible();
    if (owner !== undefined) await expect(this.locators.actionItemOwner(owner)).toBeVisible();
  }

  /**
   * @deprecated No such field exists — confirmed against the running app,
   * notes are read-only with an AI-composed title (see
   * generatedNoteTitle()). Kept only so a stale caller fails with a clear
   * "not visible" error instead of a missing-method one.
   */
  async fillDraft(details: KeyMeetingNotesDraftDetails): Promise<void> {
    if (details.title !== undefined) await this.locators.notesTitleInput.fill(details.title);
  }

  /** @deprecated No such step exists — generation persists the note immediately. */
  async save(): Promise<void> {
    await this.locators.saveButton.click();
  }

  /** The note's own AI-composed title, once generation has landed. */
  async generatedTitle(): Promise<string> {
    return (await this.locators.generatedNoteTitle.innerText()).trim();
  }

  async cancel(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
  }

  async expectLoggedEntryVisible(title: string): Promise<void> {
    await expect(this.locators.keyMeetingNotesEntry(title)).toBeVisible();
  }

  /** Opens the Key Meeting Notes detail dialog from its Communication-history entry. */
  async openDetailFromHistory(title: string): Promise<void> {
    await this.locators.keyMeetingNotesEntry(title).click();
    await expect(this.locators.detailDialog).toBeVisible();
  }

  async expectDetailSectionsVisible(): Promise<void> {
    await expect(this.locators.detailDialog).toBeVisible();
    await expect(this.locators.summaryOrAgendaSection).toBeVisible();
    await expect(this.locators.discussionPointsSection).toBeVisible();
    await expect(this.locators.actionItemsSection).toBeVisible();
  }

  async expectSourceInteractionVisible(): Promise<void> {
    await expect(this.locators.sourceInteractionText).toBeVisible();
  }

  async expectSystemField(label: string): Promise<void> {
    await expect(this.locators.systemField(label)).toBeVisible();
  }

  /** Opens the Notify dialog — one click, does NOT send (see sendNotification). */
  async notifyInternally(): Promise<void> {
    await this.locators.notifyInternallyButton.click();
  }

  /** Opens the Notify dialog — one click, does NOT send (see sendNotification). */
  async notifyCustomer(): Promise<void> {
    await this.locators.notifyCustomerButton.click();
  }

  /**
   * Completes a send from an already-open Notify dialog and waits for its
   * toast — confirmed against the running app: `onSend` only resolves (and
   * only then does the dialog toast) once the mutation actually completes,
   * so waiting on the toast is waiting on the real send, not just the click.
   */
  async sendNotification(): Promise<void> {
    await this.locators.sendNotificationsButton.click();
    await expect(this.locators.toast).toBeVisible();
  }

  /** Back to the Key Meeting Notes list — confirmed against the running app: a link/button, not a route change with its own dialog. */
  async backToNotesList(): Promise<void> {
    await this.locators.backToNotesListLink.click();
  }

  /** Closes an open Notify dialog without sending — it's a real modal and blocks the page behind it until dismissed. */
  async closeNotifyDialog(): Promise<void> {
    await this.locators.notifyDialogCancelButton.click();
    await expect(this.locators.notifyDialog).toBeHidden();
  }

  async openNotificationsPanel(): Promise<void> {
    await this.locators.notificationsBellButton.click();
    await expect(this.locators.notificationsPanel).toBeVisible();
  }

  async expectNotificationVisible(title: string): Promise<void> {
    await expect(this.locators.notificationItem(title)).toBeVisible();
  }

  /** Follows a notification's deep link into the record it names. */
  async openNotification(title: string): Promise<void> {
    await this.locators.notificationItem(title).click();
  }

  async expectAuditEntryVisible(text: string | RegExp): Promise<void> {
    await expect(this.locators.auditEntry(text)).toBeVisible();
  }

  async expectNoRecipientsWarningVisible(): Promise<void> {
    await expect(this.locators.noRecipientsWarning).toBeVisible();
  }

  async expectDialogClosed(): Promise<void> {
    await expect(this.locators.generateDialog).toBeHidden();
  }
}
