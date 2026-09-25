import * as allure from 'allure-js-commons';
import { test, expect } from '../../../src/fixtures/techpack.fixtures';

/**
 * Techpack — Smoke suite. Module-loads check plus one happy-path test per
 * capability as they're built out, same shape as CRM's smoke suite
 * (tests/smoke/crm/smoke-recent.spec.ts) — minimal, no exhaustive field
 * coverage (that's what regression is for).
 */
const DUMMY_PDF = {
  name: `playwright-smoke-techpack-${Date.now()}.pdf`,
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
};

test.describe('Techpack module', () => {
  test.beforeEach(async () => {
    await allure.epic('Techpack');
    await allure.feature('Smoke');
    await allure.owner('Techpack QA');
  });

  test('loads after shell login', async ({ techpackPage }) => {
    await techpackPage.open();
    await techpackPage.expectLoaded();
  });

  test('Create Techpack (Classic): successful creation with a random identity', async ({
    createTechpackPage,
    page,
  }) => {
    test.setTimeout(120000);
    await createTechpackPage.openFromTechpacksList();
    await createTechpackPage.fillAllRequiredWithRandomAvailable();
    await createTechpackPage.uploadTechpackFile(DUMMY_PDF);

    // Customer+Season+Style+Fabric+Wash is a real uniqueness key server-side
    // (see create-techpack.page.ts) — retry with a fresh random identity on
    // a collision with an existing techpack, same as the regression suite's
    // own TC:7.
    let result = await createTechpackPage.createExpectingResult();
    for (let i = 0; result === 'duplicate' && i < 3; i++) {
      await page.keyboard.press('Escape');
      await createTechpackPage.fillAllRequiredWithRandomAvailable();
      result = await createTechpackPage.createExpectingResult();
    }

    expect(result).toBe('created');
    await createTechpackPage.expectCreatedSuccessfully();
  });
});
