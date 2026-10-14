import * as allure from 'allure-js-commons';
import { test } from '../../../src/fixtures/sample-development.fixtures';

/**
 * Sample Development — Smoke suite: the module loads after shell login.
 * Deliberately minimal and read-only. The create flow lives in the
 * regression suite, because every create is a real Sample Request (plus
 * the Techpack/SO/Consumption tasks it triggers) that the app gives no
 * way to delete — not something a frequent smoke run should leave behind.
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
});
