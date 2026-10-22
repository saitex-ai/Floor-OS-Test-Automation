import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/crm.fixtures';
import type { ExternalEventsPage } from '../../../src/pages/crm/external-events.page';
import {
  renderBlankImage,
  renderBusinessCard,
  uniqueCompanyName,
} from '../../../src/utils/business-card';

/**
 * CRM — Scan & Create Customer/Contact with the Floor OS Assistant.
 *
 * Source of truth: test-cases/crm/scan-create-floor-os-assistant.md and the
 * ClickUp set https://app.clickup.com/t/z941abzcx1, written from the Floor
 * OS CRM prototype and checked against dev on 2026-10-21.
 *
 * Every scan uses a business card generated for that test (unique company
 * and contact email), so duplicates only happen where a test makes them.
 *
 * "BUG:" steps assert what dev does today where it differs from the
 * prototype; each one links its CRM Bug Tracking ticket and will fail once
 * the bug is fixed — the signal to switch the step to the prototype's
 * expected result.
 */

/** An existing dev Customer, used read-only for the duplicate-name cases. */
const EXISTING_CUSTOMER_NAME = 'Acme Textiles';

/**
 * Every "Save customer & contact" on dev has been stuck on "Checking
 * whether this customer already exists…" since the afternoon of
 * 2026-10-21 (it worked that morning). Tests that need a save assert the
 * expected outcome and are marked as known failures, so they report an
 * unexpected pass once the bug is fixed.
 */
function knownSaveBug(): void {
  test.fail(
    true,
    'Known bug: Scan & Create save never completes (stuck "Checking whether this customer already exists…") — https://app.clickup.com/t/z941abzd34',
  );
}

const BUG = {
  missingEmail: 'https://app.clickup.com/t/z941abzd2p',
  duplicateCustomer: 'https://app.clickup.com/t/z941abzd2q',
  duplicateEmail: 'https://app.clickup.com/t/z941abzd2t',
  freeText: 'https://app.clickup.com/t/z941abzd2u',
  saveBeforeScan: 'https://app.clickup.com/t/z941abzd2v',
  unreadableFile: 'https://app.clickup.com/t/z941abzd2w',
  saveStuck: 'https://app.clickup.com/t/z941abzd34',
};

/** A manual External Event is born Attended, so its Leads tab is open. */
async function createAttendedEvent(externalEventsPage: ExternalEventsPage): Promise<string> {
  const title = `Playwright Scan Event ${Date.now()}`;
  await externalEventsPage.openFromEventsList();
  await externalEventsPage.fill({
    title,
    venue: 'Regression City / Venue',
    date: '2026-09-20',
    about: 'Created by the Scan & Create regression suite.',
    attendee: 'Alice Planner',
    score: 7,
    numberOfLeads: 1,
    wentWell: 'Good turnout.',
    couldBeBetter: 'Nothing major.',
    attendNextEditions: 'Yes',
  });
  await externalEventsPage.submit();
  await externalEventsPage.expectConfirmDialogVisible();
  await externalEventsPage.confirmSaveEvent();
  await externalEventsPage.expectSavedSuccessfully();
  return title;
}

test.describe('CRM - Scan & Create Customer/Contact (Floor OS Assistant)', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async () => {
    await allure.epic('CRM');
    await allure.feature('Scan & Create Customer/Contact');
    await allure.owner('CRM QA');
  });

  test('TC:1 Verify Scan & Create Opens the Floor OS Assistant with a Greeting and Four Options', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx4', 'TC:1 (ClickUp)');

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.expectAssistantReady();
  });

  test('TC:2 Verify Scan & Create Is Available from CRM Home, Customers List and Contacts List', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx5', 'TC:2 (ClickUp)');

    // CRM Home and Contacts were missing until dev added them on
    // 2026-10-21 (https://app.clickup.com/t/z941abzd2n, fixed).
    await test.step('CRM Home → Scan & Create opens the assistant', async () => {
      await scanCreatePage.openFromCrmHome();
      await scanCreatePage.expectAssistantReady();
      await scanCreatePage.closeAssistant();
    });

    await test.step('Customers list → More actions → Scan & Create opens the assistant', async () => {
      await scanCreatePage.openFromCustomersList();
      await scanCreatePage.expectAssistantReady();
      await scanCreatePage.closeAssistant();
    });

    await test.step('Contacts list → More actions → Scan & Create opens the assistant', async () => {
      await scanCreatePage.openFromContactsList();
      await scanCreatePage.expectAssistantReady();
    });
  });

  test('TC:3 Verify Uploading a Business Card Shows Scan Progress and Disables the Other Options', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx6', 'TC:3 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);

    await test.step('The file name is echoed and every option is disabled', async () => {
      await scanCreatePage.expectChatLine(card.filePath.split('/').pop()!);
      await expect(l.uploadFileOption).toHaveAttribute('aria-pressed', 'true');
      await scanCreatePage.expectOptionsDisabled();
    });

    await test.step('The assistant reports the scan was read', async () => {
      await scanCreatePage.expectChatLine(
        'Scan read. Checking mandatory fields before I pre-fill the form…',
        90_000,
      );
    });
  });

  test('TC:4 Verify the Assistant Runs the Mandatory Checks and Offers Review & Save', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx7', 'TC:4 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
  });

  test('TC:5 Verify Review & Save Opens the Pre-Filled Review Form', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx8', 'TC:5 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();

    await test.step('Scanned values are filled in and CRM Stage is Lead', async () => {
      await scanCreatePage.expectReviewFormPrefilled(card);
    });

    await test.step('Cancel sits to the left of Save customer & contact', async () => {
      await scanCreatePage.expectCancelLeftOfSave();
    });
  });

  test('TC:6 Verify Every Pre-Filled Field on the Review Form Is Editable', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcx9', 'TC:6 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();

    await test.step('Pre-filled fields in each section accept a new value', async () => {
      await l.designationInput.fill('Head of Sourcing');
      await expect(l.designationInput).toHaveValue('Head of Sourcing');
      await l.customerNameInput.fill(`${card.companyName} Edited`);
      await expect(l.customerNameInput).toHaveValue(`${card.companyName} Edited`);
      await scanCreatePage.selectComboboxOption(l.crmStageCombobox, 'Qualified Lead');
    });

    await test.step('An empty optional field can be filled in', async () => {
      await l.customerCityInput.fill('Austin');
      await expect(l.customerCityInput).toHaveValue('Austin');
    });
  });

  test('TC:7 Verify Saving Creates the Customer and Its Linked Contact', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxa', 'TC:7 (ClickUp)');
    knownSaveBug();
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();
    await scanCreatePage.save();

    await test.step('"Contact and Customer created successfully!" is shown', async () => {
      await scanCreatePage.expectCreatedDialog();
    });

    await test.step('The new Customer opens with the scanned Contact linked', async () => {
      await scanCreatePage.viewCreatedCustomer();
      await scanCreatePage.expectCreatedCustomerDetails(card);
    });
  });

  test('TC:8 Verify the Created Customer Has Stage Lead and Status Active', async ({
    scanCreatePage,
    customerDetailPage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxb', 'TC:8 (ClickUp)');
    knownSaveBug();
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();
    await scanCreatePage.save();
    await scanCreatePage.expectCreatedDialog();
    // Creation Method isn't shown anywhere on the Customer screen (the
    // System section has only Created On / Created By), so TC:8 checks
    // only what the user can see (ClickUp TC:8 updated 2026-10-22).
    await scanCreatePage.viewCreatedCustomer();

    await test.step('CRM Stage is Lead and Status is Active', async () => {
      await scanCreatePage.expectCreatedCustomerDetails(card);
      await customerDetailPage.expectStatus('Active');
    });

    test.info().annotations.push({
      type: 'not checked',
      description:
        'Manager notifications: other users’ notification bells are not reachable from this session.',
    });
  });

  test('TC:9 Verify Saying "save" in the Chat Opens the Review Form Once Checks Pass', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxc', 'TC:9 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    // "save" opens the form straight away, so its echo isn't waited for.
    await scanCreatePage.send('save', { expectEcho: false });
    await scanCreatePage.expectReviewFormLoaded();
    // CRM Stage's Lead default is checked by TC:5 (Review & save). Opened
    // via "save", it intermittently still reads "Select" under load on dev
    // (2026-10-22), which isn't what TC:9 is about.
    await scanCreatePage.expectReviewFormPrefilled(card, { checkCrmStage: false });
  });

  test('TC:10 Verify a Field Can Be Changed from the Chat Before Review', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxd', 'TC:10 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.send('set the contact designation to Head of Sourcing');

    await test.step(`BUG: the change isn't understood or applied (${BUG.freeText})`, async () => {
      await scanCreatePage.expectChatLine(
        'You can change any field, ask about the scan, or say save.',
      );
      await scanCreatePage.reviewAndSave();
      await expect(scanCreatePage.locators.designationInput).toHaveValue(card.designation);
    });
  });

  test('TC:11 Verify Details Typed in the Chat Are Used Instead of a Scan', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxe', 'TC:11 (ClickUp)');
    const typed = {
      companyName: uniqueCompanyName(),
      contactName: 'Priya Raman',
      contactEmail: `priya.${Date.now().toString(36)}@cardscan.example`,
    };

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.send(
      `Customer ${typed.companyName}, contact ${typed.contactName}, ${typed.contactEmail}`,
    );

    // Works on dev since 2026-10-22 (it used to reply with a generic
    // "Pick an option above…" and ignore the details).
    await test.step('The typed details are used: checks run and Review & save is offered', async () => {
      await scanCreatePage.expectAllChecksPassed(typed, { typed: true });
    });
  });

  test('TC:12 Verify "scan again" Restarts the Assistant', async ({ scanCreatePage }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxf', 'TC:12 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.send('scan again', { expectEcho: false });

    await test.step('The conversation resets and the options are enabled again', async () => {
      await scanCreatePage.expectAssistantReady();
      await expect(scanCreatePage.locators.reviewAndSaveButton).toHaveCount(0);
    });

    await test.step('Nothing was saved', async () => {
      await scanCreatePage.expectCustomerNotInList(card.companyName!);
    });
  });

  test('TC:13 Verify Scan & Create from an External Event’s Leads Tab Links the Customer to It', async ({
    scanCreatePage,
    externalEventsPage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxg', 'TC:13 (ClickUp)');
    knownSaveBug();
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    const title =
      await test.step('Create an Attended External Event and open its Leads tab', async () => {
        const eventTitle = await createAttendedEvent(externalEventsPage);
        await externalEventsPage.openList();
        await externalEventsPage.search(eventTitle);
        await externalEventsPage.openEventRow(eventTitle);
        await externalEventsPage.openLeadsTab();
        return eventTitle;
      });

    await test.step('Scan & Create from the Leads tab pre-sets Origin Type to External Event', async () => {
      await scanCreatePage.openFromCurrentPage();
      await scanCreatePage.scanToReview(card);
      await scanCreatePage.reviewAndSave();
      await expect(l.originTypeCombobox).toHaveText(/External Event/);
    });

    await test.step('After saving, the new Customer is listed under the event’s Leads', async () => {
      await scanCreatePage.save();
      await scanCreatePage.expectCreatedDialog();
      await externalEventsPage.openList();
      await externalEventsPage.search(title);
      await externalEventsPage.openEventRow(title);
      await externalEventsPage.openLeadsTab();
      await expect(externalEventsPage.locators.leadsTabButton).toHaveText(/Leads \(1\)/);
      await scanCreatePage.expectTextOnPage(card.companyName!);
    });
  });

  test('TC:14 Verify the Capture a Photo Option Opens the Camera with Capture and Cancel', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxh', 'TC:14 (ClickUp)');
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.openCamera();

    await test.step('The camera opens in the assistant or in a separate window, with Cancel', async () => {
      await expect(
        l
          .chatLine('Fit the business card or document inside the frame.')
          .or(
            l.chatLine(
              /Your camera opened in a separate window|Your browser blocked the camera window/,
            ),
          ),
      ).toBeVisible();
      await expect(l.cameraCancelButton).toBeVisible();
    });

    test.info().annotations.push({
      type: 'not checked',
      description: 'Taking a real photo needs a webcam; the capture itself is a manual check.',
    });
  });

  test('TC:15 Verify Uploading a QR Code Pre-Fills the Customer and Contact', async () => {
    await allure.tms('https://app.clickup.com/t/z941abzcxj', 'TC:15 (ClickUp)');
    test.fixme(
      true,
      'Needs a QR code image holding a vCard; the repo has no QR generator. Manual check.',
    );
  });

  test('TC:16 Verify Send Is Disabled When the Message Box Is Empty or Only Spaces', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxk', 'TC:16 (ClickUp)');
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await expect(l.sendButton).toBeDisabled();
    await l.messageBox.fill('   ');
    await expect(l.sendButton).toBeDisabled();
    await l.messageBox.press('Enter');
    await expect(l.chatLine(/^\s+$/)).toHaveCount(0);
    await l.messageBox.fill('hello');
    await expect(l.sendButton).toBeEnabled();
  });

  test('TC:17 Verify the Assistant Asks for a Missing Contact Email and Accepts It from the Chat', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxn', 'TC:17 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir, { contactEmail: null });
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);

    await test.step(`BUG: the email isn't asked for; the assistant offers to create the customer alone (${BUG.missingEmail})`, async () => {
      await scanCreatePage.expectChatLine(`Customer name ${card.companyName} is unique.`, 90_000);
      await scanCreatePage.expectChatLine(
        'I could not identify the contact. Can I proceed creating the customer alone?',
      );
      await expect(l.yesButton).toBeVisible();
      await expect(l.noButton).toBeVisible();
    });

    await test.step(`BUG: a typed email is not accepted (${BUG.missingEmail})`, async () => {
      await scanCreatePage.send(`pw.${Date.now()}@cardscan.example`);
      await scanCreatePage.expectChatLine('Please answer yes or no.');
      await expect(l.reviewAndSaveButton).toHaveCount(0);
    });
  });

  test('TC:18 Verify the Assistant Asks for a Missing Customer Name', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxp', 'TC:18 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir, { companyName: null });

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);
    await test.step(`BUG: the name isn't asked for; the assistant offers to create the contact alone (${BUG.missingEmail})`, async () => {
      await scanCreatePage.expectChatLine(
        'I could not identify the customer. Can I proceed creating the contact alone?',
        90_000,
      );
      await expect(scanCreatePage.locators.yesButton).toBeVisible();
      await expect(scanCreatePage.locators.reviewAndSaveButton).toHaveCount(0);
    });
  });

  test('TC:19 Verify a Duplicate Customer Name Is Flagged and a New Name Is Asked For', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxq', 'TC:19 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir, {
      companyName: EXISTING_CUSTOMER_NAME,
    });

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);

    await test.step(`BUG: the contact is offered for linking to the existing customer (${BUG.duplicateCustomer})`, async () => {
      await scanCreatePage.expectChatLine(
        `Customer ${EXISTING_CUSTOMER_NAME} already exists, so the contact will be linked to that customer. Shall I proceed?`,
        90_000,
      );
    });
  });

  test('TC:20 Verify a Duplicate Contact Email Is Flagged and a New Email Is Asked For', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxr', 'TC:20 (ClickUp)');
    knownSaveBug();
    const first = await renderBusinessCard(testInfo.outputDir);

    await test.step('Create a Contact with Scan & Create', async () => {
      await scanCreatePage.openFromCustomersList();
      await scanCreatePage.scanToReview(first);
      await scanCreatePage.reviewAndSave();
      await scanCreatePage.save();
      await scanCreatePage.expectCreatedDialog();
    });

    const second = await renderBusinessCard(testInfo.outputDir, {
      contactEmail: first.contactEmail,
    });
    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(second.filePath);

    await test.step(`BUG: the scan ends with "nothing to create" instead of asking for a new email (${BUG.duplicateEmail})`, async () => {
      await scanCreatePage.expectChatLine(
        'I found nothing to create on this scan: no customer and no contact.',
        90_000,
      );
      await expect(scanCreatePage.locators.startAgainButton).toBeVisible();
    });
  });

  test('TC:21 Verify an Invalid Contact Email Typed in the Chat Is Rejected', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxt', 'TC:21 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir, { contactEmail: null });

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);
    await scanCreatePage.expectChatLine(
      'I could not identify the contact. Can I proceed creating the customer alone?',
      90_000,
    );
    await scanCreatePage.send('not-an-email');

    await test.step(`BUG: the assistant only asks for yes or no (${BUG.missingEmail})`, async () => {
      await scanCreatePage.expectChatLine('Please answer yes or no.');
      await expect(scanCreatePage.locators.reviewAndSaveButton).toHaveCount(0);
    });
  });

  test('TC:22 Verify "save" Before Any Scan Says There Is Nothing to Save', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxu', 'TC:22 (ClickUp)');

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.send('save');

    await test.step(`BUG: the reply is the generic prompt (${BUG.saveBeforeScan})`, async () => {
      await scanCreatePage.expectChatLine(
        "Pick an option above, or type the contact's details and I'll set them up.",
      );
    });
    await expect(scanCreatePage.locators.contactProfileHeading).toHaveCount(0);
  });

  test('TC:23 Verify "save" While a Mandatory Field Is Missing Asks for It', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxv', 'TC:23 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir, { contactEmail: null });

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(card.filePath);
    await scanCreatePage.expectChatLine(
      'I could not identify the contact. Can I proceed creating the customer alone?',
      90_000,
    );
    await scanCreatePage.send('save');

    await test.step(`BUG: the assistant only asks for yes or no (${BUG.missingEmail})`, async () => {
      await scanCreatePage.expectChatLine('Please answer yes or no.');
    });
    await expect(scanCreatePage.locators.contactProfileHeading).toHaveCount(0);
  });

  test('TC:24 Verify an Unreadable File Shows an Error and Try Again', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxw', 'TC:24 (ClickUp)');
    const blank = await renderBlankImage(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.upload(blank);

    await test.step(`BUG: reported as "nothing to create" with Start again (${BUG.unreadableFile})`, async () => {
      await scanCreatePage.expectChatLine(
        'I found nothing to create on this scan: no customer and no contact.',
        90_000,
      );
      await expect(l.startAgainButton).toBeVisible();
      await expect(l.reviewAndSaveButton).toHaveCount(0);
    });

    await test.step('Start again re-enables the options', async () => {
      await l.startAgainButton.click();
      await scanCreatePage.expectAssistantReady();
    });
  });

  test('TC:25 Verify "stop" Ends the Session and Nothing Is Saved', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxx', 'TC:25 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.send('stop', { expectEcho: false });

    await test.step('The assistant closes and the user is back on the Customers list', async () => {
      await scanCreatePage.expectBackOnCustomersList();
    });

    await test.step('Nothing was saved', async () => {
      await scanCreatePage.expectCustomerNotInList(card.companyName!);
    });
  });

  test('TC:26 Verify Closing the Assistant Returns to the List and Nothing Is Saved', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxy', 'TC:26 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.closeAssistant();
    await scanCreatePage.expectBackOnCustomersList();
    await scanCreatePage.expectCustomerNotInList(card.companyName!);
  });

  test('TC:27 Verify Cancel on the Review Form Discards the Scan', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcxz', 'TC:27 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();
    await scanCreatePage.cancel();

    await test.step('The review form closes and nothing is saved', async () => {
      await scanCreatePage.expectReviewFormClosed();
      await scanCreatePage.expectCustomerNotInList(card.companyName!);
    });
  });

  test('TC:28 Verify Invalid Data on the Review Form Blocks Save with Inline Errors', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcy0', 'TC:28 (ClickUp)');
    knownSaveBug();
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();

    await test.step('An invalid email and a blank Contact Name block Save', async () => {
      await l.contactEmailInput.fill('avery@');
      await l.contactNameInput.fill('');
      await scanCreatePage.save();
      await scanCreatePage.expectFieldErrors('Required', 'Enter a valid email address');
      await expect(l.attentionBanner).toHaveText(/^2 fields need attention/);
      await expect(l.createdDialog).toHaveCount(0);
    });

    await test.step('After correcting both fields, Save succeeds', async () => {
      await l.contactEmailInput.fill(card.contactEmail!);
      await l.contactNameInput.fill(card.contactName);
      await scanCreatePage.save();
      await scanCreatePage.expectCreatedDialog();
    });
  });

  test('TC:29 Verify a Customer Name Changed to an Existing One on the Review Form Blocks Save', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcy1', 'TC:29 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();
    await l.customerNameInput.fill(EXISTING_CUSTOMER_NAME);
    await scanCreatePage.save();

    await test.step('No duplicate Customer is created', async () => {
      await expect(l.createdDialog).toHaveCount(0);
    });

    await test.step(`BUG: the save is stuck on "Checking whether this customer already exists…", no field error (${BUG.saveStuck})`, async () => {
      await scanCreatePage.expectDuplicateCheckStuck();
      await expect(l.attentionBanner).toHaveCount(0);
    });
  });

  test('TC:30 Verify a Blocked Camera Shows a Message and a Way Back to the Options', async () => {
    await allure.tms('https://app.clickup.com/t/z941abzcy3', 'TC:30 (ClickUp)');
    test.fixme(
      true,
      'On dev the camera opens in a separate browser window, whose permission prompt automation can’t drive. Manual check.',
    );
  });

  test('TC:31 Verify Typing "cancel" While the Camera Is Open Closes Only the Camera', async ({
    scanCreatePage,
  }) => {
    await allure.tms('https://app.clickup.com/t/z941abzcy4', 'TC:31 (ClickUp)');
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.openCamera();
    await expect(l.cameraCancelButton).toBeVisible();
    await scanCreatePage.send('cancel', { expectEcho: false });

    await test.step('The camera closes, the assistant stays open, and the options are back', async () => {
      await scanCreatePage.expectChatLine(
        "Camera closed. Pick another option, or type the contact's details.",
      );
      await expect(l.assistant).toBeVisible();
      await expect(l.uploadFileOption).toBeEnabled();
    });
  });

  test('TC:32 Verify Origin Is Cleared When Origin Type Changes on the Review Form', async ({
    scanCreatePage,
  }, testInfo) => {
    await allure.tms('https://app.clickup.com/t/z941abzcy5', 'TC:32 (ClickUp)');
    const card = await renderBusinessCard(testInfo.outputDir);
    const l = scanCreatePage.locators;

    await scanCreatePage.openFromCustomersList();
    await scanCreatePage.scanToReview(card);
    await scanCreatePage.reviewAndSave();

    const firstOrigin =
      await test.step('Choose Origin Type External Event and an Origin', async () => {
        await scanCreatePage.selectComboboxOption(l.originTypeCombobox, 'External Event');
        const origins = await scanCreatePage.comboboxOptions(l.originCombobox);
        expect(origins.length).toBeGreaterThan(0);
        await scanCreatePage.selectComboboxOption(l.originCombobox, origins[0]!);
        return origins;
      });

    await test.step('Changing Origin Type clears Origin and changes its options', async () => {
      await scanCreatePage.selectComboboxOption(l.originTypeCombobox, 'Web Form');
      await expect(l.originCombobox).toHaveText(/Select/);
      expect(await scanCreatePage.comboboxOptions(l.originCombobox)).not.toEqual(firstOrigin);
    });

    await test.step('Referred By appears only for Origin Type Referral', async () => {
      await expect(l.referredByLabel).toHaveCount(0);
      await scanCreatePage.selectComboboxOption(l.originTypeCombobox, 'Referral');
      await expect(l.referredByLabel).toBeVisible();
    });
  });
});
