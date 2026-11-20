import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { AlertTimerDetailLocators } from '../../locators/planning/alert-timer-detail.locators';
import { SECTION_LABELS } from '../../locators/planning/alert-timer-form.locators';
import type { AlertTimerRow } from './alert-timers-network';
import { pillFor, sectionLabels } from './alert-timers-list.page';
import { expectAbsentOrDisabled } from './master-data-list.page';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

const LIST = '/planning/master-data/alert-timers';
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CHANNELS: Record<string, string> = { in_app: 'In-app', email: 'email' };

/**
 * An alert timer's read-only Details page
 * (/planning/master-data/alert-timers/:userId): delivery, next send,
 * channels, sections in order, time zone, account status, version.
 */
export class AlertTimerDetailPage extends BasePage {
  readonly locators: AlertTimerDetailLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AlertTimerDetailLocators(page);
  }

  async open(userId: string): Promise<void> {
    const path = `${LIST}/${userId}`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.locators.sectionsHeading).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  async expectOnDetails(userId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LIST}/${userId}$`), {
      timeout: WAIT.NAVIGATION,
    });
    await this.expectLoaded();
  }

  /**
   * Everything the page shows matches the stored timer: heading, username,
   * delivery pill, channels, email, time zone, version, last saved, and the
   * sections in their stored order with a "Not included" summary of the rest.
   */
  async expectShows(row: AlertTimerRow): Promise<void> {
    const l = this.locators;
    await this.expectLoaded();
    await expect(l.heading).toHaveText(row.displayName ?? row.userId);
    await expect(l.fieldValue('Username')).toHaveText(row.username ?? row.userId);
    await expect(l.fieldValue('Delivery')).toContainText(pillFor(row));
    await expect(l.fieldValue('Time zone')).toHaveText(row.timezone);
    await expect(l.fieldValue('Version')).toHaveText(String(row.version));
    await expect(l.fieldValue('Email')).toHaveText(row.email ?? '—');
    await expect(l.fieldValue('Last saved')).toContainText(row.lastSavedBy?.username ?? '');
    await this.expectChannels(row.channels);
    await this.expectSections(row.sections);
  }

  /** "In-app", "Email" or "In-app and email". */
  async expectChannels(codes: string[]): Promise<void> {
    const words = codes.map((c) => CHANNELS[c] ?? c);
    const text = words.join(' and ');
    await expect(this.locators.fieldValue('Channels')).toHaveText(
      new RegExp(`^${text.charAt(0).toUpperCase()}${text.slice(1)}$`),
    );
  }

  /** The stored sections, in order; the rest named under "Not included". */
  async expectSections(codes: string[]): Promise<void> {
    const labels = sectionLabels(codes);
    await expect(this.locators.sectionItems).toHaveCount(labels.length);
    // Polled: until the lookups arrive, the items show raw codes ("risks").
    await expect
      .poll(
        async () =>
          (await this.locators.sectionItems.allInnerTexts()).map(
            (t) => labels.find((l) => t.startsWith(l)) ?? t,
          ),
        { message: 'sections, in stored order', timeout: WAIT.SERVER },
      )
      .toEqual(labels);
    const rest = SECTION_LABELS.filter((s) => !labels.includes(s));
    if (rest.length > 0)
      await expect(this.locators.sectionsSummary).toContainText(
        `Not included: ${rest.join(', ')}.`,
      );
  }

  /** "Next send" for a daily / weekly timer: "<Ddd> <Mmm> <d> <HH:MM>" on the right weekday and time. */
  async expectNextSendScheduled(row: AlertTimerRow): Promise<void> {
    const value = this.locators.fieldValue('Next send');
    await expect(value).toHaveText(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{1,2} \d{2}:\d{2}$/);
    const text = (await value.innerText()).trim();
    expect(text.endsWith(` ${row.sendAt}`), `next send at ${row.sendAt}: "${text}"`).toBe(true);
    if (row.cadence === 'weekly')
      expect(text.slice(0, 3), 'next send weekday').toBe(WEEKDAYS[(row.sendWeekday ?? 1) - 1]);
  }

  async expectNextSend(text: string): Promise<void> {
    await expect(this.locators.fieldValue('Next send')).toHaveText(text);
  }

  /** The Delivery value includes the cadence's description, e.g. "This timer is off…". */
  async expectDeliveryNote(text: string): Promise<void> {
    await expect(this.locators.main.getByText(text, { exact: true })).toBeVisible();
  }

  async expectSectionsNote(text: string): Promise<void> {
    await expect(this.locators.sectionsSummary).toContainText(text);
  }

  async expectAccountStatus(text: string): Promise<void> {
    await expect(this.locators.fieldValue('Account status')).toHaveText(text);
  }

  async expectWarning(text: string): Promise<void> {
    await expect(this.locators.warningAlert).toHaveText(text, { timeout: WAIT.SERVER });
  }

  async expectNoWarning(): Promise<void> {
    await expect(this.locators.warningAlert).toHaveCount(0);
  }

  /** The badge beside the heading ("Disabled", "Daily", …). */
  async expectHeaderBadge(text: string): Promise<void> {
    await expect(this.locators.headerBadge(text)).toBeVisible();
  }

  async expectNoTimerMessage(): Promise<void> {
    await expect(this.locators.noTimerMessage).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.sectionsHeading).toHaveCount(0);
    await expect(this.locators.editButton).toHaveCount(0);
  }

  /** "Edit alert timer" opens /:userId/edit. */
  async openEdit(userId: string): Promise<void> {
    await this.locators.editButton.click();
    await expect(this.page).toHaveURL(new RegExp(`${LIST}/${userId}/edit$`), {
      timeout: WAIT.NAVIGATION,
    });
  }

  async expectNoEditAction(): Promise<void> {
    await this.expectLoaded();
    await expectAbsentOrDisabled(this.locators.editButton);
  }

  /** Directory down: banner, the id in place of names, "—" for name/group/email, status Unknown. */
  async expectDegraded(row: AlertTimerRow): Promise<void> {
    const l = this.locators;
    await expect(l.degradedNotice).toHaveText(
      'Names and emails are unavailable right now. Timers are shown by account id.',
      { timeout: WAIT.PAGE_LOAD },
    );
    await expect(l.heading).toHaveText(row.userId);
    await expect(l.fieldValue('Username')).toHaveText(row.userId);
    for (const field of ['Name', 'Group', 'Email'])
      await expect(l.fieldValue(field)).toHaveText('—');
    await this.expectAccountStatus('Unknown');
    await expect(l.fieldValue('Delivery')).toContainText(pillFor(row));
  }
}
