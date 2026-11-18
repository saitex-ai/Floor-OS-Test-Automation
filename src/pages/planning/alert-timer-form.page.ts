import { type Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import {
  AlertTimerFormLocators,
  SECTION_LABELS,
  type Cadence,
  type Channel,
  type SectionLabel,
} from '../../locators/planning/alert-timer-form.locators';
import type {
  AlertTimerCandidate,
  AlertTimerRow,
  AlertTimersNetwork,
  CandidateStatus,
  RecordedWrite,
} from './alert-timers-network';
import { ensureRoute } from './navigation';
import { WAIT } from './waits';

const LIST = '/planning/master-data/alert-timers';
const NEW = `${LIST}/new`;
export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
const CADENCE_LABEL: Record<AlertTimerRow['cadence'], Cadence> = {
  real_time: 'Real time',
  daily: 'Daily',
  weekly: 'Weekly',
};
const CADENCE_CODE: Record<Cadence, AlertTimerRow['cadence']> = {
  'Real time': 'real_time',
  Daily: 'daily',
  Weekly: 'weekly',
};
const SECTION_CODE: Record<SectionLabel, string> = {
  'Delivery risks': 'risks',
  'Date slips': 'slips',
  Capacity: 'capacity',
  'Estimate accuracy': 'accuracy',
  'Prep completion': 'prep_completion',
};
const CHANNEL_CODE: Record<Channel, string> = { 'In-app': 'in_app', Email: 'email' };
/** How the picker words each candidate status. */
const STATUS_TEXT: Record<CandidateStatus, string> = {
  ready: 'Ready',
  already_set: 'Already set',
  account_disabled: 'Account disabled',
  no_planning_access: 'No Planning access · ask IT support',
  no_account: 'No sign-in account · ask IT support',
};
const ALL_STATUSES = Object.keys(STATUS_TEXT) as CandidateStatus[];

/** Two-letter searches tried, in order, to find a candidate with a given status. */
const PROBE_TERMS = ['te', 'an', 'ie', 'pl', 'in', 'er', 'ad', 'ar', 'on', 'en', 'ra', 'la', 'qa'];

/** What the form holds right now, in the API's own codes. */
export interface FormState {
  isEnabled: boolean;
  cadence: AlertTimerRow['cadence'];
  weekday: string | null;
  time: string | null;
  timezone: string | null;
  sections: string[];
  channels: string[];
}

/** A candidate found in the picker, with the search that lists it. */
export interface FoundCandidate {
  search: string;
  candidate: AlertTimerCandidate;
}

/** Section codes ("risks", …) → their checkbox labels, in the form's fixed order. */
export function sectionLabelsOf(codes: string[]): SectionLabel[] {
  return SECTION_LABELS.filter((label) => codes.includes(SECTION_CODE[label]));
}

export function cadenceLabel(code: AlertTimerRow['cadence']): Cadence {
  return CADENCE_LABEL[code];
}

/**
 * The New / Edit alert timer form (/planning/master-data/alert-timers/new
 * and /:userId/edit). The same component serves both; New adds the
 * Employee picker. Sections / Channels are real checkboxes — always read
 * and toggle them by role, never by label text (label clicks once gave a
 * false "zero sections saved" result here).
 */
export class AlertTimerFormPage extends BasePage {
  readonly locators: AlertTimerFormLocators;

  constructor(page: Page) {
    super(page);
    this.locators = new AlertTimerFormLocators(page);
  }

  // ── Navigation ──────────────────────────────────────────────────────

  async openNew(): Promise<void> {
    await this.gotoAuthenticated(NEW);
    await ensureRoute(this.page, NEW);
    await expect(this.locators.heading).toHaveText('New alert timer', { timeout: WAIT.PAGE_LOAD });
  }

  /** The New form is ready: the Employee picker rendered (it's a skeleton while lookups load). */
  async expectNewReady(): Promise<void> {
    await expect(this.locators.employeePicker).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  /** Navigates to New without waiting for the form (for users who may be refused). */
  async gotoNew(): Promise<void> {
    await this.gotoAuthenticated(NEW);
    await ensureRoute(this.page, NEW);
  }

  /** Navigates to a timer's Edit page without waiting for the form. */
  async gotoEdit(userId: string): Promise<void> {
    const path = `${LIST}/${userId}/edit`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
  }

  /** "Access restricted" instead of the form, or sent away from the screen. */
  async expectAccessRestricted(): Promise<void> {
    await expect
      .poll(
        async () =>
          (await this.locators.accessRestricted.isVisible().catch(() => false)) ||
          !new URL(this.page.url()).pathname.startsWith(LIST),
        { message: 'blocked: "Access restricted" or redirected away', timeout: WAIT.PAGE_LOAD },
      )
      .toBe(true);
    await expect(this.locators.saveButton).toHaveCount(0);
    await expect(this.locators.addButton).toHaveCount(0);
  }

  async openEdit(userId: string): Promise<void> {
    const path = `${LIST}/${userId}/edit`;
    await this.gotoAuthenticated(path);
    await ensureRoute(this.page, path);
    await this.expectEditReady();
  }

  async expectEditReady(): Promise<void> {
    await expect(this.locators.saveButton).toBeVisible({ timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.deliveryTabs.first()).toBeVisible({ timeout: WAIT.PAGE_LOAD });
  }

  // ── Employee picker (New) ───────────────────────────────────────────

  async openPicker(): Promise<void> {
    await this.expectNewReady();
    await this.locators.employeePicker.click();
    await expect(this.locators.pickerSearch).toBeVisible({ timeout: WAIT.SERVER });
  }

  /** Types `term` into the open picker's search. */
  async searchPicker(term: string): Promise<void> {
    await this.locators.pickerSearch.fill(term);
  }

  async optionNames(): Promise<string[]> {
    return (await this.locators.pickerOptions.allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
  }

  /** The picker lists exactly `count` options. */
  async expectOptionCount(count: number): Promise<void> {
    await expect(this.locators.pickerOptions).toHaveCount(count, { timeout: WAIT.SERVER });
  }

  /**
   * Scans the picker (opening list, then the probe searches) for one
   * candidate of each status; `ready` ones must have a sign-in account, an
   * email and no timer. Leaves the picker closed.
   */
  async scanCandidates(net: AlertTimersNetwork): Promise<Map<CandidateStatus, FoundCandidate>> {
    const found = new Map<CandidateStatus, FoundCandidate>();
    await this.openPicker();
    for (const search of ['', ...PROBE_TERMS]) {
      if (search !== '') await this.searchPicker(search);
      for (const c of await net.candidates(search)) {
        if (found.has(c.status)) continue;
        if (c.status === 'ready' && (!c.userId || !c.username || !c.email || c.alertTimer))
          continue;
        found.set(c.status, { search, candidate: c });
      }
      if (found.size === ALL_STATUSES.length) break;
    }
    await this.page.keyboard.press('Escape');
    return found;
  }

  /** Opens the picker on `found`'s search and picks it. */
  async pickFound(net: AlertTimersNetwork, found: FoundCandidate): Promise<void> {
    await this.openPicker();
    if (found.search !== '') await this.searchPicker(found.search);
    await net.candidates(found.search);
    await this.pick(found);
  }

  /**
   * Each option describes its candidate: name (· username), employee code,
   * department, the status in words, and "Matched by email" when the
   * account was linked by email.
   */
  async expectOptionsDescribe(rows: AlertTimerCandidate[]): Promise<void> {
    await this.expectOptionCount(rows.length);
    const names = await this.optionNames();
    for (const [i, c] of rows.entries()) {
      const who = c.username ? `${c.name} · ${c.username}` : c.name;
      const parts = [c.employeeCode, c.departmentLabel, STATUS_TEXT[c.status]].filter(Boolean);
      const expected = `${who} ${parts.join(' · ')}${c.linkedBy === 'email' ? ' · Matched by email' : ''}`;
      expect(names[i], `option ${i + 1}`).toBe(expected);
    }
  }

  /** Clicks the found candidate's option and waits for the picker to close on it. */
  async pick(found: FoundCandidate): Promise<void> {
    const c = found.candidate;
    const option = this.locators.pickerOptions
      .filter({ hasText: c.name })
      .filter({ hasText: c.username ?? c.employeeCode });
    await option.first().click();
    await expect(this.locators.pickerSearch).toBeHidden({ timeout: WAIT.SERVER });
    await expect(this.locators.employeePicker).toContainText(c.name);
  }

  // ── Picked person ───────────────────────────────────────────────────

  /** A `ready` person: their facts, Status "Ready", and the whole form usable. */
  async expectReadyPerson(c: AlertTimerCandidate): Promise<void> {
    const l = this.locators;
    await expect(l.personFact('Username')).toHaveText(c.username!);
    await expect(l.personFact('Email')).toHaveText(c.email ?? '—');
    await expect(l.personFact('Status')).toHaveText('Ready');
    await this.expectFormUsable();
    await expect(l.addButton).toBeEnabled();
  }

  /** Delivery, Channels and Sections are shown and editable. */
  async expectFormUsable(): Promise<void> {
    const l = this.locators;
    await expect(l.deliveryTabs).toHaveCount(3, { timeout: WAIT.SERVER });
    for (const tab of await l.deliveryTabs.all()) await expect(tab).toBeEnabled();
    await expect(l.channelsHeading).toBeVisible();
    await expect(l.sectionsHeading).toBeVisible();
    await expect(l.sections()).toHaveCount(SECTION_LABELS.length);
  }

  /** The form stays hidden: a panel with `title` and `text` instead, and Add disabled. */
  async expectBlockedPerson(title: string, text: string | RegExp): Promise<void> {
    const l = this.locators;
    await expect(l.blockedPanel.getByRole('heading')).toHaveText(title, { timeout: WAIT.SERVER });
    await expect(l.blockedPanel).toContainText(text);
    await this.expectNoForm();
  }

  /** An `already_set` person: who, their current timer, and a link to its Edit page. */
  async expectAlreadySetPerson(c: AlertTimerCandidate): Promise<void> {
    const l = this.locators;
    await expect(l.main.getByText(`${c.name} already has an alert timer`)).toBeVisible({
      timeout: WAIT.SERVER,
    });
    await expect(l.editTheirTimerLink).toHaveAttribute(
      'href',
      `${LIST}/${c.alertTimer?.userId ?? c.userId}/edit`,
    );
    await this.expectNoForm();
  }

  private async expectNoForm(): Promise<void> {
    const l = this.locators;
    await expect(l.deliveryTabs).toHaveCount(0);
    await expect(l.sectionsHeading).toHaveCount(0);
    await expect(l.addButton).toBeDisabled();
  }

  // ── Delivery ────────────────────────────────────────────────────────

  async selectedCadences(): Promise<string[]> {
    const names: string[] = [];
    for (const tab of await this.locators.deliveryTabs.all())
      if ((await tab.getAttribute('aria-selected')) === 'true')
        names.push((await tab.innerText()).trim());
    return names;
  }

  async expectCadence(cadence: Cadence): Promise<void> {
    await expect(this.locators.deliveryTab(cadence)).toHaveAttribute('aria-selected', 'true');
    expect(await this.selectedCadences(), 'exactly one cadence selected').toEqual([cadence]);
  }

  async chooseCadence(cadence: Cadence): Promise<void> {
    await this.locators.deliveryTab(cadence).click();
    await this.expectCadence(cadence);
  }

  /** Real time: no When fields. Daily: Time + Time zone. Weekly: Weekday + Time + Time zone. */
  async expectWhenFieldsFor(cadence: Cadence): Promise<void> {
    const l = this.locators;
    const show = { weekday: cadence === 'Weekly', time: cadence !== 'Real time' };
    await expect(l.weekday).toHaveCount(show.weekday ? 1 : 0);
    await expect(l.time).toHaveCount(show.time ? 1 : 0);
    await expect(l.timezone).toHaveCount(show.time ? 1 : 0);
  }

  async setWeekday(name: (typeof WEEKDAY_NAMES)[number]): Promise<void> {
    await this.locators.weekday.click();
    await this.locators.listOption(name).click();
    await expect(this.locators.weekday).toHaveText(name);
  }

  async setTime(time: string): Promise<void> {
    await this.locators.time.click();
    await this.locators.listOption(time).click();
    await expect(this.locators.time).toHaveText(time);
  }

  /** Every value the Time select offers. */
  async timeOptions(): Promise<string[]> {
    await this.locators.time.click();
    await expect(this.locators.listOptions().first()).toBeVisible();
    const options = (await this.locators.listOptions().allInnerTexts()).map((t) => t.trim());
    await this.page.keyboard.press('Escape');
    await expect(this.locators.listOptions()).toHaveCount(0);
    return options;
  }

  async turnOff(): Promise<void> {
    await this.locators.turnOffButton.click();
    await this.expectOff();
  }

  async turnBackOn(): Promise<void> {
    await this.locators.turnBackOnButton.click();
    await expect(this.locators.turnOffButton).toBeVisible();
  }

  /** Off: the link reads "Off · turn back on", the note shows, the rest of the form is hidden. */
  async expectOff(): Promise<void> {
    const l = this.locators;
    await expect(l.turnBackOnButton).toHaveText('Off · turn back on');
    await expect(l.offNote).toBeVisible();
    for (const tab of await l.deliveryTabs.all()) await expect(tab).toBeDisabled();
    await expect(l.channelsHeading).toHaveCount(0);
    await expect(l.sectionsHeading).toHaveCount(0);
    await expect(l.sections()).toHaveCount(0);
    await expect(l.time).toHaveCount(0);
  }

  // ── Channels and sections ───────────────────────────────────────────

  async checkedSections(): Promise<string[]> {
    const checked: string[] = [];
    for (const label of SECTION_LABELS)
      if (await this.locators.section(label).isChecked()) checked.push(SECTION_CODE[label]);
    return checked;
  }

  async checkedChannels(): Promise<string[]> {
    const checked: string[] = [];
    for (const ch of ['In-app', 'Email'] as const)
      if (await this.locators.channel(ch).isChecked()) checked.push(CHANNEL_CODE[ch]);
    return checked;
  }

  async setSection(label: SectionLabel, on: boolean): Promise<void> {
    const box = this.locators.section(label);
    if ((await box.isChecked()) !== on) await box.click();
    await expect(box).toHaveAttribute('aria-checked', String(on));
  }

  async setChannel(channel: Channel, on: boolean): Promise<void> {
    const box = this.locators.channel(channel);
    if ((await box.isChecked()) !== on) await box.click();
    await expect(box).toHaveAttribute('aria-checked', String(on));
  }

  /** The current state of an On form, in the API's codes. */
  async state(): Promise<FormState> {
    const l = this.locators;
    await expect(l.turnOffButton, 'the timer is on').toBeVisible();
    const selected = (await this.selectedCadences())[0] as Cadence;
    const read = async (box: typeof l.time) =>
      (await box.count()) > 0 ? (await box.innerText()).trim() : null;
    return {
      isEnabled: true,
      cadence: CADENCE_CODE[selected],
      weekday: await read(l.weekday),
      time: await read(l.time),
      timezone: await read(l.timezone),
      sections: await this.checkedSections(),
      channels: await this.checkedChannels(),
    };
  }

  /**
   * Unticks the ticked sections one at a time: the submit button stays
   * enabled until the last one goes, then it disables and "Choose at least
   * one section." shows.
   */
  async untickEverySection(): Promise<void> {
    const on: SectionLabel[] = [];
    for (const label of SECTION_LABELS)
      if (await this.locators.section(label).isChecked()) on.push(label);
    expect(on.length, 'sections ticked to start with').toBeGreaterThan(0);
    for (const [i, label] of on.entries()) {
      await this.setSection(label, false);
      if (i < on.length - 1) await expect(this.submitButton()).toBeEnabled();
    }
    await expect(
      this.locators.alerts.filter({ hasText: 'Choose at least one section.' }),
    ).toBeVisible();
    await expect(this.submitButton()).toBeDisabled();
  }

  /**
   * Leaves exactly one channel ticked, then clicks it: the click is
   * refused (still ticked) and "Keep at least one channel." shows.
   */
  async tryToUntickLastChannel(): Promise<void> {
    const l = this.locators;
    const keep: Channel = (await l.inAppChannel.isEnabled()) ? 'In-app' : 'Email';
    await this.setChannel(keep, true);
    await this.setChannel(keep === 'In-app' ? 'Email' : 'In-app', false);
    const last = l.channel(keep);
    await last.click();
    await expect(last).toHaveAttribute('aria-checked', 'true');
    await expect(l.alerts.filter({ hasText: 'Keep at least one channel.' })).toBeVisible();
  }

  /** Email can't be ticked and says why. */
  async expectEmailChannelUnavailable(): Promise<void> {
    await expect(this.locators.emailChannel).toBeDisabled();
    await expect(this.locators.noEmailHint).toBeVisible();
  }

  /** Sections render in the one fixed order, whatever was ticked when; nothing reorders them. */
  async expectSectionsInFixedOrder(): Promise<void> {
    const boxes = this.locators.sections();
    await expect(boxes).toHaveCount(SECTION_LABELS.length);
    for (const [i, label] of SECTION_LABELS.entries())
      await expect(boxes.nth(i), `section ${i + 1}`).toHaveAccessibleName(
        new RegExp(`^${label}\\b`),
      );
    await expect(this.locators.reorderControls()).toHaveCount(0);
  }

  // ── Submit ──────────────────────────────────────────────────────────

  /** "Add alert timer" on New, "Save" on Edit. */
  submitButton() {
    return this.locators.addButton.or(this.locators.saveButton);
  }

  async expectSubmitLabel(label: 'Add alert timer' | 'Save'): Promise<void> {
    await expect(this.submitButton()).toHaveText(label);
    const other = label === 'Save' ? this.locators.addButton : this.locators.saveButton;
    await expect(other).toHaveCount(0);
  }

  /** Clicks Add / Save and returns the request the form sent. */
  async submit(net: AlertTimersNetwork): Promise<RecordedWrite> {
    const before = net.writes.length;
    await this.submitButton().click();
    return net.writeAfter(before);
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.locators.toast(text)).toBeVisible({ timeout: WAIT.SERVER });
  }

  async expectAlert(text: string): Promise<void> {
    await expect(this.locators.alerts.filter({ hasText: text })).toBeVisible({
      timeout: WAIT.SERVER,
    });
  }

  async expectNoToast(text: string): Promise<void> {
    await expect(this.locators.toast(text)).toHaveCount(0);
  }

  /** A blocked person shows none of the Username / Group / Email / Status facts. */
  async expectNoPersonFacts(): Promise<void> {
    await expect(this.locators.personFacts).toHaveCount(0);
  }

  async expectOnEdit(userId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LIST}/${userId}/edit$`));
    await this.expectEditReady();
  }

  async expectStillOnNew(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${NEW}$`));
    await expect(this.locators.heading).toHaveText('New alert timer');
  }

  async expectOnList(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LIST}$`), { timeout: WAIT.NAVIGATION });
  }

  async expectOnDetails(userId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LIST}/${userId}$`), {
      timeout: WAIT.NAVIGATION,
    });
  }

  /** After a create race: on that person's Edit page, with the "added a moment ago" notice. */
  async expectAddedElsewhereNotice(userId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LIST}/${userId}/edit\\?notice=added$`), {
      timeout: WAIT.NAVIGATION,
    });
    await expect(this.locators.addedNotice).toHaveText(
      'An alert timer was added for this person a moment ago. You are now editing it.',
      { timeout: WAIT.PAGE_LOAD },
    );
    await this.expectEditReady();
  }

  /** The version-conflict banner, with its Reload. */
  async expectConflictBanner(): Promise<void> {
    const banner = this.locators.alerts.filter({ has: this.locators.reloadButton });
    await expect(banner).toContainText(
      'This alert timer was changed by someone else. Reload to see the latest.',
      { timeout: WAIT.SERVER },
    );
  }

  /** Reload re-reads the timer: the banner goes and the form is usable again. */
  async reloadAfterConflict(): Promise<void> {
    await this.locators.reloadButton.click();
    await expect(this.locators.reloadButton).toHaveCount(0, { timeout: WAIT.SERVER });
    await this.expectEditReady();
  }

  // ── Edit specifics ──────────────────────────────────────────────────

  /** Edit shows the person as fixed context (heading + username), with no Employee picker. */
  async expectFixedPerson(row: AlertTimerRow): Promise<void> {
    await expect(this.locators.heading).toHaveText(row.displayName ?? row.userId);
    await expect(
      this.locators.main.getByText(row.username ?? row.userId, { exact: true }).first(),
    ).toBeVisible();
    await expect(this.locators.employeePicker).toHaveCount(0);
  }

  /** Nothing on the page returns a timer to "not set": only Turn off. */
  async expectNoResetControl(): Promise<void> {
    await this.expectEditReady();
    await expect(this.locators.resetControls()).toHaveCount(0);
    await expect(this.locators.turnOffButton.or(this.locators.turnBackOnButton)).toBeVisible();
  }

  /** The loading state: the picker is a skeleton (no combobox) and Add is disabled. */
  async expectLoadingSkeleton(): Promise<void> {
    await expect(this.locators.heading).toHaveText('New alert timer', { timeout: WAIT.PAGE_LOAD });
    await expect(this.locators.employeePicker).toHaveCount(0);
    await expect(this.locators.addButton).toBeDisabled();
  }

  /** Sets the form to `values` (cadence, weekday/time, sections, channels). */
  async fill(values: {
    cadence: Cadence;
    weekday?: (typeof WEEKDAY_NAMES)[number];
    time?: string;
    sections: SectionLabel[];
    channels: Channel[];
  }): Promise<void> {
    await this.chooseCadence(values.cadence);
    if (values.weekday) await this.setWeekday(values.weekday);
    if (values.time) await this.setTime(values.time);
    // Tick the wanted ones first, so a section / channel is never left empty in between.
    for (const s of values.sections) await this.setSection(s, true);
    for (const s of SECTION_LABELS)
      if (!values.sections.includes(s)) await this.setSection(s, false);
    for (const c of values.channels) await this.setChannel(c, true);
    for (const c of ['In-app', 'Email'] as const)
      if (!values.channels.includes(c)) await this.setChannel(c, false);
  }
}

export { SECTION_CODE, CHANNEL_CODE };
