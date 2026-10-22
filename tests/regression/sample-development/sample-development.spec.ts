import * as allure from 'allure-js-commons';
import { test } from '../../../src/fixtures/sample-development.fixtures';

/**
 * Sample Development — Regression suite. Owned by the Sample Development
 * QA. Storage state from auth.setup.ts is already applied via the
 * "sample-development" project's dependency — no login needed here.
 *
 * Test data: a created Sample Request can't be deleted or cancelled
 * (confirmed live 2026-10-14: its detail page only offers "Reassign"), so
 * every request this suite creates carries QA_TAG in its free-text "Art
 * style" field, marking it for cleanup on the backend side.
 */
const QA_TAG = 'QA-AUTO pw-hybrid-framework test data - safe to delete';

test.describe('Sample Development module', () => {
  test.beforeEach(async () => {
    await allure.epic('Sample Development');
    await allure.feature('Regression');
    await allure.owner('Sample Development QA');
  });

  test('list loads after shell login', async ({ sampleRequestListPage }) => {
    await sampleRequestListPage.open();
  });

  // The create flow was the subject of z941abxfk4 ("Save fails with
  // internal server error (500)"), confirmed fixed 2026-10-05.
  test('Create Sample Request: successful creation, then visible in the list', async ({
    createSampleRequestPage,
    sampleRequestListPage,
  }) => {
    // Two authenticated page loads, ~10 live-data dropdown picks across the
    // 8-step wizard and a server-side create (which also triggers the
    // Techpack/SO/Consumption tasks) — well past the default 60s on a slow
    // dev, same as the other modules' create flows.
    test.setTimeout(150_000);

    await createSampleRequestPage.open();
    await createSampleRequestPage.fillRequestDetails();
    await createSampleRequestPage.continueFromTechpackStep();
    await createSampleRequestPage.fillStyleDetails();
    await createSampleRequestPage.fillFabric();
    await createSampleRequestPage.fillSizesAndQuantity();
    await createSampleRequestPage.continueThroughRemainingSteps(QA_TAG);
    await createSampleRequestPage.save();

    await createSampleRequestPage.expectCreatedSuccessfully();
    const sampleRequestId = createSampleRequestPage.currentSampleRequestId();

    await sampleRequestListPage.open();
    await sampleRequestListPage.expectSearchFinds(sampleRequestId);
  });
});
