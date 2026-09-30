import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';

/**
 * CRM — Generate Key Meeting Notes (Sprint 2).
 *
 * Source of truth: test-cases/crm/generate-key-meeting-notes.md (ClickUp
 * task https://app.clickup.com/t/z941abtab7, User Story
 * https://app.clickup.com/t/86eyja0d9). NOT yet confirmed against a
 * running app — locators and interactions in key-meeting-notes.page.ts are
 * a best guess from three related ClickUp user stories' text (see the note
 * atop key-meeting-notes.locators.ts, especially around the
 * generate-dialog-vs-two-screens and section-label assumptions). Every
 * test here needs a real live run before it's trusted the way
 * create-contact.spec.ts and create-customer.spec.ts now are.
 */
test.describe('CRM - Generate Key Meeting Notes', () => {
  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Generate Key Meeting Notes');
    await allure.owner('CRM QA');
  });

  /** Every test needs a real Customer to generate Key Meeting Notes against. */
  async function createTestCustomer(
    createCustomerPage: import('../../../src/pages/crm/create-customer.page').CreateCustomerPage,
    page: import('@playwright/test').Page,
  ): Promise<string> {
    const customerName = `Playwright KMN Customer ${Date.now()}`;
    await createCustomerPage.openFromCrmHome();
    await createCustomerPage.fillProfile({
      name: customerName,
      email: `pw-kmn-${Date.now()}@example.com`,
      city: 'Coimbatore',
      country: 'India',
      originType: 'Referral',
      origin: 'Internal Referral',
      buyer: 'Fabric',
      referredBy: 'Jordan Smith',
      crmStage: 'Lead',
    });
    await createCustomerPage.save();
    if (await createCustomerPage.locators.duplicateWarningModal.isVisible().catch(() => false)) {
      await createCustomerPage.locators.saveAnywayButton.click();
    }
    await createCustomerPage.expectSavedSuccessfully();
    await createCustomerPage.locators.postSaveCancelButton.click();
    await expect(page).toHaveURL(/\/crm\/customers\/[0-9a-f-]+$/);
    return page.url().split('/').pop()!;
  }

  test('TC:1 Verify opening the "Generate Key Meeting Notes" modal', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtab8', 'TC:1 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);

    await test.step('Open the Generate Key Meeting Notes modal from Customer Details', async () => {
      await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    });

    await test.step('The modal opens', async () => {
      await keyMeetingNotesPage.expectGenerateDialogVisible();
    });
  });

  test('TC:2 Verify file upload and readiness state before generation', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtab9', 'TC:2 (ClickUp)');

    const customerId = await createTestCustomer(createCustomerPage, page);
    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);

    await test.step('Upload a source file', async () => {
      await keyMeetingNotesPage.uploadSourceFile();
    });

    await test.step('The modal shows a "ready to generate" state', async () => {
      await keyMeetingNotesPage.expectReadyToGenerate();
    });
  });

  test('TC:3 Verify AI generation of structured notes draft (Agenda, Discussion Points, Action Items)', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtaba', 'TC:3 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget (same as TC:4/6/7).
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page);
    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    await keyMeetingNotesPage.uploadSourceFile();

    await test.step('Generate the draft', async () => {
      await keyMeetingNotesPage.generateDraft();
    });

    await test.step('Structured sections are populated', async () => {
      await keyMeetingNotesPage.expectDraftSectionsVisible();
    });
  });

  test('TC:4 Verify Action Items distinction from general discussion content', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtabb', 'TC:4 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget.
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page);
    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    // Default fixture text has no action item at all — this test needs one
    // distinct from general discussion, with an owner, to tell them apart.
    await keyMeetingNotesPage.uploadSourceFile(
      'meeting-notes-source.txt',
      'Discussed Q3 sample approval timeline and next steps. ' +
        'Action item: Owner will send the updated quote to the buyer by Friday.',
    );
    await keyMeetingNotesPage.generateDraft();

    await test.step('Action items render distinct from general discussion content', async () => {
      // Not an exact phrase: the model composes in its own words by design
      // (see the system prompt in declared_fields.py — "answer IN YOUR OWN
      // WORDS... a model told to extract quotes a line back", which this
      // feature deliberately avoids). A stable keyword from the uploaded
      // source survives that paraphrasing; the literal input sentence would
      // not. No owner param either — confirmed against the running app:
      // action items render as a plain bullet, with no "Owner: X" badge —
      // that locator targeted a UI affordance that was never built.
      await keyMeetingNotesPage.expectActionItemVisible('buyer');
    });
  });

  test('TC:5 Verify mandatory validation during note creation/editing', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtabd', 'TC:5 (ClickUp)');
    // Confirmed against the running app: this feature does not exist.
    // meeting-note-detail.tsx's own docblock says so directly ("READ-ONLY,
    // DELIBERATELY... No edit affordance anywhere, matching the
    // prototype") — generation persists the note immediately with an
    // AI-composed title. There is no editable Title field, no Save button,
    // and therefore nothing for "mandatory validation" to block. Same
    // disposition as TC:3 (fixme, not deleted): a real live run is what
    // surfaced this, so it stays visible rather than silently vanishing.
    test.fixme(true, 'No create/edit form exists — notes are read-only from the moment they generate. See meeting-note-detail.tsx.');

    const customerId = await createTestCustomer(createCustomerPage, page);
    await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
    await keyMeetingNotesPage.uploadSourceFile();
    await keyMeetingNotesPage.generateDraft();

    await test.step('Clear the mandatory Title field', async () => {
      await keyMeetingNotesPage.fillDraft({ title: '' });
    });

    await test.step('Click Save', async () => {
      await keyMeetingNotesPage.save();
    });

    await test.step('Save is blocked; the field is flagged', async () => {
      await keyMeetingNotesPage.expectFieldError('Required');
    });
  });

  test('TC:6 Verify persistence in Communication tab and audit trail logging', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtabf', 'TC:6 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget.
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page);

    await test.step('Generate a Key Meeting Notes record', async () => {
      await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
      await keyMeetingNotesPage.uploadSourceFile();
      await keyMeetingNotesPage.generateDraft();
    });

    // No custom title to give it — confirmed against the running app,
    // generation persists immediately with an AI-composed title (see TC:5).
    // Read back whatever the model actually produced instead.
    const title = await keyMeetingNotesPage.generatedTitle();

    await test.step('It appears in the Key Meeting Notes history', async () => {
      await keyMeetingNotesPage.backToNotesList();
      await keyMeetingNotesPage.expectLoggedEntryVisible(title);
    });

    await test.step('The record shows its source, timestamp, and acting user', async () => {
      // Confirmed against the running app: there is no literal "created"
      // wording or separate audit-trail block — the closest analog is the
      // note's own subtitle line ("generated from <source> · <timestamp> ·
      // <generatedBy>"), which is exactly source + timestamp + acting user.
      await keyMeetingNotesPage.openDetailFromHistory(title);
      await keyMeetingNotesPage.expectSourceInteractionVisible();
    });
  });

  test('TC:7 Verify notification actions ("Notify Internally" & "Notify the Customer")', async ({
    createCustomerPage,
    keyMeetingNotesPage,
    page,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abtabg', 'TC:7 (ClickUp)');
    // Real AI generation against a local model — confirmed 6-10s+ per call,
    // well past the default per-test budget.
    test.slow();

    const customerId = await createTestCustomer(createCustomerPage, page);

    await test.step('Generate a Key Meeting Notes record', async () => {
      await keyMeetingNotesPage.openGenerateFromCustomerDetail(customerId);
      await keyMeetingNotesPage.uploadSourceFile();
      await keyMeetingNotesPage.generateDraft();
    });

    await test.step('"Notify Internally" opens a real dialog, not a one-click dispatch', async () => {
      // Confirmed against the running app: clicking the button opens a
      // dialog with Managers/Executives recipient pickers — sending isn't
      // groundable from here, because this dev realm has no user seeded
      // with either job role ("No one holds this role yet." in both
      // comboboxes). That's a seed-data gap, not a feature to guess a
      // fake pass for — same "don't force it" discipline as TC:3/TC:5.
      await keyMeetingNotesPage.notifyInternally();
      await expect(keyMeetingNotesPage.locators.notifyDialog).toBeVisible();
      await expect(keyMeetingNotesPage.locators.sendNotificationsButton).toBeVisible();
      // A real modal — must be dismissed, or it blocks "Notify the
      // Customer" behind it for the next step.
      await keyMeetingNotesPage.closeNotifyDialog();
    });

    await test.step('"Notify the Customer" dispatches a real notification', async () => {
      // Confirmed against the running app: this dialog's "Customer"
      // combobox comes pre-filled with the customer's own name — Send
      // needs no picking, and `onSend` only toasts once the mutation
      // actually resolves (meeting-note-detail.tsx).
      await keyMeetingNotesPage.notifyCustomer();
      await keyMeetingNotesPage.sendNotification();
    });
  });
});
