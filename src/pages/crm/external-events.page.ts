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
}
