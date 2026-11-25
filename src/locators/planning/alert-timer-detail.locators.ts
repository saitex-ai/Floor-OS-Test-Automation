import { type Locator, type Page } from '@playwright/test';

/**
 * Raw element locators for an alert timer's read-only Details page
 * (/planning/master-data/alert-timers/:userId). No actions or assertions
 * here, see src/pages/planning/alert-timer-detail.page.ts.
 */
export class AlertTimerDetailLocators {
  readonly main: Locator;
  readonly heading: Locator;
  readonly backLink: Locator;
  readonly editButton: Locator;
  /** A warning banner (email missing / no Planning access). */
  readonly warningAlert: Locator;
  /** The directory-degraded notice. */
  readonly degradedNotice: Locator;
  readonly sectionsHeading: Locator;
  readonly sectionItems: Locator;
  /** "The digest covers these sections… Not included: …" under the list. */
  readonly sectionsSummary: Locator;
  /** What the page shows for an id with no saved timer. */
  readonly noTimerMessage: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').first();
    this.heading = page.getByRole('heading', { level: 1 });
    this.backLink = page.getByRole('link', { name: 'All alert timers' });
    this.editButton = page.getByRole('button', { name: 'Edit alert timer' });
    this.warningAlert = this.main.getByRole('alert');
    this.degradedNotice = this.main
      .getByRole('status')
      .filter({ hasText: 'Names and emails are unavailable right now' });
    this.sectionsHeading = page.getByRole('heading', { name: 'Sections', level: 2 });
    this.sectionItems = this.main.getByRole('list').last().getByRole('listitem');
    this.sectionsSummary = this.main.getByText(/Not included:|in this order|sections only/);
    this.noTimerMessage = page.getByText('This person has no alert timer.', { exact: true });
  }

  /**
   * The value next to a field label ("Next send", "Delivery", "Version", …).
   * Each field is a label span followed by its value span. Delivery's value
   * is the pill only; its description is a separate line.
   */
  fieldValue(label: string): Locator {
    // A label has its value as next sibling; a bare value that happens to
    // read the same (Channels "Email") has none.
    return this.main
      .locator(`xpath=.//*[normalize-space(text())="${label}"][following-sibling::*]`)
      .first()
      .locator('xpath=following-sibling::*[1]');
  }

  /** The username / status badges beside the heading. */
  headerBadge(text: string): Locator {
    return this.heading.locator('xpath=..').getByText(text, { exact: true });
  }

  /** Text anywhere in the page body, matched exactly. */
  mainText(text: string): Locator {
    return this.main.getByText(text, { exact: true });
  }
}
