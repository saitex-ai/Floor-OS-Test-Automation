import { type Locator, type Page } from '@playwright/test';

/** The five digest sections, in the fixed order the form and Details render them. */
export const SECTION_LABELS = [
  'Delivery risks',
  'Date slips',
  'Capacity',
  'Estimate accuracy',
  'Prep completion',
] as const;
export type SectionLabel = (typeof SECTION_LABELS)[number];

export type Cadence = 'Real time' | 'Daily' | 'Weekly';
export type Channel = 'In-app' | 'Email';

/**
 * Raw element locators for the New / Edit alert timer form
 * (/planning/master-data/alert-timers/new and /:userId/edit). Both screens
 * render the same form component; New adds the Employee picker on top. No
 * actions or assertions here, see src/pages/planning/alert-timer-form.page.ts.
 */
export class AlertTimerFormLocators {
  readonly main: Locator;
  readonly heading: Locator;
  readonly employeePicker: Locator;
  /** The picker's open popup: a search box and its "Suggestions" listbox. */
  readonly pickerDialog: Locator;
  readonly pickerSearch: Locator;
  readonly pickerOptions: Locator;
  readonly addButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deliveryTabs: Locator;
  readonly turnOffButton: Locator;
  readonly turnBackOnButton: Locator;
  /** "This timer is off. Alerts stay in the in-app inbox." */
  readonly offNote: Locator;
  readonly weekday: Locator;
  readonly time: Locator;
  readonly timezone: Locator;
  readonly channelsHeading: Locator;
  readonly sectionsHeading: Locator;
  readonly inAppChannel: Locator;
  readonly emailChannel: Locator;
  /** Inline validation / outage messages (role="alert") inside the form page. */
  readonly alerts: Locator;
  /** The "added a moment ago" notice after a create race (role="status"). */
  readonly addedNotice: Locator;
  readonly reloadButton: Locator;
  /** The picked person's read-only facts (Username / Group / Email / Status). */
  readonly personFacts: Locator;
  /** The panel shown instead of the form for a person who can't be added. */
  readonly blockedPanel: Locator;
  readonly editTheirTimerLink: Locator;
  readonly noEmailHint: Locator;
  readonly accessRestricted: Locator;
  /** The App Launcher's "Pinned Modules" heading: where a user with no Planning app lands. */
  readonly launcherHeading: Locator;

  constructor(private readonly page: Page) {
    this.main = page.getByRole('main').first();
    this.heading = page.getByRole('heading', { level: 1 });
    this.employeePicker = page.getByRole('combobox', { name: 'Employee' });
    this.pickerDialog = page.getByRole('dialog').filter({ has: page.getByRole('combobox') });
    this.pickerSearch = this.pickerDialog.getByRole('combobox');
    this.pickerOptions = page.getByRole('listbox', { name: 'Suggestions' }).getByRole('option');
    this.addButton = page.getByRole('button', { name: 'Add alert timer' });
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.deliveryTabs = page.getByRole('tablist', { name: 'Delivery' }).getByRole('tab');
    this.turnOffButton = page.getByRole('button', { name: 'Turn off', exact: true });
    this.turnBackOnButton = page.getByRole('button', { name: /turn back on/i });
    this.offNote = page.getByText('This timer is off. Alerts stay in the in-app inbox.', {
      exact: true,
    });
    this.weekday = page.getByRole('combobox', { name: 'Weekday', exact: true });
    this.time = page.getByRole('combobox', { name: 'Time', exact: true });
    this.timezone = page.getByRole('combobox', { name: 'Time zone', exact: true });
    this.channelsHeading = page.getByRole('heading', { name: 'Channels', level: 2 });
    this.sectionsHeading = page.getByRole('heading', { name: 'Sections', level: 2 });
    this.inAppChannel = page.getByRole('checkbox', { name: /^In-app/ });
    this.emailChannel = page.getByRole('checkbox', { name: /^Email\b/ });
    this.alerts = this.main.getByRole('alert');
    this.addedNotice = this.main
      .getByRole('status')
      .filter({ hasText: 'An alert timer was added for this person a moment ago' });
    this.reloadButton = page.getByRole('button', { name: 'Reload', exact: true });
    this.personFacts = this.main.getByRole('term');
    this.blockedPanel = this.main.getByRole('status').filter({ has: page.getByRole('heading') });
    this.editTheirTimerLink = page.getByRole('link', { name: 'Edit their alert timer' });
    this.noEmailHint = page.getByText('No email on this account', { exact: true });
    this.accessRestricted = page.getByText('Access restricted', { exact: true });
    this.launcherHeading = page.getByRole('heading', { name: 'Pinned Modules' });
  }

  deliveryTab(cadence: Cadence): Locator {
    return this.page.getByRole('tablist', { name: 'Delivery' }).getByRole('tab', {
      name: cadence,
      exact: true,
    });
  }

  /** A section's checkbox; its accessible name is "<label> <description>". */
  section(label: SectionLabel): Locator {
    return this.page.getByRole('checkbox', { name: new RegExp(`^${label}\\b`) });
  }

  /** Every section checkbox, top to bottom. */
  sections(): Locator {
    return this.page.getByRole('checkbox', {
      name: new RegExp(`^(${SECTION_LABELS.join('|')})\\b`),
    });
  }

  channel(channel: Channel): Locator {
    return channel === 'In-app' ? this.inAppChannel : this.emailChannel;
  }

  /** An option of the open Weekday / Time listbox. */
  listOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /** Every option of the open Weekday / Time listbox. */
  listOptions(): Locator {
    return this.page.getByRole('listbox').last().getByRole('option');
  }

  /** The picked person's fact value ("Username" → "test.ie.02"). */
  personFact(term: string): Locator {
    return this.main
      .getByRole('term')
      .filter({ hasText: new RegExp(`^${term}$`) })
      .locator('xpath=following-sibling::*[1]');
  }

  /** Any control that would reorder sections (drag handle / move up / move down). */
  reorderControls(): Locator {
    return this.main.getByRole('button', { name: /drag|reorder|move (up|down)/i });
  }

  /** Any control that would return a timer to "not set" (distinct from Turn off). */
  resetControls(): Locator {
    return this.main
      .getByRole('button', { name: /reset|not set|remove|delete/i })
      .or(this.main.getByRole('link', { name: /reset|not set|remove|delete/i }));
  }

  /** A toast in the shell's Notifications region. */
  toast(text: string | RegExp): Locator {
    return this.page.getByRole('region', { name: /Notifications/ }).getByText(text);
  }

  /** The panel's heading, shown instead of the form for a blocked person. */
  blockedHeading(): Locator {
    return this.blockedPanel.getByRole('heading');
  }

  /** Text in the page body ("<name> already has an alert timer"). */
  mainText(text: string, exact = false): Locator {
    return this.main.getByText(text, { exact });
  }
}
