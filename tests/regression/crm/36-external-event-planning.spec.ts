import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import { PLANNING_AI_SECTIONS } from '../../../src/pages/crm/external-events.page';

/**
 * CRM — External Event Planning (Sprint 5).
 *
 * Source of truth: ClickUp test-case set https://app.clickup.com/t/z941abyq77
 * (user story https://app.clickup.com/t/86eye4du0). Confirmed against dev
 * 2026-10-15 — see external-events.page.ts's "Planning tab" section doc.
 *
 * Data constraints, confirmed live:
 * - dev has NO non-elapsed Planning event: the Planning tab holds only
 *   "Planning · Elapsed" AI events, which offer no status buttons at all.
 * - A manually-created event is always born type "Other", status
 *   "Attended" (28-/29-*.spec.ts), so there is no event we can create
 *   that offers "To Attend".
 * - AI/seeded events must never have their status changed by this suite.
 *
 * So every To Attend transition TC (TC:11/12/14/19) is `test.fixme()`'d
 * on the transition itself, after running whatever READ-ONLY part can be
 * checked against existing events in the needed state. Everything else
 * here is read-only (opening events, switching tabs, opening the
 * Register Online link in a new tab), except TC:21, which creates its own
 * manual "Other" event.
 *
 * Coverage that already exists and is NOT duplicated here:
 * 23-external-event-details.spec.ts (lock/unlock of Feedback Form/Leads,
 * decline modal validation/cancel), 22-* (List tabs/search/sort),
 * 28-/29-* (manual create + Overview details).
 */

const NO_FRESH_PLANNING_EVENT =
  'dev has no non-elapsed Planning event (Planning tab holds only "Planning · Elapsed" AI events, which offer no To Attend button), ' +
  'and a manually-created event is always born "Other"/Attended — so there is no event this suite owns that can be marked To Attend, ' +
  'and AI/seeded events must not be changed. Re-enable once a Planning event can be created (or seeded per-run) for tests.';

test.describe('CRM - External Event Planning (Sprint 5)', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('External Event Planning');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Navigation to External Event Details via SSO', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7a', 'TC:1 (ClickUp)');
    const l = externalEventsPage.locators;

    await test.step('Reach CRM External Events through the SSO session — no separate CRM login', async () => {
      await externalEventsPage.openList();
      await externalEventsPage.expectListLoaded();
      await expect(l.ssoPasswordInput).toHaveCount(0);
      await expect(page).toHaveURL(/\/crm\/events$/);
    });

    let title = '';
    await test.step('Click an event in the Planning tab', async () => {
      await externalEventsPage.selectStatusTab('Planning');
      const row = await externalEventsPage.openRow(l.aiEventRows().first());
      title = row.title;
    });

    await test.step('The Details screen opens on the Planning tab for that event', async () => {
      await expect(page).toHaveURL(/\/crm\/events\/[0-9a-f-]{36}/);
      await expect(l.eventTitleHeading).toHaveText(title);
      await expect(l.planningTabButton).toBeVisible();
      // Planning is the default tab: its AI sections render without
      // clicking anything, and neither Feedback Form nor Leads content is shown.
      await expect(l.sectionHeading('External Event Summary')).toBeVisible();
      await expect(page.getByText(/^The Feedback Form opens once/)).toHaveCount(0);
    });
  });

  test('TC:2 Verify External Event Header Details', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7c', 'TC:2 (ClickUp)');
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.openFirstAiEventInTab('Planning');
    expect(row, 'expected at least one AI event on the Planning tab').not.toBeNull();

    await test.step('Header shows title, status and "Event: External Event · <value> · <date> · <venue>"', async () => {
      await expect(l.eventTitleHeading).toHaveText(row!.title);
      expect(await externalEventsPage.headerStatus()).toBe(row!.status);
      await expect(l.eventTypeLine).toHaveText(/^Event: External Event · [^·]+ · [^·]+/);
      expect(await externalEventsPage.headerEventType()).toBe(row!.type);
    });

    await test.step('System section shows Title, External Event value, Status, Created/Updated On/By — read-only', async () => {
      await externalEventsPage.expectSystemField('External Event Title', row!.title);
      await externalEventsPage.expectSystemField('External Event', row!.type);
      await externalEventsPage.expectSystemField('Status', /\S+/);
      await externalEventsPage.expectSystemField('Created On', /\d{1,2}\/\d{1,2}\/\d{4}/);
      await externalEventsPage.expectSystemField('Created By', /\S+/);
      await externalEventsPage.expectSystemField('Updated On', /\d{1,2}\/\d{1,2}\/\d{4}/);
      await externalEventsPage.expectSystemField('Updated By', /\S+/);
      await externalEventsPage.expectSystemReadOnly();
    });

    await test.step('BUG: no event ID (e.g. "EV-2026-019") is shown in the header', async () => {
      // ClickUp/prototype expect an event ID next to the title; dev renders
      // none anywhere on the screen (the only identifier is the UUID in the URL).
      await expect(l.eventIdText).toHaveCount(0);
    });
  });

  test('TC:3 Verify Event Value for Each Event Type', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7d', 'TC:3 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    const missing: string[] = [];
    for (const type of ['Trade Fair', 'Fashion Show', 'Sales Summit', 'Exhibition']) {
      await test.step(`${type}: header and System show the same Event value as the List`, async () => {
        const row = await externalEventsPage.openFirstEventOfType(type);
        if (row === null) {
          missing.push(type);
          return;
        }
        await expect(l.eventTypeLine).toHaveText(new RegExp(`^Event: External Event · ${type} · `));
        await externalEventsPage.expectSystemField('External Event', type);
      });
    }

    test.fixme(
      missing.length > 0,
      `No "${missing.join('", "')}" event exists on dev (types present: Trade Fair, Exhibition, Fashion Show, Other) — the other types were verified.`,
    );
  });

  test('TC:4 Verify Owner Drop-down List', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7e', 'TC:4 (ClickUp)');
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.openFirstAiEventInTab('Planning');
    expect(row).not.toBeNull();

    const ownerCount =
      await test.step('Look for an Owner drop-down on the Details screen', async () => {
        return l.ownerControl.count();
      });

    test.fixme(
      ownerCount === 0,
      'Owner drop-down (FR-03 / AC-03) not present on dev — Planning tab and System section have no Owner control (matches the prototype). Confirm scope with the team.',
    );
  });

  test('TC:5 Verify AI-Generated Planning Artifacts Are Displayed', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7f', 'TC:5 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.findAiEvent(
      async () => !(await externalEventsPage.hasAnyPlaceholderSection()),
    );
    expect(row, 'expected an AI event whose artifacts all generated').not.toBeNull();

    await test.step('External Event Summary, Participant Summary, Visitor Summary, Schedule and Contact Details are shown with content', async () => {
      await externalEventsPage.expectSectionsWithContent(PLANNING_AI_SECTIONS);
    });

    const missingCount =
      await test.step('Look for Sales Potential Report and Participation Plan', async () => {
        return (
          (await l.sectionHeading(/Sales Potential Report/i).count()) +
          (await l.sectionHeading(/Participation Plan/i).count())
        );
      });

    test.fixme(
      missingCount === 0,
      'Sales Potential Report and Participation Plan (FR-07/FR-08) not present on dev (nor in the prototype) — confirm scope. The other 5 sections were verified.',
    );
  });

  test('TC:6 Verify AI Artifacts Match the Selected Event', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7h', 'TC:6 (ClickUp)');
    const l = externalEventsPage.locators;

    let aTitle = '';
    let aSummary = '';
    await test.step('Open Event A and note its title, type and AI content', async () => {
      const a = await externalEventsPage.openFirstAiEventInTab('Planning', 0);
      expect(a).not.toBeNull();
      aTitle = a!.title;
      await expect(l.eventTitleHeading).toHaveText(aTitle);
      expect(await externalEventsPage.headerEventType()).toBe(a!.type);
      await externalEventsPage.expectSystemField('External Event Title', aTitle);
      aSummary = (await externalEventsPage.sectionText('External Event Summary'))
        .replace('External Event Summary', '')
        .replace('Generated by AI', '')
        .trim();
    });

    await test.step('Open a different Event B — it shows its own content, nothing carried over from A', async () => {
      const b = await externalEventsPage.openFirstAiEventInTab('Planning', 1);
      expect(b, 'expected a second AI event on the Planning tab').not.toBeNull();
      expect(b!.title).not.toBe(aTitle);
      await expect(l.eventTitleHeading).toHaveText(b!.title);
      await externalEventsPage.expectSystemField('External Event Title', b!.title);
      await expect(page.locator('main').last()).not.toContainText(aTitle);
      const bSummary = await externalEventsPage.sectionText('External Event Summary');
      expect(bSummary).not.toContain(aSummary);
    });
  });

  test('TC:7 Verify Register Online When Online Registration Exists', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7j', 'TC:7 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.findAiEvent(() => externalEventsPage.hasRegisterOnline());
    expect(row, 'expected an AI event with an online registration link').not.toBeNull();
    const eventUrl = page.url();
    const href = await externalEventsPage.registerOnlineHref();

    await test.step('Register Online is shown in the Schedule section with "Online registration exists — <site>"', async () => {
      const schedule = l.sectionCard('External Event Schedule');
      await expect(schedule.getByRole('link', { name: 'Register Online' })).toBeVisible();
      await expect(schedule.locator(l.onlineRegistrationNote)).toBeVisible();
      const site = (await l.onlineRegistrationNote.innerText()).split('— ')[1]?.trim() ?? '';
      expect(site.length).toBeGreaterThan(0);
      expect(new URL(href).hostname).toContain(site);
    });

    await test.step('Clicking it opens the registration page in a new tab; CRM stays on the same event', async () => {
      const newTab = await externalEventsPage.clickRegisterOnlineAndAwaitNewTab();
      expect(newTab, 'expected a new browser tab for registration').not.toBeNull();
      expect(newTab!.url()).toContain(new URL(href).hostname);
      await newTab!.close();
      expect(page.url()).toBe(eventUrl);
      await expect(l.eventTitleHeading).toHaveText(row!.title);
    });

    await test.step('BUG: no "Redirected to the event\'s online registration page" confirmation is shown', async () => {
      // Expected per ClickUp/prototype: a confirmation toast. Dev shows none
      // (the link is a plain target=_blank anchor).
      await page.waitForTimeout(1000);
      await expect(
        page.getByText("Redirected to the event's online registration page"),
      ).toHaveCount(0);
    });
  });

  test('TC:8 Verify Register Online Is Hidden When No Online Registration Exists', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7r', 'TC:8 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.findAiEvent(
      async () => !(await externalEventsPage.hasRegisterOnline()),
    );
    expect(row, 'expected an AI event without an online registration link').not.toBeNull();

    await test.step('No Register Online button and no "Online registration exists" note', async () => {
      await expect(l.sectionCard('External Event Schedule')).toBeVisible();
      await expect(l.registerOnlineLink).toHaveCount(0);
      await expect(l.onlineRegistrationNote).toHaveCount(0);
    });

    await test.step('The rest of the Planning tab works normally', async () => {
      await expect(l.sectionHeading('External Event Summary')).toBeVisible();
      await expect(l.sectionHeading('System')).toBeVisible();
      await externalEventsPage.openFeedbackFormTab();
      await expect(l.sectionHeading('External Event Summary')).toHaveCount(0);
      await l.planningTabButton.click();
      await expect(l.sectionHeading('External Event Summary')).toBeVisible();
    });
  });

  test('TC:9 Verify External Event Contact Details Are Displayed', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7u', 'TC:9 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;
    const contact = "External Event's Contact Details";

    const row = await externalEventsPage.findAiEvent(
      async () => !(await externalEventsPage.isSectionPlaceholder(contact)),
    );
    expect(row, 'expected an AI event with contact details').not.toBeNull();

    await test.step("The Contact Details section shows this event's contact information", async () => {
      const card = l.sectionCard(contact);
      await expect(card).toBeVisible();
      await expect(card).toContainText('Generated by AI');
      await expect(card).toContainText(/[\w.+-]+@[\w-]+\.[\w.]+/);
      await expect(card.locator(l.aiPlaceholderText)).toHaveCount(0);
      await expect(l.eventTitleHeading).toHaveText(row!.title);
    });
  });

  test('TC:10 Verify Contact Details Section Is Hidden When No Contact Details Exist', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7v', 'TC:10 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;
    const contact = "External Event's Contact Details";

    const row = await externalEventsPage.findAiEvent(() =>
      externalEventsPage.isSectionPlaceholder(contact),
    );
    expect(row, 'expected an AI event with no contact details').not.toBeNull();

    await test.step('BUG: the Contact Details section is still shown, with a "no relevant information" placeholder', async () => {
      // AC-08 / Alternate Flow A2 expects the section to be hidden. Dev
      // renders the card with "Unfortunately, no relevant information is
      // available for the External Event's Contact Details online." instead.
      const card = l.sectionCard(contact);
      await expect(card).toBeVisible();
      await expect(card.locator(l.aiPlaceholderText)).toBeVisible();
    });

    await test.step('The rest of the screen is unaffected — no broken section', async () => {
      await expect(l.sectionHeading('External Event Summary')).toBeVisible();
      await expect(l.sectionHeading('System')).toBeVisible();
    });

    test.info().annotations.push({
      type: 'partial',
      description: `"To Attend still works" not exercised: ${NO_FRESH_PLANNING_EVENT}`,
    });
  });

  test('TC:11 Verify Marking an External Event as To Attend', async () => {
    await allure.tms('https://app.clickup.com/t/z941abyq7w', 'TC:11 (ClickUp)');
    test.fixme(true, NO_FRESH_PLANNING_EVENT);
  });

  test('TC:12 Verify To Attend Status Is Reflected in the External Events List', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7x', 'TC:12 (ClickUp)');
    const l = externalEventsPage.locators;

    let toAttendTitles: string[] = [];
    await test.step('Read-only: every To Attend event is listed with status To Attend and the tab count matches', async () => {
      await externalEventsPage.openStatusTab('To Attend');
      const expected = await externalEventsPage.statusTabCount('To Attend');
      const rows = await externalEventsPage.readAllRows();
      expect(rows.length).toBe(expected);
      for (const r of rows) expect(r.status, r.title).toBe('To Attend');
      toAttendTitles = rows.map((r) => r.title);
    });

    await test.step('Read-only: none of them is under the Planning tab', async () => {
      await externalEventsPage.selectStatusTab('Planning');
      await expect(l.tableRows().first()).toBeVisible();
      const planning = await externalEventsPage.readAllRows();
      for (const r of planning) {
        expect(r.status).toMatch(/^Planning/);
      }
      // Titles are not unique on dev (e.g. two "Kingpins Amsterdam"), so
      // compare on status per row rather than title membership.
      expect(toAttendTitles.length).toBeGreaterThan(0);
    });

    test.fixme(
      true,
      `The +1 To Attend / -1 Planning count change cannot be checked: ${NO_FRESH_PLANNING_EVENT}`,
    );
  });

  test('TC:13 Verify To Attend Status Persists', async ({ externalEventsPage, page }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq7y', 'TC:13 (ClickUp)');
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.openFirstAiEventInTab('To Attend');
    expect(row, 'expected an existing To Attend event').not.toBeNull();
    const eventUrl = page.url();

    await test.step('An event marked To Attend shows To Attend with Updated On/By in System', async () => {
      expect(await externalEventsPage.headerStatus()).toBe('To Attend');
      await externalEventsPage.expectSystemField('Status', 'To Attend');
      await externalEventsPage.expectSystemField('Updated On', /\d{1,2}\/\d{1,2}\/\d{4}/);
      await externalEventsPage.expectSystemField('Updated By', /\S+/);
    });

    await test.step('Status persists after reloading the Details screen', async () => {
      await page.reload();
      await externalEventsPage.waitForDetailsLoaded();
      expect(await externalEventsPage.headerStatus()).toBe('To Attend');
      await externalEventsPage.expectSystemField('Status', 'To Attend');
    });

    await test.step('Status persists after a fresh SSO-redeemed navigation back to the event', async () => {
      await externalEventsPage.openEventById(eventUrl.split('/').pop()!);
      await externalEventsPage.waitForDetailsLoaded();
      await expect(l.eventTitleHeading).toHaveText(row!.title);
      expect(await externalEventsPage.headerStatus()).toBe('To Attend');
    });

    test.info().annotations.push({
      type: 'partial',
      description: `Verified on an existing To Attend event (read-only); marking one, and an explicit logout/login, not exercised: ${NO_FRESH_PLANNING_EVENT}`,
    });
  });

  test('TC:14 Verify Manager Notification and Audit Trail on To Attend', async () => {
    await allure.tms('https://app.clickup.com/t/z941abyq7z', 'TC:14 (ClickUp)');
    test.fixme(
      true,
      `Needs a To Attend transition (${NO_FRESH_PLANNING_EVENT}); the manager email needs a mailbox this suite cannot read, and dev has no per-event activity/audit log (System shows only Updated On/By).`,
    );
  });

  test('TC:15 Verify AI Artifact Generation Failure Handling', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq81', 'TC:15 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    const row = await externalEventsPage.findAiEvent(
      () => externalEventsPage.hasAnyPlaceholderSection(),
      ['To Attend', 'Planning', 'Attended', 'Not Attending'],
    );
    expect(
      row,
      'expected an AI event with at least one artifact that failed to generate',
    ).not.toBeNull();

    const failed: string[] = [];
    const ok: string[] = [];
    await test.step('Each failed artifact shows a clear "no relevant information" message', async () => {
      for (const name of PLANNING_AI_SECTIONS) {
        if (await externalEventsPage.isSectionPlaceholder(name)) failed.push(name);
        else ok.push(name);
      }
      expect(failed.length).toBeGreaterThan(0);
      for (const name of failed) {
        await expect(l.sectionCard(name)).toContainText(
          `Unfortunately, no relevant information is available for the ${name} online.`,
        );
      }
    });

    await test.step('Other artifacts, event details and the decision buttons still work — nothing blocks the screen', async () => {
      await externalEventsPage.expectSectionsWithContent(ok);
      await expect(l.eventTitleHeading).toHaveText(row!.title);
      await externalEventsPage.expectSystemField('External Event Title', row!.title);
      if (row!.status === 'To Attend') await externalEventsPage.expectToAttendDecisionButtons();
      await externalEventsPage.openFeedbackFormTab();
      await l.planningTabButton.click();
      await expect(l.sectionHeading('External Event Summary')).toBeVisible();
    });

    test.info().annotations.push({
      type: 'partial',
      description: `"Click To Attend" not exercised: ${NO_FRESH_PLANNING_EVENT}`,
    });
  });

  test('TC:16 Verify To Attend Is Not Offered for Events Not in Planning', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq83', 'TC:16 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;

    await test.step('A To Attend event shows Mark Attended and Not Attending, no To Attend', async () => {
      const row = await externalEventsPage.openFirstAiEventInTab('To Attend');
      expect(row).not.toBeNull();
      await externalEventsPage.expectToAttendDecisionButtons();
    });

    await test.step('An Attended event shows no status buttons and its Feedback Form/Leads tabs are open', async () => {
      const row = await externalEventsPage.openFirstAiEventInTab('Attended');
      expect(row).not.toBeNull();
      await externalEventsPage.expectNoStatusButtons();
      await externalEventsPage.expectFeedbackAndLeadsUnlocked();
    });

    await test.step('A Not Attending event shows "Not Attending — <reasons>" and no status buttons', async () => {
      const row = await externalEventsPage.openFirstAiEventInTab('Not Attending');
      expect(row).not.toBeNull();
      await expect(l.notAttendingNote).toBeVisible();
      await expect(l.notAttendingNote).toHaveText(/^Not Attending — .+/);
      await externalEventsPage.expectNoStatusButtons();
    });
  });

  test('TC:17 Verify Elapsed External Event Behaviour', async ({ externalEventsPage }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq84', 'TC:17 (ClickUp)');
    const l = externalEventsPage.locators;

    let row: Awaited<ReturnType<typeof externalEventsPage.openFirstAiEventInTab>> = null;
    await test.step('The event is listed under Elapsed with status "Planning · Elapsed"', async () => {
      await externalEventsPage.openStatusTab('Elapsed');
      const rows = await externalEventsPage.readAllRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.status, r.title).toBe('Planning · Elapsed');
      row = await externalEventsPage.openRow(l.tableRows().first());
    });

    await test.step('Header shows "Planning · Elapsed" with the elapsed banner', async () => {
      expect(row).not.toBeNull();
      expect(await externalEventsPage.headerStatus()).toBe('Planning · Elapsed');
      await expect(l.elapsedBanner).toBeVisible();
    });

    await test.step('To Attend is blocked on an elapsed event — no status buttons are offered', async () => {
      // ClickUp leaves the rule open ("allowed or blocked — confirm");
      // dev's actual rule is "blocked": no decision buttons at all.
      await externalEventsPage.expectNoStatusButtons();
    });
  });

  test('TC:19 Verify Double-Click on To Attend Updates Once', async () => {
    await allure.tms('https://app.clickup.com/t/z941abyq86', 'TC:19 (ClickUp)');
    test.fixme(true, NO_FRESH_PLANNING_EVENT);
  });

  test('TC:20 Verify Opening an External Event That Does Not Exist', async ({
    externalEventsPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq87', 'TC:20 (ClickUp)');
    const l = externalEventsPage.locators;

    await test.step('A well-formed but unknown event ID shows "Event not found." and a back link', async () => {
      await externalEventsPage.openEventById('00000000-0000-0000-0000-000000000000');
      await expect(l.eventNotFoundMessage).toBeVisible({ timeout: 30_000 });
      await expect(l.backToEventsLink).toBeVisible();
    });

    await test.step('The back link returns to the External Events list', async () => {
      await l.backToEventsLink.click();
      await expect(page).toHaveURL(/\/crm\/events$/);
      await expect(l.pageHeading).toBeVisible();
    });

    await test.step('An EV-style ID (EV-9999-999) shows a load error, with no back link', async () => {
      // Dev shows "Couldn't load this event. It may not exist, or the CRM
      // service is unavailable." with no back link. Not a bug: CRM screens
      // don't provide a back link — users leave via the side navigation
      // (confirmed with the team 2026-10-15).
      await externalEventsPage.openEventById('EV-9999-999');
      await expect(l.eventLoadErrorMessage).toBeVisible({ timeout: 30_000 });
      await expect(l.eventNotFoundMessage).toHaveCount(0);
      await expect(l.backToEventsLink).toHaveCount(0);
    });
  });

  test('TC:21 Verify Planning Tab Content for an "Other" Type Event', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq88', 'TC:21 (ClickUp)');
    test.slow();
    const l = externalEventsPage.locators;
    const details = {
      title: `Regression Planning Other Event ${Date.now()}`,
      venue: 'Regression Planning Venue',
      date: '2026-09-20',
      about: 'A regression "Other" event for the Planning tab check.',
      attendee: 'Alice Planner',
      score: 7,
      numberOfLeads: 1,
      wentWell: 'Good turnout.',
      couldBeBetter: 'Nothing major.',
      attendNextEditions: 'Yes',
    };

    await test.step('Create a manual ("Other") event', async () => {
      await externalEventsPage.createManualEvent(details);
      await expect(l.eventTitleHeading).toHaveText(details.title);
      expect(await externalEventsPage.headerEventType()).toBe('Other');
    });

    await test.step('The first tab is Overview, not Planning', async () => {
      await expect(l.overviewTabButton).toBeVisible();
      await expect(l.planningTabButton).toHaveCount(0);
    });

    await test.step('Overview shows Title, Venue, Date, About and System — no AI planning artifacts', async () => {
      await externalEventsPage.openOverviewTab();
      await externalEventsPage.expectOverviewShows({
        title: details.title,
        venue: details.venue,
        about: details.about,
        status: 'Attended',
      });
      await expect(l.sectionCard('External Event')).toContainText(
        /External Event Date\s*Sep 20, 2026/i,
      );
      for (const name of PLANNING_AI_SECTIONS) await expect(l.sectionHeading(name)).toHaveCount(0);
      await expect(l.eventTypeLine).not.toContainText('Generated by AI');
    });

    await test.step('Status buttons: none — a manual event is born Attended, so there is no decision left', async () => {
      // ClickUp expects To Attend / Not Attending "work the same as for
      // other event types"; dev saves every manual event straight to
      // Attended (the create form requires the Feedback Form), and Attended
      // events — of any type — show no status buttons (same as TC:16).
      await externalEventsPage.expectNoStatusButtons();
    });
  });
});

test.describe('CRM - External Event Planning (Sprint 5) - access', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('External Event Planning');
    await allure.owner('CRM QA');
  });

  test('TC:18 Verify Access Is Restricted Without SSO Session or External Events Rights', async ({
    externalEventsPage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abyq85', 'TC:18 (ClickUp)');

    await test.step('Without a session, a direct Details URL shows the sign-in gate and no event data', async () => {
      // Seeded AI event "Munich Fabric Start / Bluezone" (read-only).
      await externalEventsPage.gotoUnauthenticated(
        '/crm/events/e5100000-0000-4000-8000-000000000001',
      );
      await externalEventsPage.expectSignInGateWithoutEventData(/Munich Fabric Start/);
    });

    await test.step('Signing in goes to the SSO (Keycloak) login form', async () => {
      await externalEventsPage.expectSignInLeadsToSsoLogin();
    });

    test.fixme(
      true,
      'The "user without External Events rights" half needs a restricted SSO user (e.g. CRM_EXECUTIVE_USER_DEV), which is not configured in .env.',
    );
  });
});
