import * as allure from 'allure-js-commons';
import { test } from '../../../src/fixtures/sample-development.fixtures';

/**
 * Sample Development — Smoke suite. Module-loads check plus one
 * happy-path test (create a Sample Request, see it in the list), same
 * shape as CRM's smoke suite — minimal, no exhaustive field coverage
 * (that's what regression is for).
 *
 * The create flow was the subject of z941abxfk4 ("Save fails with
 * internal server error (500)"), confirmed fixed 2026-10-05 — this test
 * is the first automated coverage of that flow since.
 */
test.describe('Sample Development module', () => {
  test.beforeEach(async () => {
    await allure.epic('Sample Development');
    await allure.feature('Smoke');
    await allure.owner('Sample Development QA');
  });

  test('loads after shell login', async ({ sampleRequestListPage }) => {
    await sampleRequestListPage.open();
  });

  test('Create Sample Request: successful creation, then visible in the list', async ({
    createSampleRequestPage,
    sampleRequestListPage,
  }) => {
    await createSampleRequestPage.open();

    await createSampleRequestPage.fillRequestDetails();
    await createSampleRequestPage.continueFromTechpackStep();
    await createSampleRequestPage.fillStyleDetails();
    await createSampleRequestPage.fillFabric();
    await createSampleRequestPage.fillSizesAndQuantity();
    await createSampleRequestPage.continueThroughRemainingSteps();
    await createSampleRequestPage.save();

    await createSampleRequestPage.expectCreatedSuccessfully();
    const sampleRequestId = createSampleRequestPage.currentSampleRequestId();

    await sampleRequestListPage.open();
    await sampleRequestListPage.search(sampleRequestId);
    await sampleRequestListPage.expectRowVisible(sampleRequestId);
  });
});
