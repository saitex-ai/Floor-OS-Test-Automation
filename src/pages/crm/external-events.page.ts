import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { ExternalEventsLocators, EXTERNAL_EVENTS_LIST_PATH } from '../../locators/crm/external-events.locators';

/**
 * "Create External Event [created by user manually]" (CRM, Sprint 4 user
 * story). Owned by the CRM QA. Confirmed against the running app
 * (2026-09-25), including a full real create-to-save run — see
 * ExternalEventsLocators' class doc for the corrections that made to the
 * original ClickUp text.
 */
export interface ExternalEventDetails {
  title: string;
  venue: string;
  /** ISO date string, e.g. '2026-09-20' — native date input. */
  date: string;
  about: string;
  attendee: string;
  score: number;
  numberOfLeads: number;
  wentWell: string;
  couldBeBetter: string;
  attendNextEditions: string;
}

export class ExternalEventsPage extends BasePage {
  readonly locators: ExternalEventsLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new ExternalEventsLocators(page);
  }

  async openFromEventsList(): Promise<void> {
    await this.gotoAuthenticated(EXTERNAL_EVENTS_LIST_PATH);
    await this.locators.createEventButton.click();
  }

  /** Fills the whole form, including the three Feedback Form fields the ClickUp text omits from "mandatory" but the app enforces anyway. */
  async fill(details: ExternalEventDetails): Promise<void> {
    const l = this.locators;
    await l.titleInput.fill(details.title);
    await l.venueInput.fill(details.venue);
    await l.dateInput.fill(details.date);
    await l.aboutInput.fill(details.about);

    await l.attendeesButton.click();
    await l.attendeeOption(details.attendee).click();

    await l.scoreRadio(details.score).check();
    await l.numberOfLeadsInput.fill(String(details.numberOfLeads));
    await l.wentWellInput.fill(details.wentWell);
    await l.couldBeBetterInput.fill(details.couldBeBetter);
    await l.attendNextEditionsInput.fill(details.attendNextEditions);
  }

  async submit(): Promise<void> {
    await this.locators.submitButton.click();
  }

  async expectFieldError(message: string | RegExp): Promise<void> {
    await expect(this.page.getByText(message).first()).toBeVisible();
  }

  async expectConfirmDialogVisible(): Promise<void> {
    await expect(this.locators.confirmDialog).toBeVisible();
  }

  /** Confirmed against the running app: Submit alone does not persist the event — this second confirm step does, then redirects to the new event's own Details screen. */
  async confirmSaveEvent(): Promise<void> {
    await this.locators.saveEventButton.click();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await expect(this.locators.toast).toBeVisible();
    await expect(this.page).toHaveURL(/\/crm\/events\/[0-9a-f-]+/);
  }

  // ---------------------------------------------------------------------
  // List screen (CRM Sprint 3 — "External Events List screen")
  // ---------------------------------------------------------------------

  async openList(): Promise<void> {
    await this.gotoAuthenticated(EXTERNAL_EVENTS_LIST_PATH);
  }

  async expectListLoaded(): Promise<void> {
    await expect(this.locators.pageHeading).toBeVisible();
    await expect(this.locators.statusTab('All')).toBeVisible();
    await expect(this.locators.statusTab('Planning')).toBeVisible();
    await expect(this.locators.statusTab('To Attend')).toBeVisible();
    await expect(this.locators.statusTab('Attended')).toBeVisible();
    await expect(this.locators.searchInput).toBeVisible();
  }

  /**
   * Not Attending/Elapsed are tucked behind "+2 more", not top-level tabs —
   * confirmed against the running app. Confirmed directly (2026-09-25):
   * the table re-renders after a brief delay following the click — reading
   * rows immediately after this without a settle wait can catch the grid
   * mid-transition and return the wrong row/order (same debounce-race
   * class as search()'s wait, below).
   */
  async selectStatusTab(name: 'All' | 'Planning' | 'To Attend' | 'Attended'): Promise<void> {
    await this.locators.statusTab(name).click();
    await this.page.waitForTimeout(600);
  }

  async selectOverflowStatusTab(name: 'Not Attending' | 'Elapsed'): Promise<void> {
    await this.locators.moreStatusTabsButton.click();
    await this.page.getByRole('menuitem', { name: new RegExp(`^${name} \\d+$`) }).click();
    await this.page.waitForTimeout(600);
  }

  /** Confirmed against the running app: the live filter is debounced — a brief settle wait avoids reading the table mid-filter. */
  async search(query: string): Promise<void> {
    await this.locators.searchInput.fill(query);
    await this.page.waitForTimeout(600);
  }

  /** "AI Relevance" (and "Leads") are real columns but hidden by default — must be toggled on before they can be sorted on. */
  async showAiRelevanceColumn(): Promise<void> {
    await this.locators.configureColumnsButton.click();
    await expect(this.locators.columnsDialog).toBeVisible();
    await this.locators.columnToggle('AI Relevance').click();
    await this.locators.applyColumnsButton.click();
  }

  async sortByAiRelevanceDescending(): Promise<void> {
    // One click sorts ascending, a second flips to descending — confirmed directly.
    await this.locators.aiRelevanceColumnHeader.click();
    await this.locators.aiRelevanceColumnHeader.click();
  }

  async openEventRow(title: string): Promise<void> {
    await this.locators.eventRow(title).click();
  }

  /** The FIRST (i.e. currently top-sorted) row in whatever the table is showing right now. */
  /** Whether the table currently showing (e.g. after selectStatusTab()) has at least one row. */
  async hasAnyRows(): Promise<boolean> {
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    return (await rows.count()) > 0;
  }

  async openFirstRow(): Promise<void> {
    await this.page
      .getByRole('row')
      .filter({ hasNot: this.page.getByRole('columnheader') })
      .first()
      .click();
  }

  // ---------------------------------------------------------------------
  // Details/workspace (CRM Sprint 3 — "External Event Details screen")
  // ---------------------------------------------------------------------

  /**
   * Finds a genuinely undecided, NOT-elapsed Planning event from the
   * List's Planning tab and opens it. Confirmed against the running app:
   * the AI-discovery seed pool of Planning events is FIXED (6 total in
   * this environment, several already "Planning · Elapsed") and NOT
   * replenishable — there is no UI path to create a fresh one (manually
   * "Create Event" always saves straight to Attended — see class doc).
   * Callers MUST treat a `null` return as "skip this test, the pool is
   * exhausted", not as a failure — the same "don't force a false
   * pass/fail on unowned/finite seed data" discipline as
   * biz-doc.page.ts's hasAnyRecords() and qualified-lead-to-prospect's
   * cross-module gaps.
   */
  async findFreshPlanningEvent(): Promise<string | null> {
    await this.openList();
    await this.selectStatusTab('Planning');
    const rows = this.page.getByRole('row').filter({ hasNot: this.page.getByRole('columnheader') });
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const text = await rows.nth(i).innerText();
      if (!text.includes('Elapsed')) {
        await rows.nth(i).click();
        await this.page.waitForURL(/\/crm\/events\/[0-9a-f-]+/);
        const match = this.page.url().match(/\/crm\/events\/([0-9a-f-]+)/);
        return match?.[1] ?? null;
      }
    }
    return null;
  }

  async openEventById(eventId: string): Promise<void> {
    await this.gotoAuthenticated(`/crm/events/${eventId}`);
  }

  /**
   * TC:1 — Feedback Form/Leads stay locked until the event is Attended.
   * Confirmed against the running app (2026-09-25): the tab buttons are
   * NOT HTML-disabled (toBeDisabled() always reads false, decided or
   * not) — clicking a locked tab is allowed, but its content is gated
   * behind "The Feedback Form/Leads tab opens once this event's status
   * is Attended." That gate text is what actually reflects lock state.
   */
  async expectFeedbackAndLeadsLocked(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
    await expect(
      this.page.getByText("The Feedback Form opens once this event's status is Attended."),
    ).toBeVisible();
    await this.locators.leadsTabButton.click();
    await expect(
      this.page.getByText("The Leads tab opens once this event's status is Attended."),
    ).toBeVisible();
  }

  /** TC:3 — the counterpart check once the event has transitioned to Attended: the same gate text must be gone. */
  async expectFeedbackAndLeadsUnlocked(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
    await expect(
      this.page.getByText("The Feedback Form opens once this event's status is Attended."),
    ).toBeHidden();
    await this.locators.leadsTabButton.click();
    await expect(
      this.page.getByText("The Leads tab opens once this event's status is Attended."),
    ).toBeHidden();
  }

  async decideToAttend(): Promise<void> {
    await this.locators.toAttendButton.click();
  }

  async markAttended(): Promise<void> {
    await this.locators.markAttendedButton.click();
  }

  async openFeedbackFormTab(): Promise<void> {
    await this.locators.feedbackFormTabButton.click();
  }

  async openLeadsTab(): Promise<void> {
    await this.locators.leadsTabButton.click();
  }

  /** TC:5 — confirms the registration link opens in a new tab, without asserting on that external page's own content. */
  async clickRegisterOnlineAndAwaitNewTab(): Promise<Page | null> {
    const newPagePromise = this.page.context().waitForEvent('page', { timeout: 10_000 }).catch(() => null);
    await this.locators.registerOnlineLink.click();
    return newPagePromise;
  }

  async openDeclineDialog(): Promise<void> {
    await this.locators.notAttendingButton.click();
    await expect(this.locators.declineDialog).toBeVisible();
  }

  async attemptDeclineWithoutFilling(): Promise<void> {
    await this.locators.declineProceedButton.click();
  }

  async fillDeclineReason(reasonChip: string, detailedReason: string): Promise<void> {
    await this.locators.declineReasonButton.click();
    await this.locators.declineReasonOption(reasonChip).click();
    // Dismiss the reason popup by clicking the dialog's own heading — a
    // neutral point outside the popup (same idiom as
    // log-communication.page.ts's selectNotifyManager()).
    await this.locators.declineDialog.getByRole('heading').click();
    await this.locators.declineDetailedReasonInput.fill(detailedReason);
  }

  async confirmDecline(): Promise<void> {
    await this.locators.declineProceedButton.click();
  }

  async cancelDecline(): Promise<void> {
    await this.locators.declineCancelButton.click();
  }

  async expectStatus(status: string): Promise<void> {
    await expect(this.page.getByText(status, { exact: false }).first()).toBeVisible();
  }
}
