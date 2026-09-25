import { type Locator, type Page } from '@playwright/test';

/** External Events list, under the CRM module (confirmed against the running app). */
export const EXTERNAL_EVENTS_LIST_PATH = '/crm/events';

/**
 * Raw element locators for "Create External Event" (CRM, Sprint 4 user
 * story) — no actions or assertions here, see
 * src/pages/crm/external-events.page.ts for those.
 *
 * Confirmed against the running app (2026-09-25):
 * - The list screen's entry point is a "Create Event" button (not
 *   "Create External Event") that navigates to its own route
 *   (`/crm/events/new`).
 * - "External Event Date" is a native `<input type="date">` — fill with
 *   an ISO string (e.g. "2026-09-20"), same idiom as every other native
 *   date field already confirmed elsewhere in this app.
 * - "SAITEX Attendees" is a button that opens a popup dialog with a
 *   `listbox` of employee names, not a combobox — selecting one closes
 *   the popup automatically (unlike the Notify Internally multi-select
 *   elsewhere in this app, which needs an explicit dismiss — see
 *   log-communication.page.ts's selectNotifyManager() for that
 *   contrast).
 * - The ClickUp text names only SAITEX Attendees/Score/Number of Leads as
 *   mandatory Feedback Form fields. Confirmed directly this is
 *   incomplete: "What went well?", "What could have been better?", and
 *   "Attend next editions?" are ALSO required — Submit is blocked with
 *   field-level "Required" errors on all three otherwise.
 * - Submit does not save immediately — it opens a confirmation dialog
 *   ("External Event created!", warning that all Managers get notified)
 *   with "Keep editing"/"Save event"; only "Save event" persists it and
 *   redirects to the new event's own Details screen
 *   (`/crm/events/{id}?tab=feedback`).
 */
export class ExternalEventsLocators {
  readonly createEventButton: Locator;

  readonly titleInput: Locator;
  readonly venueInput: Locator;
  readonly dateInput: Locator;
  readonly aboutInput: Locator;

  readonly attendeesButton: Locator;
  readonly scoreRadiogroup: Locator;
  readonly numberOfLeadsInput: Locator;
  readonly wentWellInput: Locator;
  readonly couldBeBetterInput: Locator;
  readonly attendNextEditionsInput: Locator;

  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  readonly confirmDialog: Locator;
  readonly saveEventButton: Locator;
  readonly keepEditingButton: Locator;

  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.createEventButton = page.getByRole('button', { name: 'Create Event' });

    this.titleInput = page.getByRole('textbox', { name: 'External Event Title', exact: false });
    this.venueInput = page.getByRole('textbox', { name: 'External Event Venue', exact: false });
    this.dateInput = page.getByRole('textbox', { name: 'External Event Date', exact: false });
    this.aboutInput = page.getByRole('textbox', { name: 'About the External Event', exact: false });

    this.attendeesButton = page.getByRole('button', { name: 'SAITEX Attendees' });
    this.scoreRadiogroup = page.getByRole('radiogroup', { name: /Score/ });
    this.numberOfLeadsInput = page.getByRole('textbox', { name: 'Number of Leads', exact: false });
    this.wentWellInput = page.getByRole('textbox', { name: 'What went well?', exact: false });
    this.couldBeBetterInput = page.getByRole('textbox', {
      name: 'What could have been better?',
      exact: false,
    });
    this.attendNextEditionsInput = page.getByRole('textbox', {
      name: 'Attend next editions?',
      exact: false,
    });

    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.confirmDialog = page
      .getByRole('dialog')
      .or(page.getByRole('alertdialog'))
      .filter({ hasText: 'External Event created' });
    this.saveEventButton = this.confirmDialog.getByRole('button', { name: 'Save event' });
    this.keepEditingButton = this.confirmDialog.getByRole('button', { name: 'Keep editing' });

    this.toast = page.locator('[data-sonner-toast]').first();
  }

  scoreRadio(value: number): Locator {
    return this.scoreRadiogroup.getByRole('radio', { name: String(value), exact: true });
  }

  attendeeOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }
}
